import * as THREE from "three";
import { PaletteContrastReport, SceneSpec } from "@/lib/types";

// ============================================================================
// STEP 2 (C + D) — COLOR MAPPING, PALETTE CONTRAST GUARD & PROCEDURAL PBR
// ============================================================================
// Fixes pastel/cream color washout and flat untextured surfaces:
// C. Color Mapping:
//    - Parses every SceneSpec hex with `srgbHexToLinearColor()` using
//      `.convertSRGBToLinear()`, never blending toward #FFFFFF or #F5F5F0.
//    - Enforces a Palette Contrast Guard (`enforcePaletteContrastGuard`) so
//      large architectural surfaces (floors, walls, ceilings) never exceed
//      lightness 0.72 (0.76 for translucent paper) and always maintain >= 0.14
//      luminance separation between floor, wall, hero furniture, and accent.
// D. Materials:
//    - Generates 512×512 Diffuse (`map` in SRGBColorSpace), Micro-Roughness
//      (`roughnessMap` in NoColorSpace), Bump (`bumpMap` in NoColorSpace), and
//      Sobel Tangent-Space Normal (`normalMap` in NoColorSpace) textures for
//      all 17 procedural architectural patterns.
//    - World-scale UV tiling (`computeWorldScaleRepeat`) + hardware anisotropy.
//    - Cached by material ID + tiling repeat and disposed via `disposeMaterialCache()`.

export type ArchitecturalMaterialId =
  | "warm_oak"
  | "herringbone_parquet"
  | "charred_hinoki"
  | "tatami_mat"
  | "board_concrete"
  | "polished_concrete"
  | "obsidian_terrazzo"
  | "honed_limestone"
  | "warm_sandstone"
  | "veined_marble"
  | "terracotta_tile"
  | "inlay_ceramic"
  | "limewash_plaster"
  | "acoustic_slats"
  | "vertical_timber_slats"
  | "acoustic_felt"
  | "washi_screen"
  | "brushed_brass"
  | "anodized_aluminum"
  | "mirror_chrome"
  | "cognac_leather"
  | "moss_velvet"
  | "boucle_wool"
  | "raw_linen"
  | "marigold_silk"
  | "distressed_brick"
  | "stacked_brick"
  | "strata_rock"
  | "teak_decking"
  | "translucent_canopy"
  | "mullioned_glass"
  | "frosted_mullioned_glass";

export type ProceduralPatternKind =
  | "wood_plank"
  | "herringbone"
  | "slats"
  | "stacked_brick"
  | "strata_rock"
  | "mullioned_glass"
  | "frosted_mullioned_glass"
  | "tiles"
  | "inlay"
  | "tatami"
  | "shoji"
  | "terrazzo"
  | "concrete"
  | "stone"
  | "fabric"
  | "plaster"
  | "metal";

export interface ArchitecturalMaterialSpec {
  id: ArchitecturalMaterialId;
  name: string;
  colorHex: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission?: number;
  ior?: number;
  sheen?: number;
  bumpScale: number;
  normalScale: number;
  tileSizeMeters: number;
  absorptionAlpha: number; // 500Hz–1kHz Sabine acoustic absorption coefficient
  pattern: ProceduralPatternKind;
}

/**
 * Authoritative PBR Material Catalog with grounded, non-bleached albedo colors.
 * No architectural surface has lightness > 0.74 so walls/floors never whitewash.
 */
export const ARCHITECTURAL_MATERIAL_LIBRARY: Record<
  ArchitecturalMaterialId,
  ArchitecturalMaterialSpec
