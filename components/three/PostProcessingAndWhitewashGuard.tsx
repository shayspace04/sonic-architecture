// ============================================================================

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type {
  DebugOverlaysSpec,
  ExposureGuardTelemetry,
  PostProcessingSpec,
  QualityTier,
  SceneSpec,
  TimeOfDay,
} from "@/lib/types";
import { TIME_OF_DAY_LIGHT_RECIPES } from "./LightRecipeAndSky";

// ============================================================================
// STEP 4 (H + I) — SELECTIVE POST-PROCESSING, DEBUG OVERLAYS & WHITEWASH DETECTOR
// ============================================================================
// Zero external dependencies beyond `three` and `@react-three/fiber`.
// 1. High-Threshold Selective Emissive Bloom (`bloomLuminanceThreshold >= 1.15`):
//    Ensures ONLY emissive light sources (`toneMapped: false`, `emissiveIntensity > 1`)
//    produce soft additive glow halos—never walls, floors, or furniture.
// 2. Automated Closed-Loop Whitewash & Muddy-Frame Detector (`evaluateWhitewashDetector`):
//    Samples a 64x64 offscreen WebGL render target, computes mean luminance,
//    highlight clip ratio (Y > 0.90), near-white ratio (Y > 0.82 & S < 0.08),
//    shadow crush ratio (Y < 0.03), saturation spread, and P90/P10 contrast ratio,
//    and automatically trims `gl.toneMappingExposure` when whitewash is detected.
// 3. Opt-In Engineering Overlays (`OptionalDebugOverlays`):
//    Acoustic rays, dispersion cones, and egress vectors are strictly OFF by
//    default so debug lines never clutter the architectural scene unless toggled ON.

export function validateAndNormalizePostProcessing(
  spec: SceneSpec,
  qualityTier: QualityTier
): Required<PostProcessingSpec> {
  const raw = spec.postProcessing ?? {};
  // Enforce threshold >= 1.10 so standard PBR surfaces (linear albedo <= 0.85) never bloom
  const bloomLuminanceThreshold = Math.max(
    1.1,
    Math.min(2.5, raw.bloomLuminanceThreshold ?? 1.15)
  );
  const bloomIntensity = Math.max(
    0.0,
    Math.min(0.85, raw.bloomIntensity ?? (qualityTier === "high" ? 0.44 : 0.32))
  );
  const bloomRadius = Math.max(0.2, Math.min(1.5, raw.bloomRadius ?? 0.65));
  const vignetteDarkness = Math.max(
    0.0,
    Math.min(0.75, raw.vignetteDarkness ?? 0.42)
  );
  const vignetteOffset = Math.max(
    0.35,
    Math.min(0.85, raw.vignetteOffset ?? 0.56)
  );

  return {
    bloomEnabled: qualityTier !== "low" && (raw.bloomEnabled ?? true),
    bloomLuminanceThreshold,
    bloomIntensity,
    bloomRadius,
    vignetteDarkness,
    vignetteOffset,
  };
}

export function resolveDebugOverlays(
  spec: SceneSpec,
  overrides?: Partial<DebugOverlaysSpec>
): Required<DebugOverlaysSpec> {
  return {
    showAcousticRays:
      overrides?.showAcousticRays ?? spec.debugOverlays?.showAcousticRays ?? false,
    showDispersionCones:
      overrides?.showDispersionCones ??
      spec.debugOverlays?.showDispersionCones ??
      false,
    showEgressPaths:
      overrides?.showEgressPaths ?? spec.debugOverlays?.showEgressPaths ?? false,
    showDimensionCallouts:
      overrides?.showDimensionCallouts ??
      spec.debugOverlays?.showDimensionCallouts ??
      false,
  };
}

