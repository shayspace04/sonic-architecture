"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneSpec } from "@/lib/types";
import { TIME_OF_DAY_LIGHT_RECIPES } from "./LightRecipeAndSky";
import { getContactShadowTexture } from "./ArchitecturalKit";

// ============================================================================
// STEP 3 (F + G) — 3D DISPLACED TERRAIN, ANIMATED WATER & INSTANCED ORGANIC TREES
// ============================================================================
// Upgrades AtmosphereAndSetting from a flat 2D RingGeometry to:
// 1. A 3D vertex-displaced terrain ring (`buildDisplacedTerrainRingGeometry`)
//    that stays flush with the architectural plinth at `innerRadius` and rises
//    into rolling hills, dunes, or coastal bluffs outward.
// 2. Reflective coastal/valley water (`MeshPhysicalMaterial`) with an animated
//    procedural tangent-space water-ripple normal map (`createWaterRippleNormalMap`).
// 3. Multi-part Instanced Exterior Organic Trees (tapered trunk + 3 layered
//    asymmetric foliage crowns + ground AO contact shadow decals)—replacing
//    single-cone/blob trees.
// 4. 3 concentric horizon ridge/mesa/skyline silhouette rings + drifting ground mist.
// Full GPU resource `.dispose()` on unmount.

export type ArchitecturalSetting = SceneSettingBackdrop;

export type SceneSettingBackdrop =
  | "valley"
  | "desert"
  | "coast"
  | "city"
  | "garden"
  | "interior-only";

export interface AtmosphereSettingConfig {
  setting: SceneSettingBackdrop;
  groundHex: string;
  ridgeBaseHex: [string, string, string];
  fogDensityMultiplier: number;
  hasReflectiveWater: boolean;
  waterColorHex: string;
  mistOpacityMultiplier: number;
  exteriorTreeCount: number;
  canopyPaletteHex: [string, string, string];
}

export const SETTING_BACKDROP_CONFIGS: Record<
  SceneSettingBackdrop,
  AtmosphereSettingConfig
> = {
  valley: {
    setting: "valley",
    groundHex: "#1E2923",
    ridgeBaseHex: ["#1F3028", "#2B4238", "#3D594E"],
    fogDensityMultiplier: 1.0,
    hasReflectiveWater: true,
    waterColorHex: "#153243",
    mistOpacityMultiplier: 1.25,
    exteriorTreeCount: 28,
    canopyPaletteHex: ["#2E4631", "#3D5A3D", "#4F6D4A"],
  },
  garden: {
    setting: "garden",
    groundHex: "#212D24",
    ridgeBaseHex: ["#22352A", "#2F4739", "#425E4E"],
    fogDensityMultiplier: 0.92,
    hasReflectiveWater: true,
    waterColorHex: "#173847",
    mistOpacityMultiplier: 1.15,
    exteriorTreeCount: 36,
    canopyPaletteHex: ["#334F36", "#466443", "#5A7852"],
  },
  desert: {
    setting: "desert",
    groundHex: "#5C4033",
    ridgeBaseHex: ["#5A3828", "#784B37", "#96644C"],
    fogDensityMultiplier: 0.85,
    hasReflectiveWater: false,
    waterColorHex: "#1E293B",
    mistOpacityMultiplier: 0.65,
    exteriorTreeCount: 10,
    canopyPaletteHex: ["#4B5338", "#5E6445", "#707553"],
  },
  coast: {
    setting: "coast",
    groundHex: "#1E2631",
    ridgeBaseHex: ["#1C2D3D", "#294056", "#3D5873"],
    fogDensityMultiplier: 0.9,
    hasReflectiveWater: true,
    waterColorHex: "#123552",
    mistOpacityMultiplier: 1.15,
    exteriorTreeCount: 20,
    canopyPaletteHex: ["#354B3E", "#465F4E", "#5B7461"],
  },
  city: {
    setting: "city",
    groundHex: "#14171E",
    ridgeBaseHex: ["#161B24", "#222A38", "#323D52"],
    fogDensityMultiplier: 1.05,
    hasReflectiveWater: false,
    waterColorHex: "#0F172A",
    mistOpacityMultiplier: 0.8,
    exteriorTreeCount: 8,
    canopyPaletteHex: ["#2B3D34", "#384E43", "#486155"],
  },
  "interior-only": {
    setting: "interior-only",
    groundHex: "#0E1014",
    ridgeBaseHex: ["#0E1014", "#0E1014", "#0E1014"],
    fogDensityMultiplier: 1.35,
    hasReflectiveWater: false,
    waterColorHex: "#0E1014",
    mistOpacityMultiplier: 0.0,
    exteriorTreeCount: 0,
    canopyPaletteHex: ["#2E4631", "#3D5A3D", "#4F6D4A"],
  },
};

