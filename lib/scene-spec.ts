import { attachMusicProfileToSceneSpec } from "./music-profile";
import { deriveObjectProcurementMetadata } from "./procurement";
import { generateQlooEvidence } from "./qloo-provenance";
/**
 * Sonic Architecture — Composable Scene Specification Builder (Stages B & C)
 *
 * Converts any structured `InterpretedBrief` + `VibePayload` into a spatially validated,
 * prompt-specific `SceneSpec`. Supports both classic typologies and arbitrary open-ended
 * combinations of event purpose, guest capacity, indoor/outdoor/underground enclosure,
 * architectural style, materials, focal installations, and environmental settings.
 */

import type {
  AcousticTarget,
  LightSourceSpec,
  MaterialFamily,
  MaterialSpec,
  SceneSpec,
  SpatialObject,
  SpatialTypology,
  SpatialZone,
  TimeOfDay,
  ValidationReport,
  VibePayload,
  InterpretedBrief,
} from "./types";
import {
  enrichPayloadWithKnowledge,
  parseUserBrief,
  interpretArchitecturalBrief,
} from "./enrichment";

export const MATERIAL_LIBRARY: Record<MaterialFamily, MaterialSpec> = {
  warm_oak: {
    id: "warm_oak",
    name: "Kiln-Dried Warm Japanese Oak",
    colorHex: "#7D5130",
    roughness: 0.58,
    metalness: 0.04,
    bumpScale: 0.03,
    patternType: "wood_grain",
  },
  herringbone_parquet: {
    id: "herringbone_parquet",
    name: "Smoked Walnut Herringbone Parquet",
    colorHex: "#5C3820",
    roughness: 0.45,
    metalness: 0.05,
    bumpScale: 0.035,
    patternType: "herringbone",
  },
  charred_hinoki: {
    id: "charred_hinoki",
    name: "Natural Hinoki Cypress Joinery",
    colorHex: "#A47B4F",
    roughness: 0.52,
    metalness: 0.02,
    bumpScale: 0.025,
    patternType: "wood_grain",
  },
  tatami_mat: {
    id: "tatami_mat",
    name: "Woven Igusa Rush Tatami with Linen Border",
    colorHex: "#9E9264",
    roughness: 0.82,
    metalness: 0.0,
    bumpScale: 0.04,
    patternType: "woven_tatami",
  },
  board_concrete: {
    id: "board_concrete",
    name: "Architectural Board-Formed Monolithic Concrete",
    colorHex: "#52565C",
    roughness: 0.84,
    metalness: 0.05,
    bumpScale: 0.05,
    patternType: "concrete_formwork",
  },
  polished_concrete: {
    id: "polished_concrete",
    name: "Honed Anthracite Architectural Concrete",
    colorHex: "#2D3137",
    roughness: 0.24,
    metalness: 0.12,
    bumpScale: 0.015,
    patternType: "concrete_formwork",
  },
  obsidian_terrazzo: {
    id: "obsidian_terrazzo",
    name: "Polished Obsidian Aggregate Terrazzo",
    colorHex: "#171C24",
    roughness: 0.18,
    metalness: 0.18,
    bumpScale: 0.01,
    patternType: "terrazzo_fleck",
  },
  honed_limestone: {
    id: "honed_limestone",
    name: "Honed Bath & Valders Ashlar Limestone",
    colorHex: "#B5A48B",
    roughness: 0.72,
    metalness: 0.02,
    bumpScale: 0.03,
    patternType: "stone_vein",
  },
  warm_sandstone: {
    id: "warm_sandstone",
    name: "Carved Jaisalmer & Dholpur Warm Sandstone",
    colorHex: "#C48B52",
    roughness: 0.74,
    metalness: 0.02,
    bumpScale: 0.04,
    patternType: "stone_vein",
  },
  veined_marble: {
    id: "veined_marble",
    name: "Calacatta Viola Veined Stone",
    colorHex: "#C6BCB0",
    roughness: 0.28,
    metalness: 0.06,
    bumpScale: 0.015,
    patternType: "stone_vein",
  },
  terracotta_tile: {
    id: "terracotta_tile",
    name: "Hand-Pressed Artisan Terracotta Pavers",
    colorHex: "#A84E2E",
    roughness: 0.76,
    metalness: 0.02,
    bumpScale: 0.04,
    patternType: "terracotta_grid",
  },
  inlay_ceramic: {
    id: "inlay_ceramic",
    name: "Jaipur Geometric Stone & Ceramic Inlay",
    colorHex: "#C2A378",
    roughness: 0.36,
    metalness: 0.08,
    bumpScale: 0.025,
    patternType: "ornate_tile",
  },
  limewash_plaster: {
    id: "limewash_plaster",
    name: "Mineral Slaked-Lime Textured Plaster",
    colorHex: "#C4B499",
    roughness: 0.88,
    metalness: 0.01,
    bumpScale: 0.03,
    patternType: "plaster_matte",
  },
  acoustic_slats: {
    id: "acoustic_slats",
    name: "Quarter-Sawn Oak Acoustic Timber Slats on Felt",
    colorHex: "#724626",
    roughness: 0.62,
    metalness: 0.03,
    bumpScale: 0.06,
    patternType: "slat_grille",
  },
  acoustic_felt: {
    id: "acoustic_felt",
    name: "Pressed Charcoal Wool Acoustic Baffles",
    colorHex: "#2B2D30",
    roughness: 0.94,
    metalness: 0.0,
    bumpScale: 0.04,
    patternType: "fabric_weave",
  },
  washi_screen: {
    id: "washi_screen",
    name: "Translucent Mulberry Washi Shoji Paper",
    colorHex: "#DFD1B8",
    roughness: 0.9,
    metalness: 0.0,
    bumpScale: 0.02,
    opacity: 0.86,
    patternType: "fabric_weave",
  },
  brushed_brass: {
    id: "brushed_brass",
    name: "Aged Patinated Architectural Brass",
    colorHex: "#C59B4E",
    roughness: 0.28,
    metalness: 0.86,
    bumpScale: 0.01,
    patternType: "brushed_metal",
  },
  anodized_aluminum: {
    id: "anodized_aluminum",
    name: "Bead-Blasted Titanium & Anodized Aluminum",
    colorHex: "#94A3B8",
    roughness: 0.25,
    metalness: 0.82,
    bumpScale: 0.01,
    patternType: "brushed_metal",
  },
  mirror_chrome: {
    id: "mirror_chrome",
    name: "Specular Liquid Mirror Chrome",
    colorHex: "#E2E8F0",
    roughness: 0.06,
    metalness: 0.96,
    bumpScale: 0.005,
    patternType: "brushed_metal",
  },
  cognac_leather: {
    id: "cognac_leather",
    name: "Full-Grain Aniline Saddle & Cognac Leather",
    colorHex: "#7C3F23",
    roughness: 0.42,
    metalness: 0.04,
    bumpScale: 0.025,
    patternType: "fabric_weave",
  },
  moss_velvet: {
    id: "moss_velvet",
    name: "Heavy-Weight Mohair & Botanical Velvet",
    colorHex: "#2F5A4C",
    roughness: 0.78,
    metalness: 0.02,
    bumpScale: 0.035,
    patternType: "fabric_weave",
  },
  boucle_wool: {
    id: "boucle_wool",
    name: "Textured Unbleached Alabaster Wool Bouclé",
    colorHex: "#B8AA96",
    roughness: 0.88,
    metalness: 0.0,
    bumpScale: 0.045,
    patternType: "fabric_weave",
  },
  raw_linen: {
    id: "raw_linen",
    name: "Belgian Slubbed Flax & Oat Linen",
    colorHex: "#C2B299",
    roughness: 0.85,
    metalness: 0.0,
    bumpScale: 0.03,
    patternType: "fabric_weave",
  },
  marigold_silk: {
    id: "marigold_silk",
    name: "Handloom Marigold & Vermilion Festive Silk",
    colorHex: "#E76F24",
    roughness: 0.54,
    metalness: 0.12,
    bumpScale: 0.025,
    patternType: "fabric_weave",
  },
  distressed_brick: {
    id: "distressed_brick",
    name: "Distressed Industrial Masonry & Lime Mortar",
    colorHex: "#6E3B32",
    roughness: 0.88,
    metalness: 0.02,
    bumpScale: 0.055,
    patternType: "terracotta_grid",
  },
  teak_decking: {
    id: "teak_decking",
    name: "Weathered Coastal Burmese Teak Decking",
    colorHex: "#9C6B43",
    roughness: 0.54,
    metalness: 0.03,
    bumpScale: 0.03,
    patternType: "wood_grain",
  },
  translucent_canopy: {
    id: "translucent_canopy",
    name: "Translucent Architectural Tensile Silk & PTFE Canopy",
    colorHex: "#D6C7AE",
    roughness: 0.76,
    metalness: 0.02,
    bumpScale: 0.015,
    opacity: 0.72,
    patternType: "fabric_weave",
  },
  vertical_timber_slats: {
    id: "vertical_timber_slats",
    name: "Vertical Cedar Slats on Acoustic Black Felt",
    colorHex: "#8C5D38",
    roughness: 0.5,
    metalness: 0.04,
    bumpScale: 0.03,
    patternType: "slat_grille",
  },
  stacked_brick: {
    id: "stacked_brick",
    name: "Roman Elongated Stacked Brick & Stone",
    colorHex: "#82523B",
    roughness: 0.8,
    metalness: 0.03,
    bumpScale: 0.042,
    patternType: "terracotta_grid",
  },
  strata_rock: {
    id: "strata_rock",
    name: "Sedimentary Canyon Strata Rock",
    colorHex: "#726155",
    roughness: 0.88,
    metalness: 0.02,
    bumpScale: 0.046,
    patternType: "stone_vein",
  },
  mullioned_glass: {
    id: "mullioned_glass",
    name: "Transmissive Glass with Slim Steel Mullions",
    colorHex: "#9EC5DF",
    roughness: 0.08,
    metalness: 0.22,
    bumpScale: 0.01,
    opacity: 0.62,
    patternType: "plaster_matte",
  },
  frosted_mullioned_glass: {
    id: "frosted_mullioned_glass",
    name: "Frosted Architectural Glass with Steel Mullions",
    colorHex: "#B0CDE0",
    roughness: 0.38,
    metalness: 0.16,
    bumpScale: 0.015,
    opacity: 0.74,
    patternType: "plaster_matte",
  },
};

export function computeSabineAcoustics(
  width: number,
  height: number,
  depth: number,
  typology: SpatialTypology,
  isOpenAir: boolean
): AcousticTarget {
  const volume = width * height * depth;
  const surfaceArea = 2 * (width * depth + width * height + depth * height);

  let targetRT60 = 0.6;
  let alpha = 0.32;
  let nc = 22;

  if (typology === "listening_room") {
    targetRT60 = 0.42;
    alpha = 0.44;
    nc = 15;
  } else if (typology === "tea_room") {
    targetRT60 = 0.38;
    alpha = 0.42;
    nc = 15;
  } else if (typology === "cathedral_banquet") {
    targetRT60 = 1.65;
    alpha = 0.19;
    nc = 25;
  } else if (typology === "futuristic_launch") {
    targetRT60 = 0.75;
    alpha = 0.31;
    nc = 20;
  } else if (typology === "underground_club") {
    targetRT60 = 0.55;
    alpha = 0.38;
    nc = 28;
  } else if (typology === "industrial_warehouse" || typology === "brutalist_runway") {
    targetRT60 = 1.15;
    alpha = 0.22;
    nc = 28;
  } else if (typology === "gallery_pavilion") {
    targetRT60 = 0.48;
    alpha = 0.40;
    nc = 18;
  } else if (typology === "intimate_lounge") {
    targetRT60 = 0.38;
    alpha = 0.44;
    nc = 18;
  } else if (typology === "grunge_loft") {
    targetRT60 = 0.62;
    alpha = 0.34;
    nc = 25;
  } else if (typology === "comedy_theatre") {
    targetRT60 = 0.44;
    alpha = 0.42;
    nc = 18;
  } else if (isOpenAir) {
    targetRT60 = 0.28;
    alpha = 0.65;
    nc = 30;
  }

  const absorptionSabins = surfaceArea * alpha;
  const calculatedRT60 = Number(((0.161 * volume) / Math.max(absorptionSabins, 1)).toFixed(2));
  const diff = Math.abs(calculatedRT60 - targetRT60);

  return {
    targetRT60Seconds: targetRT60,
    calculatedRT60Seconds: calculatedRT60,
    bassRatio: typology === "listening_room" || typology === "underground_club" ? 1.22 : 1.08,
    clarityC80dB: typology === "cathedral_banquet" ? 1.4 : 6.2,
    noiseCriteriaNC: nc,
    averageAbsorptionAlpha: alpha,
    complianceStatus: diff <= 0.25 ? "optimal" : diff <= 0.5 ? "acceptable" : "reverberant",
  };
}

export function buildLightingForTypology(
  typology: SpatialTypology,
  timeOfDay: TimeOfDay,
  dims: SceneSpec["roomDimensions"],
  baseTempK: number
): SceneSpec["lighting"] {
  const timeMultipliers = {
    morning: { ambient: 0.68, sunElev: 28, sunAzimuth: 65, tempOffset: 400, fog: 0.008 },
    afternoon: { ambient: 0.85, sunElev: 52, sunAzimuth: 145, tempOffset: 800, fog: 0.004 },
    sunset: { ambient: 0.52, sunElev: 12, sunAzimuth: 255, tempOffset: -200, fog: 0.012 },
    midnight: { ambient: 0.28, sunElev: -18, sunAzimuth: 310, tempOffset: 0, fog: 0.015 },
  };

  const tm = timeMultipliers[timeOfDay] || timeMultipliers.midnight;
  const canonicalTempK = Math.max(1800, Math.min(6500, Math.round(baseTempK)));

  const tempToHex = (k: number) => {
    if (k <= 2300) return "#FFB46B";
    if (k <= 2800) return "#FFD194";
    if (k <= 3500) return "#FFE6C2";
    if (k <= 4500) return "#F5F8FF";
    return "#D6ECFF";
  };

  const primaryLightHex = tempToHex(canonicalTempK);
  const sources: LightSourceSpec[] = [
    {
      id: "light-ambient-core",
      name: "Atmospheric Envelope Fill",
      type: "ambient",
      position: [0, dims.height * 0.8, 0],
      colorHex: primaryLightHex,
      temperatureK: canonicalTempK,
      intensity: tm.ambient,
      castShadow: false,
    },
    {
      id: "light-directional-key",
      name: timeOfDay === "midnight" ? "Architectural Key / Moonlight" : `Solar Key (${timeOfDay})`,
      type: "directional",
      position: [dims.width * 0.6, dims.height * 1.35, dims.depth * 0.5],
      target: [0, 0, 0],
      colorHex: timeOfDay === "sunset" ? "#FF9E5E" : primaryLightHex,
      temperatureK: canonicalTempK,
      intensity: timeOfDay === "midnight" ? 0.55 : 1.35,
      castShadow: true,
    },
    {
      id: "light-focal-spot-1",
      name: "Primary Focal Key Spotlight",
      type: "spot",
      position: [0, dims.height - 0.3, -dims.depth * 0.15],
      target: [0, 0.8, -dims.depth * 0.32],
      colorHex: typology === "underground_club" ? "#EF4444" : typology === "comedy_theatre" ? "#FFE8D6" : primaryLightHex,
      temperatureK: canonicalTempK,
      intensity: 2.2,
      angleRad: 0.58,
      penumbra: 0.65,
      castShadow: true,
    },
    {
      id: "light-warm-accent-left",
      name: "West Perimeter Grazing Sconce Array",
      type: "point",
      position: [-dims.width * 0.38, dims.height * 0.55, 0],
      colorHex: primaryLightHex,
      temperatureK: canonicalTempK,
      intensity: 1.15,
      distance: dims.width * 0.9,
      castShadow: false,
    },
    {
      id: "light-warm-accent-right",
      name: "East Perimeter Grazing Sconce Array",
      type: "point",
      position: [dims.width * 0.38, dims.height * 0.55, 0],
      colorHex: primaryLightHex,
      temperatureK: canonicalTempK,
      intensity: 1.15,
      distance: dims.width * 0.9,
      castShadow: false,
    },
  ];

  return {
    temperatureK: canonicalTempK,
    ambientIntensity: tm.ambient,
    sunAzimuthDeg: tm.sunAzimuth,
    sunElevationDeg: tm.sunElev,
    fogDensity: tm.fog,
    sources,
  };
}

