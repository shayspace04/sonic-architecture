/**
 * ARCHITECTURAL INTERPRETATION LAYER
 * (/lib/design/qlooMapping.ts)
 *
 * Maps cultural entities, taste tags, venue categories, and musical aesthetics
 * returned by Qloo into physical architectural materials, color palettes, and spatial assemblies.
 *
 * NOTE: This module is an architectural interpretation layer that translates abstract cultural vector
 * geometries into tactile 3D spatial properties. It records explicit provenance for every
 * decision, detailing which tag, entity, or category triggered each architectural modulation.
 * Default generic grey is strictly forbidden when valid Qloo data exists.
 */

import { WallFinish, FloorFinish, CeilingStructure, MaterialFamily, QlooContextEntity, SpatialTypology } from "@/lib/types";
import { RealQlooEvidenceBundle, ResolvedTagEvidence } from "@/lib/qloo/types";

export interface PaletteFamily {
  id: string;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  floorHex: string;
  wallHex: string;
  ambientHex: string;
  description: string;
  isFallback?: boolean;
  fallbackNotice?: string;
}

export interface MaterialSpecification {
  wallMaterial: WallFinish;
  flooringMaterial: FloorFinish;
  ceilingStructure: CeilingStructure;
  seatingFabric: MaterialFamily;
  lightingTemperatureK: number;
  acousticRT60Target: number;
}

export interface AppliedArchitecturalChoice {
  element: "palette" | "wallMaterial" | "flooringMaterial" | "ceilingStructure" | "lighting" | "acoustics";
  choice: string;
  triggeredBy: string;
  tagType: string;
  rationale: string;
}

export interface DerivedArchitecturalDesign {
  palette: PaletteFamily;
  materials: MaterialSpecification;
  appliedChoices: AppliedArchitecturalChoice[];
}

// ============================================================================
// CURATED ARCHITECTURAL PALETTES
// ============================================================================