> = {
  warm_oak: {
    id: "warm_oak",
    name: "Kiln-Dried Warm Japanese Oak Planks",
    colorHex: "#7D5130",
    roughness: 0.48,
    metalness: 0.04,
    clearcoat: 0.36,
    clearcoatRoughness: 0.24,
    bumpScale: 0.022,
    normalScale: 0.55,
    tileSizeMeters: 1.8,
    absorptionAlpha: 0.1,
    pattern: "wood_plank",
  },
  herringbone_parquet: {
    id: "herringbone_parquet",
    name: "Smoked Walnut Herringbone Parquet",
    colorHex: "#5C3820",
    roughness: 0.38,
    metalness: 0.06,
    clearcoat: 0.48,
    clearcoatRoughness: 0.2,
    bumpScale: 0.026,
    normalScale: 0.65,
    tileSizeMeters: 1.5,
    absorptionAlpha: 0.09,
    pattern: "herringbone",
  },
  charred_hinoki: {
    id: "charred_hinoki",
    name: "Natural Hinoki Cypress Joinery",
    colorHex: "#A47B4F",
    roughness: 0.46,
    metalness: 0.03,
    clearcoat: 0.24,
    clearcoatRoughness: 0.28,
    bumpScale: 0.018,
    normalScale: 0.48,
    tileSizeMeters: 1.6,
    absorptionAlpha: 0.11,
    pattern: "wood_plank",
  },
  tatami_mat: {
    id: "tatami_mat",
    name: "Woven Igusa Rush Tatami Grid",
    colorHex: "#9E9264",
    roughness: 0.82,
    metalness: 0.0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    sheen: 0.45,
    bumpScale: 0.028,
    normalScale: 0.62,
    tileSizeMeters: 1.8,
    absorptionAlpha: 0.32,
    pattern: "tatami",
  },
  board_concrete: {
    id: "board_concrete",
    name: "Board-Formed Monolithic Concrete",
    colorHex: "#52565C",
    roughness: 0.82,
    metalness: 0.05,
    clearcoat: 0.05,
    clearcoatRoughness: 0.5,
    bumpScale: 0.036,
    normalScale: 0.78,
    tileSizeMeters: 2.4,
    absorptionAlpha: 0.03,
    pattern: "concrete",
  },
  polished_concrete: {
    id: "polished_concrete",
    name: "Honed Anthracite Concrete",
    colorHex: "#2D3137",
    roughness: 0.24,
    metalness: 0.14,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    bumpScale: 0.016,
    normalScale: 0.42,
    tileSizeMeters: 2.6,
    absorptionAlpha: 0.02,
    pattern: "concrete",
  },
  obsidian_terrazzo: {
    id: "obsidian_terrazzo",
    name: "Polished Obsidian Aggregate Terrazzo",
    colorHex: "#171C24",
    roughness: 0.16,
    metalness: 0.22,
    clearcoat: 0.74,
    clearcoatRoughness: 0.12,
    bumpScale: 0.014,
    normalScale: 0.38,
    tileSizeMeters: 2.0,
    absorptionAlpha: 0.02,
    pattern: "terrazzo",
  },
  honed_limestone: {
    id: "honed_limestone",
    name: "Honed Bath & Valders Ashlar Limestone",
    colorHex: "#B5A48B",
    roughness: 0.68,
    metalness: 0.02,
    clearcoat: 0.08,
    clearcoatRoughness: 0.4,
    bumpScale: 0.028,
    normalScale: 0.64,
    tileSizeMeters: 2.2,
    absorptionAlpha: 0.04,
    pattern: "stone",
  },
  warm_sandstone: {
    id: "warm_sandstone",
    name: "Carved Jaisalmer & Dholpur Warm Sandstone",
    colorHex: "#C48B52",
    roughness: 0.72,
    metalness: 0.02,
    clearcoat: 0.06,
    clearcoatRoughness: 0.45,
    bumpScale: 0.034,
    normalScale: 0.72,
    tileSizeMeters: 2.0,
    absorptionAlpha: 0.05,
    pattern: "stone",
  },
  veined_marble: {
    id: "veined_marble",
    name: "Calacatta Viola Veined Architectural Stone",
    colorHex: "#C6BCB0",
    roughness: 0.26,
    metalness: 0.06,
    clearcoat: 0.62,
    clearcoatRoughness: 0.14,
    bumpScale: 0.016,
    normalScale: 0.44,
    tileSizeMeters: 2.4,
    absorptionAlpha: 0.02,
    pattern: "stone",
  },
  terracotta_tile: {
    id: "terracotta_tile",
    name: "Hand-Pressed Terracotta Pavers",
    colorHex: "#A84E2E",
    roughness: 0.72,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.4,
    bumpScale: 0.032,
    normalScale: 0.7,
    tileSizeMeters: 1.4,
    absorptionAlpha: 0.05,
    pattern: "tiles",
  },
  inlay_ceramic: {
    id: "inlay_ceramic",
    name: "Jaipur Geometric Stone & Ceramic Inlay",
    colorHex: "#C2A378",
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.52,
    clearcoatRoughness: 0.18,
    bumpScale: 0.024,
    normalScale: 0.58,
    tileSizeMeters: 1.6,
    absorptionAlpha: 0.03,
    pattern: "inlay",
  },
  limewash_plaster: {
    id: "limewash_plaster",
    name: "Mineral Slaked-Lime Textured Plaster",
    colorHex: "#C4B499",
    roughness: 0.86,
    metalness: 0.01,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    bumpScale: 0.022,
    normalScale: 0.52,
    tileSizeMeters: 2.2,
    absorptionAlpha: 0.06,
    pattern: "plaster",
  },
  acoustic_slats: {
    id: "acoustic_slats",
    name: "Quarter-Sawn Oak Acoustic Slats on Felt",
    colorHex: "#724626",
    roughness: 0.56,
    metalness: 0.03,
    clearcoat: 0.2,
    clearcoatRoughness: 0.32,
    bumpScale: 0.052,
    normalScale: 0.88,
    tileSizeMeters: 1.2,
    absorptionAlpha: 0.54,
    pattern: "slats",
  },
  vertical_timber_slats: {
    id: "vertical_timber_slats",
    name: "Vertical Cedar Slats on Acoustic Black Felt",
    colorHex: "#8C5D38",
    roughness: 0.5,
    metalness: 0.04,
    clearcoat: 0.24,
    clearcoatRoughness: 0.28,
    bumpScale: 0.055,
    normalScale: 0.9,
    tileSizeMeters: 1.2,
    absorptionAlpha: 0.58,
    pattern: "slats",
  },
  acoustic_felt: {
    id: "acoustic_felt",
    name: "Pressed Charcoal Wool Acoustic Baffles",
    colorHex: "#282A2E",
    roughness: 0.92,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.8,
    sheen: 0.65,
    bumpScale: 0.03,
    normalScale: 0.6,
    tileSizeMeters: 1.0,
    absorptionAlpha: 0.68,
    pattern: "fabric",
  },
  washi_screen: {
    id: "washi_screen",
    name: "Translucent Mulberry Washi Shoji Lattice",
    colorHex: "#DFD1B8",
    roughness: 0.86,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.8,
    transmission: 0.32,
    bumpScale: 0.024,
    normalScale: 0.56,
    tileSizeMeters: 1.4,
    absorptionAlpha: 0.38,
    pattern: "shoji",
  },
  brushed_brass: {
    id: "brushed_brass",
    name: "Patinated Architectural Brass",
    colorHex: "#C59B4E",
    roughness: 0.26,
    metalness: 0.86,
    clearcoat: 0.6,
    clearcoatRoughness: 0.22,
    bumpScale: 0.014,
    normalScale: 0.36,
    tileSizeMeters: 1.0,
    absorptionAlpha: 0.03,
    pattern: "metal",
  },
  anodized_aluminum: {
    id: "anodized_aluminum",
    name: "Bead-Blasted Titanium & Anodized Aluminum",
    colorHex: "#7C8B9E",
    roughness: 0.26,
    metalness: 0.82,
    clearcoat: 0.52,
    clearcoatRoughness: 0.24,
    bumpScale: 0.014,
    normalScale: 0.36,
    tileSizeMeters: 1.5,
    absorptionAlpha: 0.04,
    pattern: "metal",
  },
  mirror_chrome: {
    id: "mirror_chrome",
    name: "Specular Liquid Mirror Chrome",
    colorHex: "#CBD5E1",
    roughness: 0.06,
    metalness: 0.96,
    clearcoat: 0.92,
    clearcoatRoughness: 0.06,
    bumpScale: 0.005,
    normalScale: 0.18,
    tileSizeMeters: 1.5,
    absorptionAlpha: 0.02,
    pattern: "metal",
  },
  cognac_leather: {
    id: "cognac_leather",
    name: "Full-Grain Saddle & Cognac Leather",
    colorHex: "#7A3B1E",
    roughness: 0.42,
    metalness: 0.04,
    clearcoat: 0.28,
    clearcoatRoughness: 0.35,
    sheen: 0.48,
    bumpScale: 0.02,
    normalScale: 0.48,
    tileSizeMeters: 0.8,
    absorptionAlpha: 0.42,
    pattern: "fabric",
  },
  moss_velvet: {
    id: "moss_velvet",
    name: "Heavy-Weight Botanical Mohair Velvet",
    colorHex: "#285042",
    roughness: 0.76,
    metalness: 0.02,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    sheen: 0.84,
    bumpScale: 0.022,
    normalScale: 0.52,
    tileSizeMeters: 0.9,
    absorptionAlpha: 0.62,
    pattern: "fabric",
  },
  boucle_wool: {
    id: "boucle_wool",
    name: "Textured Warm Stone Wool Bouclé",
    colorHex: "#B8AA96",
    roughness: 0.86,
    metalness: 0.0,
    clearcoat: 0.02,
    clearcoatRoughness: 0.7,
    sheen: 0.72,
    bumpScale: 0.028,
    normalScale: 0.64,
    tileSizeMeters: 0.8,
    absorptionAlpha: 0.68,
    pattern: "fabric",
  },
  raw_linen: {
    id: "raw_linen",
    name: "Belgian Slubbed Flax & Oat Linen",
    colorHex: "#C2B299",
    roughness: 0.84,
    metalness: 0.0,
    clearcoat: 0.02,
    clearcoatRoughness: 0.65,
    sheen: 0.58,
    bumpScale: 0.022,
    normalScale: 0.52,
    tileSizeMeters: 0.9,
    absorptionAlpha: 0.52,
    pattern: "fabric",
  },
  marigold_silk: {
    id: "marigold_silk",
    name: "Handloom Marigold & Vermilion Festive Silk",
    colorHex: "#DF641A",
    roughness: 0.46,
    metalness: 0.12,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    sheen: 0.82,
    bumpScale: 0.018,
    normalScale: 0.45,
    tileSizeMeters: 1.0,
    absorptionAlpha: 0.48,
    pattern: "fabric",
  },
  distressed_brick: {
    id: "distressed_brick",
    name: "Distressed Industrial Masonry & Lime Mortar",
    colorHex: "#6A372E",
    roughness: 0.86,
    metalness: 0.02,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    bumpScale: 0.038,
    normalScale: 0.82,
    tileSizeMeters: 1.6,
    absorptionAlpha: 0.05,
    pattern: "tiles",
  },
  stacked_brick: {
    id: "stacked_brick",
    name: "Roman Elongated Stacked Brick & Stone",
    colorHex: "#82523B",
    roughness: 0.8,
    metalness: 0.03,
    clearcoat: 0.08,
    clearcoatRoughness: 0.45,
    bumpScale: 0.042,
    normalScale: 0.85,
    tileSizeMeters: 1.6,
    absorptionAlpha: 0.05,
    pattern: "stacked_brick",
  },
  strata_rock: {
    id: "strata_rock",
    name: "Sedimentary Canyon Strata Rock",
    colorHex: "#726155",
    roughness: 0.88,
    metalness: 0.02,
    clearcoat: 0.04,
    clearcoatRoughness: 0.65,
    bumpScale: 0.046,
    normalScale: 0.88,
    tileSizeMeters: 2.2,
    absorptionAlpha: 0.04,
    pattern: "strata_rock",
  },
  teak_decking: {
    id: "teak_decking",
    name: "Weathered Coastal Burmese Teak Decking",
    colorHex: "#8F5F38",
    roughness: 0.5,
    metalness: 0.03,
    clearcoat: 0.26,
    clearcoatRoughness: 0.3,
    bumpScale: 0.024,
    normalScale: 0.58,
    tileSizeMeters: 1.8,
    absorptionAlpha: 0.1,
    pattern: "wood_plank",
  },
  translucent_canopy: {
    id: "translucent_canopy",
    name: "Architectural Tensile Woven Silk Canopy",
    colorHex: "#D6C7AE",
    roughness: 0.74,
    metalness: 0.02,
    clearcoat: 0.05,
    clearcoatRoughness: 0.55,
    transmission: 0.28,
    sheen: 0.65,
    bumpScale: 0.018,
    normalScale: 0.42,
    tileSizeMeters: 2.0,
    absorptionAlpha: 0.42,
    pattern: "fabric",
  },
  mullioned_glass: {
    id: "mullioned_glass",
    name: "Transmissive Glass with Slim Steel Mullions",
    colorHex: "#9EC5DF",
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 0.92,
    clearcoatRoughness: 0.06,
    transmission: 0.62,
    ior: 1.5,
    bumpScale: 0.024,
    normalScale: 0.54,
    tileSizeMeters: 2.4,
    absorptionAlpha: 0.12,
    pattern: "mullioned_glass",
  },
  frosted_mullioned_glass: {
    id: "frosted_mullioned_glass",
    name: "Frosted Architectural Glass with Steel Mullions",
    colorHex: "#B0CDE0",
    roughness: 0.38,
    metalness: 0.16,
    clearcoat: 0.65,
    clearcoatRoughness: 0.25,
    transmission: 0.48,
    ior: 1.48,
    bumpScale: 0.026,
    normalScale: 0.56,
    tileSizeMeters: 2.4,
    absorptionAlpha: 0.14,
    pattern: "frosted_mullioned_glass",
  },
};