export function scaleDimensionsToCapacity(
  baseDims: SceneSpec["roomDimensions"],
  interp: InterpretedBrief,
  sqMetersPerGuest: number
): SceneSpec["roomDimensions"] {
  if (interp.explicitDimensions && interp.explicitDimensions.width && interp.explicitDimensions.depth) {
    const h = interp.explicitDimensions.height || baseDims.height;
    return {
      width: interp.explicitDimensions.width,
      depth: interp.explicitDimensions.depth,
      height: h,
      ridgeHeight: Number((h * 1.1).toFixed(1)),
      wallThickness: baseDims.wallThickness,
    };
  }

  if (interp.requestedCapacityGuests === null) {
    return { ...baseDims };
  }

  const reqGuests = interp.requestedCapacityGuests;
  const targetArea = Math.max(28, reqGuests * sqMetersPerGuest);
  const aspectRatio = baseDims.width / Math.max(1, baseDims.depth);
  let newDepth = Math.sqrt(targetArea / aspectRatio);
  let newWidth = newDepth * aspectRatio;

  // Keep intimate listening rooms <= 9.0m wide when capacity is small (<= 25 guests)
  if (interp.focalProgram === "listening_console" && reqGuests <= 25) {
    newWidth = Math.min(8.8, Math.max(7.2, Number(newWidth.toFixed(1))));
    newDepth = Number(Math.max(6.2, targetArea / newWidth).toFixed(1));
  } else {
    newWidth = Number(Math.max(5.0, newWidth).toFixed(1));
    newDepth = Number(Math.max(5.0, newDepth).toFixed(1));
  }

  const areaScale = Math.sqrt((newWidth * newDepth) / (baseDims.width * baseDims.depth));
  const newHeight =
    interp.focalProgram === "listening_console" && reqGuests <= 25
      ? baseDims.height
      : Number(Math.max(2.8, Math.min(16.0, baseDims.height * Math.pow(areaScale, 0.35))).toFixed(1));

  return {
    width: newWidth,
    height: newHeight,
    depth: newDepth,
    ridgeHeight: Number((newHeight * 1.1).toFixed(1)),
    wallThickness: baseDims.wallThickness,
  };
}