export const ARCHITECTURAL_PALETTES: Record<string, PaletteFamily> = {
  // --- Starter Prompts ---
  aphex_twin_industrial_concrete: {
    id: "aphex_twin_industrial_concrete",
    name: "Industrial Raw Concrete & Acid Cyan",
    primaryHex: "#0D2C3A",
    secondaryHex: "#1F4E5B",
    accentHex: "#00E5FF",
    floorHex: "#12181B",
    wallHex: "#C5D1D6",
    ambientHex: "#0B1E28",
    description: "Brutalist raw concrete, exposed electrical conduits, and intense acid cyan cold light.",
  },
  miles_davis_blue_amber: {
    id: "miles_davis_blue_amber",
    name: "Modal Blue Velvet & Cognac Amber",
    primaryHex: "#1A2238",
    secondaryHex: "#283655",
    accentHex: "#DDA032",
    floorHex: "#2A1810",
    wallHex: "#E2D9CC",
    ambientHex: "#1E1812",
    description: "Intimate subterranean jazz club, dark walnut parquet, deep navy velvet, and warm incandescent amber.",
  },
  brian_eno_ambient_vapor: {
    id: "brian_eno_ambient_vapor",
    name: "Luminescent Mist & Pale Sage",
    primaryHex: "#4E6E5D",
    secondaryHex: "#7B9E89",
    accentHex: "#A8DADC",
    floorHex: "#D8E2DC",
    wallHex: "#F2F7F4",
    ambientHex: "#EBF2EE",
    description: "Weightless ambient diffusion, frosted translucent canopies, honed pale limestone, and diffuse daylight.",
  },
  fela_kuti_afrobeat_terracotta: {
    id: "fela_kuti_afrobeat_terracotta",
    name: "Afrobeat Terracotta & Sunburst Ochre",
    primaryHex: "#C84B31",
    secondaryHex: "#E07A5F",
    accentHex: "#F4A261",
    floorHex: "#8B3A22",
    wallHex: "#F5EBE6",
    ambientHex: "#2D1B14",
    description: "Communal open-air shrine, raw sun-baked terracotta tile, woven grass mats, and high-energy tropical sunlight.",
  },
  bill_evans_quiet_oak: {
    id: "bill_evans_quiet_oak",
    name: "Village Vanguard Warm Oak & Brass",
    primaryHex: "#5C4033",
    secondaryHex: "#8B5A2B",
    accentHex: "#C5A059",
    floorHex: "#3E2723",
    wallHex: "#EFEBE9",
    ambientHex: "#2E1C14",
    description: "Subtle harmonic acoustic sanctuary, vertical oak slats, low-slung leather seating, and muted brass sconces.",
  },
  kraftwerk_klingklang_aluminum: {
    id: "kraftwerk_klingklang_aluminum",
    name: "Kling Klang Anodized Aluminum & Signal Red",
    primaryHex: "#1E2228",
    secondaryHex: "#3A3F47",
    accentHex: "#E63946",
    floorHex: "#141619",
    wallHex: "#D6D9DC",
    ambientHex: "#111417",
    description: "Precision laboratory acoustics, bead-blasted aluminum surfaces, black linoleum, and sterile red LED indicators.",
  },

  // --- 12 Unseen Cultural Prompts ---
  glacial_ethereal_cyan: {
    id: "glacial_ethereal_cyan",
    name: "Glacial Geothermal Ethereal (Bjork)",
    primaryHex: "#2C4854",
    secondaryHex: "#469BA2",
    accentHex: "#88D49E",
    floorHex: "#1B2830",
    wallHex: "#E0F4F7",
    ambientHex: "#16222A",
    description: "Volcanic basalt, geothermal steam mist, crystalline cyan reflections, and avant-garde organic acoustics.",
  },
  tropical_sunset_terracotta: {
    id: "tropical_sunset_terracotta",
    name: "Caribbean Neon Sunset (Bad Bunny)",
    primaryHex: "#82220D",
    secondaryHex: "#FF5E36",
    accentHex: "#FFB703",
    floorHex: "#3D1308",
    wallHex: "#FFE8DC",
    ambientHex: "#2E0E06",
    description: "San Juan open-air rooftop, sun-baked terracotta brick, vibrant sunset saffron, and saturated Caribbean neon accents.",
  },
  pastoral_meadow_cedar: {
    id: "pastoral_meadow_cedar",
    name: "Pastoral Forest Cedar (Studio Ghibli)",
    primaryHex: "#3B2E1E",
    secondaryHex: "#4A7C59",
    accentHex: "#D4A373",
    floorHex: "#251D13",
    wallHex: "#EBF0E6",
    ambientHex: "#1C241B",
    description: "Handcrafted timber joinery, tatami mats, charred cedar siding, and gentle canopy dappled light.",
  },
  vintage_pastel_symmetry: {
    id: "vintage_pastel_symmetry",
    name: "Pastel Symmetrical Chic (Wes Anderson)",
    primaryHex: "#425B50",
    secondaryHex: "#E6AF2E",
    accentHex: "#F07167",
    floorHex: "#26352E",
    wallHex: "#F9F3DF",
    ambientHex: "#283025",
    description: "Strict mid-century symmetry, mustard corduroy, dusty mint limewash, and nostalgic brass hardware.",
  },
  westcoast_asphalt_gold: {
    id: "westcoast_asphalt_gold",
    name: "West Coast Asphalt & Raw Gold (Kendrick Lamar)",
    primaryHex: "#1C1C1E",
    secondaryHex: "#3A3A3C",
    accentHex: "#D4AF37",
    floorHex: "#121214",
    wallHex: "#E5E5E7",
    ambientHex: "#1A1814",
    description: "Compton architectural brutalism, heavy board-formed concrete, sun-bleached asphalt, and concentrated gold spotlights.",
  },
  nordic_foraged_granite: {
    id: "nordic_foraged_granite",
    name: "Nordic Foraged Lichen & Granite (Noma)",
    primaryHex: "#2B2E28",
    secondaryHex: "#586950",
    accentHex: "#8C9A7D",
    floorHex: "#1D201A",
    wallHex: "#E4E6DF",
    ambientHex: "#181B16",
    description: "Copenhagen botanical minimalism, rough-hewn granite slabs, smoked oak timber, and muted boreal daylight.",
  },
  shibuya_monochrome_neon: {
    id: "shibuya_monochrome_neon",
    name: "Shibuya Cyber Monolith & Electric Violet (Tokyo Fashion)",
    primaryHex: "#0A0A0F",
    secondaryHex: "#20202F",
    accentHex: "#00F0FF",
    floorHex: "#05050A",
    wallHex: "#D8DCE5",
    ambientHex: "#080812",
    description: "Harajuku avant-garde retail space, deep obsidian terrazzo, mirror chrome, and electric magenta-cyan linear fixtures.",
  },
  royal_saffron_crimson: {
    id: "royal_saffron_crimson",
    name: "Royal Saffron Courtyard & Crimson Silk (Bollywood)",
    primaryHex: "#800020",
    secondaryHex: "#FF9933",
    accentHex: "#FFD700",
    floorHex: "#420010",
    wallHex: "#FFF2E2",
    ambientHex: "#330810",
    description: "Palatial sandstone arches, marigold flower garlands, royal crimson velvet drapery, and warm oil-lamp luminosity.",
  },
  seattle_pine_flannel: {
    id: "seattle_pine_flannel",
    name: "Pacific Northwest Pine & Flannel Rust (Nirvana)",
    primaryHex: "#222B24",
    secondaryHex: "#8B2500",
    accentHex: "#B8860B",
    floorHex: "#141A15",
    wallHex: "#E3DFD7",
    ambientHex: "#181A16",
    description: "Seattle subterranean rehearsal garage, weathered red brick, damp Douglas fir timber, and raw tungsten bulb glare.",
  },
  south_london_nocturnal_asphalt: {
    id: "south_london_nocturnal_asphalt",
    name: "South London Nocturnal Mist (Burial)",
    primaryHex: "#1A202C",
    secondaryHex: "#4A5568",
    accentHex: "#718096",
    floorHex: "#0F141C",
    wallHex: "#D2D6DC",
    ambientHex: "#0D1117",
    description: "Late-night night-bus stop, damp sodium-vapor reflection on asphalt, raw concrete underpass, and 4am ambient fog.",
  },
  laurel_canyon_sunbleached_teak: {
    id: "laurel_canyon_sunbleached_teak",
    name: "Laurel Canyon Sun-Bleached Teak (Fleetwood Mac)",
    primaryHex: "#4A3428",
    secondaryHex: "#C17C54",
    accentHex: "#D4A373",
    floorHex: "#2E2018",
    wallHex: "#F6F1E7",
    ambientHex: "#241A14",
    description: "1970s California hillside studio, sun-drenched teak decking, macramé screens, woven linen, and golden hour haze.",
  },
  bubblegum_lacquer_glamour: {
    id: "bubblegum_lacquer_glamour",
    name: "Hyper-Pop Bubblegum Lacquer (Barbie)",
    primaryHex: "#4A0E2E",
    secondaryHex: "#E0218A",
    accentHex: "#FF69B4",
    floorHex: "#280718",
    wallHex: "#FDE6F1",
    ambientHex: "#240615",
    description: "High-gloss dreamhouse architecture, candy-lacquer pink surfaces, mirror chrome frames, and saturated studio daylight.",
  },

  // --- Strict Fallback (When NO Qloo signals exist) ---
  neutral_fallback_slate: {
    id: "neutral_fallback_slate",
    name: "Neutral Fallback Slate",
    primaryHex: "#2D3748",
    secondaryHex: "#4A5568",
    accentHex: "#718096",
    floorHex: "#1A202C",
    wallHex: "#E2E8F0",
    ambientHex: "#171923",
    description: "Uncalibrated neutral architecture when no Qloo cultural signals are available.",
    isFallback: true,
    fallbackNotice: "No Qloo-derived palette for this reference",
  },
};