// ============================================================================
// STEP 2(C) — COLOR MAPPING & PALETTE CONTRAST GUARD
// ============================================================================

export type ColorSurfaceRole =
  | "floor"
  | "wall"
  | "ceiling"
  | "furniture"
  | "accent"
  | "emissive";

/**
 * Parses a hex color, prevents cream/whitewash clamping on architectural
 * surfaces, and converts from sRGB to linear working space via
 * `.convertSRGBToLinear()`. Never blends toward #FFFFFF or #F5F5F0.
 */
export function srgbHexToLinearColor(
  hex: string,
  role: ColorSurfaceRole = "furniture"
): THREE.Color {
  const color = new THREE.Color(hex || "#7D5130");
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  // Guard against overly pale/whitewashed architectural surfaces
  if (role === "floor" || role === "wall" || role === "ceiling") {
    const maxL = role === "floor" ? 0.64 : 0.72;
    if (hsl.l > maxL) {
      hsl.l = maxL;
    }
    // Preserve warm/mineral chroma so limestone, sandstone, and plaster never turn gray-white
    if (hsl.s > 0.03 && hsl.s < 0.18 && hsl.l > 0.45) {
      hsl.s = Math.min(0.32, hsl.s * 1.35 + 0.05);
    }
    color.setHSL(hsl.h, hsl.s, hsl.l);
  } else if (role === "furniture") {
    if (hsl.l > 0.78) {
      hsl.l = 0.78;
      color.setHSL(hsl.h, hsl.s, hsl.l);
    }
  }

  if (typeof color.convertSRGBToLinear === "function") {
    color.convertSRGBToLinear();
  }
  return color;
}

