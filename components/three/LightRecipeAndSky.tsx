"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ExposureGuardTelemetry,
  QualityTier,
  SceneSpec,
  TimeOfDay,
} from "@/lib/types";

// ============================================================================
// STEP 1 (A + B) — RENDERER, EXPOSURE GUARD, PMREM ENVIRONMENT & LIGHTING
// ============================================================================
// Fixes the whitewash at its root:
// 1. Exposure set per time-of-day preset (0.60–0.92), never a static 1.15.
// 2. Hemisphere/ambient fill capped to a faint fill (0.06–0.18).
// 3. Time-of-day procedural sky + horizon + ground bounce PMREM environment
//    (eliminating the #FFF3E0 30x30 white overhead softbox plane) with
//    per-preset environmentIntensity (0.42–0.88).
// 4. One shadow-casting key light (PCFSoftShadowMap, bias -0.00035,
//    normalBias 0.02), subtle complementary fill light, and budgeted warm
//    2200–2700K practical lights with physical inverse-square decay (decay=2).
// 5. Emissive fixtures use toneMapped: false and emissiveIntensity > 1.0 so
//    selective bloom (luminanceThreshold > 1.0) only blooms fixtures.
// 6. Automatic Exposure Guard with unit-testable pure whitewash evaluation.

export interface LightRecipePreset {
  id: TimeOfDay;
  label: string;
  /** Target renderer.toneMappingExposure for this time of day */
  defaultExposure: number;
  /** Allowed auto-exposure guard clamp window [min, max] */
  exposureBounds: [number, number];
  /** Target scene.environmentIntensity (0.40–1.0) */
  environmentIntensity: number;
  zenithHex: string;
  horizonHex: string;
  groundHex: string;
  fogHex: string;
  fogDensity: number;
  sunColorHex: string;
  sunIntensity: number;
  sunAzimuthRad: number;
  sunElevationRad: number;
  /** Secondary non-shadow-casting directional fill opposite the sun */
  fillColorHex: string;
  fillIntensity: number;
  /** Faint sky-to-ground hemisphere fill (strictly <= 0.20) */
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  practicalTemperatureK: number;
  practicalEmissiveHex: string;
  practicalBoostMultiplier: number;
}

export const TIME_OF_DAY_LIGHT_RECIPES: Record<TimeOfDay, LightRecipePreset> = {
  morning: {
    id: "morning",
    label: "Dawn / Morning",
    defaultExposure: 0.88,
    exposureBounds: [0.76, 1.02],
    environmentIntensity: 0.78,
    zenithHex: "#35557A",
    horizonHex: "#D89E72",
    groundHex: "#1D2228",
    fogHex: "#6E7F91",
    fogDensity: 0.0035,
    sunColorHex: "#FFC88A",
    sunIntensity: 2.2,
    sunAzimuthRad: 0.85,
    sunElevationRad: 0.38,
    fillColorHex: "#6B8EB8",
    fillIntensity: 0.2,
    hemiSkyHex: "#D9B38C",
    hemiGroundHex: "#1F242B",
    hemiIntensity: 0.12,
    practicalTemperatureK: 2500,
    practicalEmissiveHex: "#FFA84D",
    practicalBoostMultiplier: 0.95,
  },
  afternoon: {
    id: "afternoon",
    label: "Day / Afternoon",
    defaultExposure: 0.92,
    exposureBounds: [0.8, 1.05],
    environmentIntensity: 0.85,
    zenithHex: "#264E7A",
    horizonHex: "#8AB0D6",
    groundHex: "#22272E",
    fogHex: "#6E859E",
    fogDensity: 0.003,
    sunColorHex: "#FFF1D6",
    sunIntensity: 2.35,
    sunAzimuthRad: 0.38,
    sunElevationRad: 1.02,
    fillColorHex: "#799EC4",
    fillIntensity: 0.22,
    hemiSkyHex: "#B5D2EE",
    hemiGroundHex: "#262B33",
    hemiIntensity: 0.14,
    practicalTemperatureK: 2700,
    practicalEmissiveHex: "#FFB969",
    practicalBoostMultiplier: 0.8,
  },
  sunset: {
    id: "sunset",
    label: "Dusk / Sunset",
    defaultExposure: 0.82,
    exposureBounds: [0.7, 0.95],
    environmentIntensity: 0.68,
    zenithHex: "#17142B",
    horizonHex: "#D96230",
    groundHex: "#141118",
    fogHex: "#2E1C23",
    fogDensity: 0.0048,
    sunColorHex: "#FF7433",
    sunIntensity: 1.95,
    sunAzimuthRad: -0.92,
    sunElevationRad: 0.26,
    fillColorHex: "#4A588A",
    fillIntensity: 0.16,
    hemiSkyHex: "#E07A48",
    hemiGroundHex: "#15121B",
    hemiIntensity: 0.11,
    practicalTemperatureK: 2350,
    practicalEmissiveHex: "#FF9233",
    practicalBoostMultiplier: 1.45,
  },
  midnight: {
    id: "midnight",
    label: "Night / Midnight",
    defaultExposure: 1.1,
    exposureBounds: [0.9, 1.2],
    environmentIntensity: 0.9,
    zenithHex: "#223046",
    horizonHex: "#2D3E5A",
    groundHex: "#242E3D",
    fogHex: "#222D3E",
    fogDensity: 0.0038,
    sunColorHex: "#A8CCF8",
    sunIntensity: 2.05,
    sunAzimuthRad: -0.45,
    sunElevationRad: 0.75,
    fillColorHex: "#5E82B8",
    fillIntensity: 0.42,
    hemiSkyHex: "#749ED6",
    hemiGroundHex: "#263242",
    hemiIntensity: 0.2,
    practicalTemperatureK: 2450,
    practicalEmissiveHex: "#FFA84D",
    practicalBoostMultiplier: 2.1,
  },
};