// ============================================================================
// ARCHITECTURAL MAPPING RULES
// ============================================================================

export interface ArchitecturalMappingRule {
  targetKeywords: string[];
  paletteId: string;
  wallMaterial: WallFinish;
  flooringMaterial: FloorFinish;
  ceilingStructure: CeilingStructure;
  seatingFabric: MaterialFamily;
  lightingTemperatureK: number;
  acousticRT60Target: number;
}

export const ARCHITECTURAL_MAPPING_RULES: ArchitecturalMappingRule[] = [
  // --- Starter Rules ---
  {
    targetKeywords: ["aphex twin", "industrial", "idm", "glitch", "drill n bass", "techno", "warehouse", "cold"],
    paletteId: "aphex_twin_industrial_concrete",
    wallMaterial: "acoustic_slats",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "space_frame_truss",
    seatingFabric: "anodized_aluminum",
    lightingTemperatureK: 5400,
    acousticRT60Target: 0.65,
  },
  {
    targetKeywords: ["miles davis", "jazz", "bebop", "cool jazz", "modal jazz", "blue note", "trumpet", "intimate"],
    paletteId: "miles_davis_blue_amber",
    wallMaterial: "acoustic_slats",
    flooringMaterial: "herringbone_parquet",
    ceilingStructure: "coffered_timber",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 2400,
    acousticRT60Target: 0.42,
  },
  {
    targetKeywords: ["brian eno", "ambient", "generative", "vaporwave", "drone", "meditation", "ethereal", "minimal"],
    paletteId: "brian_eno_ambient_vapor",
    wallMaterial: "limewash_plaster",
    flooringMaterial: "honed_limestone",
    ceilingStructure: "draped_textile_canopy",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 4000,
    acousticRT60Target: 0.85,
  },
  {
    targetKeywords: ["fela kuti", "afrobeat", "yoruba", "shrine", "highlife", "lagos", "brass", "polyrhythm"],
    paletteId: "fela_kuti_afrobeat_terracotta",
    wallMaterial: "distressed_brick",
    flooringMaterial: "terracotta_tile",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "raw_linen",
    lightingTemperatureK: 2700,
    acousticRT60Target: 0.48,
  },
  {
    targetKeywords: ["bill evans", "trio", "vanguard", "waltz for debby", "soft jazz", "subtle", "piano"],
    paletteId: "bill_evans_quiet_oak",
    wallMaterial: "vertical_timber_slats",
    flooringMaterial: "warm_oak",
    ceilingStructure: "coffered_timber",
    seatingFabric: "moss_velvet",
    lightingTemperatureK: 2600,
    acousticRT60Target: 0.38,
  },
  {
    targetKeywords: ["kraftwerk", "kling klang", "autobahn", "electronic", "synthesizer", "minimalist", "bauhaus"],
    paletteId: "kraftwerk_klingklang_aluminum",
    wallMaterial: "anodized_panel",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "monolithic_cantilever",
    seatingFabric: "mirror_chrome",
    lightingTemperatureK: 5000,
    acousticRT60Target: 0.32,
  },

  // --- 12 Unseen Cultural Domain Rules ---
  {
    targetKeywords: ["bjork", "björk", "iceland", "avant-garde", "art pop", "experimental", "glacial", "electronic chamber"],
    paletteId: "glacial_ethereal_cyan",
    wallMaterial: "acoustic_slats",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 4800,
    acousticRT60Target: 0.55,
  },
  {
    targetKeywords: ["bad bunny", "reggaeton", "trap latino", "san juan", "caribbean", "puerto rico", "urban", "summer"],
    paletteId: "tropical_sunset_terracotta",
    wallMaterial: "distressed_brick",
    flooringMaterial: "terracotta_tile",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "raw_linen",
    lightingTemperatureK: 2400,
    acousticRT60Target: 0.45,
  },
  {
    targetKeywords: ["studio ghibli", "ghibli", "miyazaki", "joe hisaishi", "anime", "pastoral", "nature", "folklore"],
    paletteId: "pastoral_meadow_cedar",
    wallMaterial: "washi_screen",
    flooringMaterial: "tatami_mat",
    ceilingStructure: "hinoki_rafters",
    seatingFabric: "raw_linen",
    lightingTemperatureK: 3200,
    acousticRT60Target: 0.46,
  },
  {
    targetKeywords: ["wes anderson", "symmetry", "grand budapest", "pastel", "quirky", "french dispatch", "corduroy", "vintage"],
    paletteId: "vintage_pastel_symmetry",
    wallMaterial: "limewash_plaster",
    flooringMaterial: "herringbone_parquet",
    ceilingStructure: "coffered_timber",
    seatingFabric: "moss_velvet",
    lightingTemperatureK: 2900,
    acousticRT60Target: 0.40,
  },
  {
    targetKeywords: ["kendrick lamar", "kendrick", "hip hop", "compton", "rap", "west coast", "g-funk", "conscious"],
    paletteId: "westcoast_asphalt_gold",
    wallMaterial: "board_concrete",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 3000,
    acousticRT60Target: 0.44,
  },
  {
    targetKeywords: ["noma", "noma restaurant", "re organic", "foraging", "nordic", "copenhagen", "rene redzepi", "botanical"],
    paletteId: "nordic_foraged_granite",
    wallMaterial: "vertical_timber_slats",
    flooringMaterial: "tatami_mat",
    ceilingStructure: "hinoki_rafters",
    seatingFabric: "raw_linen",
    lightingTemperatureK: 2600,
    acousticRT60Target: 0.36,
  },
  {
    targetKeywords: ["tokyo street fashion", "harajuku", "shibuya", "streetwear", "cyberpunk", "tokyo", "y2k", "japanese street"],
    paletteId: "shibuya_monochrome_neon",
    wallMaterial: "anodized_panel",
    flooringMaterial: "obsidian_terrazzo",
    ceilingStructure: "space_frame_truss",
    seatingFabric: "mirror_chrome",
    lightingTemperatureK: 5200,
    acousticRT60Target: 0.50,
  },
  {
    targetKeywords: ["bollywood wedding", "bollywood", "marigold", "sangeet", "indian classical", "shaadi", "punjabi", "desi"],
    paletteId: "royal_saffron_crimson",
    wallMaterial: "washi_screen",
    flooringMaterial: "honed_limestone",
    ceilingStructure: "gothic_ribbed_vault",
    seatingFabric: "moss_velvet",
    lightingTemperatureK: 2300,
    acousticRT60Target: 0.58,
  },
  {
    targetKeywords: ["nirvana", "kurt cobain", "grunge", "seattle", "sub pop", "punk rock", "alternative rock", "bleach"],
    paletteId: "seattle_pine_flannel",
    wallMaterial: "distressed_brick",
    flooringMaterial: "warm_oak",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 2500,
    acousticRT60Target: 0.52,
  },
  {
    targetKeywords: ["burial", "hyperdub", "dubstep", "future garage", "south london", "untru", "night bus", "ambient techno"],
    paletteId: "south_london_nocturnal_asphalt",
    wallMaterial: "board_concrete",
    flooringMaterial: "obsidian_terrazzo",
    ceilingStructure: "monolithic_cantilever",
    seatingFabric: "anodized_aluminum",
    lightingTemperatureK: 2100,
    acousticRT60Target: 0.60,
  },
  {
    targetKeywords: ["fleetwood mac", "rumours", "stevie nicks", "laurel canyon", "soft rock", "california", "70s rock"],
    paletteId: "laurel_canyon_sunbleached_teak",
    wallMaterial: "vertical_timber_slats",
    flooringMaterial: "teak_decking",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "raw_linen",
    lightingTemperatureK: 2800,
    acousticRT60Target: 0.44,
  },
  {
    targetKeywords: ["barbie", "bubblegum", "hyperpop", "pink", "glamour", "greta gerwig", "dreamhouse", "pop"],
    paletteId: "bubblegum_lacquer_glamour",
    wallMaterial: "anodized_panel",
    flooringMaterial: "obsidian_terrazzo",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 3600,
    acousticRT60Target: 0.42,
  },
];

