import type { VibePayload } from "./types";
import type { SceneSpec } from "./scene-spec";

export type ProvenanceKind = "qloo" | "engine" | "user" | "neutral" | "fallback";

export interface RationaleEntry {
  decision: string;
  label: string;
  value: string;
  provenance: ProvenanceKind;
  provenanceLabel: string;
  interpretation: string;
  evidence: Array<{ group: string; items: string[] }>;
  isDefault: boolean;
}

export const PROVENANCE_LABELS: Record<ProvenanceKind, string> = {
  qloo: "Qloo Cultural Evidence",
  engine: "Spatial Design Translation",
  user: "User Prompt Requirement",
  neutral: "Architectural Default",
  fallback: "Local Fallback Engine",
};

export function buildDetailedRationale(
  vibe: VibePayload,
  spec: SceneSpec,
  promptText: string = ""
): RationaleEntry[] {
  const source = vibe.reasoning.source;
  const ev = vibe.evidence;
  const rules = vibe.reasoning.rules;

  const entries: RationaleEntry[] = [];

  // 1. Spatial Typology
  entries.push({
    decision: "typology",
    label: "Spatial Typology & Layout",
    value: spec.typologyLabel,
    provenance: promptText ? "user" : source === "qloo" ? "engine" : "fallback",
    provenanceLabel: promptText
      ? PROVENANCE_LABELS.user
      : source === "qloo"
        ? PROVENANCE_LABELS.engine
        : PROVENANCE_LABELS.fallback,
    interpretation: spec.designIntent,
    evidence: ev.genreTags.length > 0 ? [{ group: "genre", items: ev.genreTags.slice(0, 3) }] : [],
    isDefault: source === "local-fallback",
  });

  // 2. Lighting & Color Temperature
  entries.push({
    decision: "lightingTemperatureK",
    label: "Illumination & Atmosphere",
    value: `${spec.lightingKelvin}K Kelvin`,
    provenance: source === "qloo" && ev.adjectives.length > 0 ? "qloo" : "engine",
    provenanceLabel:
      source === "qloo" && ev.adjectives.length > 0
        ? PROVENANCE_LABELS.qloo
        : PROVENANCE_LABELS.engine,
    interpretation: rules.lightingTemperatureK || spec.atmosphereNote,
    evidence:
      ev.adjectives.length > 0
        ? [{ group: "mood", items: ev.adjectives.slice(0, 3) }]
        : ev.styleTags.length > 0
          ? [{ group: "style", items: ev.styleTags.slice(0, 3) }]
          : [],
    isDefault: !rules.lightingTemperatureK || rules.lightingTemperatureK.includes("default"),
  });

  // 3. Wall Architecture & Acoustics
  entries.push({
    decision: "wallFinish",
    label: "Wall Architecture & Material",
    value: spec.wallFinish.replace("_", " ").toUpperCase(),
    provenance: "engine",
    provenanceLabel: PROVENANCE_LABELS.engine,
    interpretation: `Selected ${spec.wallFinish.replace("_", " ")} to match ${spec.typologyLabel}'s acoustic and reflective profile.`,
    evidence: ev.themeTags.length > 0 ? [{ group: "theme", items: ev.themeTags.slice(0, 3) }] : [],
    isDefault: false,
  });

  // 4. Flooring Material
  entries.push({
    decision: "flooringMaterial",
    label: "Flooring Substrate",
    value: vibe.flooringMaterial || spec.floorFinish.replace("_", " ").toUpperCase(),
    provenance: source === "qloo" ? "engine" : "fallback",
    provenanceLabel: source === "qloo" ? PROVENANCE_LABELS.engine : PROVENANCE_LABELS.fallback,
    interpretation: rules.flooringMaterial || "Floor material selected for circulation durability and tone.",
    evidence: ev.genreTags.length > 0 ? [{ group: "genre", items: ev.genreTags.slice(0, 3) }] : [],
    isDefault: source === "local-fallback",
  });

  // 5. Seating & Tactile Material
  entries.push({
    decision: "seatingFabric",
    label: "Furniture & Tactility",
    value: vibe.seatingFabric || "Curated Architectural Seating",
    provenance: source === "qloo" ? "engine" : "fallback",
    provenanceLabel: source === "qloo" ? PROVENANCE_LABELS.engine : PROVENANCE_LABELS.fallback,
    interpretation: rules.seatingFabric || "Seating fabrics balance ergonomics and tactile warmth.",
    evidence: ev.characteristics.length > 0 ? [{ group: "characteristics", items: ev.characteristics.slice(0, 3) }] : [],
    isDefault: source === "local-fallback",
  });

  // 6. Color Resonance Palette
  entries.push({
    decision: "primaryColorHex",
    label: "Chromatic Anchor",
    value: spec.primaryColor,
    provenance: source === "qloo" ? "qloo" : "neutral",
    provenanceLabel: source === "qloo" ? PROVENANCE_LABELS.qloo : PROVENANCE_LABELS.neutral,
    interpretation: rules.primaryColorHex || "Base chromatic palette reflecting the cultural evidence.",
    evidence: ev.genreTags.length > 0 ? [{ group: "genre", items: ev.genreTags.slice(0, 3) }] : [],
    isDefault: source === "local-fallback",
  });

  return entries;
}