export function resolveSceneSetting(spec: SceneSpec): SceneSettingBackdrop {
  const explicit = spec.setting;
  if (
    explicit === "valley" ||
    explicit === "desert" ||
    explicit === "coast" ||
    explicit === "city" ||
    explicit === "garden" ||
    explicit === "interior-only"
  ) {
    return explicit;
  }
  const lower = (spec.promptText || "").toLowerCase();
  if (
    lower.includes("interior-only") ||
    lower.includes("underground") ||
    lower.includes("basement")
  ) {
    return "interior-only";
  }
  if (
    lower.includes("desert") ||
    lower.includes("canyon") ||
    lower.includes("mesa") ||
    lower.includes("sandstone")
  ) {
    return "desert";
  }
  if (
    lower.includes("coast") ||
    lower.includes("ocean") ||
    lower.includes("sea") ||
    lower.includes("mediterranean")
  ) {
    return "coast";
  }
  if (
    lower.includes("garden") ||
    lower.includes("mandap") ||
    lower.includes("courtyard") ||
    lower.includes("botanical")
  ) {
    return "garden";
  }
  if (
    lower.includes("city") ||
    lower.includes("urban") ||
    lower.includes("skyline") ||
    lower.includes("loft") ||
    lower.includes("runway")
  ) {
    return "city";
  }
  return "valley";
}

/**
 * Evaluates deterministic multi-octave terrain elevation at world (x, z)
 * so both the 3D terrain mesh and instanced exterior trees share the exact
 * same ground height.
 */
export function sampleTerrainElevation(
  x: number,
  z: number,
  innerSafeRadius: number,
  outerRadius: number,
  setting: SceneSettingBackdrop,
  reliefAmplitude: number
): number {
  const r = Math.sqrt(x * x + z * z);
  if (r <= innerSafeRadius * 1.08) return 0;

  const t = Math.min(
    1,
    Math.max(0, (r - innerSafeRadius * 1.08) / (outerRadius * 0.55))
  );
  const smoothBlend = t * t * (3 - 2 * t);
  const angle = Math.atan2(z, x);

  if (setting === "city") {
    return smoothBlend * 0.35 * Math.sin(x * 0.06) * Math.cos(z * 0.06);
  }
  if (setting === "desert") {
    // Wind-carved desert dunes and stepped sandstone ledges
    const dune =
      Math.sin(x * 0.045 + Math.cos(z * 0.035) * 1.6) * 0.65 +
      Math.cos(z * 0.08 - angle * 2.0) * 0.35;
    return smoothBlend * reliefAmplitude * 0.85 * Math.max(-0.2, dune);
  }
  if (setting === "coast") {
    // Coastal bluff on one side (+X/Z), gentle shoreline basin on the other
    const bluff = Math.sin(angle * 1.5 + 0.6) * 0.7 + Math.cos(r * 0.07) * 0.3;
    return smoothBlend * reliefAmplitude * 0.75 * Math.max(-0.15, bluff);
  }

  // Rolling botanical / valley hills
  const hill =
    Math.sin(x * 0.05 + 0.4) * Math.cos(z * 0.045 - 0.3) * 0.58 +
    Math.sin((x + z) * 0.08) * 0.28 +
    Math.cos(angle * 4.0) * 0.14;
  return smoothBlend * reliefAmplitude * Math.max(-0.12, hill);
}