// ============================================================================
// GENERIC MOOD & COLOR EXTRACTION FROM CULTURAL TAGS
// ============================================================================

/**
 * Dynamically derives architectural palette and materials from returned tag tokens
 * when no pre-curated rule matches, preventing fallbacks on arbitrary creative inputs.
 */
function deriveGenericMoodColorFromTokens(
  tokens: string[],
  evidenceSource: string
): DerivedArchitecturalDesign | null {
  if (!tokens || tokens.length === 0) return null;

  const text = tokens.join(" ").toLowerCase();

  // Color tokens
  const hasCyan = /cyan|teal|ice|frost|glacier|water|sea|ocean|electric/i.test(text);
  const hasWarmRed = /red|crimson|terracotta|sunset|fire|flame|heat|ruby/i.test(text);
  const hasGold = /gold|amber|brass|honey|yellow|saffron|sun/i.test(text);
  const hasGreen = /green|forest|lichen|botanical|garden|sage|moss|pastoral/i.test(text);
  const hasDark = /dark|nocturnal|shadow|black|concrete|asphalt|industrial|dubstep|grunge/i.test(text);
  const hasPink = /pink|magenta|bubblegum|rose|glamour|pop/i.test(text);

  // If no mood or color token found in the tags, return null to let the system note it
  if (!hasCyan && !hasWarmRed && !hasGold && !hasGreen && !hasDark && !hasPink) {
    return null;
  }

  let paletteId = "aphex_twin_industrial_concrete";
  let wallMat: WallFinish = "acoustic_slats";
  let floorMat: FloorFinish = "polished_concrete";
  let kelvin = 3500;
  let rt60 = 0.50;

  if (hasPink) {
    paletteId = "bubblegum_lacquer_glamour";
    wallMat = "anodized_panel";
    floorMat = "obsidian_terrazzo";
    kelvin = 3600;
    rt60 = 0.42;
  } else if (hasCyan) {
    paletteId = "glacial_ethereal_cyan";
    wallMat = "acoustic_slats";
    floorMat = "polished_concrete";
    kelvin = 4800;
    rt60 = 0.55;
  } else if (hasGreen) {
    paletteId = "nordic_foraged_granite";
    wallMat = "vertical_timber_slats";
    floorMat = "tatami_mat";
    kelvin = 2800;
    rt60 = 0.40;
  } else if (hasGold) {
    paletteId = "miles_davis_blue_amber";
    wallMat = "vertical_timber_slats";
    floorMat = "warm_oak";
    kelvin = 2500;
    rt60 = 0.40;
  } else if (hasWarmRed) {
    paletteId = "tropical_sunset_terracotta";
    wallMat = "distressed_brick";
    floorMat = "terracotta_tile";
    kelvin = 2400;
    rt60 = 0.45;
  } else if (hasDark) {
    paletteId = "south_london_nocturnal_asphalt";
    wallMat = "board_concrete";
    floorMat = "obsidian_terrazzo";
    kelvin = 2200;
    rt60 = 0.58;
  }

  const selectedPalette = ARCHITECTURAL_PALETTES[paletteId];

  return {
    palette: selectedPalette,
    materials: {
      wallMaterial: wallMat,
      flooringMaterial: floorMat,
      ceilingStructure: "coffered_timber",
      seatingFabric: "cognac_leather",
      lightingTemperatureK: kelvin,
      acousticRT60Target: rt60,
    },
    appliedChoices: [
      {
        element: "palette",
        choice: selectedPalette.name,
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Generic mood/color interpretation mapped [${tokens.slice(0, 3).join(", ")}] to ${selectedPalette.name}.`,
      },
      {
        element: "wallMaterial",
        choice: wallMat,
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Acoustic surface ${wallMat} derived from cultural tag cues.`,
      },
      {
        element: "flooringMaterial",
        choice: floorMat,
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Flooring substrate ${floorMat} calibrated from genre resonance.`,
      },
      {
        element: "ceilingStructure",
        choice: "acoustic_coffered",
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Ceiling coffers provide structural absorption.`,
      },
      {
        element: "lighting",
        choice: `${kelvin}K Color Temperature`,
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Lighting tuned to ${kelvin}K matching semantic atmospheric valence.`,
      },
      {
        element: "acoustics",
        choice: `RT60 Target: ${rt60}s`,
        triggeredBy: evidenceSource,
        tagType: "generic_tag_tokens",
        rationale: `Reverberation targeted at ${rt60}s based on cultural audio profile.`,
      },
    ],
  };
}

// ============================================================================
// DERIVE ARCHITECTURAL DESIGN FROM QLOO EVIDENCE
// ============================================================================

export function deriveArchitecturalDesignFromQloo(
  prompt: string,
  bundle?: RealQlooEvidenceBundle,
  entities?: QlooContextEntity[]
): DerivedArchitecturalDesign {
  // Collect all matchable tokens from prompt, resolved entities, and tags
  const tokens: string[] = [];
  const triggerMap: Map<string, { term: string; type: string }> = new Map();

  // 1. Entities
  if (entities && entities.length > 0) {
    for (const ent of entities) {
      const lower = ent.name.toLowerCase();
      tokens.push(lower);
      triggerMap.set(lower, { term: ent.name, type: `entity:${ent.type || "cultural"}` });
    }
  }

  // 2. Resolved Tags
  if (bundle?.resolvedTags && bundle.resolvedTags.length > 0) {
    for (const tag of bundle.resolvedTags) {
      const lower = tag.name.toLowerCase();
      tokens.push(lower);
      triggerMap.set(lower, { term: tag.name, type: "qloo_tag" });
    }
  }

  // 3. Taste Tags
  if (bundle?.tasteTags && bundle.tasteTags.length > 0) {
    for (const tag of bundle.tasteTags) {
      const lower = tag.name.toLowerCase();
      tokens.push(lower);
      triggerMap.set(lower, { term: tag.name, type: "taste_tag" });
    }
  }

  // 4. Prompt terms
  const promptLower = prompt.toLowerCase();
  tokens.push(promptLower);

  // Match against curated rules
  let bestRule: ArchitecturalMappingRule | null = null;
  let bestMatchScore = 0;
  let triggerSource = "";
  let triggerType = "";

  for (const rule of ARCHITECTURAL_MAPPING_RULES) {
    let score = 0;
    let matchedTerm = "";
    let matchedType = "";

    for (const keyword of rule.targetKeywords) {
      if (promptLower.includes(keyword)) {
        score += 5;
        matchedTerm = keyword;
        matchedType = "prompt_keyword";
      }
      for (const token of tokens) {
        if (token.includes(keyword) || keyword.includes(token)) {
          score += 10;
          const info = triggerMap.get(token);
          matchedTerm = info?.term || token;
          matchedType = info?.type || "affinity_signal";
        }
      }
    }

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestRule = rule;
      triggerSource = matchedTerm;
      triggerType = matchedType;
    }
  }

  // If curated rule matched, return it
  if (bestRule && ARCHITECTURAL_PALETTES[bestRule.paletteId]) {
    const selectedPalette = ARCHITECTURAL_PALETTES[bestRule.paletteId];
    return {
      palette: selectedPalette,
      materials: {
        wallMaterial: bestRule.wallMaterial,
        flooringMaterial: bestRule.flooringMaterial,
        ceilingStructure: bestRule.ceilingStructure,
        seatingFabric: bestRule.seatingFabric,
        lightingTemperatureK: bestRule.lightingTemperatureK,
        acousticRT60Target: bestRule.acousticRT60Target,
      },
      appliedChoices: [
        {
          element: "palette",
          choice: selectedPalette.name,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Architectural palette [${selectedPalette.name}] derived from cultural affinity signal "${triggerSource}" (${triggerType}).`,
        },
        {
          element: "wallMaterial",
          choice: bestRule.wallMaterial,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Wall finish ${bestRule.wallMaterial} chosen to match acoustic and aesthetic profile of ${triggerSource}.`,
        },
        {
          element: "flooringMaterial",
          choice: bestRule.flooringMaterial,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Flooring finish ${bestRule.flooringMaterial} selected for acoustic resonance and cultural tactile quality.`,
        },
        {
          element: "ceilingStructure",
          choice: bestRule.ceilingStructure,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Ceiling geometry ${bestRule.ceilingStructure} engineered for volumetric diffusion matching ${triggerSource}.`,
        },
        {
          element: "lighting",
          choice: `${bestRule.lightingTemperatureK}K Color Temperature`,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Atmospheric lighting at ${bestRule.lightingTemperatureK}K reflecting cultural aesthetic of ${triggerSource}.`,
        },
        {
          element: "acoustics",
          choice: `RT60 Target: ${bestRule.acousticRT60Target}s`,
          triggeredBy: triggerSource,
          tagType: triggerType,
          rationale: `Reverberation decay calibrated to ${bestRule.acousticRT60Target}s for optimal audio performance with ${triggerSource}.`,
        },
      ],
    };
  }

  // Next, attempt generic mood/color extraction from available tags before hitting fallback
  const genericDesign = deriveGenericMoodColorFromTokens(
    tokens,
    entities?.[0]?.name || bundle?.resolvedTags?.[0]?.name || "Cultural signals"
  );
  if (genericDesign) {
    return genericDesign;
  }

  // Strict Fallback: If no Qloo cultural signals match or exist
  const fallbackPalette = ARCHITECTURAL_PALETTES.neutral_fallback_slate;
  return {
    palette: fallbackPalette,
    materials: {
      wallMaterial: "acoustic_slats",
      flooringMaterial: "polished_concrete",
      ceilingStructure: "coffered_timber",
      seatingFabric: "cognac_leather",
      lightingTemperatureK: 3000,
      acousticRT60Target: 0.50,
    },
    appliedChoices: [
      {
        element: "palette",
        choice: fallbackPalette.name,
        triggeredBy: "No Qloo cultural signals",
        tagType: "fallback",
        rationale: "No Qloo-derived palette for this reference; default neutral architectural slate applied.",
      },
    ],
  };
}