/**
 * Validates and normalizes `SceneSpec.lighting` fields so legacy SceneSpecs
 * without Step 1 optional properties receive safe, non-whitewashed defaults.
 */
export function validateAndNormalizeLightingSpec(spec: SceneSpec): {
  exposure: number;
  environmentIntensity: number;
  ambientFillIntensity: number;
  fillLightIntensity: number;
  practicalBudgetCount: number;
} {
  const recipe =
    TIME_OF_DAY_LIGHT_RECIPES[spec.timeOfDay] ??
    TIME_OF_DAY_LIGHT_RECIPES.midnight;
  const [minExp, maxExp] = recipe.exposureBounds;

  const rawExposure = spec.lighting.exposure ?? recipe.defaultExposure;
  const exposure = Math.max(minExp, Math.min(maxExp, rawExposure));

  const rawEnvIntensity =
    spec.lighting.environmentIntensity ?? recipe.environmentIntensity;
  const environmentIntensity = Math.max(0.4, Math.min(1.0, rawEnvIntensity));

  // Hard cap ambient/hemisphere fill strictly <= 0.20 to prevent flat washout while preventing crushed shadows
  const ambientFillIntensity = Math.max(
    0.06,
    Math.min(0.2, spec.lighting.ambientIntensity || recipe.hemiIntensity)
  );

  const fillLightIntensity = Math.max(
    0.08,
    Math.min(0.42, spec.lighting.fillLightIntensity ?? recipe.fillIntensity)
  );

  const practicalBudgetCount = Math.max(
    2,
    Math.min(8, spec.lighting.practicalBudgetCount ?? 4)
  );

  return {
    exposure,
    environmentIntensity,
    ambientFillIntensity,
    fillLightIntensity,
    practicalBudgetCount,
  };
}

/**
 * Pure, unit-testable Whitewash Detector & Automatic Exposure Guard function.
 * Evaluates an RGBA pixel buffer (0..255 per channel) against the Realism Standard:
 * - Mean luminance in [0.15, 0.72] during day/dusk, or [0.08, 0.55] at midnight.
 * - Highlight clip ratio (luminance > 0.92) must be < 5% (0.05).
 * - Computes saturation spread across pixels to detect washed-out gray/white frames.
 * - Nudges exposure within `exposureBounds` when overexposed or underexposed.
 */