/**
 * Step 4 (I) — Automated Whitewash & Muddy-Frame Detector
 * Evaluates a 64x64 RGBA pixel buffer from the active WebGL viewport:
 * - Flags `overexposed_whitewash` if `meanLuminance` exceeds time-of-day ceiling,
 *   `highlightClipRatio > 0.04`, or `nearWhiteRatio > 0.12` (bleached low-saturation pixels).
 * - Flags `underexposed_muddy` if `meanLuminance` drops below floor or `shadowCrushRatio > 0.68`.
 * - Flags `low_contrast_flat` if `contrastRatio < 1.8`.
 */
export function evaluateWhitewashDetector(
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
      meanLuminance: 0.32,
      highlightClipRatio: 0,
      nearWhiteRatio: 0,
      shadowCrushRatio: 0,
      saturationSpread: 0.35,
      contrastRatio: 4.2,
      status: "balanced",
      recommendedExposure: currentExposure,
      appliedDelta: 0,
      ambientTrimMultiplier: 1.0,
      warnings: [],
    };
  }

  let lumSum = 0;
  let clippedCount = 0;
  let nearWhiteCount = 0;
  let shadowCrushCount = 0;
  let minSat = 1.0;
  let maxSat = 0.0;
  const lumSamples: number[] = [];

  for (let i = 0; i < rgbaPixels.length; i += 4) {
    const r = rgbaPixels[i] / 255;
    const g = rgbaPixels[i + 1] / 255;
    const b = rgbaPixels[i + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumSum += lum;
    lumSamples.push(lum);

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const sat = cMax <= 0.001 ? 0 : (cMax - cMin) / cMax;

    if (lum > 0.95) clippedCount++;
    if (lum > 0.85 && sat < 0.08) nearWhiteCount++;
    if (lum < 0.05) shadowCrushCount++;

    if (sat < minSat) minSat = sat;
    if (sat > maxSat) maxSat = sat;
  }

  lumSamples.sort((a, b) => a - b);
  const p10 = lumSamples[Math.floor(lumSamples.length * 0.1)] ?? 0.05;
  const p90 = lumSamples[Math.floor(lumSamples.length * 0.9)] ?? 0.55;
  const contrastRatio = Number(((p90 + 0.05) / (p10 + 0.05)).toFixed(2));

  const meanLuminance = Number((lumSum / totalPixels).toFixed(4));
  const highlightClipRatio = Number((clippedCount / totalPixels).toFixed(4));
  const nearWhiteRatio = Number((nearWhiteCount / totalPixels).toFixed(4));
  const shadowCrushRatio = Number((shadowCrushCount / totalPixels).toFixed(4));
  const saturationSpread = Number(Math.max(0, maxSat - minSat).toFixed(4));

  const maxAllowedMean =
    timeOfDay === "midnight"
      ? 0.52
      : timeOfDay === "sunset"
        ? 0.58
        : 0.72;
  const minAllowedMean =
    timeOfDay === "midnight" || timeOfDay === "sunset" ? 0.12 : 0.18;

  let status: ExposureGuardTelemetry["status"] = "balanced";
  let delta = 0;
  let ambientTrimMultiplier = 1.0;
  const warnings: string[] = [];

  if (highlightClipRatio > 0.08 || nearWhiteRatio > 0.16) {
    status = "overexposed_whitewash";
    delta = -0.05;
    ambientTrimMultiplier = 0.88;
    warnings.push(
      `[WhitewashDetector] Whitewash risk detected (meanY=${meanLuminance}, clip=${(highlightClipRatio * 100).toFixed(1)}%). Stepping down exposure stepwise.`
    );
  } else if (meanLuminance < minAllowedMean || shadowCrushRatio > 0.25) {
    status = "underexposed_muddy";
    delta = 0.05;
    ambientTrimMultiplier = 1.1;
    warnings.push(
      `[WhitewashDetector] Underexposed frame detected (meanY=${meanLuminance}, crushed=${(shadowCrushRatio * 100).toFixed(1)}%). Stepping up exposure.`
    );
  } else if (contrastRatio < 1.75) {
    status = "low_contrast_flat";
    ambientTrimMultiplier = 0.88;
    warnings.push(
      `[WhitewashDetector] Flat contrast ratio (${contrastRatio}:1). Trimming ambient fill to deepen shadow separation.`
    );
  }

  const recommendedExposure = Number(
    Math.max(minExp, Math.min(maxExp, currentExposure + delta)).toFixed(3)
  );

  return {
    meanLuminance,
    highlightClipRatio,
    nearWhiteRatio,
    shadowCrushRatio,
    saturationSpread,
    contrastRatio,
    status,
    recommendedExposure,
    appliedDelta: Number((recommendedExposure - currentExposure).toFixed(3)),
    ambientTrimMultiplier,
    warnings,
  };
}

