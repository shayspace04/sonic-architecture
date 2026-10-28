// lib/materials.ts
// Sonic Architecture - Photographic PBR Material Library with Poly Haven CC0 Textures
import * as THREE from "three";
import { SceneSpec } from "./types";
import {
  ArchitecturalMaterialId,
  buildProceduralPhysicalMaterial,
} from "@/components/three/ProceduralMaterials";

export type SemanticMaterialName =
  | "raw_concrete"
  | "polished_concrete"
  | "board_formed_concrete"
  | "dark_wood"
  | "light_oak"
  | "plaster"
  | "brick"
  | "terrazzo"
  | "brushed_metal"
  | "brass"
  | "leather"
  | "velvet"
  | "marble"
  | "tatami"
  | "stone_tile"
  | "rubber_flooring"
  | "glass_frosted";

export interface PBRTextureMapPaths {
  albedo?: string;
  normal?: string;
  roughness?: string;
  ao?: string;
}

export interface MaterialPresetDefinition {
  semanticName: SemanticMaterialName;
  realScaleMeters: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalScale: number;
  transmission?: number;
  ior?: number;
  sheen?: number;
  maps: PBRTextureMapPaths;
  isProceduralFallback?: boolean;
}

/**
 * Photographic CC0 PBR Material Presets mapped from Poly Haven assets.
 */
export const PBR_PRESET_DEFINITIONS: Record<
  SemanticMaterialName,
  MaterialPresetDefinition