/**
 * Pure, unit-testable Palette Contrast Guard.
 * Ensures floor, walls, hero furniture, and accents have distinct lightness
 * and saturation without any surface clamping above 0.74 lightness.
 */
export function enforcePaletteContrastGuard(
  palette: SceneSpec["palette"]
): PaletteContrastReport {
  const adjustmentsApplied: string[] = [];

  const floorCol = new THREE.Color(palette.floorHex || "#7D5130");
  const wallCol = new THREE.Color(palette.wallHex || "#724626");
  const primaryCol = new THREE.Color(palette.primaryHex || "#7A3B1E");
  const accentCol = new THREE.Color(palette.accentHex || "#C59B4E");

  const fHsl = { h: 0, s: 0, l: 0 };
  const wHsl = { h: 0, s: 0, l: 0 };
  const pHsl = { h: 0, s: 0, l: 0 };
  const aHsl = { h: 0, s: 0, l: 0 };

  floorCol.getHSL(fHsl);
  wallCol.getHSL(wHsl);
  primaryCol.getHSL(pHsl);
  accentCol.getHSL(aHsl);

  // 1. Clamp excessive lightness on floor and wall
  if (fHsl.l > 0.64) {
    fHsl.l = 0.62;
    adjustmentsApplied.push("Clamped floor lightness to 0.62 to prevent floor whitewash");
  }
  if (wHsl.l > 0.72) {
    wHsl.l = 0.7;
    adjustmentsApplied.push("Clamped wall lightness to 0.70 to prevent wall whitewash");
  }
  if (pHsl.l > 0.76) {
    pHsl.l = 0.72;
    adjustmentsApplied.push("Clamped primary furniture lightness to 0.72");
  }

  // 2. Enforce minimum delta-L (>= 0.14) between floor and wall so room boundaries read clearly
  if (Math.abs(wHsl.l - fHsl.l) < 0.14) {
    if (fHsl.l >= wHsl.l) {
      fHsl.l = Math.max(0.12, wHsl.l - 0.15);
    } else {
      fHsl.l = Math.max(0.12, fHsl.l - 0.08);
      wHsl.l = Math.min(0.7, fHsl.l + 0.15);
    }
    adjustmentsApplied.push("Separated floor and wall lightness by >= 0.14 delta-L");
  }

  // 3. Enforce contrast between primary furniture and floor (>= 0.12 delta-L)
  if (Math.abs(pHsl.l - fHsl.l) < 0.12) {
    pHsl.l = fHsl.l < 0.4 ? Math.min(0.72, fHsl.l + 0.16) : Math.max(0.18, fHsl.l - 0.16);
    adjustmentsApplied.push("Separated hero furniture lightness from floor by >= 0.12 delta-L");
  }

  // 4. Ensure accent has rich chroma (saturation >= 0.42)
  if (aHsl.s < 0.42) {
    aHsl.s = 0.52;
    adjustmentsApplied.push("Boosted accent saturation to 0.52 for crisp focal hierarchy");
  }

  floorCol.setHSL(fHsl.h, fHsl.s, fHsl.l);
  wallCol.setHSL(wHsl.h, wHsl.s, wHsl.l);
  primaryCol.setHSL(pHsl.h, pHsl.s, pHsl.l);
  accentCol.setHSL(aHsl.h, aHsl.s, aHsl.l);

  const floorWallDeltaL = Number(Math.abs(wHsl.l - fHsl.l).toFixed(3));
  const wallPrimaryDeltaL = Number(Math.abs(wHsl.l - pHsl.l).toFixed(3));
  const maxSurfaceLightness = Number(Math.max(fHsl.l, wHsl.l).toFixed(3));

  return {
    floorHex: `#${floorCol.getHexString()}`,
    wallHex: `#${wallCol.getHexString()}`,
    primaryHex: `#${primaryCol.getHexString()}`,
    accentHex: `#${accentCol.getHexString()}`,
    floorWallDeltaL,
    wallPrimaryDeltaL,
    maxSurfaceLightness,
    wasAdjusted: adjustmentsApplied.length > 0,
    adjustmentsApplied,
  };
}

/**
 * Computes world-scale UV repeat counts from physical surface dimensions (meters)
 * so textures never stretch on 30m walls or tile too tightly on small panels.
 */
export function computeWorldScaleRepeat(
  spanUMeters: number,
  spanVMeters: number,
  tileSizeMeters = 1.8
): [number, number] {
  const safeTile = Math.max(0.4, tileSizeMeters);
  const rx = Math.max(1, Number((spanUMeters / safeTile).toFixed(2)));
  const ry = Math.max(1, Number((spanVMeters / safeTile).toFixed(2)));
  return [rx, ry];
}

/**
 * Converts a grayscale heightfield canvas (`bumpCanvas`) into a tangent-space
 * RGB Normal Map canvas using a 3×3 Sobel operator.
 */