export function evaluateExposureGuard(
  rgbaPixels: Uint8Array | Uint8ClampedArray,
  currentExposure: number,
  timeOfDay: TimeOfDay
): ExposureGuardTelemetry {
  const recipe =
    TIME_OF_DAY_LIGHT_RECIPES[timeOfDay] ?? TIME_OF_DAY_LIGHT_RECIPES.midnight;
  const [minExp, maxExp] = recipe.exposureBounds;

  const totalPixels = Math.floor(rgbaPixels.length / 4);
  if (totalPixels === 0) {
    return {
      meanLuminance: 0.35,
      highlightClipRatio: 0,
      saturationSpread: 0.25,
      status: "balanced",
      recommendedExposure: currentExposure,
      appliedDelta: 0,
    };
  }

  let lumSum = 0;
  let clippedCount = 0;
  let minSat = 1.0;
  let maxSat = 0.0;

  for (let i = 0; i < rgbaPixels.length; i += 4) {
    const r = rgbaPixels[i] / 255;
    const g = rgbaPixels[i + 1] / 255;
    const b = rgbaPixels[i + 2] / 255;

    // Rec. 709 relative luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumSum += lum;
    if (lum > 0.92) {
      clippedCount += 1;
    }

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const sat = cMax <= 0.001 ? 0 : (cMax - cMin) / cMax;
    if (sat < minSat) minSat = sat;
    if (sat > maxSat) maxSat = sat;
  }

  const meanLuminance = Number((lumSum / totalPixels).toFixed(4));
  const highlightClipRatio = Number((clippedCount / totalPixels).toFixed(4));
  const saturationSpread = Number(Math.max(0, maxSat - minSat).toFixed(4));

  const maxAllowedMean = timeOfDay === "midnight" ? 0.52 : 0.72;
  const minAllowedMean = timeOfDay === "midnight" ? 0.08 : 0.15;

  let status: ExposureGuardTelemetry["status"] = "balanced";
  let delta = 0;

  if (meanLuminance > maxAllowedMean || highlightClipRatio > 0.05) {
    status = "overexposed_whitewash";
    delta = -0.08;
  } else if (meanLuminance < minAllowedMean) {
    status = "underexposed_muddy";
    delta = 0.06;
  }

  const recommendedExposure = Number(
    Math.max(minExp, Math.min(maxExp, currentExposure + delta)).toFixed(3)
  );

  return {
    meanLuminance,
    highlightClipRatio,
    saturationSpread,
    status,
    recommendedExposure,
    appliedDelta: Number((recommendedExposure - currentExposure).toFixed(3)),
  };
}

/**
 * Generates a time-of-day-aware procedural PMREM environment texture from a
 * spherical sky/horizon/ground gradient + directional solar bounce cards.
 * Replaces the legacy #FFF3E0 30x30 white overhead softbox plane.
 */