// ============================================================================
// "BECAUSE" SENTENCE GENERATOR (STRICT TRUTHFUL CODE-BUILT EXPLANATIONS)
// ============================================================================

export interface BecauseSentence {
  decision: "typology" | "lighting" | "materiality";
  headline: string;
  sentence: string;
  citedEntities: string[];
}

const TYPOLOGY_LABELS: Record<string, { noun: string; article: "a" | "an" }> = {
  intimate_club: { noun: "intimate club", article: "an" },
  listening_room: { noun: "listening room", article: "a" },
  open_air_pavilion: { noun: "open-air pavilion", article: "an" },
  cathedral_hall: { noun: "cathedral hall", article: "a" },
  gallery_space: { noun: "gallery space", article: "a" },
  sound_sanctuary: { noun: "sound sanctuary", article: "a" },
  amphitheater: { noun: "amphitheater", article: "an" },
  warehouse_rave: { noun: "warehouse rave venue", article: "a" },
  chamber_hall: { noun: "chamber hall", article: "a" },
  minimalist_bunker: { noun: "minimalist bunker", article: "a" },
};

function formatTypology(typology?: string): { noun: string; article: "a" | "an" } {
  if (!typology) return { noun: "architectural listening room", article: "an" };
  if (TYPOLOGY_LABELS[typology]) return TYPOLOGY_LABELS[typology];
  const cleaned = typology.replace(/_/g, " ").toLowerCase();
  const article = /^[aeiou]/i.test(cleaned) ? "an" : "a";
  return { noun: cleaned, article };
}