> = {
  raw_concrete: {
    semanticName: "raw_concrete",
    realScaleMeters: 2.0,
    roughness: 0.88,
    metalness: 0.02,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 1.2,
    maps: {
      albedo: "/assets/textures/raw_concrete/albedo.webp",
      normal: "/assets/textures/raw_concrete/normal.webp",
      roughness: "/assets/textures/raw_concrete/roughness.webp",
      ao: "/assets/textures/raw_concrete/ao.webp",
    },
  },
  polished_concrete: {
    semanticName: "polished_concrete",
    realScaleMeters: 3.0,
    roughness: 0.28,
    metalness: 0.06,
    clearcoat: 0.45,
    clearcoatRoughness: 0.15,
    normalScale: 0.6,
    maps: {
      albedo: "/assets/textures/polished_concrete/albedo.webp",
      normal: "/assets/textures/polished_concrete/normal.webp",
      roughness: "/assets/textures/polished_concrete/roughness.webp",
      ao: "/assets/textures/polished_concrete/ao.webp",
    },
  },
  board_formed_concrete: {
    semanticName: "board_formed_concrete",
    realScaleMeters: 2.5,
    roughness: 0.82,
    metalness: 0.03,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 1.1,
    maps: {
      albedo: "/assets/textures/board_formed_concrete/albedo.webp",
      normal: "/assets/textures/board_formed_concrete/normal.webp",
      roughness: "/assets/textures/board_formed_concrete/roughness.webp",
      ao: "/assets/textures/board_formed_concrete/ao.webp",
    },
  },
  dark_wood: {
    semanticName: "dark_wood",
    realScaleMeters: 2.0,
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.15,
    clearcoatRoughness: 0.25,
    normalScale: 0.85,
    maps: {
      albedo: "/assets/textures/dark_wood/albedo.webp",
      normal: "/assets/textures/dark_wood/normal.webp",
      roughness: "/assets/textures/dark_wood/roughness.webp",
      ao: "/assets/textures/dark_wood/ao.webp",
    },
  },
  light_oak: {
    semanticName: "light_oak",
    realScaleMeters: 2.0,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.1,
    clearcoatRoughness: 0.2,
    normalScale: 0.8,
    maps: {
      albedo: "/assets/textures/light_oak/albedo.webp",
      normal: "/assets/textures/light_oak/normal.webp",
      roughness: "/assets/textures/light_oak/roughness.webp",
      ao: "/assets/textures/light_oak/ao.webp",
    },
  },
  plaster: {
    semanticName: "plaster",
    realScaleMeters: 2.5,
    roughness: 0.92,
    metalness: 0.01,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 0.75,
    maps: {
      albedo: "/assets/textures/plaster/albedo.webp",
      normal: "/assets/textures/plaster/normal.webp",
      roughness: "/assets/textures/plaster/roughness.webp",
      ao: "/assets/textures/plaster/ao.webp",
    },
  },
  brick: {
    semanticName: "brick",
    realScaleMeters: 1.8,
    roughness: 0.85,
    metalness: 0.02,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 1.35,
    maps: {
      albedo: "/assets/textures/brick/albedo.webp",
      normal: "/assets/textures/brick/normal.webp",
      roughness: "/assets/textures/brick/roughness.webp",
      ao: "/assets/textures/brick/ao.webp",
    },
  },
  terrazzo: {
    semanticName: "terrazzo",
    realScaleMeters: 1.5,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.5,
    clearcoatRoughness: 0.12,
    normalScale: 0.5,
    maps: {
      albedo: "/assets/textures/terrazzo/albedo.webp",
      normal: "/assets/textures/terrazzo/normal.webp",
      roughness: "/assets/textures/terrazzo/roughness.webp",
      ao: "/assets/textures/terrazzo/ao.webp",
    },
  },
  brushed_metal: {
    semanticName: "brushed_metal",
    realScaleMeters: 1.0,
    roughness: 0.38,
    metalness: 0.88,
    clearcoat: 0.1,
    clearcoatRoughness: 0.2,
    normalScale: 0.9,
    maps: {
      albedo: "/assets/textures/brushed_metal/albedo.webp",
      normal: "/assets/textures/brushed_metal/normal.webp",
      roughness: "/assets/textures/brushed_metal/roughness.webp",
      ao: "/assets/textures/brushed_metal/ao.webp",
    },
  },
  brass: {
    semanticName: "brass",
    realScaleMeters: 1.0,
    roughness: 0.28,
    metalness: 0.94,
    clearcoat: 0.2,
    clearcoatRoughness: 0.15,
    normalScale: 0.7,
    maps: {
      albedo: "/assets/textures/brushed_metal/albedo.webp",
      normal: "/assets/textures/brushed_metal/normal.webp",
      roughness: "/assets/textures/brushed_metal/roughness.webp",
      ao: "/assets/textures/brushed_metal/ao.webp",
    },
    isProceduralFallback: true,
  },
  leather: {
    semanticName: "leather",
    realScaleMeters: 1.0,
    roughness: 0.62,
    metalness: 0.04,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    normalScale: 1.1,
    maps: {
      albedo: "/assets/textures/leather/albedo.webp",
      normal: "/assets/textures/leather/normal.webp",
      roughness: "/assets/textures/leather/roughness.webp",
      ao: "/assets/textures/leather/ao.webp",
    },
  },
  velvet: {
    semanticName: "velvet",
    realScaleMeters: 1.0,
    roughness: 0.88,
    metalness: 0.02,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 0.9,
    sheen: 0.75,
    maps: {
      albedo: "/assets/textures/velvet/albedo.webp",
      normal: "/assets/textures/velvet/normal.webp",
      roughness: "/assets/textures/velvet/roughness.webp",
      ao: "/assets/textures/velvet/ao.webp",
    },
  },
  marble: {
    semanticName: "marble",
    realScaleMeters: 2.0,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    normalScale: 0.45,
    maps: {
      albedo: "/assets/textures/marble/albedo.webp",
      normal: "/assets/textures/marble/normal.webp",
      roughness: "/assets/textures/marble/roughness.webp",
      ao: "/assets/textures/marble/ao.webp",
    },
  },
  tatami: {
    semanticName: "tatami",
    realScaleMeters: 1.8,
    roughness: 0.78,
    metalness: 0.02,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 1.0,
    maps: {
      albedo: "/assets/textures/tatami/albedo.webp",
      normal: "/assets/textures/tatami/normal.webp",
      roughness: "/assets/textures/tatami/roughness.webp",
      ao: "/assets/textures/tatami/ao.webp",
    },
  },
  stone_tile: {
    semanticName: "stone_tile",
    realScaleMeters: 2.0,
    roughness: 0.68,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.2,
    normalScale: 1.15,
    maps: {
      albedo: "/assets/textures/stone_tile/albedo.webp",
      normal: "/assets/textures/stone_tile/normal.webp",
      roughness: "/assets/textures/stone_tile/roughness.webp",
      ao: "/assets/textures/stone_tile/ao.webp",
    },
  },
  rubber_flooring: {
    semanticName: "rubber_flooring",
    realScaleMeters: 1.5,
    roughness: 0.65,
    metalness: 0.06,
    clearcoat: 0.05,
    clearcoatRoughness: 0.25,
    normalScale: 0.85,
    maps: {
      albedo: "/assets/textures/rubber_flooring/albedo.webp",
      normal: "/assets/textures/rubber_flooring/normal.webp",
      roughness: "/assets/textures/rubber_flooring/roughness.webp",
      ao: "/assets/textures/rubber_flooring/ao.webp",
    },
  },
  glass_frosted: {
    semanticName: "glass_frosted",
    realScaleMeters: 1.5,
    roughness: 0.35,
    metalness: 0.06,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
    normalScale: 0.4,
    transmission: 0.92,
    ior: 1.45,
    maps: {
      roughness: "/assets/textures/plaster/roughness.webp",
      normal: "/assets/textures/plaster/normal.webp",
    },
    isProceduralFallback: true,
  },
};