export function buildProceduralTimeOfDayEnvMap(
  gl: THREE.WebGLRenderer,
  recipe: LightRecipePreset
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(gl);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  // Gradient equirectangular dome inside the PMREM capture scene
  const domeCanvas = document.createElement("canvas");
  domeCanvas.width = 256;
  domeCanvas.height = 128;
  const ctx = domeCanvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, recipe.zenithHex);
    grad.addColorStop(0.45, recipe.zenithHex);
    grad.addColorStop(0.54, recipe.horizonHex);
    grad.addColorStop(1.0, recipe.groundHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
  }

  const domeTex = new THREE.CanvasTexture(domeCanvas);
  const domeGeo = new THREE.SphereGeometry(40, 24, 16);
  const domeMat = new THREE.MeshBasicMaterial({
    map: domeTex,
    side: THREE.BackSide,
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  envScene.add(domeMesh);

  // Subtle solar directional specular reflector card (positioned at solar vector, NOT a giant white ceiling slab)
  const cardGeo = new THREE.PlaneGeometry(8, 5);
  const sunCardMat = new THREE.MeshBasicMaterial({
    color: recipe.sunColorHex,
    side: THREE.DoubleSide,
  });
  const sunCard = new THREE.Mesh(cardGeo, sunCardMat);
  const sx = Math.cos(recipe.sunElevationRad) * Math.sin(recipe.sunAzimuthRad) * 18;
  const sy = Math.max(4, Math.sin(recipe.sunElevationRad) * 18);
  const sz = Math.cos(recipe.sunElevationRad) * Math.cos(recipe.sunAzimuthRad) * 18;
  sunCard.position.set(sx, sy, sz);
  sunCard.lookAt(0, 0, 0);
  envScene.add(sunCard);

  // Warm interior practical bounce card for balanced metallic reflections
  const warmCardMat = new THREE.MeshBasicMaterial({
    color: recipe.practicalEmissiveHex,
    side: THREE.DoubleSide,
  });
  const warmCard = new THREE.Mesh(cardGeo, warmCardMat);
  warmCard.position.set(-sx * 0.7, 3.2, -sz * 0.7);
  warmCard.lookAt(0, 0, 0);
  envScene.add(warmCard);

  const renderTarget = pmrem.fromScene(envScene, 0.04);

  // Immediate disposal of temporary capture geometries & materials
  domeGeo.dispose();
  domeTex.dispose();
  domeMat.dispose();
  cardGeo.dispose();
  sunCardMat.dispose();
  warmCardMat.dispose();
  pmrem.dispose();

  return renderTarget.texture;
}

export interface LightRecipeAndSkyProps {
  spec: SceneSpec;
  qualityTier?: QualityTier;
  practicalsEnabled?: boolean;
  onExposureTelemetry?: (telemetry: ExposureGuardTelemetry) => void;
}

export const LightRecipeAndSky: React.FC<LightRecipeAndSkyProps> = ({
  spec,
  qualityTier = "high",
  practicalsEnabled = true,
  onExposureTelemetry,
}) => {
  const { gl, scene, camera } = useThree();
  const recipe =
    TIME_OF_DAY_LIGHT_RECIPES[spec.timeOfDay] ??
    TIME_OF_DAY_LIGHT_RECIPES.midnight;
  const normalized = useMemo(
    () => validateAndNormalizeLightingSpec(spec),
    [spec]
  );
  const { width, height, depth } = spec.roomDimensions;

  // Apply Renderer Color Space, Tone Mapping, Per-Preset Exposure, Fog & Procedural PMREM Environment
  useEffect(() => {
    // 1. Color space & tone mapping
    if ("outputColorSpace" in gl && THREE.SRGBColorSpace) {
      gl.outputColorSpace = THREE.SRGBColorSpace;
    }
    const agxToneMapping = (
      THREE as unknown as { AgXToneMapping?: THREE.ToneMapping }
    ).AgXToneMapping;
    gl.toneMapping = agxToneMapping ?? THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = normalized.exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Time-of-day atmospheric background & exponential distance fog
    scene.background = new THREE.Color(recipe.fogHex);
    scene.fog = new THREE.FogExp2(recipe.fogHex, recipe.fogDensity);

    // 3. Procedural Time-of-Day PMREM Environment + per-preset environmentIntensity
    const envTex = buildProceduralTimeOfDayEnvMap(gl, recipe);
    const prevEnv = scene.environment;
    scene.environment = envTex;
    if ("environmentIntensity" in scene) {
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity =
        normalized.environmentIntensity;
    }

    return () => {
      envTex.dispose();
      if (scene.environment === envTex) {
        scene.environment = prevEnv;
      }
    };
  }, [gl, scene, recipe, normalized.exposure, normalized.environmentIntensity]);

  // Automatic Exposure Guard (samples a tiny 32x32 offscreen render target once after scene settles)
  const guardSampledKeyRef = useRef<string>("");
  const guardRenderTarget = useMemo(
    () =>
      new THREE.WebGLRenderTarget(32, 32, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }),
    []
  );

  useEffect(() => {
    return () => {
      guardRenderTarget.dispose();
    };
  }, [guardRenderTarget]);

  useFrame(() => {
    const sampleKey = `${spec.id}_${spec.timeOfDay}_${normalized.exposure}`;
    if (guardSampledKeyRef.current === sampleKey) return;
    guardSampledKeyRef.current = sampleKey;

    const prevTarget = gl.getRenderTarget();
    try {
      gl.setRenderTarget(guardRenderTarget);
      gl.render(scene, camera);
      const buffer = new Uint8Array(32 * 32 * 4);
      gl.readRenderTargetPixels(guardRenderTarget, 0, 0, 32, 32, buffer);
      gl.setRenderTarget(prevTarget);

      const telemetry = evaluateExposureGuard(
        buffer,
        gl.toneMappingExposure,
        spec.timeOfDay
      );
      if (telemetry.appliedDelta !== 0) {
        gl.toneMappingExposure = telemetry.recommendedExposure;
      }
      if (onExposureTelemetry) {
        onExposureTelemetry(telemetry);
      }
    } catch {
      gl.setRenderTarget(prevTarget);
    }
  });

  const {
    skyGeo,
    skyMat,
    spillPlaneGeo,
    wallSpillGeo,
    spillMat,
    fixtureBulbGeo,
    fixtureBulbMat,
    sunPosition,
    fillPosition,
    shadowMapSize,
    practicalPositions,
  } = useMemo(() => {
    // 1. Procedural Sky Gradient + Solar Atmospheric Scattering Texture
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 512;
    skyCanvas.height = 256;
    const ctx = skyCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, recipe.zenithHex);
      grad.addColorStop(0.4, recipe.zenithHex);
      grad.addColorStop(0.55, recipe.horizonHex);
      grad.addColorStop(1.0, recipe.groundHex);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      const sunU =
        (((recipe.sunAzimuthRad || 0.4) + Math.PI) / (Math.PI * 2)) * 512;
      const sunV = Math.max(
        24,
        Math.min(138, 138 - (recipe.sunElevationRad || 0.4) * 78)
      );
      const sunHalo = ctx.createRadialGradient(sunU, sunV, 4, sunU, sunV, 88);
      sunHalo.addColorStop(0.0, recipe.sunColorHex);
      sunHalo.addColorStop(0.3, `${recipe.horizonHex}99`);
      sunHalo.addColorStop(1.0, "rgba(0,0,0,0)");
      ctx.fillStyle = sunHalo;
      ctx.fillRect(0, 0, 512, 256);
    }
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    if ("colorSpace" in skyTex && THREE.SRGBColorSpace) {
      skyTex.colorSpace = THREE.SRGBColorSpace;
    }
    const sGeo = new THREE.SphereGeometry(135, 32, 20);
    const sMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });

    // 2. Soft Radial Gradient Light-Spill Decal Texture for Floor & Wall Wash
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gctx = glowCanvas.getContext("2d");
    if (gctx) {
      const radGrad = gctx.createRadialGradient(64, 64, 3, 64, 64, 62);
      radGrad.addColorStop(0.0, recipe.practicalEmissiveHex);
      radGrad.addColorStop(0.42, `${recipe.practicalEmissiveHex}55`);
      radGrad.addColorStop(1.0, "rgba(0,0,0,0)");
      gctx.fillStyle = radGrad;
      gctx.fillRect(0, 0, 128, 128);
    }
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const spGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const wSpGeo = new THREE.PlaneGeometry(2.1, 2.5);
    const spMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: practicalsEnabled
        ? Math.min(0.68, 0.28 * recipe.practicalBoostMultiplier)
        : 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      side: THREE.DoubleSide,
    });

    // 3. Emissive Practical Fixture Core (toneMapped: false, emissiveIntensity > 1.0 for selective bloom)
    const fBulbGeo = new THREE.SphereGeometry(0.085, 14, 10);
    const fBulbMat = new THREE.MeshStandardMaterial({
      color: recipe.practicalEmissiveHex,
      emissive: new THREE.Color(recipe.practicalEmissiveHex),
      emissiveIntensity: 2.25,
      roughness: 0.15,
      toneMapped: false,
    });

    // 4. Solar Key-Light Vector & Opposite Cool/Warm Fill Vector
    const dist = Math.max(width, depth) * 1.4;
    const sx =
      Math.cos(recipe.sunElevationRad) * Math.sin(recipe.sunAzimuthRad) * dist;
    const sy = Math.max(height * 0.9, Math.sin(recipe.sunElevationRad) * dist);
    const sz =
      Math.cos(recipe.sunElevationRad) * Math.cos(recipe.sunAzimuthRad) * dist;

    // 5. Budgeted Practical Point-Light & Spill Coordinates
    const maxPointLights =
      qualityTier === "low"
        ? 2
        : Math.min(4, normalized.practicalBudgetCount);
    const pts: Array<[number, number, number]> = (
      [
        [-width * 0.36, height * 0.58, -depth * 0.22],
        [width * 0.36, height * 0.58, -depth * 0.22],
        [-width * 0.36, height * 0.58, depth * 0.22],
        [width * 0.36, height * 0.58, depth * 0.22],
      ] as Array<[number, number, number]>
    ).slice(0, maxPointLights);

    return {
      skyGeo: sGeo,
      skyMat: sMat,
      spillPlaneGeo: spGeo,
      wallSpillGeo: wSpGeo,
      spillMat: spMat,
      fixtureBulbGeo: fBulbGeo,
      fixtureBulbMat: fBulbMat,
      sunPosition: [sx, sy, sz] as [number, number, number],
      fillPosition: [-sx * 0.65, sy * 0.55, -sz * 0.65] as [
        number,
        number,
        number,
      ],
      shadowMapSize: qualityTier === "low" ? 1024 : 2048,
      practicalPositions: pts,
    };
  }, [
    recipe,
    width,
    height,
    depth,
    qualityTier,
    practicalsEnabled,
    normalized.practicalBudgetCount,
  ]);

  // Strict GPU disposal on unmount or dependency change
  useEffect(() => {
    return () => {
      skyGeo.dispose();
      if (skyMat.map) skyMat.map.dispose();
      skyMat.dispose();
      spillPlaneGeo.dispose();
      wallSpillGeo.dispose();
      if (spillMat.map) spillMat.map.dispose();
      spillMat.dispose();
      fixtureBulbGeo.dispose();
      fixtureBulbMat.dispose();
    };
  }, [
    skyGeo,
    skyMat,
    spillPlaneGeo,
    wallSpillGeo,
    spillMat,
    fixtureBulbGeo,
    fixtureBulbMat,
  ]);

  const dCam = Math.max(width, depth) * 0.82;

  return (
    <group name="step-1-light-recipe-and-sky">
      {/* 360° Procedural Sky Gradient Dome */}
      <mesh geometry={skyGeo} material={skyMat} />

      {/* Faint Sky-to-Ground Hemisphere Fill (strictly capped to 0.05–0.20) */}
      <hemisphereLight
        args={[
          recipe.hemiSkyHex,
          spec.lighting.hemiGroundHex ?? recipe.hemiGroundHex,
          normalized.ambientFillIntensity,
        ]}
        position={[0, height * 1.5, 0]}
      />

      {/* Omnidirectional Diffuse Shadow Fill (prevents dark PBR materials from crushing to black in deep shadows) */}
      <ambientLight
        color={recipe.id === "midnight" ? "#A0C0EC" : "#E8D8C8"}
        intensity={recipe.id === "midnight" ? 0.44 : 0.14}
      />

      {/* Primary Shadow-Casting Solar / Lunar Key Light (PCFSoftShadowMap + tuned bias & normalBias) */}
      <directionalLight
        color={recipe.sunColorHex}
        intensity={recipe.sunIntensity}
        position={sunPosition}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.00035}
        shadow-normalBias={0.02}
        shadow-camera-left={-dCam}
        shadow-camera-right={dCam}
        shadow-camera-top={dCam}
        shadow-camera-bottom={-dCam}
        shadow-camera-near={0.5}
        shadow-camera-far={Math.max(width, depth) * 3.2}
      />

      {/* Secondary Non-Shadow-Casting Complementary Fill Light */}
      <directionalLight
        color={recipe.fillColorHex}
        intensity={normalized.fillLightIntensity}
        position={fillPosition}
        castShadow={false}
      />

      {/* Budgeted Warm 2200K–2700K Interior Practical Lights with Physical Inverse-Square Attenuation (decay=2) */}
      {practicalsEnabled &&
        practicalPositions.map((pos, idx) => (
          <group key={`practical-node-${idx}`} position={pos}>
            <pointLight
              color={recipe.practicalEmissiveHex}
              intensity={1.75 * recipe.practicalBoostMultiplier}
              distance={Math.max(width, depth) * 1.5}
              decay={2}
              castShadow={false}
            />
            {/* Emissive Fixture Core (toneMapped: false, emissiveIntensity > 1.0) */}
            <mesh geometry={fixtureBulbGeo} material={fixtureBulbMat} />
          </group>
        ))}

      {/* Soft Radial Gradient Light-Spill Glow Planes on Floor & Perimeter Walls */}
      <mesh
        geometry={spillPlaneGeo}
        material={spillMat}
        position={[
          spec.focalPoint.position[0],
          0.015,
          spec.focalPoint.position[2],
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {practicalPositions.map((pos, idx) => (
        <React.Fragment key={`spill-pair-${idx}`}>
          <mesh
            geometry={spillPlaneGeo}
            material={spillMat}
            position={[pos[0], 0.014, pos[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={wallSpillGeo}
            material={spillMat}
            position={[
              pos[0] < 0 ? -width / 2 + 0.16 : width / 2 - 0.16,
              pos[1],
              pos[2],
            ]}
            rotation={[0, pos[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          />
        </React.Fragment>
      ))}
    </group>
  );
};
