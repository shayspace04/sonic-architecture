import type { VibePayload } from "./types";
import { detectGenreFamily } from "./spatial-rules";

/**
 * Deterministic translation of a VibePayload into 3D scene parameters.
 *
 * Provenance contract: Qloo supplies cultural evidence (already provenance-
 * labeled in the payload); Sonic Architecture translates it into these visual
 * parameters with the explicit rules documented below. Nothing here invents
 * Qloo data — every input is a payload field, every rule is listed in
 * `sceneParamsFromPayload`, and the rules are surfaced in the UI so the
 * translation is auditable.
 */

export type MaterialLanguage = "gloss" | "mineral" | "raw" | "soft" | "neutral";

export interface SceneParams {
  primaryColor: string;
  crestColor: string;
  shadowColor: string;
  keyLightKelvin: number;
  waveAmplitude: number;
  waveSpeed: number;
  pointDensity: number;
  pointSize: number;
  reflectivity: number;
  openness: number;
  fogDensity: number;
  bloomIntensity: number;
  shadowDepth: number;
  materialLanguage: MaterialLanguage;
  rules: Record<string, string>;
}

const FAMILY_WAVE_AMPLITUDE: Record<string, number> = {
  electronic: 1.8, hiphop: 1.2, punk: 1.5, atmospheric: 0.7, neutral: 1.0,
};
const FAMILY_WAVE_SPEED: Record<string, number> = {
  electronic: 1.5, hiphop: 1.0, punk: 1.3, atmospheric: 0.45, neutral: 0.8,
};
const FAMILY_OPENNESS: Record<string, number> = {
  electronic: 0.9, hiphop: 0.78, punk: 0.5, atmospheric: 0.62, neutral: 0.72,
};
const FAMILY_FOG: Record<string, number> = {
  electronic: 0.045, hiphop: 0.035, punk: 0.03, atmospheric: 0.055, neutral: 0.04,
};
const FAMILY_BLOOM: Record<string, number> = {
  electronic: 1.4, hiphop: 0.9, punk: 1.1, atmospheric: 0.7, neutral: 0.8,
};
const FAMILY_MATERIAL: Record<string, MaterialLanguage> = {
  electronic: "gloss", hiphop: "mineral", punk: "raw", atmospheric: "soft", neutral: "neutral",
};