/**
 * Mapping from legacy ArchitecturalMaterialId to photographic PBR presets.
 */
export const ARCHITECTURAL_TO_PBR_MAP: Record<
  ArchitecturalMaterialId,
  SemanticMaterialName
> = {
  warm_oak: "light_oak",
  herringbone_parquet: "light_oak",
  charred_hinoki: "dark_wood",
  tatami_mat: "tatami",
  board_concrete: "board_formed_concrete",
  polished_concrete: "polished_concrete",
  obsidian_terrazzo: "terrazzo",
  honed_limestone: "stone_tile",
  warm_sandstone: "stone_tile",
  veined_marble: "marble",
  terracotta_tile: "stone_tile",
  inlay_ceramic: "terrazzo",
  limewash_plaster: "plaster",
  acoustic_slats: "dark_wood",
  vertical_timber_slats: "dark_wood",
  acoustic_felt: "velvet",
  washi_screen: "tatami",
  brushed_brass: "brass",
  anodized_aluminum: "brushed_metal",
  mirror_chrome: "brushed_metal",
  cognac_leather: "leather",
  moss_velvet: "velvet",
  boucle_wool: "velvet",
  raw_linen: "plaster",
  marigold_silk: "velvet",
  distressed_brick: "brick",
  stacked_brick: "brick",
  strata_rock: "stone_tile",
  teak_decking: "light_oak",
  translucent_canopy: "glass_frosted",
  mullioned_glass: "glass_frosted",
  frosted_mullioned_glass: "glass_frosted",
};

// Texture cache to prevent reloading the same GPU textures
const TEXTURE_CACHE = new Map<string, THREE.Texture>();
const MATERIAL_CACHE = new Map<string, THREE.MeshPhysicalMaterial>();
let textureLoader: THREE.TextureLoader | null = null;

function getTextureLoader(): THREE.TextureLoader | null {
  if (typeof window === "undefined") return null;
  if (!textureLoader) {
    textureLoader = new THREE.TextureLoader();
  }
  return textureLoader;
}

function loadCachedTexture(
  path: string,
  isColor = false,
  repeatU = 1,
  repeatV = 1
): THREE.Texture | null {
  const loader = getTextureLoader();
  if (!loader) return null;

  const cacheKey = `${path}?u=${repeatU.toFixed(2)}&v=${repeatV.toFixed(2)}&c=${isColor}`;
  if (TEXTURE_CACHE.has(cacheKey)) {
    return TEXTURE_CACHE.get(cacheKey)!;
  }

  const texture = loader.load(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, repeatV);
  texture.anisotropy = 8;
  if (isColor && "colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ("colorSpace" in texture && THREE.NoColorSpace) {
    texture.colorSpace = THREE.NoColorSpace;
  }

  TEXTURE_CACHE.set(cacheKey, texture);
  return texture;
}

/**
 * Computes world-scale UV repeats so 1 texture tile corresponds to real-world meters.
 * Prevents stretching when walls/floors are scaled dynamically.
 */
export function computeWorldScaleUVRepeat(
  widthMeters: number,
  heightMeters: number,
  realScaleMeters: number
): [number, number] {
  const scale = Math.max(0.5, realScaleMeters);
  const repeatU = Math.max(1, Math.round(widthMeters / scale));
  const repeatV = Math.max(1, Math.round(heightMeters / scale));
  return [repeatU, repeatV];
}

export interface BuildPBRMaterialOptions {
  widthMeters?: number;
  heightMeters?: number;
  tintColorHex?: string;
  tintStrength?: number; // 0.0 (raw photographic albedo) to 1.0 (strongly tinted), default 0.35
  roughnessMultiplier?: number;
  normalScaleMultiplier?: number;
}

/**
 * Builds or retrieves a cached photographic MeshPhysicalMaterial with
 * world-scale UV tiling, micro-detail, and optional subtle palette tinting.
 */