/**
 * Builds a 3D vertex-displaced annular terrain geometry in the XZ plane
 * with smooth radial subdivisions and recomputed vertex normals.
 */
function buildDisplacedTerrainRingGeometry(
  innerRadius: number,
  outerRadius: number,
  radialSegments: number,
  thetaSegments: number,
  setting: SceneSettingBackdrop,
  reliefAmplitude: number
): THREE.BufferGeometry {
  const geo = new THREE.RingGeometry(
    innerRadius,
    outerRadius,
    thetaSegments,
    radialSegments
  );
  // Rotate from XY into XZ horizontal plane so Y is vertical elevation
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const elev = sampleTerrainElevation(
      vx,
      vz,
      innerRadius,
      outerRadius,
      setting,
      reliefAmplitude
    );
    posAttr.setY(i, elev);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a tileable 256x256 tangent-space normal map for gentle coastal/valley water ripples.
 */
function createWaterRippleNormalMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;
        const dx =
          Math.cos(u * 4 + Math.sin(v * 3)) * 0.45 +
          Math.cos(u * 9 - v * 6) * 0.25;
        const dy =
          Math.sin(v * 5 + Math.cos(u * 4)) * 0.45 +
          Math.sin(v * 8 + u * 5) * 0.25;
        const nx = Math.max(0, Math.min(255, Math.round((dx * 0.35 + 0.5) * 255)));
        const ny = Math.max(0, Math.min(255, Math.round((dy * 0.35 + 0.5) * 255)));
        const idx = (y * size + x) * 4;
        data[idx] = nx;
        data[idx + 1] = ny;
        data[idx + 2] = 248;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.needsUpdate = true;
  return tex;
}