const MATERIAL_REFLECTIVITY: Record<MaterialLanguage, number> = {
  gloss: 0.82, mineral: 0.55, raw: 0.35, soft: 0.28, neutral: 0.42,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function neutralSceneParams(): SceneParams {
  const family = "neutral";
  return {
    primaryColor: "#808080",
    crestColor: blendHex("#808080", "#D5FF3F", 0.35),
    shadowColor: blendHex("#8B5CF6", "#808080", 0.3),
    keyLightKelvin: 4500,
    waveAmplitude: FAMILY_WAVE_AMPLITUDE[family],
    waveSpeed: FAMILY_WAVE_SPEED[family],
    pointDensity: 96,
    pointSize: 1.6,
    reflectivity: MATERIAL_REFLECTIVITY[FAMILY_MATERIAL[family]],
    openness: FAMILY_OPENNESS[family],
    fogDensity: FAMILY_FOG[family],
    bloomIntensity: FAMILY_BLOOM[family],
    shadowDepth: 0.6,
    materialLanguage: FAMILY_MATERIAL[family],
    rules: {
      waveAmplitude: "No profile yet; neutral default wave amplitude.",
      waveSpeed: "No profile yet; neutral default movement speed.",
      pointDensity: "No profile yet; point density 96 (clamp 72-150).",
      reflectivity: 'Material language "neutral" -> reflectivity 0.42.',
      openness: "Neutral spatial composition -> openness 0.72 (camera distance and column spacing).",
      fogDensity: "Neutral atmosphere -> fog density 0.040.",
      bloomIntensity: "Neutral light character -> bloom intensity 0.80.",
      keyLightKelvin: "No profile yet; neutral 4500K key light.",
      shadowDepth: "Default -> shadow depth 0.60.",
      crestColor: "Neutral primary #808080 blended 35% toward the acid-lime crest highlight.",
      shadowColor: "Ultraviolet base #8B5CF6 blended 30% toward neutral primary.",
      provenance: "Pre-profile state: neutral procedural defaults, no evidence mapped.",
    },
  };
}

export function sceneParamsFromPayload(vibe: VibePayload): SceneParams {
  const family = detectGenreFamily(vibe.evidence);
  const moodText = [...vibe.evidence.styleTags, ...vibe.evidence.adjectives, ...vibe.evidence.characteristics]
    .join(" ")
    .toLowerCase();
  const hasMood = (words: string[]) => words.some((w) => moodText.includes(w));
  const isHighEnergy = hasMood(["energetic", "high-energy", "dynamic", "upbeat", "danceable"]);
  const isDark = hasMood(["dark", "gritty", "raw", "aggressive", "intense"]);

  const evidenceCount =
    vibe.evidence.genreTags.length +
    vibe.evidence.styleTags.length +
    vibe.evidence.themeTags.length +
    vibe.evidence.adjectives.length +
    vibe.evidence.characteristics.length;

  const rules: Record<string, string> = {};
  const src = vibe.reasoning.source;

  let amplitude = FAMILY_WAVE_AMPLITUDE[family];
  rules.waveAmplitude =
    family === "neutral"
      ? "No recognized genre family; medium default wave amplitude."
      : `${family} genre family -> ${amplitude.toFixed(2)} wave amplitude.`;
  if (isHighEnergy) {
    amplitude *= 1.15;
    rules.waveAmplitude += " High-energy Qloo style tags +15%.";
  }

  let speed = FAMILY_WAVE_SPEED[family];
  rules.waveSpeed =
    family === "neutral"
      ? "No recognized genre family; moderate default movement speed."
      : `${family} genre family -> ${speed.toFixed(2)} movement speed.`;
  if (isHighEnergy) {
    speed *= 1.2;
    rules.waveSpeed += " High-energy tags x1.2.";
  } else if (isDark) {
    speed *= 0.9;
    rules.waveSpeed += " Dark/gritty tags x0.9.";
  }

  const density = clamp(Math.round(96 + evidenceCount * 2), 72, 150);
  rules.pointDensity = `${evidenceCount} matched evidence tags -> point density ${density} (clamp 72-150).`;

  const material: MaterialLanguage = FAMILY_MATERIAL[family];
  const reflectivity = MATERIAL_REFLECTIVITY[material];
  rules.reflectivity = `Material language "${material}" (from ${family} material mapping) -> reflectivity ${reflectivity.toFixed(2)}.`;

  const openness = FAMILY_OPENNESS[family];
  rules.openness = `${family} spatial composition -> openness ${openness.toFixed(2)} (camera distance and column spacing).`;

  const fogDensity = FAMILY_FOG[family];
  rules.fogDensity = `${family} atmosphere -> fog density ${fogDensity.toFixed(3)}.`;

  const bloomIntensity = FAMILY_BLOOM[family];
  rules.bloomIntensity = `${family} light character -> bloom intensity ${bloomIntensity.toFixed(2)}.`;

  const keyLightKelvin = clamp(Math.round(vibe.lightingTemperatureK), 2800, 6500);
  rules.keyLightKelvin = `Qloo-mapped lighting temperature ${vibe.lightingTemperatureK}K -> clamped ${keyLightKelvin}K key light.`;

  const shadowDepth = isDark ? 0.9 : family === "atmospheric" ? 0.4 : 0.6;
  rules.shadowDepth = `${isDark ? "Dark/gritty tags" : family === "atmospheric" ? "Atmospheric family" : "Default"} -> shadow depth ${shadowDepth.toFixed(2)}.`;

  rules.crestColor = `Qloo primary ${vibe.primaryColorHex} blended 35% toward the Sonic Architecture acid-lime crest highlight.`;
  rules.shadowColor = `Ultraviolet base #8B5CF6 blended 30% toward Qloo primary ${vibe.primaryColorHex} for shadow tint.`;

  if (src === "local-fallback") {
    rules.provenance = "local-fallback: no live Qloo evidence; scene uses neutral procedural defaults.";
  } else if (src === "qloo-partial") {
    rules.provenance = "qloo-partial: resolved references with incomplete evidence; mixed mapped/neutral parameters.";
  } else {
    rules.provenance = "qloo: evidence-backed mapping. Qloo supplied the evidence; Sonic Architecture set the scene.";
  }

  return {
    primaryColor: vibe.primaryColorHex,
    crestColor: blendHex(vibe.primaryColorHex, "#D5FF3F", 0.35),
    shadowColor: blendHex("#8B5CF6", vibe.primaryColorHex, 0.3),
    keyLightKelvin,
    waveAmplitude: amplitude,
    waveSpeed: speed,
    pointDensity: density,
    pointSize: 1.6,
    reflectivity,
    openness,
    fogDensity,
    bloomIntensity,
    shadowDepth,
    materialLanguage: material,
    rules,
  };
}

export function blendHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const m = pa.map((c, i) => Math.round(c + (pb[i] - c) * t));
  return `#${m.map((c) => clamp(c, 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): number[] | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = clamp(kelvin, 1500, 12000) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = (v: number) => clamp(Math.round(v), 0, 255) / 255;
  return [c(r), c(g), c(b)];
}