export function buildPhotographicPBRMaterial(
  semanticOrArchId: SemanticMaterialName | ArchitecturalMaterialId | string,
  options: BuildPBRMaterialOptions = {}
): THREE.MeshPhysicalMaterial {
  // Resolve alias
  let semantic: SemanticMaterialName = "raw_concrete";
  if (semanticOrArchId in PBR_PRESET_DEFINITIONS) {
    semantic = semanticOrArchId as SemanticMaterialName;
  } else if (semanticOrArchId in ARCHITECTURAL_TO_PBR_MAP) {
    semantic = ARCHITECTURAL_TO_PBR_MAP[
      semanticOrArchId as ArchitecturalMaterialId
    ];
  }

  const spec = PBR_PRESET_DEFINITIONS[semantic] || PBR_PRESET_DEFINITIONS.raw_concrete;

  const widthMeters = options.widthMeters ?? spec.realScaleMeters;
  const heightMeters = options.heightMeters ?? spec.realScaleMeters;
  const [repeatU, repeatV] = computeWorldScaleUVRepeat(
    widthMeters,
    heightMeters,
    spec.realScaleMeters
  );

  const tintHex = options.tintColorHex ? options.tintColorHex.toUpperCase() : "NONE";
  const tintStrength = Math.max(0, Math.min(1, options.tintStrength ?? 0.35));

  const cacheKey = `${semantic}#u${repeatU}v${repeatV}#t${tintHex}#s${tintStrength.toFixed(2)}`;
  if (MATERIAL_CACHE.has(cacheKey)) {
    return MATERIAL_CACHE.get(cacheKey)!;
  }

  // Load PBR texture maps
  const albedoMap = spec.maps.albedo
    ? loadCachedTexture(spec.maps.albedo, true, repeatU, repeatV)
    : null;
  const normalMap = spec.maps.normal
    ? loadCachedTexture(spec.maps.normal, false, repeatU, repeatV)
    : null;
  const roughMap = spec.maps.roughness
    ? loadCachedTexture(spec.maps.roughness, false, repeatU, repeatV)
    : null;
  const aoMap = spec.maps.ao
    ? loadCachedTexture(spec.maps.ao, false, repeatU, repeatV)
    : null;

  // Base physical parameters
  let roughness = spec.roughness * (options.roughnessMultiplier ?? 1.0);
  let metalness = spec.metalness;
  let normalScale = spec.normalScale * (options.normalScaleMultiplier ?? 1.0);

  // Material construction
  const mat = new THREE.MeshPhysicalMaterial({
    map: albedoMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughnessMap: roughMap,
    roughness: roughness,
    metalness: metalness,
    aoMap: aoMap,
    aoMapIntensity: aoMap ? 0.95 : 0.0,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
    envMapIntensity: metalness > 0.4 ? 1.25 : 0.85,
  });

  // Special brass handling
  if (semantic === "brass") {
    // Elegant warm brass base color
    const brassAlbedo = new THREE.Color("#C89D55");
    mat.color.copy(brassAlbedo);
  } else if (options.tintColorHex) {
    // Subtle cultural palette tinting without destroying photographic contrast
    const targetColor = new THREE.Color(options.tintColorHex);
    // Blend between pure white (1,1,1 = unchanged texture) and target tint color
    const blendedColor = new THREE.Color(1, 1, 1).lerp(targetColor, tintStrength);
    mat.color.copy(blendedColor);
  }

  // Transmission glass properties
  if (spec.transmission !== undefined) {
    mat.transmission = spec.transmission;
    mat.ior = spec.ior ?? 1.45;
    mat.transparent = true;
    mat.opacity = 0.65;
    mat.thickness = 0.5;
  }

  // Velvet sheen
  if (spec.sheen !== undefined) {
    mat.sheen = spec.sheen;
  }

  MATERIAL_CACHE.set(cacheKey, mat);
  return mat;
}

/**
 * Helper to get a PBR material with automatic fallback to procedural material
 * if WebGL textures are disabled or unavailable.
 */
export function getPhotographicOrProceduralMaterial(
  id: ArchitecturalMaterialId | SemanticMaterialName | string,
  widthMeters: number,
  heightMeters: number,
  tintColorHex?: string
): THREE.Material {
  try {
    return buildPhotographicPBRMaterial(id, {
      widthMeters,
      heightMeters,
      tintColorHex,
      tintStrength: 0.3,
    });
  } catch (err) {
    console.warn(`[materials.ts] Falling back to procedural material for ${id}:`, err);
    return buildProceduralPhysicalMaterial(
      (id as ArchitecturalMaterialId) || "warm_oak",
      Math.max(1, Math.round(widthMeters / 2)),
      Math.max(1, Math.round(heightMeters / 2))
    );
  }
}