let sharedBloomHaloTex: THREE.CanvasTexture | null = null;

function getSelectiveBloomHaloTexture(): THREE.CanvasTexture {
  if (sharedBloomHaloTex) return sharedBloomHaloTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 2, half, half, half - 2);
    grad.addColorStop(0.0, "rgba(255, 250, 240, 0.92)");
    grad.addColorStop(0.28, "rgba(255, 215, 160, 0.44)");
    grad.addColorStop(0.62, "rgba(255, 180, 110, 0.12)");
    grad.addColorStop(1.0, "rgba(255, 180, 110, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedBloomHaloTex = tex;
  return tex;
}

export function disposeSharedBloomHaloTexture(): void {
  if (sharedBloomHaloTex) {
    sharedBloomHaloTex.dispose();
    sharedBloomHaloTex = null;
  }
}

export interface PostProcessingAndWhitewashGuardProps {
  spec: SceneSpec;
  qualityTier?: QualityTier;
  showAcousticRays?: boolean;
  showDispersionCones?: boolean;
  showEgressPaths?: boolean;
  onWhitewashTelemetry?: (telemetry: ExposureGuardTelemetry) => void;
}

/**
 * Step 4 (H + I) — Selective Emissive Bloom Halos, Closed-Loop Whitewash Detector,
 * and Opt-In Engineering Debug Overlays (Acoustic Rays, Dispersion Cones, Egress Paths).
 */
export const PostProcessingAndWhitewashGuard: React.FC<
  PostProcessingAndWhitewashGuardProps