export function generateNormalMapFromHeightCanvas(
  heightCanvas: HTMLCanvasElement,
  strength = 2.2
): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = w;
  normalCanvas.height = h;

  const hCtx = heightCanvas.getContext("2d");
  const nCtx = normalCanvas.getContext("2d");
  if (!hCtx || !nCtx) return normalCanvas;

  const src = hCtx.getImageData(0, 0, w, h).data;
  const dstImg = nCtx.createImageData(w, h);
  const dst = dstImg.data;

  const sampleHeight = (x: number, y: number): number => {
    const wx = (x + w) % w;
    const wy = (y + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sampleHeight(x - 1, y - 1);
      const t = sampleHeight(x, y - 1);
      const tr = sampleHeight(x + 1, y - 1);
      const l = sampleHeight(x - 1, y);
      const r = sampleHeight(x + 1, y);
      const bl = sampleHeight(x - 1, y + 1);
      const b = sampleHeight(x, y + 1);
      const br = sampleHeight(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dZ = 1.0;

      const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);
      const nx = -dX * invLen;
      const ny = -dY * invLen;
      const nz = dZ * invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  nCtx.putImageData(dstImg, 0, 0);
  return normalCanvas;
}

const MATERIAL_INSTANCE_CACHE = new Map<string, THREE.MeshPhysicalMaterial>();

export function buildProceduralPhysicalMaterial(
  matId: string,
  repeatX = 4,
  repeatY = 4,
  envMap: THREE.Texture | null = null,
  maxAnisotropy = 8
): THREE.MeshPhysicalMaterial {
  const key = (
    matId in ARCHITECTURAL_MATERIAL_LIBRARY ? matId : "warm_oak"
  ) as ArchitecturalMaterialId;
  const spec = ARCHITECTURAL_MATERIAL_LIBRARY[key];
  const rx = Math.max(1, Math.round(repeatX * 2) / 2);
  const ry = Math.max(1, Math.round(repeatY * 2) / 2);
  const cacheKey = `${spec.id}_${rx}_${ry}`;
  const cached = MATERIAL_INSTANCE_CACHE.get(cacheKey);
  if (cached) return cached;

  const diffuseCanvas = document.createElement("canvas");
  diffuseCanvas.width = 512;
  diffuseCanvas.height = 512;
  const ctx = diffuseCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rctx = roughCanvas.getContext("2d");

  const baseRoughByte = Math.round(spec.roughness * 255);

  if (ctx && bctx && rctx) {
    ctx.fillStyle = spec.colorHex;
    ctx.fillRect(0, 0, 512, 512);
    bctx.fillStyle = "#808080";
    bctx.fillRect(0, 0, 512, 512);
    rctx.fillStyle = `rgb(${baseRoughByte},${baseRoughByte},${baseRoughByte})`;
    rctx.fillRect(0, 0, 512, 512);

    if (spec.pattern === "wood_plank") {
      // Staggered architectural timber planks + cathedral grain + recessed bevel seams
      const plankH = 64;
      for (let y = 0; y < 512; y += plankH) {
        const rowIdx = Math.floor(y / plankH);
        const jointX = (rowIdx * 173 + 64) % 448;
        const toneShift = ((rowIdx * 23) % 18) - 9;
        ctx.fillStyle =
          toneShift > 0
            ? `rgba(255,235,205,${toneShift * 0.008})`
            : `rgba(15,8,4,${-toneShift * 0.011})`;
        ctx.fillRect(0, y, 512, plankH);

        const rb = Math.max(45, Math.min(220, baseRoughByte + toneShift * 2));
        rctx.fillStyle = `rgb(${rb},${rb},${rb})`;
        rctx.fillRect(0, y + 2, 512, plankH - 4);

        // Recessed plank seam in diffuse, bump, and roughness
        ctx.strokeStyle = "rgba(18,10,5,0.48)";
        bctx.strokeStyle = "#1C1C1C";
        rctx.strokeStyle = "rgb(235,235,235)";
        ctx.lineWidth = 3;
        bctx.lineWidth = 5;
        rctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.moveTo(jointX, y);
        ctx.lineTo(jointX, y + plankH);
        ctx.stroke();

        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(512, y);
        bctx.moveTo(jointX, y);
        bctx.lineTo(jointX, y + plankH);
        bctx.stroke();

        rctx.beginPath();
        rctx.moveTo(0, y);
        rctx.lineTo(512, y);
        rctx.stroke();
      }
      // Fine organic wood grain fibers
      for (let i = 0; i < 120; i++) {
        const gy = (i * 4.3) % 512;
        ctx.strokeStyle =
          i % 2 === 0 ? "rgba(255,240,220,0.06)" : "rgba(20,10,4,0.09)";
        bctx.strokeStyle = i % 2 === 0 ? "#969696" : "#686868";
        ctx.lineWidth = 1.5;
        bctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(160, gy + 7, 340, gy - 7, 512, gy);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(0, gy);
        bctx.bezierCurveTo(160, gy + 7, 340, gy - 7, 512, gy);
        bctx.stroke();
      }
    } else if (spec.pattern === "herringbone") {
      const blockW = 64;
      const blockL = 128;
      for (let row = -2; row < 10; row++) {
        for (let col = -2; col < 10; col++) {
          ctx.save();
          bctx.save();
          rctx.save();
          const cx = col * blockW;
          const cy = row * blockW;
          const isEven = (row + col) % 2 === 0;
          const angle = isEven ? Math.PI / 4 : -Math.PI / 4;
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          bctx.translate(cx, cy);
          bctx.rotate(angle);
          rctx.translate(cx, cy);
          rctx.rotate(angle);

          const toneShift = ((row * 17 + col * 31) % 16) - 8;
          ctx.fillStyle =
            toneShift > 0
              ? `rgba(255,235,210,${toneShift * 0.009})`
              : `rgba(15,8,4,${-toneShift * 0.012})`;
          ctx.fillRect(0, 0, blockL, blockW / 2);
          ctx.strokeStyle = "rgba(18,10,5,0.48)";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(0, 0, blockL, blockW / 2);

          bctx.strokeStyle = "#1A1A1A";
          bctx.lineWidth = 4;
          bctx.strokeRect(0, 0, blockL, blockW / 2);

          const rByte = Math.max(
            40,
            Math.min(220, baseRoughByte + (isEven ? -22 : 22) + toneShift)
          );
          rctx.fillStyle = `rgb(${rByte},${rByte},${rByte})`;
          rctx.fillRect(2, 2, blockL - 4, blockW / 2 - 4);

          ctx.restore();
          bctx.restore();
          rctx.restore();
        }
      }
    } else if (spec.pattern === "slats") {
      // Deep black acoustic felt backing + raised timber slats with beveled highlights
      ctx.fillStyle = "#100E0C";
      ctx.fillRect(0, 0, 512, 512);
      bctx.fillStyle = "#0E0E0E";
      bctx.fillRect(0, 0, 512, 512);
      rctx.fillStyle = "rgb(242,242,242)";
      rctx.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 32) {
        ctx.fillStyle = spec.colorHex;
        ctx.fillRect(x + 5, 0, 21, 512);
        ctx.fillStyle = "rgba(255,245,230,0.10)";
        ctx.fillRect(x + 5, 0, 4, 512);
        bctx.fillStyle = "#F0F0F0";
        bctx.fillRect(x + 5, 0, 21, 512);
        rctx.fillStyle = `rgb(${baseRoughByte},${baseRoughByte},${baseRoughByte})`;
        rctx.fillRect(x + 5, 0, 21, 512);
      }
    } else if (spec.pattern === "stacked_brick") {
      const rowH = 32;
      const colW = 128;
      for (let y = 0; y < 512; y += rowH) {
        const rowOffset = (Math.floor(y / rowH) % 2) * (colW / 2);
        for (let x = -colW; x < 512; x += colW) {
          const bx = x + rowOffset;
          const jitter = ((bx * 7 + y * 13) % 18) - 9;
          ctx.fillStyle =
            jitter > 0
              ? `rgba(255,230,205,${jitter * 0.01})`
              : `rgba(20,10,5,${-jitter * 0.012})`;
          ctx.fillRect(bx + 3, y + 3, colW - 6, rowH - 6);
          bctx.fillStyle = "#E2E2E2";
          bctx.fillRect(bx + 3, y + 3, colW - 6, rowH - 6);
          const rb = Math.max(95, Math.min(245, baseRoughByte + jitter * 2));
          rctx.fillStyle = `rgb(${rb},${rb},${rb})`;
          rctx.fillRect(bx + 3, y + 3, colW - 6, rowH - 6);
        }
        ctx.fillStyle = "rgba(22,18,16,0.72)";
        ctx.fillRect(0, y, 512, 4);
        bctx.fillStyle = "#141414";
        bctx.fillRect(0, y, 512, 5);
        rctx.fillStyle = "rgb(245,245,245)";
        rctx.fillRect(0, y, 512, 5);
      }
    } else if (spec.pattern === "tiles" || spec.pattern === "inlay") {
      const step = 64;
      for (let y = 0; y < 512; y += step) {
        for (let x = 0; x < 512; x += step) {
          const shade = ((x * 13 + y * 29) % 20) - 10;
          ctx.fillStyle =
            shade > 0
              ? `rgba(255,240,220,${shade * 0.008})`
              : `rgba(15,8,4,${-shade * 0.01})`;
          ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
          bctx.fillStyle = "#DADADA";
          bctx.fillRect(x + 3, y + 3, step - 6, step - 6);

          const rb = Math.max(45, Math.min(240, baseRoughByte + shade * 2));
          rctx.fillStyle = `rgb(${rb},${rb},${rb})`;
          rctx.fillRect(x + 3, y + 3, step - 6, step - 6);

          if (spec.pattern === "inlay") {
            ctx.strokeStyle = "rgba(197,155,78,0.52)";
            bctx.strokeStyle = "#F5F5F5";
            rctx.strokeStyle = "rgb(55,55,55)";
            ctx.lineWidth = 2.5;
            bctx.lineWidth = 2.5;
            rctx.lineWidth = 2.5;
            ctx.strokeRect(x + 11, y + 11, step - 22, step - 22);
            bctx.strokeRect(x + 11, y + 11, step - 22, step - 22);
            rctx.strokeRect(x + 11, y + 11, step - 22, step - 22);
          }
        }
      }
      ctx.strokeStyle = "rgba(24,18,14,0.52)";
      bctx.strokeStyle = "#181818";
      rctx.strokeStyle = "rgb(240,240,240)";
      ctx.lineWidth = 4;
      bctx.lineWidth = 5;
      rctx.lineWidth = 5;
      for (let i = 0; i <= 512; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(i, 0);
        bctx.lineTo(i, 512);
        bctx.moveTo(0, i);
        bctx.lineTo(512, i);
        bctx.stroke();
        rctx.beginPath();
        rctx.moveTo(i, 0);
        rctx.lineTo(i, 512);
        rctx.moveTo(0, i);
        rctx.lineTo(512, i);
        rctx.stroke();
      }
    } else if (spec.pattern === "concrete" || spec.pattern === "stone") {
      // Ashlar stone blocks / board-formed concrete courses + tie-rod holes + mineral mottling
      for (let m = 0; m < 260; m++) {
        const mx = (m * 67) % 512;
        const my = (m * 109) % 512;
        const rad = 8 + (m % 18);
        ctx.fillStyle =
          m % 2 === 0 ? "rgba(255,250,240,0.03)" : "rgba(0,0,0,0.045)";
        ctx.beginPath();
        ctx.arc(mx, my, rad, 0, Math.PI * 2);
        ctx.fill();

        const rb = Math.max(
          35,
          Math.min(245, baseRoughByte + (m % 2 === 0 ? 14 : -14))
        );
        rctx.fillStyle = `rgb(${rb},${rb},${rb})`;
        rctx.beginPath();
        rctx.arc(mx, my, rad, 0, Math.PI * 2);
        rctx.fill();
      }

      ctx.strokeStyle = "rgba(15,15,18,0.34)";
      bctx.strokeStyle = "#242424";
      rctx.strokeStyle = "rgb(235,235,235)";
      ctx.lineWidth = 3;
      bctx.lineWidth = 5;
      rctx.lineWidth = 4;

      for (let y = 0; y <= 512; y += 85) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(512, y);
        bctx.stroke();
        rctx.beginPath();
        rctx.moveTo(0, y);
        rctx.lineTo(512, y);
        rctx.stroke();

        const offset = (Math.round(y / 85) % 2) * 128;
        for (let x = offset; x < 512; x += 256) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 85);
          ctx.stroke();
          bctx.beginPath();
          bctx.moveTo(x, y);
          bctx.lineTo(x, y + 85);
          bctx.stroke();

          if (spec.pattern === "concrete") {
            ctx.fillStyle = "rgba(10,12,15,0.45)";
            bctx.fillStyle = "#101010";
            [28, 228].forEach((dx) => {
              ctx.beginPath();
              ctx.arc(x + dx, y + 42, 4.5, 0, Math.PI * 2);
              ctx.fill();
              bctx.beginPath();
              bctx.arc(x + dx, y + 42, 5.5, 0, Math.PI * 2);
              bctx.fill();
            });
          }
        }
      }
    } else if (spec.pattern === "terrazzo") {
      const chipPalette = [
        "rgba(56,189,248,0.38)",
        "rgba(226,232,240,0.28)",
        "rgba(148,163,184,0.34)",
        "rgba(217,83,43,0.28)",
        "rgba(197,155,78,0.34)",
      ];
      for (let i = 0; i < 280; i++) {
        const cx = (i * 73) % 502;
        const cy = (i * 117) % 502;
        const rw = 4 + (i % 8);
        const rh = 3 + ((i * 3) % 7);
        ctx.fillStyle = chipPalette[i % chipPalette.length];
        ctx.fillRect(cx, cy, rw, rh);
        bctx.fillStyle = i % 2 === 0 ? "#9C9C9C" : "#6E6E6E";
        bctx.fillRect(cx, cy, rw, rh);
        rctx.fillStyle = i % 2 === 0 ? "rgb(28,28,28)" : "rgb(64,64,64)";
        rctx.fillRect(cx, cy, rw, rh);
      }
    } else if (spec.pattern === "tatami") {
      for (let y = 0; y < 512; y += 4) {
        ctx.fillStyle =
          y % 8 === 0 ? "rgba(255,250,235,0.06)" : "rgba(15,12,6,0.07)";
        ctx.fillRect(0, y, 512, 2);
        bctx.fillStyle = y % 8 === 0 ? "#A8A8A8" : "#585858";
        bctx.fillRect(0, y, 512, 2);
      }
      ctx.strokeStyle = "#1E291C";
      bctx.strokeStyle = "#303030";
      ctx.lineWidth = 14;
      bctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 498, 242);
      ctx.strokeRect(7, 263, 498, 242);
      bctx.strokeRect(7, 7, 498, 242);
      bctx.strokeRect(7, 263, 498, 242);
    } else if (spec.pattern === "shoji") {
      ctx.strokeStyle = "#6E4826";
      bctx.strokeStyle = "#F2F2F2";
      rctx.strokeStyle = "rgb(110,110,110)";
      ctx.lineWidth = 10;
      bctx.lineWidth = 10;
      rctx.lineWidth = 10;
      for (let x = 0; x <= 512; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x, 512);
        bctx.stroke();
        rctx.beginPath();
        rctx.moveTo(x, 0);
        rctx.lineTo(x, 512);
        rctx.stroke();
      }
      for (let y = 0; y <= 512; y += 96) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(512, y);
        bctx.stroke();
      }
    } else if (spec.pattern === "fabric" || spec.pattern === "plaster") {
      for (let i = 0; i < 460; i++) {
        const px = (i * 59) % 512;
        const py = (i * 97) % 512;
        ctx.fillStyle =
          i % 2 === 0 ? "rgba(255,248,235,0.045)" : "rgba(10,8,6,0.055)";
        bctx.fillStyle = i % 2 === 0 ? "#A2A2A2" : "#5E5E5E";
        const rb = Math.max(
          80,
          Math.min(250, baseRoughByte + (i % 2 === 0 ? 16 : -16))
        );
        rctx.fillStyle = `rgb(${rb},${rb},${rb})`;
        ctx.fillRect(px, py, 16, 3);
        ctx.fillRect(px, py, 3, 16);
        bctx.fillRect(px, py, 14, 3);
        bctx.fillRect(px, py, 3, 14);
        rctx.fillRect(px, py, 14, 3);
      }
    } else if (spec.pattern === "metal") {
      // Fine directional brushed metal anisotropy lines
      for (let y = 0; y < 512; y += 2) {
        const shift = ((y * 17) % 12) - 6;
        ctx.fillStyle =
          shift > 0
            ? `rgba(255,255,255,${shift * 0.006})`
            : `rgba(0,0,0,${-shift * 0.006})`;
        ctx.fillRect(0, y, 512, 1);
        bctx.fillStyle = shift > 0 ? "#909090" : "#707070";
        bctx.fillRect(0, y, 512, 1);
      }
    } else if (spec.pattern === "strata_rock") {
      for (let y = 0; y < 512; y += 5) {
        const wave = Math.sin(y * 0.065) * 15;
        ctx.strokeStyle =
          y % 15 === 0
            ? "rgba(35,28,22,0.48)"
            : y % 10 === 0
            ? "rgba(245,232,212,0.18)"
            : "rgba(0,0,0,0.16)";
        bctx.strokeStyle = y % 15 === 0 ? "#1C1C1C" : "#C8C8C8";
        ctx.lineWidth = y % 15 === 0 ? 4 : 2;
        bctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
        bctx.stroke();
      }
    } else if (
      spec.pattern === "mullioned_glass" ||
      spec.pattern === "frosted_mullioned_glass"
    ) {
      const isFrosted = spec.pattern === "frosted_mullioned_glass";
      ctx.fillStyle = isFrosted
        ? "rgba(195, 220, 238, 0.55)"
        : "rgba(170, 208, 235, 0.35)";
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "#181C22";
      bctx.strokeStyle = "#FFFFFF";
      rctx.strokeStyle = "rgb(60,60,60)";
      ctx.lineWidth = 10;
      bctx.lineWidth = 10;
      rctx.lineWidth = 10;
      for (let x = 0; x <= 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x, 512);
        bctx.stroke();
        rctx.beginPath();
        rctx.moveTo(x, 0);
        rctx.lineTo(x, 512);
        rctx.stroke();
      }
      for (let y = 0; y <= 512; y += 170) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(512, y);
        bctx.stroke();
        rctx.beginPath();
        rctx.moveTo(0, y);
        rctx.lineTo(512, y);
        rctx.stroke();
      }
    }
  }

  const normalCanvas = generateNormalMapFromHeightCanvas(bumpCanvas, 2.4);

  const mapTex = new THREE.CanvasTexture(diffuseCanvas);
  mapTex.wrapS = THREE.RepeatWrapping;
  mapTex.wrapT = THREE.RepeatWrapping;
  mapTex.repeat.set(rx, ry);
  mapTex.anisotropy = maxAnisotropy;
  if ("colorSpace" in mapTex && THREE.SRGBColorSpace) {
    mapTex.colorSpace = THREE.SRGBColorSpace;
  }

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(rx, ry);
  bumpTex.anisotropy = maxAnisotropy;
  if ("colorSpace" in bumpTex && THREE.NoColorSpace) {
    bumpTex.colorSpace = THREE.NoColorSpace;
  }

  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(rx, ry);
  normalTex.anisotropy = maxAnisotropy;
  if ("colorSpace" in normalTex && THREE.NoColorSpace) {
    normalTex.colorSpace = THREE.NoColorSpace;
  }

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(rx, ry);
  roughTex.anisotropy = maxAnisotropy;
  if ("colorSpace" in roughTex && THREE.NoColorSpace) {
    roughTex.colorSpace = THREE.NoColorSpace;
  }

  const mat = new THREE.MeshPhysicalMaterial({
    map: mapTex,
    bumpMap: bumpTex,
    bumpScale: spec.bumpScale,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(spec.normalScale, spec.normalScale),
    roughnessMap: roughTex,
    roughness: spec.roughness,
    metalness: spec.metalness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
    envMap,
    envMapIntensity: spec.metalness > 0.5 ? 1.35 : 0.85,
  });

  if (spec.transmission !== undefined) {
    mat.transparent = true;
    mat.opacity = spec.pattern === "frosted_mullioned_glass" ? 0.74 : 0.6;
    mat.transmission = spec.transmission;
    mat.ior = spec.ior ?? 1.5;
  }
  if (spec.sheen !== undefined) {
    mat.sheen = spec.sheen;
  }

  MATERIAL_INSTANCE_CACHE.set(cacheKey, mat);
  return mat;
}