function buildRidgeCylinderGeometry(
  radius: number,
  height: number,
  radialSegments: number,
  setting: SceneSettingBackdrop,
  layerIdx: number
): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    radialSegments,
    1,
    true
  );
  const posAttr = geo.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const vy = posAttr.getY(i);
    if (vy > 0) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const angle = Math.atan2(vz, vx);
      let hProfile = 0;

      if (setting === "city") {
        const block = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 32);
        const towerSeed = (block * 23 + layerIdx * 11) % 13;
        hProfile = towerSeed * (1.35 + layerIdx * 0.45);
      } else if (setting === "desert") {
        const raw =
          Math.sin(angle * 4 + layerIdx) + Math.cos(angle * 7 - layerIdx);
        hProfile =
          Math.max(-3.5, Math.min(4.2, raw * 4.0)) * (1.25 + layerIdx * 0.42);
      } else if (setting === "coast") {
        const headland = Math.sin(angle * 2.0 + layerIdx * 0.5);
        hProfile =
          headland > -0.15
            ? (headland * 5.2 + Math.cos(angle * 8) * 1.4) *
              (1.0 + layerIdx * 0.3)
            : -3.6;
      } else {
        hProfile =
          (Math.sin(angle * 5 + layerIdx * 1.3) * 4.4 +
            Math.cos(angle * 9 - layerIdx) * 2.5 +
            Math.sin(angle * 15) * 1.1) *
          (1.0 + layerIdx * 0.36);
      }
      posAttr.setY(i, Math.max(0.4, 4.5 + hProfile));
    } else {
      posAttr.setY(i, -0.4);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

export interface AtmosphereAndSettingProps {
  spec: SceneSpec;
  qualityTier?: "low" | "medium" | "high";
}

export const AtmosphereAndSetting: React.FC<AtmosphereAndSettingProps> = ({
  spec,
  qualityTier = "high",
}) => {
  const { scene } = useThree();
  const mistGroupRef = useRef<THREE.Group>(null);
  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const lowerCanopyInstRef = useRef<THREE.InstancedMesh>(null);
  const midCanopyInstRef = useRef<THREE.InstancedMesh>(null);
  const upperCanopyInstRef = useRef<THREE.InstancedMesh>(null);
  const shadowInstRef = useRef<THREE.InstancedMesh>(null);

  const setting = resolveSceneSetting(spec);
  const settingCfg = SETTING_BACKDROP_CONFIGS[setting];
  const lightRecipe =
    TIME_OF_DAY_LIGHT_RECIPES[spec.timeOfDay] ??
    TIME_OF_DAY_LIGHT_RECIPES.midnight;

  const { width, depth } = spec.roomDimensions;
  const baseRadius = Math.max(width, depth) * 1.45;
  const terrainRelief = spec.terrainReliefMeters ?? 3.8;
  const foliageDensity = spec.foliageDensityMultiplier ?? 1.0;

  // Synchronize scene background & exponential-squared fog
  useEffect(() => {
    const fogColor = new THREE.Color(lightRecipe.fogHex);
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(
      lightRecipe.fogHex,
      lightRecipe.fogDensity * settingCfg.fogDensityMultiplier
    );
  }, [
    scene,
    lightRecipe.fogHex,
    lightRecipe.fogDensity,
    settingCfg.fogDensityMultiplier,
  ]);

  const {
    outerGroundGeo,
    outerGroundMat,
    waterRingGeo,
    waterRingMat,
    waterNormalTex,
    ridgeLayers,
    mistPlaneGeo,
    mistMat,
    mistConfigs,
    trunkGeo,
    trunkMat,
    canopyGeo,
    lowerCanopyMat,
    midCanopyMat,
    upperCanopyMat,
    treeShadowGeo,
    treeShadowMat,
    treeTransforms,
  } = useMemo(() => {
    const fogCol = new THREE.Color(lightRecipe.fogHex);

    // 1. 3D Vertex-Displaced Exterior Terrain Ring
    const radialSegs = qualityTier === "low" ? 16 : 28;
    const thetaSegs = qualityTier === "low" ? 40 : 72;
    const gGeo = buildDisplacedTerrainRingGeometry(
      baseRadius * 0.56,
      118,
      radialSegs,
      thetaSegs,
      setting,
      terrainRelief
    );
    const gMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(settingCfg.groundHex).lerp(fogCol, 0.16),
      roughness: 0.9,
      metalness: 0.02,
    });

    // 2. Reflective Water Plane with Animated Normal Map
    const wGeo = new THREE.RingGeometry(
      baseRadius * 0.58,
      baseRadius * 2.35,
      64
    );
    const wNorm = createWaterRippleNormalMap();
    const wMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(
        spec.timeOfDay === "sunset" ? "#3B2838" : settingCfg.waterColorHex
      ).lerp(fogCol, 0.2),
      normalMap: wNorm,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.07,
      metalness: 0.62,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.55,
    });

    // 3. Three Concentric Horizon Ridge / Skyline Silhouette Rings
    const radii = [baseRadius * 1.65, baseRadius * 2.55, baseRadius * 3.65];
    const fogBlendWeights = [0.24, 0.54, 0.82];
    const ridgeSegs =
      qualityTier === "low" ? 36 : setting === "city" ? 48 : 64;

    const layers = radii.map((rad, idx) => {
      const rGeo = buildRidgeCylinderGeometry(
        rad,
        18 + idx * 9,
        ridgeSegs,
        setting,
        idx
      );
      const blendedColor = new THREE.Color(settingCfg.ridgeBaseHex[idx]).lerp(
        fogCol,
        fogBlendWeights[idx]
      );
      const rMat = new THREE.MeshBasicMaterial({
        color: blendedColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9 - idx * 0.18,
      });
      return { geo: rGeo, mat: rMat };
    });

    // 4. Low Ground-Mist Radial Texture & Drifting Planes
    const mistCanvas = document.createElement("canvas");
    mistCanvas.width = 128;
    mistCanvas.height = 128;
    const mctx = mistCanvas.getContext("2d");
    if (mctx) {
      const g = mctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0.0, "rgba(226, 232, 240, 0.85)");
      g.addColorStop(0.5, "rgba(226, 232, 240, 0.32)");
      g.addColorStop(1.0, "rgba(226, 232, 240, 0.0)");
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, 128, 128);
    }
    const mistTex = new THREE.CanvasTexture(mistCanvas);
    const mGeo = new THREE.PlaneGeometry(baseRadius * 0.92, baseRadius * 0.92);
    const baseMistOpacity =
      spec.timeOfDay === "morning" || spec.timeOfDay === "midnight"
        ? 0.22
        : 0.12;
    const mMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      color: fogCol.clone().lerp(new THREE.Color("#FFFFFF"), 0.35),
      transparent: true,
      opacity: baseMistOpacity * settingCfg.mistOpacityMultiplier,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mistCount = qualityTier === "low" ? 4 : 8;
    const mConfigs = Array.from({ length: mistCount }, (_, i) => {
      const ang = (i / mistCount) * Math.PI * 2;
      const dist = baseRadius * (0.85 + (i % 3) * 0.28);
      return {
        baseX: Math.cos(ang) * dist,
        y: 0.14 + (i % 3) * 0.22,
        baseZ: Math.sin(ang) * dist,
        phase: i * 1.15,
      };
    });

    // 5. Multi-Tier Instanced Exterior Organic Trees (Trunk + 3 Asymmetric Canopy Pads + Contact Shadow)
    const rawTreeCount = Math.round(
      settingCfg.exteriorTreeCount *
        foliageDensity *
        (qualityTier === "low" ? 0.5 : 1.0)
    );
    const tGeo = new THREE.CylinderGeometry(0.11, 0.24, 1.9, 8);
    const tMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3D2E22").lerp(fogCol, 0.15),
      roughness: 0.88,
      metalness: 0.02,
    });

    // Flattened organic crown geometry instead of a cone or sphere
    const cGeo = new THREE.IcosahedronGeometry(1.0, 2);
    cGeo.scale(1.35, 0.62, 1.22);

    const lowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(settingCfg.canopyPaletteHex[0]).lerp(fogCol, 0.18),
      roughness: 0.82,
      metalness: 0.02,
    });
    const midMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(settingCfg.canopyPaletteHex[1]).lerp(fogCol, 0.18),
      roughness: 0.78,
      metalness: 0.02,
    });
    const upMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(settingCfg.canopyPaletteHex[2]).lerp(fogCol, 0.18),
      roughness: 0.75,
      metalness: 0.02,
    });

    const sGeo = new THREE.PlaneGeometry(3.4, 3.4);
    sGeo.rotateX(-Math.PI / 2);
    const sMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const transforms: {
      x: number;
      y: number;
      z: number;
      scale: number;
      rotY: number;
    }[] = [];

    for (let i = 0; i < rawTreeCount; i++) {
      const goldenAngle = i * 2.3999632 + 0.45;
      const radialFrac = (i + 0.5) / Math.max(1, rawTreeCount);
      const dist = baseRadius * (0.72 + radialFrac * 1.45);
      const tx = Math.cos(goldenAngle) * dist;
      const tz = Math.sin(goldenAngle) * dist;
      const ty =
        sampleTerrainElevation(
          tx,
          tz,
          baseRadius * 0.56,
          118,
          setting,
          terrainRelief
        ) - 0.24;
      const sc = 0.82 + ((i * 17) % 9) * 0.09;
      transforms.push({
        x: tx,
        y: ty,
        z: tz,
        scale: sc,
        rotY: (i * 1.7) % (Math.PI * 2),
      });
    }

    return {
      outerGroundGeo: gGeo,
      outerGroundMat: gMat,
      waterRingGeo: wGeo,
      waterRingMat: wMat,
      waterNormalTex: wNorm,
      ridgeLayers: layers,
      mistPlaneGeo: mGeo,
      mistMat: mMat,
      mistConfigs: mConfigs,
      trunkGeo: tGeo,
      trunkMat: tMat,
      canopyGeo: cGeo,
      lowerCanopyMat: lowMat,
      midCanopyMat: midMat,
      upperCanopyMat: upMat,
      treeShadowGeo: sGeo,
      treeShadowMat: sMat,
      treeTransforms: transforms,
    };
  }, [
    baseRadius,
    lightRecipe.fogHex,
    setting,
    settingCfg,
    spec.timeOfDay,
    qualityTier,
    terrainRelief,
    foliageDensity,
  ]);

  // Populate InstancedMesh matrices for exterior multi-crown organic trees
  useEffect(() => {
    if (
      !trunkInstRef.current ||
      !lowerCanopyInstRef.current ||
      !midCanopyInstRef.current ||
      !upperCanopyInstRef.current ||
      !shadowInstRef.current
    ) {
      return;
    }
    const dummy = new THREE.Object3D();

    treeTransforms.forEach((tr, idx) => {
      // Ground AO Contact Shadow Decal
      dummy.position.set(tr.x, tr.y + 0.02, tr.z);
      dummy.rotation.set(0, tr.rotY, 0);
      dummy.scale.set(tr.scale, 1, tr.scale);
      dummy.updateMatrix();
      shadowInstRef.current!.setMatrixAt(idx, dummy.matrix);

      // Tapered Gnarled Trunk
      dummy.position.set(tr.x, tr.y + 0.9 * tr.scale, tr.z);
      dummy.rotation.set(0.05, tr.rotY, -0.04);
      dummy.scale.set(tr.scale, tr.scale, tr.scale);
      dummy.updateMatrix();
      trunkInstRef.current!.setMatrixAt(idx, dummy.matrix);

      // Lower Asymmetric Foliage Pad
      dummy.position.set(
        tr.x - 0.28 * tr.scale,
        tr.y + 1.75 * tr.scale,
        tr.z + 0.18 * tr.scale
      );
      dummy.rotation.set(0.08, tr.rotY + 0.5, -0.06);
      dummy.scale.set(tr.scale * 1.05, tr.scale * 0.95, tr.scale * 1.02);
      dummy.updateMatrix();
      lowerCanopyInstRef.current!.setMatrixAt(idx, dummy.matrix);

      // Mid Asymmetric Foliage Pad
      dummy.position.set(
        tr.x + 0.32 * tr.scale,
        tr.y + 2.15 * tr.scale,
        tr.z - 0.22 * tr.scale
      );
      dummy.rotation.set(-0.06, tr.rotY + 1.4, 0.07);
      dummy.scale.set(tr.scale * 0.92, tr.scale * 0.88, tr.scale * 0.95);
      dummy.updateMatrix();
      midCanopyInstRef.current!.setMatrixAt(idx, dummy.matrix);

      // Upper Crown Foliage Pad
      dummy.position.set(
        tr.x + 0.05 * tr.scale,
        tr.y + 2.58 * tr.scale,
        tr.z + 0.06 * tr.scale
      );
      dummy.rotation.set(0.04, tr.rotY + 2.3, -0.04);
      dummy.scale.set(tr.scale * 0.74, tr.scale * 0.78, tr.scale * 0.74);
      dummy.updateMatrix();
      upperCanopyInstRef.current!.setMatrixAt(idx, dummy.matrix);
    });

    shadowInstRef.current.instanceMatrix.needsUpdate = true;
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    lowerCanopyInstRef.current.instanceMatrix.needsUpdate = true;
    midCanopyInstRef.current.instanceMatrix.needsUpdate = true;
    upperCanopyInstRef.current.instanceMatrix.needsUpdate = true;
  }, [treeTransforms]);

  // Animate drifting ground-mist planes + subtle water ripple normal offset
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mistGroupRef.current) {
      mistGroupRef.current.children.forEach((child, idx) => {
        const cfg = mistConfigs[idx];
        if (!cfg) return;
        child.position.x = cfg.baseX + Math.sin(t * 0.32 + cfg.phase) * 1.45;
        child.position.z = cfg.baseZ + Math.cos(t * 0.26 + cfg.phase) * 1.15;
      });
    }
    if (settingCfg.hasReflectiveWater) {
      waterNormalTex.offset.set(t * 0.018, t * 0.012);
    }
  });

  // Strict GPU disposal on unmount
  useEffect(() => {
    return () => {
      outerGroundGeo.dispose();
      outerGroundMat.dispose();
      waterRingGeo.dispose();
      waterNormalTex.dispose();
      waterRingMat.dispose();
      ridgeLayers.forEach((layer) => {
        layer.geo.dispose();
        layer.mat.dispose();
      });
      mistPlaneGeo.dispose();
      if (mistMat.map) mistMat.map.dispose();
      mistMat.dispose();
      trunkGeo.dispose();
      trunkMat.dispose();
      canopyGeo.dispose();
      lowerCanopyMat.dispose();
      midCanopyMat.dispose();
      upperCanopyMat.dispose();
      treeShadowGeo.dispose();
      treeShadowMat.dispose();
    };
  }, [
    outerGroundGeo,
    outerGroundMat,
    waterRingGeo,
    waterNormalTex,
    waterRingMat,
    ridgeLayers,
    mistPlaneGeo,
    mistMat,
    trunkGeo,
    trunkMat,
    canopyGeo,
    lowerCanopyMat,
    midCanopyMat,
    upperCanopyMat,
    treeShadowGeo,
    treeShadowMat,
  ]);

  if (setting === "interior-only") {
    return null;
  }

  return (
    <group name="step-3-atmosphere-terrain-and-foliage">
      {/* 1. 3D Vertex-Displaced Exterior Terrain Ground Mesh */}
      <mesh
        geometry={outerGroundGeo}
        material={outerGroundMat}
        position={[0, -0.24, 0]}
        receiveShadow
      />

      {/* 2. Optional Reflective Coastal / Valley Water Plane with Animated Ripple Normal Map */}
      {settingCfg.hasReflectiveWater && (
        <mesh
          geometry={waterRingGeo}
          material={waterRingMat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.14, 0]}
        />
      )}

      {/* 3. Multi-Crown Instanced Exterior Organic Trees + Ground Contact Shadows */}
      {treeTransforms.length > 0 && (
        <group name="exterior-instanced-organic-trees">
          <instancedMesh
            ref={shadowInstRef}
            args={[treeShadowGeo, treeShadowMat, treeTransforms.length]}
          />
          <instancedMesh
            ref={trunkInstRef}
            args={[trunkGeo, trunkMat, treeTransforms.length]}
            castShadow
            receiveShadow
          />
          <instancedMesh
            ref={lowerCanopyInstRef}
            args={[canopyGeo, lowerCanopyMat, treeTransforms.length]}
            castShadow
            receiveShadow
          />
          <instancedMesh
            ref={midCanopyInstRef}
            args={[canopyGeo, midCanopyMat, treeTransforms.length]}
            castShadow
            receiveShadow
          />
          <instancedMesh
            ref={upperCanopyInstRef}
            args={[canopyGeo, upperCanopyMat, treeTransforms.length]}
            castShadow
            receiveShadow
          />
        </group>
      )}

      {/* 4. Three Concentric Fog-Blended Ridge / Mesa / Coastal / Skyline Silhouette Rings */}
      {ridgeLayers.map((layer, idx) => (
        <mesh
          key={`ridge-silhouette-${idx}`}
          geometry={layer.geo}
          material={layer.mat}
        />
      ))}

      {/* 5. Drifting Low Ground-Mist Planes */}
      <group ref={mistGroupRef}>
        {mistConfigs.map((cfg, idx) => (
          <mesh
            key={`ground-mist-${idx}`}
            geometry={mistPlaneGeo}
            material={mistMat}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cfg.baseX, cfg.y, cfg.baseZ]}
          />
        ))}
      </group>
    </group>
  );
};