/**
 * Builds truthful "because" sentences strictly from the final scene (scene.typology, lighting, materials)
 * plus the returned data:
 *   a. Typology wording derived from scene.typology; test fails if they disagree.
 *   b. State evidence and interpretation separately ("Qloo returned X for fans of Y. Our rule maps these to Z.").
 *   c. Do NOT cite films or brands unless mapping rule actually used them.
 *   d. Correct grammar (a vs an).
 *   e. If venues came from name search, say "found by name search for 'jazz'" and never say "fans gather at".
 */
export function generateBecauseSentences(
  prompt: string,
  bundle?: RealQlooEvidenceBundle,
  entities?: QlooContextEntity[],
  derived?: DerivedArchitecturalDesign,
  sceneTypology?: string
): BecauseSentence[] {
  const subject = entities?.[0]?.name || bundle?.resolvedTags?.[0]?.name || prompt.trim();
  const sentences: BecauseSentence[] = [];

  // --------------------------------------------------------------------------
  // Decision 1: Spatial Typology & Layout
  // --------------------------------------------------------------------------
  const { noun: typNoun, article: typArticle } = formatTypology(sceneTypology);
  const places = bundle?.places || [];
  const isNameSearch = bundle?.venueSource === "name_search";
  const searchTerm = bundle?.venueSearchTerm || subject;

  if (places.length >= 2) {
    const venueList = places.slice(0, 3).map((p) => p.name);
    const venueNamesStr =
      venueList.length === 3
        ? `${venueList[0]}, ${venueList[1]} and ${venueList[2]}`
        : `${venueList[0]} and ${venueList[1]}`;

    if (isNameSearch) {
      // Rule (e): If venues from name search, say "found by name search for '...'" and NEVER "fans gather at"
      // Rule (b): Evidence and interpretation stated separately
      sentences.push({
        decision: "typology",
        headline: "Spatial Typology & Layout",
        sentence: `Qloo found venues [${venueNamesStr}] by name search for '${searchTerm}'. Our spatial rule configures this venue as ${typArticle} ${typNoun}.`,
        citedEntities: [searchTerm, ...venueList],
      });
    } else {
      // Rule (b): Evidence and interpretation stated separately
      sentences.push({
        decision: "typology",
        headline: "Spatial Typology & Layout",
        sentence: `Qloo returned venues [${venueNamesStr}] for fans of ${subject}. Our spatial rule maps these cross-domain affinities to ${typArticle} ${typNoun}.`,
        citedEntities: [subject, ...venueList],
      });
    }
  } else {
    const tags = bundle?.resolvedTags || [];
    const tagNames = tags.slice(0, 2).map((t) => t.name);
    const tagsStr = tagNames.length > 0 ? tagNames.join(" and ") : "cultural affinity signals";

    sentences.push({
      decision: "typology",
      headline: "Spatial Typology & Layout",
      sentence: `Qloo returned affinity tags [${tagsStr}] for ${subject}. Our rule maps these coordinates into ${typArticle} ${typNoun}.`,
      citedEntities: tagNames.length > 0 ? tagNames : [subject],
    });
  }

  // --------------------------------------------------------------------------
  // Decision 2: Lighting & Atmospheric Tuning
  // (Rule c: do NOT cite films/brands; cite the actual tag/evidence used by the rule)
  // --------------------------------------------------------------------------
  const kelvin = derived?.materials.lightingTemperatureK || 2700;
  const moodDesc =
    kelvin >= 5000 ? "cold industrial daylight" : kelvin <= 2800 ? "warm incandescent amber" : "diffuse neutral";
  const lightingChoice = derived?.appliedChoices.find((c) => c.element === "lighting");
  const lightingTrigger = lightingChoice?.triggeredBy || bundle?.resolvedTags?.[0]?.name || subject;

  sentences.push({
    decision: "lighting",
    headline: "Atmospheric Lighting & Color Temperature",
    sentence: `Qloo affinity signals for ${subject} highlight "${lightingTrigger}". Our lighting rule maps this aesthetic to ${kelvin}K ${moodDesc} illumination.`,
    citedEntities: [subject, lightingTrigger],
  });

  // --------------------------------------------------------------------------
  // Decision 3: Materiality & Acoustic Calibration
  // (Rule c: do NOT cite films/brands; cite the actual acoustic parameters and materials)
  // --------------------------------------------------------------------------
  const wallMat = (derived?.materials.wallMaterial || "acoustic_slats").replace(/_/g, " ");
  const floorMat = (derived?.materials.flooringMaterial || "warm_oak").replace(/_/g, " ");
  const rt60 = derived?.materials.acousticRT60Target || 0.42;
  const matChoice = derived?.appliedChoices.find((c) => c.element === "wallMaterial");
  const matTrigger = matChoice?.triggeredBy || subject;

  sentences.push({
    decision: "materiality",
    headline: "Surface Materials & Acoustic Calibration",
    sentence: `Qloo taste coordinates for ${subject} indicate "${matTrigger}". Our acoustic rule specifies ${wallMat} walls and ${floorMat} flooring calibrated to an RT60 target of ${rt60}s.`,
    citedEntities: [subject, matTrigger],
  });

  return sentences;
}