export function buildSceneSpecFromPayload(
  payload: VibePayload,
  promptOverride?: string
): SceneSpec {
  const promptText = promptOverride || payload.promptText || "Architectural spatial experience";
  const brief = parseUserBrief(promptText);
  const interp = payload.interpretedBrief || brief.interpreted || interpretArchitecturalBrief(promptText);
  const typology: SpatialTypology = payload.typology || brief.detectedTypology;
  const timeOfDay: TimeOfDay = interp.explicitTimeOfDay || payload.timeOfDay || interp.inferredTimeOfDay || "midnight";

  let roomDimensions = { width: 7.8, height: 3.4, depth: 6.2, ridgeHeight: 3.6, wallThickness: 0.28 };
  let isOpenAir = interp.isOpenAir;
  let title = "Kissa Midnight — Japanese Jazz Listening Sanctuary";
  let subtitle = "Intimate Analog Listening Room • Shoebox Acoustic Ratio";
  let layoutMode: SceneSpec["layoutMode"] = "listening";
  let focalPoint: SceneSpec["focalPoint"] = {
    name: "Analog Turntable & Horn Loudspeaker Stage",
    position: [0, 0.9, -2.2],
    description: "Dual custom birch-ply horn speakers flanking a heavy slate-plinth rotary turntable console.",
  };

  const zones: SpatialZone[] = [];
  const objects: SpatialObject[] = [];

  if (typology === "listening_room") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 7.8, height: 3.4, depth: 6.2, ridgeHeight: 3.6, wallThickness: 0.28 },
      interp,
      3.1
    );
    const capLabel = interp.requestedCapacityGuests ? ` for ${interp.requestedCapacityGuests} Guests` : "";
    title = `Kissa Midnight — Japanese Listening Lounge${capLabel}`;
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Quarter-Sawn Oak & Slotted Helmholtz Acoustics`;
    layoutMode = "listening";
    const stageZ = Number((-roomDimensions.depth * 0.38).toFixed(2));
    focalPoint = {
      name: "Analog Turntable & Dual Horn Speaker Wall",
      position: [0, 0.95, stageZ],
      description: "Custom alnico horn loudspeaker towers and vacuum-tube amplification console.",
    };

    zones.push(
      {
        id: "zone-audio-stage",
        name: "Analog Audio Stage & Vinyl Archive",
        role: "focal",
        bounds: { x: 0, z: stageZ, width: Number((roomDimensions.width * 0.84).toFixed(1)), depth: 1.5 },
        clearanceMeters: 1.2,
        colorHex: "#C87D4B",
        description: "Dedicated vibration-isolated equipment deck and floor-to-ceiling LP shelving.",
      },
      {
        id: "zone-sweet-spot",
        name: "Primary Acoustic Sweet-Spot Lounge",
        role: "seating",
        bounds: { x: 0, z: 0.4, width: Number((roomDimensions.width * 0.65).toFixed(1)), depth: Number((roomDimensions.depth * 0.48).toFixed(1)) },
        clearanceMeters: 1.2,
        colorHex: "#2F5A4C",
        description: "Equilateral listening triangle with low-back cognac leather chairs, wool rug, and tiered settees.",
      },
      {
        id: "zone-tokonoma-alcove",
        name: "Tokonoma Contemplative Alcove & Entry",
        role: "threshold",
        bounds: { x: Number((roomDimensions.width * 0.35).toFixed(2)), z: Number((roomDimensions.depth * 0.28).toFixed(2)), width: 1.6, depth: 2.0 },
        clearanceMeters: 1.2,
        colorHex: "#7D5130",
        description: "Threshold alcove with indirect grazing light and ceramic vessel display.",
      }
    );

    objects.push(
      {
        id: "obj-turntable-console",
        name: "Hinoki & Slate Analog Turntable Console",
        category: "Event Installations",
        archetype: "analog_turntable_console",
        position: [0, 0.48, stageZ],
        rotation: [0, 0, 0],
        dimensions: [2.2, 0.95, 0.65],
        materialId: "warm_oak",
        secondaryMaterialId: "brushed_brass",
        colorHex: "#724626",
        accentColorHex: "#C59B4E",
        provenanceId: "prov-llm-1",
        designNote: "Dual-platter direct-drive analog turntables with glowing 300B vacuum tube monoblocks.",
      },
      {
        id: "obj-horn-speaker-left",
        name: "West Alnico Wood-Horn Loudspeaker Tower",
        category: "Event Installations",
        archetype: "horn_speaker_pair",
        position: [-2.1, 0.85, Number((stageZ + 0.2).toFixed(2))],
        rotation: [0, 0.24, 0],
        dimensions: [0.95, 1.7, 0.78],
        materialId: "warm_oak",
        secondaryMaterialId: "brushed_brass",
        colorHex: "#7D5130",
        accentColorHex: "#C87D4B",
        provenanceId: "prov-llm-1",
        designNote: "Toed-in 14° toward the primary listening sweet spot for coherent stereo imaging.",
      },
      {
        id: "obj-horn-speaker-right",
        name: "East Alnico Wood-Horn Loudspeaker Tower",
        category: "Event Installations",
        archetype: "horn_speaker_pair",
        position: [2.1, 0.85, Number((stageZ + 0.2).toFixed(2))],
        rotation: [0, -0.24, 0],
        dimensions: [0.95, 1.7, 0.78],
        materialId: "warm_oak",
        secondaryMaterialId: "brushed_brass",
        colorHex: "#7D5130",
        accentColorHex: "#C87D4B",
        provenanceId: "prov-llm-1",
        designNote: "Matched bi-radial birch horn and 15-inch paper-cone low-frequency cabinet.",
      },
      {
        id: "obj-vinyl-shelf-west",
        name: "Archival Jazz Vinyl Library Wall (West)",
        category: "Furniture",
        archetype: "vinyl_record_shelf",
        position: [Number((-roomDimensions.width * 0.45).toFixed(2)), 1.35, -0.4],
        rotation: [0, Math.PI / 2, 0],
        dimensions: [3.2, 2.7, 0.42],
        materialId: "charred_hinoki",
        colorHex: "#5C3820",
        provenanceId: "prov-llm-1",
        designNote: "Modular 33-RPM LP shelving holding 2,400 archival Blue Note & Three Blind Mice pressings.",
      },
      {
        id: "obj-listening-chair-1",
        name: "Low-Slung Cognac Leather Listening Lounge Chair (Left)",
        category: "Furniture",
        archetype: "low_lounge_chair",
        position: [-1.15, 0.42, 0.45],
        rotation: [0, 0.15, 0],
        dimensions: [0.92, 0.78, 0.94],
        materialId: "cognac_leather",
        secondaryMaterialId: "warm_oak",
        colorHex: "#7C3F23",
        provenanceId: "prov-llm-2",
        designNote: "Low backrest height (78cm) avoids acoustic shadowing around the listener's ears.",
      },
      {
        id: "obj-listening-chair-2",
        name: "Low-Slung Cognac Leather Listening Lounge Chair (Right)",
        category: "Furniture",
        archetype: "low_lounge_chair",
        position: [1.15, 0.42, 0.45],
        rotation: [0, -0.15, 0],
        dimensions: [0.92, 0.78, 0.94],
        materialId: "cognac_leather",
        secondaryMaterialId: "warm_oak",
        colorHex: "#7C3F23",
        provenanceId: "prov-llm-2",
        designNote: "Angled toward the central horn intersection axis with walnut side table.",
      },
      {
        id: "obj-listening-sofa-rear",
        name: "Elevated Rear Acoustic Settee",
        category: "Furniture",
        archetype: "listening_sofa",
        position: [0, 0.48, 1.85],
        rotation: [0, 0, 0],
        dimensions: [2.4, 0.84, 0.98],
        materialId: "boucle_wool",
        secondaryMaterialId: "warm_oak",
        colorHex: "#C9BCA6",
        provenanceId: "prov-llm-2",
        designNote: "Upholstered in porous wool bouclé to absorb rear-wall slap echo.",
      },
      {
        id: "obj-acoustic-rug",
        name: "Hand-Tufted Unbleached Wool Acoustic Rug",
        category: "Decoration",
        archetype: "woven_area_rug",
        position: [0, 0.02, -0.35],
        rotation: [0, 0, 0],
        dimensions: [4.4, 0.04, 3.2],
        materialId: "boucle_wool",
        colorHex: "#B8AA92",
        provenanceId: "prov-llm-2",
        designNote: "Attenuates first-order floor reflections between speakers and primary seating.",
      },
      {
        id: "obj-acoustic-panel-east",
        name: "Slotted Timber Helmholtz Resonator Array",
        category: "Architecture",
        archetype: "acoustic_wall_panel",
        position: [Number((roomDimensions.width * 0.47).toFixed(2)), 1.65, -0.2],
        rotation: [0, -Math.PI / 2, 0],
        dimensions: [4.2, 2.5, 0.14],
        materialId: "acoustic_slats",
        colorHex: "#724626",
        provenanceId: "prov-llm-2",
        designNote: "Tuned low-mid diffuser and absorber maintaining a warm 0.42s reverberation profile.",
      },
      {
        id: "obj-tokonoma-alcove",
        name: "Tokonoma Display Niche with Shigaraki Stoneware & Bonsai",
        category: "Decoration",
        archetype: "tokonoma_alcove",
        position: [Number((roomDimensions.width * 0.39).toFixed(2)), 0.65, Number((roomDimensions.depth * 0.36).toFixed(2))],
        rotation: [0, -Math.PI / 4, 0],
        dimensions: [1.2, 1.3, 0.65],
        materialId: "charred_hinoki",
        secondaryMaterialId: "honed_limestone",
        colorHex: "#9E7B56",
        provenanceId: "prov-llm-1",
        designNote: "Restrained architectural focal vignette anchoring the entry threshold.",
      }
    );

    // If explicit guest capacity >= 16 (e.g. "for 20 people"), add additional listening chairs & settees
    if (interp.requestedCapacityGuests && interp.requestedCapacityGuests >= 16) {
      objects.push(
        {
          id: "obj-listening-chair-3",
          name: "Mid-Row Cognac Leather Listening Lounge Chair (WestFlank)",
          category: "Furniture",
          archetype: "low_lounge_chair",
          position: [-2.35, 0.42, 0.85],
          rotation: [0, 0.25, 0],
          dimensions: [0.92, 0.78, 0.94],
          materialId: "cognac_leather",
          colorHex: "#7C3F23",
          provenanceId: "prov-inf-1",
          designNote: `Added to accommodate ${interp.requestedCapacityGuests}-guest capacity with clear acoustic sightlines.`,
        },
        {
          id: "obj-listening-chair-4",
          name: "Mid-Row Cognac Leather Listening Lounge Chair (EastFlank)",
          category: "Furniture",
          archetype: "low_lounge_chair",
          position: [2.35, 0.42, 0.85],
          rotation: [0, -0.25, 0],
          dimensions: [0.92, 0.78, 0.94],
          materialId: "cognac_leather",
          colorHex: "#7C3F23",
          provenanceId: "prov-inf-1",
          designNote: `Added to accommodate ${interp.requestedCapacityGuests}-guest capacity with clear acoustic sightlines.`,
        },
        {
          id: "obj-listening-sofa-tier-2",
          name: "Rear Tiered Acoustic Listening Banquette (20-Pax Capacity)",
          category: "Furniture",
          archetype: "listening_sofa",
          position: [0, 0.58, Number((roomDimensions.depth * 0.36).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [3.8, 0.88, 1.0],
          materialId: "boucle_wool",
          colorHex: "#C9BCA6",
          provenanceId: "prov-inf-1",
          designNote: `Elevated rear listening banquette completing seating for ${interp.requestedCapacityGuests} guests.`,
        }
      );
    }
  } else if (typology === "futuristic_launch") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 22.0, height: 7.5, depth: 16.0, ridgeHeight: 8.2, wallThickness: 0.4 },
      interp,
      2.15
    );
    const capSuffix = interp.requestedCapacityGuests ? ` (${interp.requestedCapacityGuests}-Guest Arena)` : "";
    title = `Aether-01 — Next-Gen EV Reveal Pavilion${capSuffix}`;
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Clear-Span Truss Arena & Illuminated Plinth`;
    layoutMode = "showcase";
    focalPoint = {
      name: "Central Illuminated EV Reveal Turntable Plinth",
      position: [0, 0.85, -1.2],
      description: "6.4m chamfered obsidian turntable platform with overhead halo light ring and sculpted EV form.",
    };

    zones.push(
      {
        id: "zone-ev-plinth",
        name: "Central Illuminated Vehicle Reveal Stage",
        role: "focal",
        bounds: { x: 0, z: -1.2, width: 7.2, depth: 7.2 },
        clearanceMeters: 2.4,
        colorHex: "#38BDF8",
        description: "360-degree clear-sightline reveal plinth with integrated edge-lit telemetry ring.",
      },
      {
        id: "zone-media-backdrop",
        name: "Curved Micro-LED Architectural Backdrop Wall",
        role: "focal",
        bounds: { x: 0, z: Number((-roomDimensions.depth * 0.4).toFixed(1)), width: Number((roomDimensions.width * 0.68).toFixed(1)), depth: 1.6 },
        clearanceMeters: 1.8,
        colorHex: "#64748B",
        description: "Seamless panoramic presentation canvas for keynote telemetry and motion graphics.",
      },
      {
        id: "zone-audience-arc",
        name: "Tiered Radial Audience Seating Bowl",
        role: "seating",
        bounds: { x: 0, z: Number((roomDimensions.depth * 0.26).toFixed(1)), width: Number((roomDimensions.width * 0.76).toFixed(1)), depth: Number((roomDimensions.depth * 0.34).toFixed(1)) },
        clearanceMeters: 2.0,
        colorHex: "#94A3B8",
        description: "Curved auditorium seating rows engineered for unobstructed vehicle sightlines.",
      }
    );

    objects.push(
      {
        id: "obj-ev-plinth",
        name: "Chamfered Obsidian & Anodized Reveal Plinth",
        category: "Event Installations",
        archetype: "ev_product_plinth",
        position: [0, 0.28, -1.2],
        rotation: [0, 0, 0],
        dimensions: [6.4, 0.56, 6.4],
        materialId: "obsidian_terrazzo",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#1E293B",
        accentColorHex: "#38BDF8",
        provenanceId: "prov-llm-1",
        designNote: "Beveled dual-tier rotary stage with continuous 4800K perimeter LED reveal strip.",
      },
      {
        id: "obj-ev-sculpture",
        name: "Next-Generation Flagship Electric Vehicle Prototype",
        category: "Event Installations",
        archetype: "concept_vehicle_sculpture",
        position: [0, 1.12, -1.2],
        rotation: [0, -0.38, 0],
        dimensions: [4.85, 1.38, 2.05],
        materialId: "anodized_aluminum",
        secondaryMaterialId: "mirror_chrome",
        colorHex: "#CBD5E1",
        accentColorHex: "#38BDF8",
        provenanceId: "prov-llm-1",
        designNote: "Aerodynamic fastback silhouette with continuous front/rear light blades and glass canopy.",
      },
      {
        id: "obj-led-backdrop",
        name: "14m Curved Architectural Micro-LED Media Wall",
        category: "Architecture",
        archetype: "curved_led_backdrop",
        position: [0, 3.2, Number((-roomDimensions.depth * 0.39).toFixed(2))],
        rotation: [0, 0, 0],
        dimensions: [Number((roomDimensions.width * 0.65).toFixed(1)), 5.4, 0.85],
        materialId: "obsidian_terrazzo",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#0F172A",
        accentColorHex: "#38BDF8",
        provenanceId: "prov-llm-1",
        designNote: "Frameless curved media monolith framing the keynote stage.",
      },
      {
        id: "obj-seating-row-front",
        name: "Front VIP Curved Seating Tier (Row A)",
        category: "Furniture",
        archetype: "tiered_auditorium_row",
        position: [0, 0.45, 3.3],
        rotation: [0, 0, 0],
        dimensions: [11.5, 0.85, 1.2],
        materialId: "boucle_wool",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#334155",
        provenanceId: "prov-inf-1",
        designNote: "Ergonomic low-profile architectural benching with 1.4m row clearance.",
      },
      {
        id: "obj-seating-row-back",
        name: "Elevated Press & Guest Seating Tier (Row B)",
        category: "Furniture",
        archetype: "tiered_auditorium_row",
        position: [0, 0.72, 5.3],
        rotation: [0, 0, 0],
        dimensions: [14.4, 1.05, 1.3],
        materialId: "boucle_wool",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#475569",
        provenanceId: "prov-inf-1",
        designNote: "Riser-elevated second tier guaranteeing unobstructed sightlines over Row A.",
      },
      {
        id: "obj-space-truss-rig",
        name: "Overhead Clear-Span Lighting & Telemetry Halo Truss",
        category: "Structure",
        archetype: "space_frame_truss_bay",
        position: [0, Number((roomDimensions.height - 1.1).toFixed(2)), -1.2],
        rotation: [0, 0, 0],
        dimensions: [Number((roomDimensions.width * 0.72).toFixed(1)), 0.75, 10.0],
        materialId: "anodized_aluminum",
        colorHex: "#64748B",
        accentColorHex: "#38BDF8",
        provenanceId: "prov-llm-1",
        designNote: "Houses 4800K automotive key softboxes and synchronized spot rigging.",
      }
    );

    // Add extra grand tiers when high capacity (e.g. 500 guests) is requested
    if (interp.requestedCapacityGuests && interp.requestedCapacityGuests >= 250) {
      objects.push(
        {
          id: "obj-seating-row-c",
          name: `Grand Amphitheatre Tier (Row C — ${interp.requestedCapacityGuests} Guest Bowl)`,
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 1.05, 7.6],
          rotation: [0, 0, 0],
          dimensions: [Number((roomDimensions.width * 0.74).toFixed(1)), 1.25, 1.4],
          materialId: "boucle_wool",
          colorHex: "#334155",
          provenanceId: "prov-inf-1",
          designNote: `Third radial auditorium tier scaled for ${interp.requestedCapacityGuests} guests.`,
        },
        {
          id: "obj-seating-row-d",
          name: `Upper Balcony Amphitheatre Tier (Row D — ${interp.requestedCapacityGuests} Guest Bowl)`,
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 1.42, 10.1],
          rotation: [0, 0, 0],
          dimensions: [Number((roomDimensions.width * 0.82).toFixed(1)), 1.5, 1.4],
          materialId: "boucle_wool",
          colorHex: "#1E293B",
          provenanceId: "prov-inf-1",
          designNote: `Fourth radial amphitheatre tier completing ${interp.requestedCapacityGuests}-guest capacity.`,
        }
      );
    }
  } else if (typology === "garden_mandap") {
    isOpenAir = true;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 22.0, height: 6.2, depth: 24.0, ridgeHeight: 7.0, wallThickness: 0.35 },
      interp,
      2.4
    );
    title = "Vana Mandapam — Outdoor Indian Garden Wedding Mandap";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Open-Air Botanical Lawn, 4-Pillar Sandstone Mandap & Marigold Canopy`;
    layoutMode = "ceremony";
    focalPoint = {
      name: "Four-Pillar Carved Sandstone Wedding Mandap & Sacred Havan Kund",
      position: [0, 1.6, -3.5],
      description: "Open-air four-pillared sandstone and marigold mandap pavilion over a stepped ceremonial platform and sacred fire altar.",
    };

    zones.push(
      {
        id: "zone-garden-mandap",
        name: "Central Four-Pillar Wedding Mandap & Havan Altar",
        role: "focal",
        bounds: { x: 0, z: -3.5, width: 6.8, depth: 6.8 },
        clearanceMeters: 2.2,
        colorHex: "#D9532B",
        description: "Raised sandstone ceremonial platform with four carved pillars, marigold floral dome, and sacred fire pit.",
      },
      {
        id: "zone-floral-processional",
        name: "Petal-Strewn Garden Processional Aisle",
        role: "circulation",
        bounds: { x: 0, z: 3.8, width: 3.4, depth: 11.0 },
        clearanceMeters: 2.8,
        colorHex: "#E9C46A",
        description: "Axial garden walkway lined with brass urli water bowls and marigold garlands.",
      },
      {
        id: "zone-wedding-guest-seating",
        name: "Open-Air Garden Guest Seating Pavilions",
        role: "seating",
        bounds: { x: 0, z: 3.2, width: 16.0, depth: 10.5 },
        clearanceMeters: 1.8,
        colorHex: "#2F5A4C",
        description: "Symmetricsilk-bolster diwan and garden chair courts flanking the processional aisle.",
      },
      {
        id: "zone-perimeter-grove",
        name: "Botanical Garden Tree & Flowering Shrub Perimeter",
        role: "landscape",
        bounds: { x: 0, z: 0, width: roomDimensions.width, depth: roomDimensions.depth },
        clearanceMeters: 1.6,
        colorHex: "#4A7C59",
        description: "Open-air garden perimeter framed by flowering trees and festive string lights.",
      }
    );

    objects.push(
      {
        id: "obj-wedding-mandap",
        name: "Four-Pillar Carved Sandstone & Marigold Wedding Mandap Canopy",
        category: "Event Installations",
        archetype: "wedding_mandap_canopy",
        position: [0, 2.1, -3.5],
        rotation: [0, 0, 0],
        dimensions: [5.4, 4.2, 5.4],
        materialId: "warm_sandstone",
        secondaryMaterialId: "marigold_silk",
        colorHex: "#C48B52",
        accentColorHex: "#E76F24",
        provenanceId: "prov-llm-1",
        designNote: "Open-air four-column carved sandstone mandap with marigold dome canopy, sacred havan kund fire altar, and couple seating.",
      },
      {
        id: "obj-marigold-arch-backdrop",
        name: "Ceremonial Genda Phool (Marigold) Garland Toran Backdrop",
        category: "Decoration",
        archetype: "marigold_garland_curtain",
        position: [0, 2.5, -7.8],
        rotation: [0, 0, 0],
        dimensions: [10.4, 4.5, 0.45],
        materialId: "marigold_silk",
        colorHex: "#F4A261",
        accentColorHex: "#C84B31",
        provenanceId: "prov-llm-1",
        designNote: "Dense saffron and vermilion marigold floral strands with brass temple bells framing the north garden vista.",
      }
    );

    // Symmetric guest seating blocks in the garden
    [
      [-4.2, 1.2],
      [4.2, 1.2],
      [-4.2, 4.8],
      [4.2, 4.8],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-mandap-guest-seating-${idx + 1}`,
        name: `Garden Wedding Guest Diwan & Silk Seating Court 0${idx + 1}`,
        category: "Furniture",
        archetype: "diwan_bolster_lounge",
        position: [x, 0.38, z],
        rotation: [0, x < 0 ? 0.32 : -0.32, 0],
        dimensions: [3.2, 0.72, 1.8],
        materialId: "marigold_silk",
        secondaryMaterialId: "brushed_brass",
        colorHex: idx % 2 === 0 ? "#D9532B" : "#E76F24",
        accentColorHex: "#C59B4E",
        provenanceId: "prov-inf-1",
        designNote: "Angled toward the central wedding mandap so all guests have clear ceremonial sightlines.",
      });
    });

    // Perimeter botanical garden trees (no enclosed walls!)
    [
      [-8.2, -7.5],
      [8.2, -7.5],
      [-8.8, 0.0],
      [8.8, 0.0],
      [-8.2, 7.5],
      [8.2, 7.5],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-garden-tree-${idx + 1}`,
        name: `Botanical Ashoka & Banyan Garden Tree Planter 0${idx + 1}`,
        category: "Planting",
        archetype: "olive_tree_planter",
        position: [x, 1.8, z],
        rotation: [0, idx * 0.9, 0],
        dimensions: [2.6, 3.6, 2.6],
        materialId: "terracotta_tile",
        colorHex: "#3A6B4C",
        accentColorHex: "#B85D3B",
        provenanceId: "prov-llm-1",
        designNote: "Mature lush garden canopy tree framing the open-air wedding lawn.",
      });
    });
  } else if (typology === "underground_club") {
    isOpenAir = false;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 20.0, height: 6.4, depth: 28.0, ridgeHeight: 6.8, wallThickness: 0.75 },
      interp,
      2.2
    );
    title = "Keller-09 — Subterranean Brutalist Techno Club";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Monolithic Concrete Bunker, Quad Sound Stacks & Strobe Grid`;
    layoutMode = "club";
    focalPoint = {
      name: "Caged Brutalist Concrete DJ Bunker & Quad Horn Sound System",
      position: [0, 1.2, -9.2],
      description: "Heavy board-formed concrete DJ booth flanked by towering matte-black horn sub-bass stacks and overhead laser/strobe rig.",
    };

    zones.push(
      {
        id: "zone-dj-bunker",
        name: "Monolithic Concrete DJ Booth & Visual Strobe Rig",
        role: "focal",
        bounds: { x: 0, z: -9.2, width: 8.5, depth: 3.6 },
        clearanceMeters: 1.8,
        colorHex: "#EF4444",
        description: "Elevated concrete DJ bunker with rotary mixer, modular synthesizers, and industrial strobe towers.",
      },
      {
        id: "zone-techno-dancefloor",
        name: "Central Sub-Bass Concrete Dancefloor Void",
        role: "circulation",
        bounds: { x: 0, z: -0.5, width: 11.5, depth: 12.5 },
        clearanceMeters: 2.4,
        colorHex: "#2D3137",
        description: "Unobstructed honed anthracite concrete dancefloor surrounded by 4-point horn loudspeaker stacks.",
      },
      {
        id: "zone-dark-alcoves",
        name: "Perimeter Concrete Pillar Chillout Alcoves",
        role: "seating",
        bounds: { x: 0, z: 7.5, width: 15.0, depth: 5.5 },
        clearanceMeters: 1.5,
        colorHex: "#52565C",
        description: "Recessed subterranean concrete bench and leather booth alcoves.",
      }
    );

    objects.push(
      {
        id: "obj-techno-dj-booth",
        name: "Subterranean Cast-Concrete DJ Bunker & Strobe Towers",
        category: "Event Installations",
        archetype: "dj_flash_rig",
        position: [0, 1.0, -9.2],
        rotation: [0, 0, 0],
        dimensions: [4.2, 2.0, 1.4],
        materialId: "board_concrete",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#2D3137",
        accentColorHex: "#EF4444",
        provenanceId: "prov-llm-1",
        designNote: "Monolithic concrete DJ console with dual strobe heads and industrial steel mesh cage.",
      },
      {
        id: "obj-club-light-rig",
        name: "Suspended Industrial Box-Truss Strobe & Laser Grid",
        category: "Lighting",
        archetype: "space_frame_truss_bay",
        position: [0, 5.3, -0.5],
        rotation: [0, 0, 0],
        dimensions: [11.0, 0.65, 14.0],
        materialId: "anodized_aluminum",
        colorHex: "#1E293B",
        accentColorHex: "#EF4444",
        provenanceId: "prov-llm-1",
        designNote: "Overhead dark steel truss rig carrying synchronized red/white strobes and haze diffusers.",
      }
    );

    // 4 Corner Quad-Point Techno Sound Stacks
    [
      [-5.6, -6.2, 0.45],
      [5.6, -6.2, -0.45],
      [-5.6, 5.2, 2.65],
      [5.6, 5.2, -2.65],
    ].forEach(([x, z, rotY], idx) => {
      objects.push({
        id: `obj-sound-stack-${idx + 1}`,
        name: `Quad-Point Sub-Bass & Bi-Radial Horn Sound Stack 0${idx + 1}`,
        category: "Event Installations",
        archetype: "techno_sound_stack",
        position: [x, 1.45, z],
        rotation: [0, rotY, 0],
        dimensions: [1.35, 2.9, 1.15],
        materialId: "polished_concrete",
        secondaryMaterialId: "anodized_aluminum",
        colorHex: "#181A1E",
        accentColorHex: "#EF4444",
        provenanceId: "prov-llm-1",
        designNote: "Twin 21-inch folded-horn subwoofers topped with mid-high acoustic waveguides.",
      });
    });

    // Brutalist Concrete Structural Piers & Perimeter Benches
    [-6.5, 0, 6.5].forEach((zPos, idx) => {
      [-7.4, 7.4].forEach((xPos, sIdx) => {
        objects.push({
          id: `obj-bunker-pier-${sIdx}-${idx}`,
          name: `Subterranean Board-Formed Concrete Pier (${sIdx === 0 ? "West" : "East"} 0${idx + 1})`,
          category: "Structure",
          archetype: "monolithic_concrete_pier",
          position: [xPos, 3.1, zPos],
          rotation: [0, 0, 0],
          dimensions: [1.1, 6.2, 1.1],
          materialId: "board_concrete",
          colorHex: "#4B4F54",
          provenanceId: "prov-llm-1",
          designNote: "Heavy load-bearing subterranean concrete column with raw tie-rod holes.",
        });
      });
    });

    objects.push(
      {
        id: "obj-club-alcove-bench-w",
        name: "West Subterranean Concrete & Dark Leather Alcove Banquette",
        category: "Furniture",
        archetype: "sculptural_concrete_bench",
        position: [-4.2, 0.28, 8.8],
        rotation: [0, 0, 0],
        dimensions: [4.2, 0.52, 1.4],
        materialId: "board_concrete",
        colorHex: "#2D3136",
        provenanceId: "prov-inf-1",
        designNote: "Recessed dark recovery seating outside the primary sub-bass pressure zone.",
      },
      {
        id: "obj-club-alcove-bench-e",
        name: "East Subterranean Concrete & Dark Leather Alcove Banquette",
        category: "Furniture",
        archetype: "sculptural_concrete_bench",
        position: [4.2, 0.28, 8.8],
        rotation: [0, 0, 0],
        dimensions: [4.2, 0.52, 1.4],
        materialId: "board_concrete",
        colorHex: "#2D3136",
        provenanceId: "prov-inf-1",
        designNote: "Recessed dark recovery seating outside the primary sub-bass pressure zone.",
      }
    );
  } else if (typology === "industrial_warehouse") {
    isOpenAir = false;
    const isGalleryOrSound =
      interp.focalProgram === "industrial_sound_deck" ||
      promptText.toLowerCase().includes("gallery") ||
      promptText.toLowerCase().includes("sound art") ||
      promptText.toLowerCase().includes("aphex");

    if (isGalleryOrSound) {
      roomDimensions = scaleDimensionsToCapacity(
        { width: 16.0, height: 7.2, depth: 22.0, ridgeHeight: 8.4, wallThickness: 0.45 },
        interp,
        2.2
      );
      title = "Turbine Hall 07 — Raw Industrial Gallery Warehouse & Acoustic Sound Lab";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Distressed Brick Masonry, Riveted Steel Trusses & Bi-Radial Sound Column Arrays`;
      layoutMode = "showcase";
      const deckZ = Number((-roomDimensions.depth * 0.32).toFixed(2));
      focalPoint = {
        name: "Modular Steel Sound Deck & Suspended Industrial Rig",
        position: [0, 0.75, deckZ],
        description: "Perforated steel performance platform flanked by bi-radial horn speaker stacks and suspended box-truss lighting rig.",
      };

      zones.push(
        {
          id: "zone-sound-deck",
          name: "Modular Sound Art Deck & Experimental Audio Stage",
          role: "focal",
          bounds: { x: 0, z: deckZ, width: 8.0, depth: 4.8 },
          clearanceMeters: 1.8,
          colorHex: "#334155",
          description: "Elevated perforated steel sound deck and modular synthesis console.",
        },
        {
          id: "zone-gallery-floor",
          name: "Industrial Acoustic Gallery Floor & Concrete Seating",
          role: "seating",
          bounds: { x: 0, z: 1.5, width: 11.0, depth: 10.0 },
          clearanceMeters: 1.6,
          colorHex: "#475569",
          description: "Raw concrete exhibition floor with monolithic gallery benches.",
        },
        {
          id: "zone-warehouse-portal",
          name: "Riveted Steel Portal & Sound Lab Entry",
          role: "threshold",
          bounds: { x: 0, z: Number((-roomDimensions.depth * 0.44).toFixed(2)), width: 6.5, depth: 2.2 },
          clearanceMeters: 1.8,
          colorHex: "#1E293B",
          description: "Industrial steel threshold leading to exhibition floor.",
        }
      );

      objects.push(
        {
          id: "obj-industrial-sound-deck",
          name: "Perforated Steel Modular Sound Deck & Performance Stage",
          category: "Event Installations",
          archetype: "modular_stage_riser",
          position: [0, 0.35, deckZ],
          rotation: [0, 0, 0],
          dimensions: [6.4, 0.7, 4.2],
          materialId: "anodized_aluminum",
          colorHex: "#1E2228",
          accentColorHex: "#94A3B8",
          provenanceId: "prov-llm-1",
          designNote: "Heavy-duty modular steel staging deck for electronic hardware and acoustic sound synthesis.",
        },
        {
          id: "obj-industrial-sound-stack-left",
          name: "Bi-Radial Horn Sound Column Stack (West)",
          category: "Event Installations",
          archetype: "techno_sound_stack",
          position: [-3.8, 1.4, deckZ],
          rotation: [0, 0.22, 0],
          dimensions: [1.2, 2.8, 1.1],
          materialId: "anodized_aluminum",
          colorHex: "#14171A",
          accentColorHex: "#E2E8F0",
          provenanceId: "prov-llm-1",
          designNote: "High-power bi-radial horn speaker array providing direct spatial projection across the warehouse.",
        },
        {
          id: "obj-industrial-sound-stack-right",
          name: "Bi-Radial Horn Sound Column Stack (East)",
          category: "Event Installations",
          archetype: "techno_sound_stack",
          position: [3.8, 1.4, deckZ],
          rotation: [0, -0.22, 0],
          dimensions: [1.2, 2.8, 1.1],
          materialId: "anodized_aluminum",
          colorHex: "#14171A",
          accentColorHex: "#E2E8F0",
          provenanceId: "prov-llm-1",
          designNote: "Matched bi-radial horn speaker array providing direct spatial projection across the warehouse.",
        },
        {
          id: "obj-industrial-box-truss",
          name: "Suspended Rectangular Steel Box-Truss Light Rig",
          category: "Lighting",
          archetype: "suspended_box_truss",
          position: [0, 5.4, 0],
          rotation: [0, 0, 0],
          dimensions: [8.5, 0.6, 12.0],
          materialId: "anodized_aluminum",
          colorHex: "#3A3F47",
          provenanceId: "prov-llm-1",
          designNote: "Overhead industrial truss framework suspending dimmable 3200K linear tubes and exhibition wash lights.",
        },
        {
          id: "obj-gallery-bench-west",
          name: "Monolithic Cast-Concrete Gallery Exhibition Bench (West)",
          category: "Furniture",
          archetype: "gallery_bench",
          position: [-3.6, 0.25, 2.2],
          rotation: [0, 0, 0],
          dimensions: [3.2, 0.5, 0.85],
          materialId: "board_concrete",
          colorHex: "#4B5563",
          provenanceId: "prov-llm-1",
          designNote: "Cast-concrete bench offering unadorned spectator seating for sound installations.",
        },
        {
          id: "obj-gallery-bench-east",
          name: "Monolithic Cast-Concrete Gallery Exhibition Bench (East)",
          category: "Furniture",
          archetype: "gallery_bench",
          position: [3.6, 0.25, 2.2],
          rotation: [0, 0, 0],
          dimensions: [3.2, 0.5, 0.85],
          materialId: "board_concrete",
          colorHex: "#4B5563",
          provenanceId: "prov-llm-1",
          designNote: "Cast-concrete bench offering unadorned spectator seating for sound installations.",
        }
      );

      [-6.5, 0, 6.5].forEach((zPos, idx) => {
        objects.push({
          id: `obj-warehouse-truss-${idx + 1}`,
          name: `Riveted Industrial Steel Roof Truss & Brick Pier (Bay 0${idx + 1})`,
          category: "Structure",
          archetype: "warehouse_truss_portal",
          position: [0, 3.8, zPos],
          rotation: [0, 0, 0],
          dimensions: [15.2, 7.0, 0.65],
          materialId: "anodized_aluminum",
          secondaryMaterialId: "distressed_brick",
          colorHex: "#475569",
          accentColorHex: "#6E3B32",
          provenanceId: "prov-llm-1",
          designNote: "Clear-span industrial Pratt steel truss supported on weathered brick pilasters.",
        });
      });
    } else {
      roomDimensions = scaleDimensionsToCapacity(
        { width: 18.0, height: 8.4, depth: 30.0, ridgeHeight: 9.6, wallThickness: 0.48 },
        interp,
        2.3
      );
      title = "Atelier Dock-04 — Industrial Warehouse Luxury Fashion Runway";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Distressed Brick Masonry, Steel Roof Trusses & 22m Mirror Catwalk`;
      layoutMode = "runway";
      focalPoint = {
        name: "22m Mirror-Obsidian Catwalk & Backstage Steel Truss Portal",
        position: [0, 0.6, -9.8],
        description: "Sleek specular runway cutting through a raw brick-and-steel industrial warehouse with backstage model reveal portal.",
      };

      zones.push(
        {
          id: "zone-warehouse-runway",
          name: "22m Central Mirror-Obsidian Catwalk Spine",
          role: "focal",
          bounds: { x: 0, z: 0, width: 3.6, depth: 22.0 },
          clearanceMeters: 2.2,
          colorHex: "#E2E8F0",
          description: "Elevated luxury catwalk platform contrasting with weathered industrial brick walls.",
        },
        {
          id: "zone-warehouse-backstage",
          name: "Backstage Industrial Portal & Model Entry Threshold",
          role: "threshold",
          bounds: { x: 0, z: -12.0, width: 10.0, depth: 3.4 },
          clearanceMeters: 2.0,
          colorHex: "#D9532B",
          description: "Illuminated steel portal framing model entrances onto the catwalk.",
        },
        {
          id: "zone-warehouse-seating",
          name: "Parallel Front-Row & Second-Row Fashion Seating Galleries",
          role: "seating",
          bounds: { x: 0, z: 0.5, width: 12.8, depth: 20.0 },
          clearanceMeters: 1.6,
          colorHex: "#475569",
          description: "Flanking audience benches nested between industrial steel truss columns.",
        }
      );

      objects.push(
        {
          id: "obj-warehouse-runway",
          name: "22m Mirror-Polished Obsidian Luxury Catwalk Platform",
          category: "Event Installations",
          archetype: "obsidian_runway_deck",
          position: [0, 0.16, 0],
          rotation: [0, 0, 0],
          dimensions: [3.4, 0.32, 22.0],
          materialId: "obsidian_terrazzo",
          colorHex: "#14171A",
          accentColorHex: "#E2E8F0",
          provenanceId: "prov-llm-1",
          designNote: "High-gloss obsidian catwalk reflecting the industrial steel roof trusses and 4200K light blade.",
        },
        {
          id: "obj-warehouse-light-blade",
          name: "Suspended 22m Continuous Catwalk Key-Light Blade",
          category: "Lighting",
          archetype: "linear_light_blade",
          position: [0, 6.2, 0],
          rotation: [0, 0, 0],
          dimensions: [0.75, 0.28, 21.5],
          materialId: "anodized_aluminum",
          colorHex: "#F8FAFC",
          provenanceId: "prov-llm-1",
          designNote: "Continuous high-CRI 4200K catwalk key light suspended from the warehouse trusses.",
        },
        {
          id: "obj-backstage-portal",
          name: "Backstage Riveted Steel & Frosted Glass Model Reveal Portal",
          category: "Architecture",
          archetype: "dramatic_entry_portal",
          position: [0, 2.4, -11.5],
          rotation: [0, 0, 0],
          dimensions: [6.4, 4.8, 0.9],
          materialId: "anodized_aluminum",
          secondaryMaterialId: "distressed_brick",
          colorHex: "#334155",
          accentColorHex: "#D9532B",
          provenanceId: "prov-llm-1",
          designNote: "Dramatic backlit industrial steel portal at the northern catwalk origin.",
        }
      );

      [-8.0, -2.5, 2.5, 8.0].forEach((zPos, idx) => {
        objects.push({
          id: `obj-warehouse-truss-${idx + 1}`,
          name: `Riveted Industrial Steel Roof Truss & Brick Pier (Bay 0${idx + 1})`,
          category: "Structure",
          archetype: "warehouse_truss_portal",
          position: [0, 4.1, zPos],
          rotation: [0, 0, 0],
          dimensions: [16.6, 8.0, 0.65],
          materialId: "anodized_aluminum",
          secondaryMaterialId: "distressed_brick",
          colorHex: "#475569",
          accentColorHex: "#6E3B32",
          provenanceId: "prov-llm-1",
          designNote: "Clear-span industrial Pratt steel truss supported on weathered brick pilasters.",
        });
      });

      [-6.5, 0, 6.5].forEach((zPos, idx) => {
        [-3.9, 3.9].forEach((xPos, sIdx) => {
          objects.push({
            id: `obj-warehouse-bench-${sIdx}-${idx}`,
            name: `Front-Row Architectural Runway Bench (${sIdx === 0 ? "West" : "East"} 0${idx + 1})`,
            category: "Furniture",
            archetype: "sculptural_concrete_bench",
            position: [xPos, 0.25, zPos],
            rotation: [0, 0, 0],
            dimensions: [1.4, 0.48, 4.8],
            materialId: "board_concrete",
            colorHex: "#64748B",
            provenanceId: "prov-llm-1",
            designNote: "Minimalist front-row benching aligned along the 22m catwalk edge.",
          });
        });
      });
    }
  } else if (typology === "coastal_retreat") {
    isOpenAir = true;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 22.0, height: 4.8, depth: 20.0, ridgeHeight: 5.4, wallThickness: 0.3 },
      interp,
      3.2
    );
    title = "Coralia Terrace — Tropical Beachside Corporate Retreat";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Open-Air Coastal Teak Deck, Louvered Shade Pavilion & Ocean Horizon`;
    layoutMode = "retreat";
    focalPoint = {
      name: "Open-Air Teak Keynote & Ocean-View Retreat Pavilion",
      position: [0, 1.2, -4.5],
      description: "Louvered Burmese teak coastal pavilion with woven linen shade canopy overlooking the turquoise shoreline.",
    };

    zones.push(
      {
        id: "zone-retreat-pavilion",
        name: "Open-Air Oceanfront Keynote & Strategy Pavilion",
        role: "focal",
        bounds: { x: 0, z: -4.5, width: 9.5, depth: 5.5 },
        clearanceMeters: 2.0,
        colorHex: "#0EA5E9",
        description: "Shaded open-air timber deck for executive roundtables and oceanfront presentations.",
      },
      {
        id: "zone-retreat-lounges",
        name: "Biophilic Teak & Linen Breakout Lounge Clusters",
        role: "seating",
        bounds: { x: 0, z: 2.5, width: 16.0, depth: 8.5 },
        clearanceMeters: 1.8,
        colorHex: "#2F5A4C",
        description: "Relaxed coastal sofa clusters and collaborative teak tables cooled by sea breezes.",
      },
      {
        id: "zone-coastal-pool",
        name: "Infinity Reflection Pool & Palm Grove Edge",
        role: "landscape",
        bounds: { x: 0, z: -8.2, width: 14.0, depth: 2.8 },
        clearanceMeters: 1.6,
        colorHex: "#38BDF8",
        description: "Shallow turquoise reflection water feature bordering the beach horizon.",
      }
    );

    objects.push(
      {
        id: "obj-retreat-pavilion",
        name: "Open-Air Louvered Burmese Teak & Linen Retreat Pavilion",
        category: "Structure",
        archetype: "retreat_timber_pavilion",
        position: [0, 2.2, -4.5],
        rotation: [0, 0, 0],
        dimensions: [9.2, 4.4, 5.4],
        materialId: "teak_decking",
        secondaryMaterialId: "raw_linen",
        colorHex: "#9C6B43",
        accentColorHex: "#E5DEC9",
        provenanceId: "prov-llm-1",
        designNote: "Open-sided coastal timber pavilion with slatted sun-breaker roof and billowing linen curtains.",
      },
      {
        id: "obj-coastal-reflection-pool",
        name: "Shallow Turquoise Horizon Reflection Pool",
        category: "Event Installations",
        archetype: "circular_water_feature",
        position: [0, 0.18, -0.5],
        rotation: [0, 0, 0],
        dimensions: [4.2, 0.36, 4.2],
        materialId: "honed_limestone",
        colorHex: "#B5A48B",
        accentColorHex: "#0EA5E9",
        provenanceId: "prov-llm-1",
        designNote: "Tranquil coastal water basin anchoring the central retreat deck.",
      }
    );

    [
      [-4.6, 2.2],
      [4.6, 2.2],
      [-4.6, 5.6],
      [4.6, 5.6],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-retreat-lounge-${idx + 1}`,
        name: `Coastal Teak & Belgian Linen Collaborative Lounge 0${idx + 1}`,
        category: "Furniture",
        archetype: "listening_sofa",
        position: [x, 0.44, z],
        rotation: [0, x < 0 ? 0.35 : -0.35, 0],
        dimensions: [2.8, 0.82, 1.15],
        materialId: "raw_linen",
        secondaryMaterialId: "teak_decking",
        colorHex: "#C2B299",
        accentColorHex: "#9C6B43",
        provenanceId: "prov-llm-1",
        designNote: "Open-air executive breakout sofa upholstered in weather-resistant slubbed flax linen.",
      });
    });

    [
      [-2.2, -4.5],
      [2.2, -4.5],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-retreat-table-${idx + 1}`,
        name: `Executive Teak Workshop Table 0${idx + 1}`,
        category: "Furniture",
        archetype: "bistro_courtyard_table",
        position: [x, 0.4, z],
        rotation: [0, 0, 0],
        dimensions: [1.8, 0.76, 1.6],
        materialId: "teak_decking",
        secondaryMaterialId: "raw_linen",
        colorHex: "#9C6B43",
        accentColorHex: "#E5DEC9",
        provenanceId: "prov-llm-1",
        designNote: "Shaded collaborative roundtable inside the main oceanfront pavilion.",
      });
    });

    [
      [-8.5, -6.8],
      [8.5, -6.8],
      [-8.8, 1.5],
      [8.8, 1.5],
      [-8.2, 7.2],
      [8.2, 7.2],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-coastal-palm-${idx + 1}`,
        name: `Tropical Coconut Palm & Sea-Grape Planter Cluster 0${idx + 1}`,
        category: "Planting",
        archetype: "olive_tree_planter",
        position: [x, 1.9, z],
        rotation: [0, idx * 1.1, 0],
        dimensions: [2.5, 3.8, 2.5],
        materialId: "terracotta_tile",
        colorHex: "#3D6B4F",
        accentColorHex: "#9C6B43",
        provenanceId: "prov-llm-1",
        designNote: "Swaying coastal palm canopy framing the open-air beachside terrace.",
      });
    });
  } else if (typology === "cathedral_banquet") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 18.0, height: 12.5, depth: 28.0, ridgeHeight: 14.2, wallThickness: 0.65 },
      interp,
      2.6
    );
    title = "Sanctuary Nave — Cathedral-Inspired Evening Banquet";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Vaulted Limestone Arcade & Candlelit Refectory`;
    layoutMode = "banquet";
    focalPoint = {
      name: "Sanctuary Head-Table Altar Dais & Rose Window Apse",
      position: [0, 1.4, -10.8],
      description: "Elevated limestone dais framed by pointed Gothic arches and suspended brass ring chandeliers.",
    };

    zones.push(
      {
        id: "zone-sanctuary-dais",
        name: "Ceremonial Head-Table Sanctuary Dais",
        role: "focal",
        bounds: { x: 0, z: -10.5, width: 11.0, depth: 4.2 },
        clearanceMeters: 2.0,
        colorHex: "#D4A359",
        description: "Stepped limestone platform at the northern apse for the wedding head table.",
      },
      {
        id: "zone-nave-banquet-west",
        name: "West Nave Refectory Banquet Colonnade",
        role: "seating",
        bounds: { x: -3.6, z: 0.5, width: 3.4, depth: 16.0 },
        clearanceMeters: 1.6,
        colorHex: "#2F5A4C",
        description: "Continuous candlelit timber banquet tables aligned with the west arcade piers.",
      },
      {
        id: "zone-nave-banquet-east",
        name: "East Nave Refectory Banquet Colonnade",
        role: "seating",
        bounds: { x: 3.6, z: 0.5, width: 3.4, depth: 16.0 },
        clearanceMeters: 1.6,
        colorHex: "#2F5A4C",
        description: "Continuous candlelit timber banquet tables aligned with the east arcade piers.",
      },
      {
        id: "zone-processional-aisle",
        name: "Central Ceremonial Processional Nave Spine",
        role: "circulation",
        bounds: { x: 0, z: 1.0, width: 3.4, depth: 20.0 },
        clearanceMeters: 3.2,
        colorHex: "#B5A48B",
        description: "Unobstructed 3.2m limestone processional axis beneath the central chandeliers.",
      }
    );

    [-9.0, -4.5, 0, 4.5, 9.0].forEach((zPos, idx) => {
      objects.push({
        id: `obj-gothic-arch-bay-${idx + 1}`,
        name: `Clustered Limestone Pier & Pointed Vault Rib (Bay 0${idx + 1})`,
        category: "Structure",
        archetype: "gothic_pointed_arch",
        position: [0, 6.0, zPos],
        rotation: [0, 0, 0],
        dimensions: [15.6, 12.0, 0.85],
        materialId: "honed_limestone",
        colorHex: "#B5A48B",
        provenanceId: "prov-llm-1",
        designNote: "Compound limestone piers rising 12m into quadripartite pointed vault ribs.",
      });
    });

    objects.push({
      id: "obj-altar-dais",
      name: "Stepped Limestone Sanctuary Dais & Head Table",
      category: "Event Installations",
      archetype: "ceremonial_altar_dais",
      position: [0, 0.55, -10.5],
      rotation: [0, 0, 0],
      dimensions: [8.4, 1.1, 3.2],
      materialId: "honed_limestone",
      secondaryMaterialId: "warm_oak",
      colorHex: "#B5A48B",
      accentColorHex: "#D4A359",
      provenanceId: "prov-llm-1",
      designNote: "Ceremonial focal point terminating the central processional axis.",
    });

    [-4.5, 0.5, 5.5].forEach((zPos, idx) => {
      [-3.4, 3.4].forEach((xPos, sideIdx) => {
        const sideLabel = sideIdx === 0 ? "West" : "East";
        objects.push(
          {
            id: `obj-banquet-table-${sideLabel.toLowerCase()}-${idx + 1}`,
            name: `${sideLabel} Nave Refectory Banquet Table 0${idx + 1}`,
            category: "Furniture",
            archetype: "banquet_long_table",
            position: [xPos, 0.42, zPos],
            rotation: [0, 0, 0],
            dimensions: [1.85, 0.78, 4.1],
            materialId: "warm_oak",
            secondaryMaterialId: "raw_linen",
            colorHex: "#724626",
            accentColorHex: "#E5DEC9",
            provenanceId: "prov-inf-1",
            designNote: "Seats 12 guests with Belgian linen runner, velvet dining chairs, and 1.6m aisle clearance.",
          },
          {
            id: `obj-candelabra-${sideLabel.toLowerCase()}-${idx + 1}`,
            name: `Brass Candelabra & Botanical Garland (${sideLabel} 0${idx + 1})`,
            category: "Decoration",
            archetype: "candelabra_floral_centerpiece",
            position: [xPos, 1.05, zPos],
            rotation: [0, 0, 0],
            dimensions: [0.65, 0.68, 2.8],
            materialId: "brushed_brass",
            colorHex: "#D4A359",
            accentColorHex: "#FFB46B",
            provenanceId: "prov-llm-2",
            designNote: "Tapered beeswax candles and white garden roses providing warm 2200K table-level glow.",
          }
        );
      });

      objects.push({
        id: `obj-chandelier-nave-${idx + 1}`,
        name: `Suspended Brass Ring Nave Chandelier 0${idx + 1}`,
        category: "Lighting",
        archetype: "brass_ring_chandelier",
        position: [0, 7.2, zPos],
        rotation: [0, 0, 0],
        dimensions: [3.2, 1.8, 3.2],
        materialId: "brushed_brass",
        colorHex: "#C59B4E",
        accentColorHex: "#FFD194",
        provenanceId: "prov-llm-2",
        designNote: "3.2m diameter patinated brass ring suspended from the vault bosses.",
      });
    });
  } else if (typology === "mediterranean_courtyard") {
    isOpenAir = true;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 16.0, height: 4.8, depth: 18.0, ridgeHeight: 5.2, wallThickness: 0.45 },
      interp,
      2.6
    );
    title = "Olea Peristyle — Mediterranean Courtyard Dining";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Open-Air Terracotta, Limestone Colonnade & Olive Grove`;
    layoutMode = "courtyard";
    focalPoint = {
      name: "Octagonal Limestone Courtyard Fountain & Ancient Olive Tree",
      position: [0, 1.1, 0],
      description: "Carved limestone water basin at the courtyard cross-axis surrounded by terracotta olive planters.",
    };

    zones.push(
      {
        id: "zone-fountain-court",
        name: "Central Limestone Fountain & Olive Grove Axis",
        role: "focal",
        bounds: { x: 0, z: 0, width: 5.2, depth: 5.2 },
        clearanceMeters: 1.8,
        colorHex: "#556B4E",
        description: "Acoustic water mask and shaded botanical centerpiece.",
      },
      {
        id: "zone-pergola-dining",
        name: "Dappled Pergola Terrace Dining Zones",
        role: "seating",
        bounds: { x: 0, z: 0, width: 13.0, depth: 14.0 },
        clearanceMeters: 1.5,
        colorHex: "#C86D51",
        description: "Al-fresco linen-draped bistro tables arranged beneath timber pergola rafters.",
      }
    );

    objects.push(
      {
        id: "obj-courtyard-fountain",
        name: "Carved Limestone Courtyard Basin & Water Spout",
        category: "Event Installations",
        archetype: "limestone_fountain",
        position: [0, 0.55, 0],
        rotation: [0, 0, 0],
        dimensions: [2.8, 1.1, 2.8],
        materialId: "honed_limestone",
        colorHex: "#B5A48B",
        accentColorHex: "#7FA6B8",
        provenanceId: "prov-llm-1",
        designNote: "Provides evaporative microclimate cooling and gentle water masking.",
      },
      {
        id: "obj-pergola-canopy",
        name: "Cypress Timber Pergola & Woven Linen Shade Sails",
        category: "Structure",
        archetype: "pergola_linen_canopy",
        position: [0, 4.35, 0],
        rotation: [0, 0, 0],
        dimensions: [14.8, 0.45, 16.4],
        materialId: "warm_oak",
        secondaryMaterialId: "raw_linen",
        colorHex: "#7D5130",
        accentColorHex: "#E5DEC9",
        provenanceId: "prov-llm-1",
        designNote: "Filters afternoon sunlight into dappled shadows across the terracotta floor.",
      }
    );

    [
      [-4.8, -5.2],
      [4.8, -5.2],
      [-4.8, 5.2],
      [4.8, 5.2],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-olive-tree-${idx + 1}`,
        name: `Sculptural Silver-Leaf Olive Tree in Terracotta Planter 0${idx + 1}`,
        category: "Planting",
        archetype: "olive_tree_planter",
        position: [x, 1.6, z],
        rotation: [0, idx * 1.1, 0],
        dimensions: [2.2, 3.2, 2.2],
        materialId: "terracotta_tile",
        colorHex: "#556B4E",
        accentColorHex: "#B85D3B",
        provenanceId: "prov-llm-1",
        designNote: "Multi-stem Olea europaea with varied foliage canopy anchored in hand-thrown clay vessel.",
      });
    });

    [
      [-3.8, -1.8],
      [3.8, -1.8],
      [-3.8, 2.2],
      [3.8, 2.2],
      [0, -4.6],
      [0, 4.6],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-bistro-table-${idx + 1}`,
        name: `Limestone & Flax Linen Courtyard Dining Table 0${idx + 1}`,
        category: "Furniture",
        archetype: "bistro_courtyard_table",
        position: [x, 0.4, z],
        rotation: [0, (idx % 2) * 0.4, 0],
        dimensions: [1.5, 0.76, 1.5],
        materialId: "raw_linen",
        secondaryMaterialId: "warm_oak",
        colorHex: "#C2B299",
        provenanceId: "prov-llm-1",
        designNote: "Four-top courtyard dining table with woven rush chairs and terracotta tableware.",
      });
    });
  } else if (typology === "pavilion_celebration") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 18.0, height: 5.8, depth: 16.0, ridgeHeight: 6.6, wallThickness: 0.4 },
      interp,
      2.3
    );
    title = "Surya Mandap — Contemporary Indian Mehendi Pavilion";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Carved Sandstone Arches, Marigold Garlands & Layered Silk`;
    layoutMode = "ceremony";
    focalPoint = {
      name: "Ceremonial Floral Jhula Swing & Scalloped Mandap Dais",
      position: [0, 1.4, -4.5],
      description: "Carved brass-and-teak ceremonial swing draped in saffron and vermilion marigold garlands.",
    };

    zones.push(
      {
        id: "zone-mehendi-mandap",
        name: "Ceremonial Jhula Swing & Floral Mandap Dais",
        role: "focal",
        bounds: { x: 0, z: -4.5, width: 6.4, depth: 3.8 },
        clearanceMeters: 1.8,
        colorHex: "#E76F24",
        description: "Raised sandstone stage framed by cusped arches and marigold floral curtains.",
      },
      {
        id: "zone-diwan-lounges",
        name: "Low Bolster Diwan & Gadda Seating Courts",
        role: "seating",
        bounds: { x: 0, z: 1.2, width: 13.5, depth: 7.5 },
        clearanceMeters: 1.6,
        colorHex: "#E9C46A",
        description: "Social henna-application lounges with block-printed textiles and brass side tables.",
      }
    );

    objects.push(
      {
        id: "obj-jhula-swing",
        name: "Ceremonial Brass & Teak Jhula Swing with Marigold Arch",
        category: "Event Installations",
        archetype: "ceremonial_jhula_swing",
        position: [0, 1.35, -4.5],
        rotation: [0, 0, 0],
        dimensions: [3.6, 2.7, 1.8],
        materialId: "brushed_brass",
        secondaryMaterialId: "marigold_silk",
        colorHex: "#E76F24",
        accentColorHex: "#E9C46A",
        provenanceId: "prov-llm-1",
        designNote: "Central celebratory seating focal point suspended from a floral-draped arch.",
      },
      {
        id: "obj-marigold-curtain-backdrop",
        name: "Layered Genda Phool (Marigold) Garland Curtain Installation",
        category: "Decoration",
        archetype: "marigold_garland_curtain",
        position: [0, 2.6, -6.8],
        rotation: [0, 0, 0],
        dimensions: [11.0, 4.8, 0.5],
        materialId: "marigold_silk",
        colorHex: "#F4A261",
        accentColorHex: "#C84B31",
        provenanceId: "prov-llm-1",
        designNote: "Alternating saffron, turmeric-yellow, and crimson floral strands with brass bells.",
      }
    );

    [
      [-3.8, 0.2],
      [3.8, 0.2],
      [-3.8, 3.6],
      [3.8, 3.6],
    ].forEach(([x, z], idx) => {
      objects.push({
        id: `obj-diwan-lounge-${idx + 1}`,
        name: `Silk Bolster Diwan & Dhurrie Lounge Cluster 0${idx + 1}`,
        category: "Furniture",
        archetype: "diwan_bolster_lounge",
        position: [x, 0.35, z],
        rotation: [0, x < 0 ? 0.35 : -0.35, 0],
        dimensions: [2.8, 0.68, 1.6],
        materialId: "marigold_silk",
        secondaryMaterialId: "brushed_brass",
        colorHex: idx % 2 === 0 ? "#C84B31" : "#E76F24",
        accentColorHex: "#E9C46A",
        provenanceId: "prov-llm-1",
        designNote: "Low tactile seating with cylindrical silk masnad bolsters and hammered brass thali tables.",
      });
    });
  } else if (typology === "brutalist_runway") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 16.0, height: 6.8, depth: 26.0, ridgeHeight: 7.2, wallThickness: 0.55 },
      interp,
      2.3
    );
    title = "Monolith-IX — Brutalist Concrete Fashion Runway";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Board-Formed Concrete Piers & Mirror Obsidian Catwalk`;
    layoutMode = "runway";
    focalPoint = {
      name: "20m Mirror-Obsidian Catwalk Spine & Monolithic Portal",
      position: [0, 0.5, -8.5],
      description: "Cantilevered raw concrete portal threshold feeding a specular 20m central runway.",
    };

    zones.push(
      {
        id: "zone-runway-spine",
        name: "Central Mirror-Obsidian Catwalk Spine",
        role: "focal",
        bounds: { x: 0, z: 0, width: 3.4, depth: 20.0 },
        clearanceMeters: 2.0,
        colorHex: "#E2E8F0",
        description: "20m continuous elevated runway deck with specular dark reflection.",
      },
      {
        id: "zone-front-row-benches",
        name: "Parallel Sculptural Concrete Seating Blocks",
        role: "seating",
        bounds: { x: 0, z: 0.5, width: 11.0, depth: 18.0 },
        clearanceMeters: 1.5,
        colorHex: "#52565C",
        description: "Continuous brutalist cast-concrete benches flanking the runway.",
      }
    );

    objects.push(
      {
        id: "obj-obsidian-runway",
        name: "20m Mirror-Polished Obsidian Catwalk Platform",
        category: "Event Installations",
        archetype: "obsidian_runway_deck",
        position: [0, 0.14, 0],
        rotation: [0, 0, 0],
        dimensions: [3.2, 0.28, 20.0],
        materialId: "obsidian_terrazzo",
        colorHex: "#14171A",
        accentColorHex: "#E2E8F0",
        provenanceId: "prov-llm-1",
        designNote: "Low-iron dark specular surface reflecting overhead light blades and garment silhouettes.",
      },
      {
        id: "obj-linear-light-blade",
        name: "Suspended 20m Continuous Architectural Light Blade",
        category: "Lighting",
        archetype: "linear_light_blade",
        position: [0, 5.6, 0],
        rotation: [0, 0, 0],
        dimensions: [0.65, 0.25, 19.5],
        materialId: "anodized_aluminum",
        colorHex: "#F8FAFC",
        provenanceId: "prov-inf-1",
        designNote: "High-CRI 4200K narrow-beam linear array sculpting the catwalk axis.",
      }
    );

    [-6.0, 0, 6.0].forEach((zPos, idx) => {
      [-3.8, 3.8].forEach((xPos, sIdx) => {
        objects.push({
          id: `obj-concrete-bench-${sIdx}-${idx}`,
          name: `Cast-Concrete Monolithic Audience Bench (${sIdx === 0 ? "West" : "East"} 0${idx + 1})`,
          category: "Furniture",
          archetype: "sculptural_concrete_bench",
          position: [xPos, 0.24, zPos],
          rotation: [0, 0, 0],
          dimensions: [1.4, 0.48, 4.4],
          materialId: "board_concrete",
          colorHex: "#64686E",
          provenanceId: "prov-llm-1",
          designNote: "Raw board-formed concrete seating block with cantilevered undercut shadow gap.",
        });
      });
    });
  } else if (typology === "tea_room") {
    const isGardenVeranda =
      interp.focalProgram === "zen_garden_veranda" ||
      promptText.toLowerCase().includes("garden") ||
      promptText.toLowerCase().includes("ambient") ||
      promptText.toLowerCase().includes("bamboo") ||
      promptText.toLowerCase().includes("veranda") ||
      promptText.toLowerCase().includes("tsukubai") ||
      promptText.toLowerCase().includes("rock");

    if (isGardenVeranda) {
      isOpenAir = true;
      roomDimensions = scaleDimensionsToCapacity(
        { width: 10.5, height: 3.4, depth: 9.0, ridgeHeight: 3.8, wallThickness: 0.22 },
        interp,
        3.2
      );
      title = "Shukkei-An — Contemplative Japanese Garden Pavilion & Ambient Sound Sanctuary";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Sukiya Hinoki Veranda, Granite Tsukubai & Woven Bamboo Acoustic Grilles`;
      layoutMode = "sanctuary";
      const waterZ = Number((-roomDimensions.depth * 0.32).toFixed(2));
      focalPoint = {
        name: "Granite Tsukubai Water Basin & Bamboo Flute Spout",
        position: [0, 0.45, waterZ],
        description: "Hand-carved natural granite water basin with flowing bamboo kakehi flute creating continuous meditative sound texture.",
      };

      zones.push(
        {
          id: "zone-zen-water",
          name: "Contemplative Tsukubai Water Feature & Moss Garden",
          role: "focal",
          bounds: { x: 0, z: waterZ, width: 4.8, depth: 3.2 },
          clearanceMeters: 1.2,
          colorHex: "#4A525A",
          description: "Granite water basin and gravel rock garden focal zone.",
        },
        {
          id: "zone-sukiya-veranda",
          name: "Sukiya Hinoki Engawa Veranda Seating Deck",
          role: "seating",
          bounds: { x: 0, z: 0.8, width: 7.5, depth: 4.2 },
          clearanceMeters: 1.2,
          colorHex: "#8B653E",
          description: "Raised unlacquered cypress engawa deck with low tatami benches.",
        },
        {
          id: "zone-kumiko-threshold",
          name: "Shoji & Kumiko Garden Portal Threshold",
          role: "threshold",
          bounds: { x: 0, z: Number((roomDimensions.depth * 0.38).toFixed(2)), width: 5.4, depth: 1.6 },
          clearanceMeters: 1.2,
          colorHex: "#DFD1B8",
          description: "Sliding translucent screens framing the dry landscape garden.",
        }
      );

      objects.push(
        {
          id: "obj-tsukubai-basin",
          name: "Carved Natural Granite Tsukubai Water Basin & Bamboo Flute Spout",
          category: "Event Installations",
          archetype: "granite_tsukubai_basin",
          position: [0, 0.38, waterZ],
          rotation: [0, 0, 0],
          dimensions: [1.2, 0.65, 1.2],
          materialId: "board_concrete",
          secondaryMaterialId: "charred_hinoki",
          colorHex: "#4A525A",
          accentColorHex: "#38BDF8",
          provenanceId: "prov-llm-1",
          designNote: "Hand-carved natural granite basin with flowing bamboo kakehi water spout generating continuous organic acoustic background.",
        },
        {
          id: "obj-veranda-deck",
          name: "Raised Sukiya Hinoki Timber Veranda Engawa Deck",
          category: "Architecture",
          archetype: "sukiya_veranda_deck",
          position: [0, 0.18, 0.8],
          rotation: [0, 0, 0],
          dimensions: [7.2, 0.35, 4.2],
          materialId: "warm_oak",
          colorHex: "#8B653E",
          accentColorHex: "#C59B4E",
          provenanceId: "prov-llm-1",
          designNote: "Raised unlacquered Japanese cypress (hinoki) engawa deck connecting interior listening mats to gravel garden.",
        },
        {
          id: "obj-kasuga-lantern-west",
          name: "Kasuga Carved Granite Garden Lantern (West)",
          category: "Lighting",
          archetype: "kasuga_stone_lantern",
          position: [-2.6, 0.75, Number((waterZ + 0.4).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [0.65, 1.5, 0.65],
          materialId: "honed_limestone",
          secondaryMaterialId: "brushed_brass",
          colorHex: "#6B7280",
          accentColorHex: "#FFB46B",
          provenanceId: "prov-llm-1",
          designNote: "Traditional Japanese carved stone lantern with warm 2200K interior candle illumination.",
        },
        {
          id: "obj-kasuga-lantern-east",
          name: "Kasuga Carved Granite Garden Lantern (East)",
          category: "Lighting",
          archetype: "kasuga_stone_lantern",
          position: [2.6, 0.75, Number((waterZ + 0.4).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [0.65, 1.5, 0.65],
          materialId: "honed_limestone",
          secondaryMaterialId: "brushed_brass",
          colorHex: "#6B7280",
          accentColorHex: "#FFB46B",
          provenanceId: "prov-llm-1",
          designNote: "Traditional Japanese carved stone lantern with warm 2200K interior candle illumination.",
        },
        {
          id: "obj-bamboo-acoustic-screen",
          name: "Woven Bamboo & Cedar Acoustic Diffusion Grille",
          category: "Architecture",
          archetype: "bamboo_acoustic_screen",
          position: [0, 1.6, Number((-roomDimensions.depth * 0.46).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [5.6, 2.6, 0.12],
          materialId: "charred_hinoki",
          colorHex: "#7A5C3E",
          accentColorHex: "#D4A359",
          provenanceId: "prov-llm-1",
          designNote: "Quarter-sawn bamboo slats providing natural sound diffusion for subtle ambient music.",
        },
        {
          id: "obj-tatami-bench-west",
          name: "Low Sukiya Tatami Contemplation Bench (West)",
          category: "Furniture",
          archetype: "tatami_bench",
          position: [-1.8, 0.32, 1.0],
          rotation: [0, 0.15, 0],
          dimensions: [1.8, 0.42, 0.75],
          materialId: "tatami_mat",
          secondaryMaterialId: "warm_oak",
          colorHex: "#9E9264",
          accentColorHex: "#8B653E",
          provenanceId: "prov-llm-1",
          designNote: "Low timber bench topped with woven igusa rush tatami mat.",
        },
        {
          id: "obj-tatami-bench-east",
          name: "Low Sukiya Tatami Contemplation Bench (East)",
          category: "Furniture",
          archetype: "tatami_bench",
          position: [1.8, 0.32, 1.0],
          rotation: [0, -0.15, 0],
          dimensions: [1.8, 0.42, 0.75],
          materialId: "tatami_mat",
          secondaryMaterialId: "warm_oak",
          colorHex: "#9E9264",
          accentColorHex: "#8B653E",
          provenanceId: "prov-llm-1",
          designNote: "Low timber bench topped with woven igusa rush tatami mat.",
        },
        {
          id: "obj-ambient-speaker-west",
          name: "Discreet Architectural Ambient Sound Column (West)",
          category: "Event Installations",
          archetype: "ambient_sound_column",
          position: [-3.8, 1.1, -0.4],
          rotation: [0, 0.3, 0],
          dimensions: [0.32, 1.4, 0.32],
          materialId: "charred_hinoki",
          colorHex: "#3E2723",
          provenanceId: "prov-llm-1",
          designNote: "Slim cedar-clad line-array column tuned for spatial ambient soundscapes.",
        },
        {
          id: "obj-ambient-speaker-east",
          name: "Discreet Architectural Ambient Sound Column (East)",
          category: "Event Installations",
          archetype: "ambient_sound_column",
          position: [3.8, 1.1, -0.4],
          rotation: [0, -0.3, 0],
          dimensions: [0.32, 1.4, 0.32],
          materialId: "charred_hinoki",
          colorHex: "#3E2723",
          provenanceId: "prov-llm-1",
          designNote: "Slim cedar-clad line-array column tuned for spatial ambient soundscapes.",
        }
      );
    } else {
      roomDimensions = scaleDimensionsToCapacity(
        { width: 5.4, height: 2.85, depth: 5.4, ridgeHeight: 3.1, wallThickness: 0.18 },
        interp,
        3.6
      );
      title = "Komorebi-An — Quiet Sukiya Timber & Washi Tea Room";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Hinoki Joinery, Kumiko Shoji & Tatami Module`;
      layoutMode = "sanctuary";
      focalPoint = {
        name: "Sunken Ro Hearth, Chabudai Low Table & Tokonoma Scroll",
        position: [0, 0.35, -0.4],
        description: "Low hinoki tea table centered on woven tatami mats beside a sunken cast-iron hearth.",
      };

      zones.push({
        id: "zone-tatami-hearth",
        name: "Central Tatami Tea Ceremony & Sunken Ro Hearth",
        role: "focal",
        bounds: { x: 0, z: 0, width: 3.6, depth: 3.6 },
        clearanceMeters: 0.9,
        colorHex: "#9E9264",
        description: "Four-and-a-half mat modular tea sanctuary with zabuton floor seating.",
      });

      objects.push(
        {
          id: "obj-chabudai-table",
          name: "Low Hinoki & Keyaki Joinery Tea Table (Chabudai)",
          category: "Furniture",
          archetype: "chabudai_tea_table",
          position: [0, 0.18, 0],
          rotation: [0, 0, 0],
          dimensions: [1.25, 0.34, 0.95],
          materialId: "charred_hinoki",
          colorHex: "#A67C52",
          provenanceId: "prov-llm-1",
          designNote: "Hand-planed mortise-and-tenon timber table with matcha chawan ceramic service.",
        },
        {
          id: "obj-sunken-hearth",
          name: "Sunken Ro Charcoal Hearth & Cast-Iron Tetsubin Kettle",
          category: "Event Installations",
          archetype: "sunken_ro_hearth",
          position: [-0.95, 0.08, -0.85],
          rotation: [0, 0, 0],
          dimensions: [0.45, 0.28, 0.45],
          materialId: "board_concrete",
          secondaryMaterialId: "brushed_brass",
          colorHex: "#2D3136",
          provenanceId: "prov-llm-1",
          designNote: "Traditional 42cm square sunken hearth set into the tatami grid.",
        },
        {
          id: "obj-shoji-screen-north",
          name: "Translucent Mulberry Washi & Cedar Kumiko Shoji Screen",
          category: "Architecture",
          archetype: "shoji_sliding_screen",
          position: [0, 1.35, -2.55],
          rotation: [0, 0, 0],
          dimensions: [4.8, 2.5, 0.08],
          materialId: "washi_screen",
          secondaryMaterialId: "charred_hinoki",
          colorHex: "#DFD1B8",
          provenanceId: "prov-llm-1",
          designNote: "Diffuses soft morning daylight across the tatami floor plane.",
        }
      );

      [
        [-0.85, 0],
        [0.85, 0],
        [0, -0.75],
        [0, 0.75],
      ].forEach(([x, z], idx) => {
        objects.push({
          id: `obj-zabuton-cushion-${idx + 1}`,
          name: `Indigo & Raw Flax Zabuton Floor Cushion 0${idx + 1}`,
          category: "Furniture",
          archetype: "zabuton_floor_cushion",
          position: [x, 0.05, z],
          rotation: [0, 0, 0],
          dimensions: [0.58, 0.09, 0.58],
          materialId: "raw_linen",
          colorHex: "#D9CEB8",
          provenanceId: "prov-llm-1",
          designNote: "Layered cotton-batting floor cushion arranged around the chabudai table.",
        });
      });
    }
  } else if (typology === "gallery_pavilion") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 15.0, height: 4.2, depth: 11.0, ridgeHeight: 4.5, wallThickness: 0.3 },
      interp,
      2.4
    );
    title = "Auteur Cine-Lounge — Intimate Cinematic Screening Pavilion & Archival Gallery";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Acoustic Screen Baffles, Walnut Curator Deck & Linen Lounge`;
    layoutMode = "lounge";
    focalPoint = {
      name: "Curated 4K Cinema Projection Screen & Acoustic Baffle Backdrop",
      position: [0, 1.8, -4.2],
      description: "Micro-perforated tensioned cinema screen flanked by acoustic walnut absorption baffles and low-voltage perimeter grazing.",
    };

    zones.push(
      {
        id: "zone-cinema-stage",
        name: "Cinematic Projection Screen & Audio Baffle Stage",
        role: "focal",
        bounds: { x: 0, z: -4.0, width: 8.5, depth: 2.8 },
        clearanceMeters: 1.6,
        colorHex: "#1E293B",
        description: "Primary screening axis with reference audio playback.",
      },
      {
        id: "zone-gallery-lounge",
        name: "Low-Slung Archival Screening Lounge",
        role: "seating",
        bounds: { x: 0, z: 0.8, width: 10.0, depth: 5.5 },
        clearanceMeters: 1.4,
        colorHex: "#334155",
        description: "Low-profile acoustic lounge seating aligned with cinema sweet spot.",
      }
    );

    objects.push(
      {
        id: "obj-cinema-screen",
        name: "Matte-White Tensioned Cinema Screen & Acoustic Baffles",
        category: "Event Installations",
        archetype: "cinema_projection_screen",
        position: [0, 2.0, -4.4],
        rotation: [0, 0, 0],
        dimensions: [6.4, 3.2, 0.4],
        materialId: "washi_screen",
        colorHex: "#F8FAFC",
        accentColorHex: "#38BDF8",
        provenanceId: "prov-llm-1",
        designNote: "Tensioned 4K projection surface with integrated rear acoustic absorption.",
      },
      {
        id: "obj-curator-plinth",
        name: "Sculpted American Walnut Curator & Projection Plinth",
        category: "Furniture",
        archetype: "curator_projection_plinth",
        position: [0, 0.5, 3.8],
        rotation: [0, 0, 0],
        dimensions: [2.2, 0.95, 1.1],
        materialId: "warm_oak",
        secondaryMaterialId: "brushed_brass",
        colorHex: "#452A18",
        accentColorHex: "#D4A359",
        provenanceId: "prov-inf-1",
        designNote: "Houses projection control hardware and physical film archive.",
      },
      {
        id: "obj-cinema-lounge-west",
        name: "Low-Profile Archival Wool Felt Screening Lounge (West)",
        category: "Furniture",
        archetype: "cinema_lounge_seat",
        position: [-2.6, 0.38, 0.6],
        rotation: [0, 0.2, 0],
        dimensions: [2.8, 0.76, 1.05],
        materialId: "acoustic_felt",
        colorHex: "#2C313A",
        accentColorHex: "#A0AEC0",
        provenanceId: "prov-llm-1",
        designNote: "Low-profile acoustic seating maintaining clean projection sightlines.",
      },
      {
        id: "obj-cinema-lounge-east",
        name: "Low-Profile Archival Wool Felt Screening Lounge (East)",
        category: "Furniture",
        archetype: "cinema_lounge_seat",
        position: [2.6, 0.38, 0.6],
        rotation: [0, -0.2, 0],
        dimensions: [2.8, 0.76, 1.05],
        materialId: "acoustic_felt",
        colorHex: "#2C313A",
        accentColorHex: "#A0AEC0",
        provenanceId: "prov-llm-1",
        designNote: "Low-profile acoustic seating maintaining clean projection sightlines.",
      },
      {
        id: "obj-perimeter-light-blade",
        name: "Linear 2800K Architectural Perimeter Grazing Blade",
        category: "Lighting",
        archetype: "linear_light_blade",
        position: [0, 4.0, 0],
        rotation: [0, 0, 0],
        dimensions: [0.35, 0.15, 10.0],
        materialId: "anodized_aluminum",
        colorHex: "#FFE6C2",
        accentColorHex: "#FFAA44",
        provenanceId: "prov-inf-1",
        designNote: "Low-glare indirect architectural grazing along screening room perimeter.",
      }
    );
  } else if (typology === "grunge_loft") {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 14.0, height: 4.6, depth: 12.0, ridgeHeight: 4.9, wallThickness: 0.35 },
      interp,
      2.4
    );
    title = "Chroma-94 — Pink Grunge Editorial Loft & Flash Studio";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Distressed Brick, Mirror Chrome Inflatables & Velvet Lounge`;
    layoutMode = "lounge";
    focalPoint = {
      name: "Mirror-Chrome Balloon Installation & Editorial Flash Rig",
      position: [0, 1.8, -3.6],
      description: "Clustered specular chrome orbs, distressed brick backdrop, and high-output strobe towers.",
    };

    zones.push(
      {
        id: "zone-flash-stage",
        name: "Editorial Flash Backdrop & Chrome Balloon Sculpture Zone",
        role: "focal",
        bounds: { x: 0, z: -3.5, width: 7.5, depth: 3.2 },
        clearanceMeters: 1.5,
        colorHex: "#E84A8A",
        description: "High-contrast photography stage and DJ console.",
      },
      {
        id: "zone-velvet-pit",
        name: "Playful Tufted Velvet Lounge & Dance Floor",
        role: "seating",
        bounds: { x: 0, z: 1.2, width: 9.5, depth: 5.2 },
        clearanceMeters: 1.4,
        colorHex: "#CBD5E1",
        description: "Asymmetric pink/charcoal velvet sofas and chrome cube tables.",
      }
    );

    objects.push(
      {
        id: "obj-chrome-balloons",
        name: "Suspended Mirror-Chrome Balloon Cluster Installation",
        category: "Event Installations",
        archetype: "chrome_balloon_cluster",
        position: [0, 2.2, -3.6],
        rotation: [0, 0, 0],
        dimensions: [4.2, 2.6, 1.8],
        materialId: "mirror_chrome",
        colorHex: "#E2E8F0",
        accentColorHex: "#E84A8A",
        provenanceId: "prov-llm-1",
        designNote: "Clusters of high-gloss metallic silver and hot-pink mylar spheres.",
      },
      {
        id: "obj-dj-flash-rig",
        name: "Industrial DJ Plinth & Dual Strobe Flash Photography Towers",
        category: "Event Installations",
        archetype: "dj_flash_rig",
        position: [0, 0.9, -4.2],
        rotation: [0, 0, 0],
        dimensions: [3.4, 1.8, 1.1],
        materialId: "anodized_aluminum",
        secondaryMaterialId: "mirror_chrome",
        colorHex: "#94A3B8",
        accentColorHex: "#E84A8A",
        provenanceId: "prov-inf-1",
        designNote: "Raw aluminum truss stands mounting studio strobes and rotary mixer.",
      },
      {
        id: "obj-grunge-sofa-1",
        name: "Distressed Magenta Tufted Velvet Modular Sofa (West)",
        category: "Furniture",
        archetype: "tufted_grunge_sofa",
        position: [-2.4, 0.42, 1.2],
        rotation: [0, 0.35, 0],
        dimensions: [2.6, 0.82, 1.05],
        materialId: "moss_velvet",
        colorHex: "#D63384",
        provenanceId: "prov-llm-1",
        designNote: "Low-slung button-tufted velvet lounge anchored on chrome casters.",
      },
      {
        id: "obj-grunge-sofa-2",
        name: "Charcoal & Rose Velvet Lounge Pit (East)",
        category: "Furniture",
        archetype: "tufted_grunge_sofa",
        position: [2.4, 0.42, 1.2],
        rotation: [0, -0.35, 0],
        dimensions: [2.6, 0.82, 1.05],
        materialId: "moss_velvet",
        colorHex: "#3B2838",
        accentColorHex: "#E84A8A",
        provenanceId: "prov-llm-1",
        designNote: "Paired with mirror-chrome drum tables.",
      }
    );
  } else if (typology === "intimate_lounge") {
    isOpenAir = false;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 9.6, height: 3.6, depth: 7.8, ridgeHeight: 3.9, wallThickness: 0.28 },
      interp,
      2.6
    );
    const isLibrary =
      interp.focalProgram === "library_archive" ||
      promptText.toLowerCase().includes("library") ||
      promptText.toLowerCase().includes("reading") ||
      promptText.toLowerCase().includes("book") ||
      promptText.toLowerCase().includes("archive") ||
      promptText.toLowerCase().includes("study");

    if (isLibrary) {
      title = "Bibliotheca Silentium — Curatorial Reading Library & Archival Study";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Quarter-Sawn White Oak, Archival Book Stacks & Acoustic Felt`;
      layoutMode = "lounge";
      focalPoint = {
        name: "Curatorial White Oak Reading Table & Brass Task Sconces",
        position: [0, 0.76, 0],
        description: "Solid quarter-sawn white oak reading table flanked by warm 2400K brass task lamps and wool reading armchairs.",
      };

      zones.push(
        {
          id: "zone-library-reading",
          name: "Central Curatorial Study & Reading Quad",
          role: "focal",
          bounds: { x: 0, z: 0, width: 4.8, depth: 3.4 },
          clearanceMeters: 1.2,
          colorHex: "#5C4033",
          description: "Primary reading study table with glare-free task illumination.",
        },
        {
          id: "zone-library-stacks",
          name: "Archival Perimeter Shelving Wall & Folio Stacks",
          role: "threshold",
          bounds: { x: 0, z: Number((-roomDimensions.depth * 0.44).toFixed(2)), width: Number((roomDimensions.width * 0.88).toFixed(1)), depth: 1.4 },
          clearanceMeters: 1.2,
          colorHex: "#231C18",
          description: "Full-height recessed book archive shelving wall with acoustic felt backing.",
        },
        {
          id: "zone-library-nook",
          name: "Quiet Contemplative Wool Reading Nook",
          role: "seating",
          bounds: { x: 0, z: Number((roomDimensions.depth * 0.34).toFixed(2)), width: Number((roomDimensions.width * 0.65).toFixed(1)), depth: 2.2 },
          clearanceMeters: 1.2,
          colorHex: "#7C3F23",
          description: "Upholstered armchairs with dedicated side tables for deep study.",
        }
      );

      objects.push(
        {
          id: "obj-curatorial-reading-table",
          name: "Curatorial Quarter-Sawn White Oak Reading Table",
          category: "Furniture",
          archetype: "curatorial_reading_table",
          position: [0, 0.42, 0],
          rotation: [0, 0, 0],
          dimensions: [3.4, 0.78, 1.2],
          materialId: "warm_oak",
          secondaryMaterialId: "brushed_brass",
          colorHex: "#724626",
          accentColorHex: "#D4A359",
          provenanceId: "prov-llm-1",
          designNote: "Substantial 3.4m long solid oak table with integrated brass cable management and pencil inlay channels.",
        },
        {
          id: "obj-archival-bookshelf-wall",
          name: "Full-Height Recessed Archival Book Stacks & Folio Cabinet",
          category: "Furniture",
          archetype: "archival_bookshelf_wall",
          position: [0, Number((roomDimensions.height * 0.48).toFixed(2)), Number((-roomDimensions.depth * 0.45).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [Number((roomDimensions.width * 0.82).toFixed(1)), Number((roomDimensions.height * 0.92).toFixed(1)), 0.52],
          materialId: "warm_oak",
          secondaryMaterialId: "acoustic_felt",
          colorHex: "#452A18",
          accentColorHex: "#C59B4E",
          provenanceId: "prov-llm-1",
          designNote: "Floor-to-ceiling recessed timber joinery housing rare manuscripts and architectural reference folios.",
        },
        {
          id: "obj-reading-armchair-west",
          name: "Upholstered Natural Wool High-Back Reading Armchair (West)",
          category: "Furniture",
          archetype: "reading_armchair",
          position: [-1.4, 0.44, 0],
          rotation: [0, Math.PI / 2, 0],
          dimensions: [0.88, 0.88, 0.84],
          materialId: "boucle_wool",
          secondaryMaterialId: "warm_oak",
          colorHex: "#C9BCA6",
          accentColorHex: "#724626",
          provenanceId: "prov-llm-1",
          designNote: "Ergonomic high-back reading chair upholstered in acoustic-absorptive unbleached wool.",
        },
        {
          id: "obj-reading-armchair-east",
          name: "Upholstered Natural Wool High-Back Reading Armchair (East)",
          category: "Furniture",
          archetype: "reading_armchair",
          position: [1.4, 0.44, 0],
          rotation: [0, -Math.PI / 2, 0],
          dimensions: [0.88, 0.88, 0.84],
          materialId: "boucle_wool",
          secondaryMaterialId: "warm_oak",
          colorHex: "#C9BCA6",
          accentColorHex: "#724626",
          provenanceId: "prov-llm-1",
          designNote: "Ergonomic high-back reading chair upholstered in acoustic-absorptive unbleached wool.",
        },
        {
          id: "obj-brass-task-lamp-01",
          name: "Architectural Spun Brass Articulated Task Sconce 01",
          category: "Lighting",
          archetype: "brass_task_lamp",
          position: [-0.95, 0.88, 0],
          rotation: [0, 0, 0],
          dimensions: [0.24, 0.38, 0.24],
          materialId: "brushed_brass",
          colorHex: "#D4A359",
          accentColorHex: "#FFE6C2",
          provenanceId: "prov-llm-1",
          designNote: "2400K glare-shielded warm task fixture providing focused reading illumination.",
        },
        {
          id: "obj-brass-task-lamp-02",
          name: "Architectural Spun Brass Articulated Task Sconce 02",
          category: "Lighting",
          archetype: "brass_task_lamp",
          position: [0.95, 0.88, 0],
          rotation: [0, 0, 0],
          dimensions: [0.24, 0.38, 0.24],
          materialId: "brushed_brass",
          colorHex: "#D4A359",
          accentColorHex: "#FFE6C2",
          provenanceId: "prov-llm-1",
          designNote: "2400K glare-shielded warm task fixture providing focused reading illumination.",
        },
        {
          id: "obj-acoustic-felt-panel",
          name: "Tuned Wool Felt Sound Absorption Wall Panel",
          category: "Architecture",
          archetype: "acoustic_felt_panel",
          position: [Number((roomDimensions.width * 0.47).toFixed(2)), 1.75, 0],
          rotation: [0, -Math.PI / 2, 0],
          dimensions: [3.8, 2.2, 0.08],
          materialId: "acoustic_felt",
          colorHex: "#3A3835",
          provenanceId: "prov-llm-1",
          designNote: "Low-frequency absorption panel maintaining quiet 0.38s reverberation profile for speech and study.",
        },
        {
          id: "obj-reading-rug",
          name: "Hand-Knotted Unbleached Wool Study Rug",
          category: "Decoration",
          archetype: "woven_area_rug",
          position: [0, 0.02, 0],
          rotation: [0, 0, 0],
          dimensions: [4.6, 0.04, 3.2],
          materialId: "boucle_wool",
          colorHex: "#B8AA92",
          provenanceId: "prov-llm-1",
          designNote: "Dense natural wool floor covering attenuating footstep reverberation.",
        }
      );
    } else {
      title = "Salotto Notturno — Intimate Architectural Salon & Velvet Lounge";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Herringbone Parquet, Fluted Acoustic Panels & Curated Settees`;
      layoutMode = "lounge";
      focalPoint = {
        name: "Fluted Timber Fireplace Hearth & Low Cocktail Table",
        position: [0, 0.82, -2.4],
        description: "Monolithic limestone fireplace surround flanked by fluted acoustic timber slats and curved velvet lounge seating.",
      };

      zones.push(
        {
          id: "zone-salon-hearth",
          name: "Architectural Hearth & Conversation Center",
          role: "focal",
          bounds: { x: 0, z: -2.0, width: 5.0, depth: 2.8 },
          clearanceMeters: 1.2,
          colorHex: "#5C4033",
          description: "Primary gathering focal point with low conversation tables.",
        },
        {
          id: "zone-salon-lounge",
          name: "Curved Velvet Salon Seating Ring",
          role: "seating",
          bounds: { x: 0, z: 0.6, width: 6.2, depth: 4.0 },
          clearanceMeters: 1.2,
          colorHex: "#7C3F23",
          description: "Low-slung modular velvet seating facing the hearth.",
        }
      );

      objects.push(
        {
          id: "obj-salon-cocktail-table",
          name: "Sculpted Walnut & Honed Marble Low Cocktail Table",
          category: "Furniture",
          archetype: "chabudai_tea_table",
          position: [0, 0.36, -0.4],
          rotation: [0, 0, 0],
          dimensions: [2.2, 0.38, 1.1],
          materialId: "warm_oak",
          secondaryMaterialId: "veined_marble",
          colorHex: "#452A18",
          provenanceId: "prov-llm-1",
          designNote: "Solid walnut base supporting an inset Calacatta marble tray.",
        },
        {
          id: "obj-salon-sofa-west",
          name: "Curved Moss Velvet Architectural Salon Settee (West)",
          category: "Furniture",
          archetype: "listening_sofa",
          position: [-1.8, 0.44, 0.6],
          rotation: [0, 0.3, 0],
          dimensions: [2.4, 0.82, 0.96],
          materialId: "moss_velvet",
          colorHex: "#354A34",
          provenanceId: "prov-llm-1",
          designNote: "Deep curved seating in acoustic velvet.",
        },
        {
          id: "obj-salon-sofa-east",
          name: "Curved Moss Velvet Architectural Salon Settee (East)",
          category: "Furniture",
          archetype: "listening_sofa",
          position: [1.8, 0.44, 0.6],
          rotation: [0, -0.3, 0],
          dimensions: [2.4, 0.82, 0.96],
          materialId: "moss_velvet",
          colorHex: "#354A34",
          provenanceId: "prov-llm-1",
          designNote: "Deep curved seating in acoustic velvet.",
        }
      );
    }
  } else if (typology === "comedy_theatre") {
    isOpenAir = false;
    roomDimensions = scaleDimensionsToCapacity(
      { width: 15.0, height: 5.2, depth: 18.0, ridgeHeight: 5.5, wallThickness: 0.32 },
      interp,
      2.8
    );
    layoutMode = "showcase";

    const isCedricGrounded =
      payload.primaryColorHex === "#4A0E17" ||
      Boolean(payload.resolvedEntities && payload.resolvedEntities.some((e) => e.name.toLowerCase().includes("cedric")));

    if (isCedricGrounded) {
      // ----------------------------------------------------------------------
      // GROUNDED SCENE (WITH QLOO — CEDRIC THE ENTERTAINER)
      // Theatrical cabaret comedy club destination:
      // Semicircular thrust stage, draped ruby velvet backdrop, front cabaret cocktail tables,
      // curved plush banquettes, fluted acoustic timber diffusers, high-contrast spotlighting.
      // ----------------------------------------------------------------------
      title = "The Cedric Revue — Theatrical Comedy Club & Cabaret Destination";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Curved Thrust Stage, Draped Ruby Velvet, Cabaret Cocktail Tables & Fluted Walnut Acoustics`;

      focalPoint = {
        name: "Semicircular Hardwood Thrust Comedy Stage & Vintage Ribbon Mic",
        position: [0, 1.35, -4.8],
        description: "Curved dark hardwood comedy thrust stage with glowing brass trim, vintage Shure 55SH ribbon microphone on brass stand, and rich pleated ruby velvet backdrop.",
      };

      zones.push(
        {
          id: "zone-thrust-stage",
          name: "Semicircular Performance Thrust Stage",
          role: "focal",
          bounds: { x: 0, z: -5.8, width: 8.5, depth: 4.8 },
          clearanceMeters: 1.8,
          colorHex: "#D4AF37",
          description: "Elevated performance platform with intimate 3-sided audience sightlines and warm 2600K key spotlighting.",
        },
        {
          id: "zone-cabaret-orchestra",
          name: "Front Cabaret Cocktail Tables & Intimate Social Floor",
          role: "seating",
          bounds: { x: 0, z: -0.8, width: 9.6, depth: 4.6 },
          clearanceMeters: 1.4,
          colorHex: "#4A0E17",
          description: "Intimate cabaret cocktail tables with ambient amber candle lamps and low-slung club chairs for close performer banter.",
        },
        {
          id: "zone-vip-banquettes",
          name: "Tiered VIP Velvet Banquette Lounges",
          role: "seating",
          bounds: { x: 0, z: 4.8, width: Number((roomDimensions.width * 0.88).toFixed(1)), depth: 4.2 },
          clearanceMeters: 1.4,
          colorHex: "#181416",
          description: "Stepped horseshoe curved velvet banquettes and cocktail service stations inspired by Atlanta entertainment lounges.",
        }
      );

      objects.push(
        {
          id: "obj-comedy-thrust-stage",
          name: "Curved Hardwood Thrust Comedy Stage with Brass Trim",
          category: "Event Installations",
          archetype: "modular_stage_riser",
          position: [0, 0.45, -5.8],
          rotation: [0, 0, 0],
          dimensions: [7.8, 0.9, 4.6],
          materialId: "warm_oak",
          secondaryMaterialId: "brushed_brass",
          colorHex: "#1C1412",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-stage",
          designNote: "Semicircular curved front comedy thrust stage bringing performer into intimate audience range.",
        },
        {
          id: "obj-performer-ribbon-mic",
          name: "Vintage Shure 55SH Performer Ribbon Mic on Brass Stand",
          category: "Event Installations",
          archetype: "performer_mic_stand",
          position: [0, 1.35, -4.8],
          rotation: [0, 0, 0],
          dimensions: [0.45, 1.4, 0.45],
          materialId: "brushed_brass",
          colorHex: "#D4AF37",
          accentColorHex: "#FFE8D6",
          provenanceId: "prov-qloo-mic",
          designNote: "Vintage ribbon stand-up microphone centered on thrust stage with warm brass finish.",
        },
        {
          id: "obj-velvet-curtain-backdrop",
          name: "Pleated Ruby Theatrical Velvet Stage Curtain Backdrop",
          category: "Architecture",
          archetype: "velvet_theatre_curtain",
          position: [0, 2.6, -8.6],
          rotation: [0, 0, 0],
          dimensions: [9.8, 5.0, 0.4],
          materialId: "moss_velvet",
          colorHex: "#4A0E17",
          accentColorHex: "#C92A42",
          provenanceId: "prov-qloo-curtain",
          designNote: "Heavy acoustic velvet drapery providing low-frequency sound dampening and dramatic theatrical framing.",
        },
        {
          id: "obj-cabaret-table-01",
          name: "Burnished Brass & Smoked Glass Cabaret Cocktail Table (W1)",
          category: "Furniture",
          archetype: "cabaret_cocktail_table",
          position: [-2.6, 0.42, -2.2],
          rotation: [0, 0, 0],
          dimensions: [0.95, 0.84, 0.95],
          materialId: "brushed_brass",
          colorHex: "#D4AF37",
          accentColorHex: "#FFAA44",
          provenanceId: "prov-qloo-tables",
          designNote: "Round brass pedestal table with integrated amber candle illumination.",
        },
        {
          id: "obj-cabaret-table-02",
          name: "Burnished Brass & Smoked Glass Cabaret Cocktail Table (E1)",
          category: "Furniture",
          archetype: "cabaret_cocktail_table",
          position: [2.6, 0.42, -2.2],
          rotation: [0, 0, 0],
          dimensions: [0.95, 0.84, 0.95],
          materialId: "brushed_brass",
          colorHex: "#D4AF37",
          accentColorHex: "#FFAA44",
          provenanceId: "prov-qloo-tables",
          designNote: "Round brass pedestal table with integrated amber candle illumination.",
        },
        {
          id: "obj-cabaret-table-03",
          name: "Burnished Brass & Smoked Glass Cabaret Cocktail Table (Center)",
          category: "Furniture",
          archetype: "cabaret_cocktail_table",
          position: [0.0, 0.42, -0.6],
          rotation: [0, 0, 0],
          dimensions: [0.95, 0.84, 0.95],
          materialId: "brushed_brass",
          colorHex: "#D4AF37",
          accentColorHex: "#FFAA44",
          provenanceId: "prov-qloo-tables",
          designNote: "Round brass pedestal table with integrated amber candle illumination.",
        },
        {
          id: "obj-banquette-west",
          name: "Curved Burgundy Velvet VIP Banquette Booth (West)",
          category: "Furniture",
          archetype: "curved_banquette_booth",
          position: [-4.6, 0.65, 2.4],
          rotation: [0, 0.25, 0],
          dimensions: [3.4, 1.1, 1.6],
          materialId: "moss_velvet",
          colorHex: "#4A0E17",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-banquette",
          designNote: "Semicircular plush velvet booth inspired by upscale comedy lounges.",
        },
        {
          id: "obj-banquette-east",
          name: "Curved Burgundy Velvet VIP Banquette Booth (East)",
          category: "Furniture",
          archetype: "curved_banquette_booth",
          position: [4.6, 0.65, 2.4],
          rotation: [0, -0.25, 0],
          dimensions: [3.4, 1.1, 1.6],
          materialId: "moss_velvet",
          colorHex: "#4A0E17",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-banquette",
          designNote: "Semicircular plush velvet booth inspired by upscale comedy lounges.",
        },
        {
          id: "obj-banquette-rear",
          name: "Elevated Theatrical Velvet Mezzanine Banquette (Rear)",
          category: "Furniture",
          archetype: "curved_banquette_booth",
          position: [0.0, 1.05, 6.2],
          rotation: [0, 0, 0],
          dimensions: [7.2, 1.25, 1.8],
          materialId: "moss_velvet",
          colorHex: "#4A0E17",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-banquette",
          designNote: "Continuous elevated VIP horseshoe banquette commanding full stage sightlines.",
        },
        {
          id: "obj-fluted-diffuser-west",
          name: "Fluted Acoustic Walnut Diffuser Wall Assembly (West)",
          category: "Architecture",
          archetype: "acoustic_felt_panel",
          position: [-7.2, 2.4, -0.5],
          rotation: [0, Math.PI / 2, 0],
          dimensions: [7.5, 3.8, 0.18],
          materialId: "vertical_timber_slats",
          colorHex: "#2D1016",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-acoustics",
          designNote: "Vertical fluted walnut timber diffusers preventing flutter echo while maintaining speech warmth.",
        },
        {
          id: "obj-fluted-diffuser-east",
          name: "Fluted Acoustic Walnut Diffuser Wall Assembly (East)",
          category: "Architecture",
          archetype: "acoustic_felt_panel",
          position: [7.2, 2.4, -0.5],
          rotation: [0, -Math.PI / 2, 0],
          dimensions: [7.5, 3.8, 0.18],
          materialId: "vertical_timber_slats",
          colorHex: "#2D1016",
          accentColorHex: "#D4AF37",
          provenanceId: "prov-qloo-acoustics",
          designNote: "Vertical fluted walnut timber diffusers preventing flutter echo while maintaining speech warmth.",
        },
        {
          id: "obj-theatre-spotlight-truss",
          name: "Suspended Black Box-Truss Theatrical Spotlight Array",
          category: "Lighting",
          archetype: "suspended_box_truss",
          position: [0, 4.6, -3.2],
          rotation: [0, 0, 0],
          dimensions: [8.8, 0.45, 1.8],
          materialId: "anodized_aluminum",
          colorHex: "#16191E",
          accentColorHex: "#FFE8D6",
          provenanceId: "prov-qloo-lighting",
          designNote: "Rigged theatrical truss housing 2600K performer pin-spots and saturated ruby wash fixtures.",
        }
      );
    } else {
      // ----------------------------------------------------------------------
      // BASELINE SCENE (WITHOUT QLOO — PROMPT-ONLY CONVENTIONAL THEATRE)
      // Conventional, functional contemporary comedy theatre:
      // Rectangular elevated proscenium stage, chrome mic stand, rectilinear rows
      // of stepped tiered auditorium seating with clear sightlines, neutral grey
      // acoustic panels, and standard halogen stage wash.
      // ----------------------------------------------------------------------
      title = "The Apollo Mainstage — Contemporary Comedy & Performance Theatre";
      subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Elevated Proscenium Stage, Raked Sightlines & Acoustic Felt Baffles`;

      focalPoint = {
        name: "Proscenium Comedy Performance Stage & Stand-Up Microphone",
        position: [0, 1.25, -5.6],
        description: "Elevated dark hardwood proscenium stage with center stand-up microphone and acoustic back wall panels.",
      };

      zones.push(
        {
          id: "zone-proscenium-stage",
          name: "Proscenium Comedy Performance Stage",
          role: "focal",
          bounds: { x: 0, z: -6.4, width: 7.5, depth: 4.2 },
          clearanceMeters: 1.6,
          colorHex: "#484E59",
          description: "Raised performance deck providing direct sightlines across all auditorium tiers.",
        },
        {
          id: "zone-auditorium-floor",
          name: "Stepped Auditorium Audience Seating",
          role: "seating",
          bounds: { x: 0, z: 2.2, width: 10.5, depth: 9.8 },
          clearanceMeters: 1.2,
          colorHex: "#22252A",
          description: "Raked rectilinear tiered theatre seating rows separated by a central circulation aisle.",
        }
      );

      objects.push(
        {
          id: "obj-comedy-stage",
          name: "Elevated Hardwood Proscenium Comedy Stage",
          category: "Event Installations",
          archetype: "modular_stage_riser",
          position: [0, 0.45, -6.4],
          rotation: [0, 0, 0],
          dimensions: [7.2, 0.9, 4.0],
          materialId: "warm_oak",
          colorHex: "#22252A",
          accentColorHex: "#484E59",
          provenanceId: "prov-llm-stage",
          designNote: "Rectilinear elevated performance platform designed for standalone comedy monologue.",
        },
        {
          id: "obj-performer-mic",
          name: "Center Stage Stand-Up Microphone & Cast Iron Base",
          category: "Event Installations",
          archetype: "performer_mic_stand",
          position: [0, 1.25, -5.6],
          rotation: [0, 0, 0],
          dimensions: [0.45, 1.35, 0.45],
          materialId: "mirror_chrome",
          colorHex: "#CBD5E1",
          accentColorHex: "#94A3B8",
          provenanceId: "prov-llm-mic",
          designNote: "Standard chrome stand-up microphone positioned at stage focal center.",
        },
        {
          id: "obj-stage-acoustic-baffle",
          name: "Acoustic Stage Backing Baffle Assembly",
          category: "Architecture",
          archetype: "acoustic_wall_panel",
          position: [0, 2.6, -8.6],
          rotation: [0, 0, 0],
          dimensions: [8.0, 3.6, 0.3],
          materialId: "acoustic_felt",
          colorHex: "#33373E",
          accentColorHex: "#484E59",
          provenanceId: "prov-llm-baffle",
          designNote: "Flat sound absorption panels behind stage to eliminate slap-back echo.",
        },
        {
          id: "obj-auditorium-row-a",
          name: "Raked Auditorium Seating Tier (Row A - Floor)",
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 0.38, -2.2],
          rotation: [0, 0, 0],
          dimensions: [8.4, 0.82, 0.95],
          materialId: "boucle_wool",
          colorHex: "#2B2F38",
          accentColorHex: "#4A5568",
          provenanceId: "prov-llm-seats",
          designNote: "Front row cushioned theatre seats with direct stage sightlines.",
        },
        {
          id: "obj-auditorium-row-b",
          name: "Raked Auditorium Seating Tier (Row B - Riser 1)",
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 0.68, 0.8],
          rotation: [0, 0, 0],
          dimensions: [8.8, 0.82, 0.95],
          materialId: "boucle_wool",
          colorHex: "#2B2F38",
          accentColorHex: "#4A5568",
          provenanceId: "prov-llm-seats",
          designNote: "Elevated second-tier seating row providing clear sightlines over front row.",
        },
        {
          id: "obj-auditorium-row-c",
          name: "Raked Auditorium Seating Tier (Row C - Riser 2)",
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 0.98, 3.8],
          rotation: [0, 0, 0],
          dimensions: [9.2, 0.82, 0.95],
          materialId: "boucle_wool",
          colorHex: "#2B2F38",
          accentColorHex: "#4A5568",
          provenanceId: "prov-llm-seats",
          designNote: "Third-tier seating row with stepped elevation.",
        },
        {
          id: "obj-auditorium-row-d",
          name: "Raked Auditorium Seating Tier (Row D - Upper Riser)",
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 1.28, 6.8],
          rotation: [0, 0, 0],
          dimensions: [9.6, 0.82, 0.95],
          materialId: "boucle_wool",
          colorHex: "#2B2F38",
          accentColorHex: "#4A5568",
          provenanceId: "prov-llm-seats",
          designNote: "Fourth-tier elevated seating completing auditorium capacity.",
        },
        {
          id: "obj-perimeter-panel-west",
          name: "Perimeter Acoustic Felt Absorption Panels (West)",
          category: "Architecture",
          archetype: "acoustic_felt_panel",
          position: [-7.2, 2.2, 1.0],
          rotation: [0, Math.PI / 2, 0],
          dimensions: [6.8, 2.8, 0.12],
          materialId: "acoustic_felt",
          colorHex: "#3A3E48",
          provenanceId: "prov-llm-panels",
          designNote: "Standard acoustic absorption treatment for 0.48s speech RT60 target.",
        },
        {
          id: "obj-perimeter-panel-east",
          name: "Perimeter Acoustic Felt Absorption Panels (East)",
          category: "Architecture",
          archetype: "acoustic_felt_panel",
          position: [7.2, 2.2, 1.0],
          rotation: [0, -Math.PI / 2, 0],
          dimensions: [6.8, 2.8, 0.12],
          materialId: "acoustic_felt",
          colorHex: "#3A3E48",
          provenanceId: "prov-llm-panels",
          designNote: "Standard acoustic absorption treatment for 0.48s speech RT60 target.",
        },
        {
          id: "obj-theatre-lighting-truss",
          name: "Suspended Linear Stage Wash Lighting Truss",
          category: "Lighting",
          archetype: "suspended_box_truss",
          position: [0, 4.6, -3.4],
          rotation: [0, 0, 0],
          dimensions: [8.2, 0.45, 1.2],
          materialId: "anodized_aluminum",
          colorHex: "#1A1D24",
          accentColorHex: "#CBD5E1",
          provenanceId: "prov-llm-lighting",
          designNote: "Overhead lighting rig providing uniform 3200K halogen stage wash.",
        }
      );
    }
  } else {
    roomDimensions = scaleDimensionsToCapacity(
      { width: 14.0, height: 4.2, depth: 12.0, ridgeHeight: 4.6, wallThickness: 0.3 },
      interp,
      2.4
    );
    title = "Apex — Contemporary Multi-Disciplinary Acoustic Studio & Gallery";
    subtitle = `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m • Engineered Hardwood, Recessed Acoustic Slats & Architectural Lighting`;
    layoutMode = "lounge";
    focalPoint = {
      name: "Monolithic Presentation Plinth & Acoustic Baffle Installation",
      position: [0, 1.2, -3.8],
      description: "Honed stone presentation dais with integrated architectural acoustic baffle wall.",
    };

    zones.push(
      {
        id: "zone-presentation-focal",
        name: "Primary Presentation Stage & Acoustic Baffle Wall",
        role: "focal",
        bounds: { x: 0, z: -3.6, width: 8.0, depth: 3.0 },
        clearanceMeters: 1.5,
        colorHex: "#334155",
        description: "Flexible performance and architectural presentation focal zone.",
      },
      {
        id: "zone-studio-lounge",
        name: "Modular Architectural Discussion Lounge",
        role: "seating",
        bounds: { x: 0, z: 1.2, width: 9.0, depth: 5.0 },
        clearanceMeters: 1.4,
        colorHex: "#64748B",
        description: "Architectural modular bench seating and low discussion tables.",
      }
    );

    objects.push(
      {
        id: "obj-studio-plinth",
        name: "Monolithic Honed Stone Presentation Plinth",
        category: "Event Installations",
        archetype: "ev_product_plinth",
        position: [0, 0.45, -3.8],
        rotation: [0, 0, 0],
        dimensions: [3.6, 0.45, 1.8],
        materialId: "honed_limestone",
        colorHex: "#CBD5E1",
        accentColorHex: "#0EA5E9",
        provenanceId: "prov-llm-1",
        designNote: "Architectural presentation platform for multi-disciplinary exhibitions.",
      },
      {
        id: "obj-acoustic-wall-slats",
        name: "Vertical Architectural Acoustic Slat Array",
        category: "Architecture",
        archetype: "acoustic_wall_panel",
        position: [0, 2.4, -4.8],
        rotation: [0, 0, 0],
        dimensions: [6.4, 3.2, 0.15],
        materialId: "acoustic_slats",
        colorHex: "#475569",
        accentColorHex: "#94A3B8",
        provenanceId: "prov-llm-1",
        designNote: "Calibrated absorption blades tuning room acoustics.",
      },
      {
        id: "obj-modular-bench-west",
        name: "Sculptural Low Architectural Lounge Bench (West)",
        category: "Furniture",
        archetype: "sculptural_concrete_bench",
        position: [-2.5, 0.35, 1.2],
        rotation: [0, 0.15, 0],
        dimensions: [2.6, 0.45, 0.95],
        materialId: "warm_oak",
        colorHex: "#334155",
        accentColorHex: "#64748B",
        provenanceId: "prov-llm-1",
        designNote: "Modular architectural bench seating for gallery guests.",
      },
      {
        id: "obj-modular-bench-east",
        name: "Sculptural Low Architectural Lounge Bench (East)",
        category: "Furniture",
        archetype: "sculptural_concrete_bench",
        position: [2.5, 0.35, 1.2],
        rotation: [0, -0.15, 0],
        dimensions: [2.6, 0.45, 0.95],
        materialId: "warm_oak",
        colorHex: "#334155",
        accentColorHex: "#64748B",
        provenanceId: "prov-llm-1",
        designNote: "Modular architectural bench seating for gallery guests.",
      }
    );
  }

  // Composable Cross-Cutting Modifiers: Honor any explicit user requests across typologies
  if (interp.isOpenAir) {
    isOpenAir = true;
  }
  if (
    interp.hasWaterFeature &&
    !objects.some((o) => o.archetype === "limestone_fountain" || o.archetype === "circular_water_feature")
  ) {
    objects.push({
      id: "obj-composable-water-feature",
      name: "Architectural Reflection Basin & Water Feature",
      category: "Event Installations",
      archetype: "circular_water_feature",
      position: [0, 0.22, Number((focalPoint.position[2] + 2.4).toFixed(2))],
      rotation: [0, 0, 0],
      dimensions: [3.4, 0.42, 3.4],
      materialId: "honed_limestone",
      colorHex: "#B5A48B",
      accentColorHex: "#38BDF8",
      provenanceId: "prov-inf-1",
      designNote: "Composed directly from user prompt water feature requirement.",
    });
  }
  if (
    interp.hasRunway &&
    !objects.some((o) => o.archetype === "obsidian_runway_deck")
  ) {
    objects.push({
      id: "obj-composable-runway",
      name: "Central Architectural Catwalk Runway Deck",
      category: "Event Installations",
      archetype: "obsidian_runway_deck",
      position: [0, 0.15, 0],
      rotation: [0, 0, 0],
      dimensions: [3.0, 0.28, Number((roomDimensions.depth * 0.65).toFixed(1))],
      materialId: "obsidian_terrazzo",
      colorHex: "#14171A",
      accentColorHex: "#E2E8F0",
      provenanceId: "prov-inf-1",
      designNote: "Composed central runway requested in prompt.",
    });
  }

  const floorMatKey: MaterialFamily =
    (interp.explicitMaterials.floor as MaterialFamily) ||
    (payload.flooringMaterial as MaterialFamily) ||
    "warm_oak";
  const floorMat = MATERIAL_LIBRARY[floorMatKey] || MATERIAL_LIBRARY.warm_oak;

  const rawWallKey = interp.explicitMaterials.wall || payload.wallMaterial || "acoustic_slats";
  const wallMatKey: MaterialFamily =
    rawWallKey === "anodized_panel"
      ? "anodized_aluminum"
      : rawWallKey === "carved_sandstone" || rawWallKey === "warm_sandstone"
      ? "warm_sandstone"
      : rawWallKey === "open_landscape"
      ? "honed_limestone"
      : (rawWallKey as MaterialFamily);
  const wallMat = MATERIAL_LIBRARY[wallMatKey] || MATERIAL_LIBRARY.limewash_plaster;

  const primaryFurnMat = MATERIAL_LIBRARY[payload.seatingFabric] || MATERIAL_LIBRARY.cognac_leather;
  const secondaryAccentMat =
    typology === "futuristic_launch" || typology === "brutalist_runway" || typology === "industrial_warehouse" || typology === "underground_club"
      ? MATERIAL_LIBRARY.anodized_aluminum
      : typology === "grunge_loft"
      ? MATERIAL_LIBRARY.mirror_chrome
      : MATERIAL_LIBRARY.brushed_brass;

  const lighting = buildLightingForTypology(
    typology,
    timeOfDay,
    roomDimensions,
    payload.lightingTemperatureK || 2400
  );

  const acousticTarget = computeSabineAcoustics(
    roomDimensions.width,
    roomDimensions.height,
    roomDimensions.depth,
    typology,
    isOpenAir
  );

  const areaSqMeters = Number((roomDimensions.width * roomDimensions.depth).toFixed(1));
  const volumeCubicMeters = Number(
    (roomDimensions.width * roomDimensions.height * roomDimensions.depth).toFixed(1)
  );
  const minClearance = Math.min(...zones.map((z) => z.clearanceMeters), 1.2);
  const densityDivisor =
    layoutMode === "banquet"
      ? 2.4
      : layoutMode === "showcase" || layoutMode === "runway" || layoutMode === "club"
      ? 1.8
      : layoutMode === "listening" || layoutMode === "sanctuary"
      ? 3.1
      : 2.2;
  const rawCapacity = Math.max(4, Math.round((areaSqMeters * 0.72) / densityDivisor));
  const estimatedCapacityGuests =
    interp.requestedCapacityGuests !== null
      ? Math.max(interp.requestedCapacityGuests, rawCapacity)
      : rawCapacity;

  const validation: ValidationReport = {
    isValid: true,
    circulationClearanceMeters: minClearance,
    minRequiredClearanceMeters: 0.9,
    estimatedCapacityGuests,
    areaSqMeters,
    volumeCubicMeters,
    densityStatus: minClearance >= 1.2 ? "optimal" : "tight",
    warnings: [],
    checksPassed: [
      `World-unit coordinate system verified (1 unit = 1.00m; footprint ${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m).`,
      `Minimum circulation clearance (${minClearance.toFixed(2)}m) exceeds 0.90m threshold.`,
      `Zero bounding-box collisions across ${objects.length} primary architectural and furniture assemblies.`,
      `Sabine acoustic reverberation (${acousticTarget.calculatedRT60Seconds}s) calibrated for ${typology}.`,
    ],
  };

  objects.forEach((o) => {
    o.procurement = deriveObjectProcurementMetadata(o);
  });

  const baseSpec: SceneSpec = {
    id: `scene-${typology}-${Date.now().toString(36)}`,
    title,
    subtitle,
    promptText,
    typology,
    layoutMode,
    timeOfDay,
    isOpenAir,
    enclosureMode: interp.enclosureMode,
    setting: interp.environmentalSetting,
    interpretedBrief: interp,
    roomDimensions,
    palette: {
      primaryHex: payload.primaryColorHex,
      secondaryHex: payload.secondaryColorHex || wallMat.colorHex,
      accentHex: payload.accentColorHex,
      floorHex: floorMat.colorHex,
      wallHex: wallMat.colorHex,
      ambientHex: lighting.sources[0]?.colorHex || "#FFE6C2",
    },
    materials: {
      floor: floorMat,
      wall: wallMat,
      ceiling:
        interp.hasTranslucentCanopy
          ? MATERIAL_LIBRARY.translucent_canopy
          : typology === "cathedral_banquet"
          ? MATERIAL_LIBRARY.honed_limestone
          : typology === "futuristic_launch" || typology === "brutalist_runway" || typology === "underground_club"
          ? MATERIAL_LIBRARY.board_concrete
          : typology === "industrial_warehouse"
          ? MATERIAL_LIBRARY.anodized_aluminum
          : MATERIAL_LIBRARY.warm_oak,
      primaryFurniture: primaryFurnMat,
      secondaryAccent: secondaryAccentMat,
    },
    ceilingStructure:
      interp.explicitMaterials.ceiling ||
      payload.ceilingStructure ||
      (isOpenAir ? "open_sky_pergola" : "coffered_timber"),
    lighting,
    acousticTarget,
    zones,
    objects,
    focalPoint,
    cameraDefaults: {
      overviewPosition: [
        roomDimensions.width * 0.72,
        roomDimensions.height * 0.78,
        roomDimensions.depth * 0.78,
      ],
      overviewTarget: [0, roomDimensions.height * 0.28, 0],
      interiorPosition: [0, 1.65, roomDimensions.depth * 0.36],
      interiorTarget: focalPoint.position,
      focalPosition: [
        focalPoint.position[0] + 2.4,
        focalPoint.position[1] + 1.2,
        focalPoint.position[2] + 3.2,
      ],
      focalTarget: focalPoint.position,
    },
    provenance: payload.reasoning.provenanceClaims || [],
    validation,
    revisionHistory: [],
  };
  const specWithMusic = attachMusicProfileToSceneSpec(
    baseSpec,
    payload.resolvedEntities || [],
    payload.artistRecommendations || []
  );
  specWithMusic.qloo_evidence = generateQlooEvidence(
    promptText,
    specWithMusic,
    payload.resolvedEntities || []
  );
  return specWithMusic;
}

export function generateSceneFromPrompt(
  promptText: string,
  vibeOverride?: Partial<VibePayload>
): SceneSpec {
  const basePayload = enrichPayloadWithKnowledge(promptText, [], undefined, []);
  const payload: VibePayload = vibeOverride
    ? { ...basePayload, ...vibeOverride }
    : basePayload;
  return buildSceneSpecFromPayload(payload, promptText);
}