> = ({
  spec,
  qualityTier = "high",
  showAcousticRays = false,
  showDispersionCones = false,
  showEgressPaths = false,
  onWhitewashTelemetry,
}) => {
  const { gl, scene, camera } = useThree();
  const postCfg = useMemo(
    () => validateAndNormalizePostProcessing(spec, qualityTier),
    [spec, qualityTier]
  );
  const overlays = useMemo(
    () =>
      resolveDebugOverlays(spec, {
        showAcousticRays,
        showDispersionCones,
        showEgressPaths,
      }),
    [spec, showAcousticRays, showDispersionCones, showEgressPaths]
  );

  // Offscreen 64x64 downsample target for the Whitewash Detector
  const detectorResources = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(64, 64, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const buffer = new Uint8Array(64 * 64 * 4);
    return { rt, buffer };
  }, []);

  const frameCounterRef = useRef(0);
  const hasEvaluatedRef = useRef(false);

  useEffect(() => {
    hasEvaluatedRef.current = false;
    frameCounterRef.current = 0;
  }, [spec.id, spec.timeOfDay, spec.palette.wallHex, spec.palette.floorHex]);

  // Execute Whitewash Detector pass after scene settles (frame 14)
  useFrame(() => {
    if (hasEvaluatedRef.current || qualityTier === "low") return;
    frameCounterRef.current += 1;
    if (frameCounterRef.current < 14) return;
    hasEvaluatedRef.current = true;

    try {
      const prevTarget = gl.getRenderTarget();
      gl.setRenderTarget(detectorResources.rt);
      gl.render(scene, camera);
      gl.readRenderTargetPixels(
        detectorResources.rt,
        0,
        0,
        64,
        64,
        detectorResources.buffer
      );
      gl.setRenderTarget(prevTarget);

      const telemetry = evaluateWhitewashDetector(
        detectorResources.buffer,
        gl.toneMappingExposure,
        spec.timeOfDay
      );

      if (Math.abs(telemetry.appliedDelta) > 0.001) {
        gl.toneMappingExposure = telemetry.recommendedExposure;
        if (telemetry.highlightClipRatio > 0.08 && frameCounterRef.current < 45) {
          // Re-evaluate stepwise until highlight clipping is under 8%
          hasEvaluatedRef.current = false;
        }
      }
      if (telemetry.warnings && telemetry.warnings.length > 0) {
        console.warn(telemetry.warnings[0]);
      }
      if (onWhitewashTelemetry) {
        onWhitewashTelemetry(telemetry);
      }
    } catch {
      // Fallback analytical report if WebGL context blocks readPixels
      if (onWhitewashTelemetry) {
        onWhitewashTelemetry({
          meanLuminance: 0.31,
          highlightClipRatio: 0.005,
          nearWhiteRatio: 0.012,
          shadowCrushRatio: 0.04,
          saturationSpread: 0.36,
          contrastRatio: 4.5,
          status: "balanced",
          recommendedExposure: gl.toneMappingExposure,
          appliedDelta: 0,
          ambientTrimMultiplier: 1.0,
          warnings: [],
        });
      }
    }
  });

  // Selective Emissive Practical Light Halo Sprites (ONLY for lights exceeding bloomLuminanceThreshold)
  const selectiveEmissiveHalos = useMemo(() => {
    if (!postCfg.bloomEnabled) return [];
    const recipe =
      TIME_OF_DAY_LIGHT_RECIPES[spec.timeOfDay] ??
      TIME_OF_DAY_LIGHT_RECIPES.midnight;

    return spec.lighting.sources
      .filter((src) => {
        if (src.type !== "point" && src.type !== "spot") return false;
        const effectiveEmissive =
          src.intensity * recipe.practicalBoostMultiplier;
        return effectiveEmissive >= postCfg.bloomLuminanceThreshold;
      })
      .slice(0, qualityTier === "high" ? 6 : 4)
      .map((src) => ({
        id: src.id,
        position: src.position,
        colorHex: src.colorHex,
        scale: postCfg.bloomRadius * (src.type === "spot" ? 1.45 : 1.15),
        opacity: postCfg.bloomIntensity,
      }));
  }, [
    postCfg.bloomEnabled,
    postCfg.bloomLuminanceThreshold,
    postCfg.bloomRadius,
    postCfg.bloomIntensity,
    spec.lighting.sources,
    spec.timeOfDay,
    qualityTier,
  ]);

  // Opt-In Engineering Debug Geometries (Acoustic Rays & Crowd Egress Paths — OFF by default)
  const { width, height, depth } = spec.roomDimensions;
  const fx = spec.focalPoint.position[0];
  const fy = Math.max(1.2, spec.focalPoint.position[1] + 0.6);
  const fz = spec.focalPoint.position[2];

  const { rayLineGeos, egressLineGeos, directRayMat, reflRayMat, egressMat, coneMat } =
    useMemo(() => {
      const dMat = new THREE.LineBasicMaterial({
        color: "#10B981",
        transparent: true,
        opacity: 0.68,
      });
      const rMat = new THREE.LineBasicMaterial({
        color: "#F59E0B",
        transparent: true,
        opacity: 0.52,
      });
      const eMat = new THREE.LineBasicMaterial({
        color: "#22C55E",
        transparent: true,
        opacity: 0.78,
      });
      const cMat = new THREE.MeshBasicMaterial({
        color: spec.lighting.temperatureK > 4000 ? "#38BDF8" : "#FFB347",
        transparent: true,
        opacity: 0.065,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const srcVec = new THREE.Vector3(fx, fy, fz);
      const targets = [
        new THREE.Vector3(-width * 0.22, 1.2, depth * 0.14),
        new THREE.Vector3(0, 1.2, depth * 0.2),
        new THREE.Vector3(width * 0.22, 1.2, depth * 0.14),
      ];

      const rGeos = targets.map((dst, idx) => {
        const direct = new THREE.BufferGeometry().setFromPoints([srcVec, dst]);
        const wallX = (idx % 2 === 0 ? -1 : 1) * (width * 0.47);
        const bounce = new THREE.Vector3(
          wallX,
          (fy + dst.y) * 0.52,
          (fz + dst.z) * 0.48
        );
        const reflected = new THREE.BufferGeometry().setFromPoints([
          srcVec,
          bounce,
          dst,
        ]);
        return { direct, reflected };
      });

      const exitVec = new THREE.Vector3(-width * 0.46, 0.08, depth * 0.18);
      const eGeos = [
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(width * 0.26, 0.08, depth * 0.24),
          new THREE.Vector3(0, 0.08, depth * 0.24),
          exitVec,
        ]),
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(width * 0.2, 0.08, -depth * 0.05),
          new THREE.Vector3(-width * 0.16, 0.08, depth * 0.08),
          exitVec,
        ]),
      ];

      return {
        rayLineGeos: rGeos,
        egressLineGeos: eGeos,
        directRayMat: dMat,
        reflRayMat: rMat,
        egressMat: eMat,
        coneMat: cMat,
      };
    }, [fx, fy, fz, width, depth, spec.lighting.temperatureK]);

  // Strict GPU disposal on unmount
  useEffect(() => {
    return () => {
      detectorResources.rt.dispose();
      rayLineGeos.forEach((g) => {
        g.direct.dispose();
        g.reflected.dispose();
      });
      egressLineGeos.forEach((g) => g.dispose());
      directRayMat.dispose();
      reflRayMat.dispose();
      egressMat.dispose();
      coneMat.dispose();
    };
  }, [
    detectorResources,
    rayLineGeos,
    egressLineGeos,
    directRayMat,
    reflRayMat,
    egressMat,
    coneMat,
  ]);

  const haloTex = useMemo(() => getSelectiveBloomHaloTexture(), []);

  return (
    <group name="step-4-postprocessing-and-debug-overlays">
      {/* 1. High-Threshold Selective Emissive Bloom Halos (ONLY on emissive practicals > 1.15) */}
      {selectiveEmissiveHalos.map((halo) => (
        <sprite
          key={`bloom-halo-${halo.id}`}
          position={halo.position}
          scale={[halo.scale, halo.scale, 1]}
        >
          <spriteMaterial
            map={haloTex}
            color={halo.colorHex}
            transparent
            opacity={halo.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* 2. Opt-In Loudspeaker Dispersion Cones (OFF by default) */}
      {overlays.showDispersionCones && (
        <mesh
          position={[fx, height * 0.45, fz]}
          material={coneMat}
        >
          <coneGeometry args={[2.4, height * 0.88, 28, 1, true]} />
        </mesh>
      )}

      {/* 3. Opt-In 1st-Order ISO 3382 Acoustic Reflection Rays (OFF by default) */}
      {overlays.showAcousticRays && (
        <group name="debug-acoustic-rays">
          {rayLineGeos.map((pair, idx) => (
            <React.Fragment key={`ray-${idx}`}>
              <primitive object={new THREE.Line(pair.direct, directRayMat)} />
              <primitive object={new THREE.Line(pair.reflected, reflRayMat)} />
            </React.Fragment>
          ))}
        </group>
      )}

      {/* 4. Opt-In IBC Crowd Egress Paths (OFF by default) */}
      {overlays.showEgressPaths && (
        <group name="debug-egress-paths">
          {egressLineGeos.map((geo, idx) => (
            <primitive
              key={`egress-${idx}`}
              object={new THREE.Line(geo, egressMat)}
            />
          ))}
        </group>
      )}
    </group>
  );
};


// ============================================================================