/**
 * Recalculates Sabine Reverberation Time (RT60 = 0.161 * V / A)
 * whenever floor, wall, ceiling, or upholstery materials change.
 */
export function recalculateSabineRT60(spec: SceneSpec): {
  calculatedRT60: number;
  equivalentAbsorptionSabins: number;
  status: "OPTIMAL" | "LIVELY" | "DAMPED";
} {
  const { width, height, depth } = spec.roomDimensions;
  const netVolume =
    spec.roomDimensions.netVolumeCubicMeters ?? width * height * depth * 0.94;
  const floorArea = width * depth;
  const ceilingArea = width * depth;
  const wallArea = 2 * (width * height + depth * height);

  const floorId =
    typeof spec.materials.floor === "string"
      ? spec.materials.floor
      : spec.materials.floor.id;
  const wallId =
    typeof spec.materials.wall === "string"
      ? spec.materials.wall
      : spec.materials.wall.id;
  const ceilId =
    typeof spec.materials.ceiling === "string"
      ? spec.materials.ceiling
      : spec.materials.ceiling.id;
  const furnId =
    typeof spec.materials.primaryFurniture === "string"
      ? spec.materials.primaryFurniture
      : spec.materials.primaryFurniture.id;

  const floorSpec =
    ARCHITECTURAL_MATERIAL_LIBRARY[floorId as ArchitecturalMaterialId] ??
    ARCHITECTURAL_MATERIAL_LIBRARY.warm_oak;
  const wallSpec =
    ARCHITECTURAL_MATERIAL_LIBRARY[wallId as ArchitecturalMaterialId] ??
    ARCHITECTURAL_MATERIAL_LIBRARY.acoustic_slats;
  const ceilSpec =
    ARCHITECTURAL_MATERIAL_LIBRARY[ceilId as ArchitecturalMaterialId] ??
    ARCHITECTURAL_MATERIAL_LIBRARY.warm_oak;
  const furnSpec =
    ARCHITECTURAL_MATERIAL_LIBRARY[furnId as ArchitecturalMaterialId] ??
    ARCHITECTURAL_MATERIAL_LIBRARY.cognac_leather;

  const totalSabins =
    floorArea * floorSpec.absorptionAlpha +
    wallArea * wallSpec.absorptionAlpha +
    ceilingArea * (spec.isOpenAir ? 0.95 : ceilSpec.absorptionAlpha) +
    floorArea * 0.28 * furnSpec.absorptionAlpha;

  const rawRT60 = (0.161 * netVolume) / Math.max(12, totalSabins);
  const clampedRT60 = Number(Math.max(0.24, Math.min(2.4, rawRT60)).toFixed(2));
  const diff = Math.abs(clampedRT60 - spec.acousticTarget.targetRT60Seconds);

  return {
    calculatedRT60: clampedRT60,
    equivalentAbsorptionSabins: Number(totalSabins.toFixed(1)),
    status:
      diff <= 0.35
        ? "OPTIMAL"
        : clampedRT60 > spec.acousticTarget.targetRT60Seconds
        ? "LIVELY"
        : "DAMPED",
  };
}

export function disposeMaterialCache(): void {
  MATERIAL_INSTANCE_CACHE.forEach((mat) => {
    if (mat.map) mat.map.dispose();
    if (mat.bumpMap) mat.bumpMap.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    mat.dispose();
  });
  MATERIAL_INSTANCE_CACHE.clear();
}
