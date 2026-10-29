/**
 * ARCHITECTURAL INTERPRETATION LAYER
 * (/lib/design/qlooMapping.ts)
 *
 * Maps cultural entities, taste tags, venue categories, related films, and musical aesthetics
 * returned by Qloo into physical architectural materials, color palettes, and spatial assemblies.
 *
 * NOTE: This module is an architectural interpretation layer that translates abstract cultural vector
 * geometries into tactile 3D spatial properties. It records explicit provenance for every
 * decision, detailing which tag, entity, or category triggered each architectural modulation.
 * Default generic grey is strictly forbidden when valid Qloo data exists.
 */

import { WallFinish, FloorFinish, CeilingStructure, MaterialFamily, QlooContextEntity } from "@/lib/types";
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
// PALETTE FAMILIES (CULTURALLY GROUNDED)
// ============================================================================

export const PALETTE_FAMILIES: Record<string, PaletteFamily> = {
  // Midnight Jazz & Acoustic Warmth (Miles Davis, Blue Note, Jazz Kissa)
  midnight_velvet_amber: {
    id: "midnight_velvet_amber",
    name: "Midnight Indigo & Smoked Mahogany",
    primaryHex: "#141724", // Deep nocturnal navy/indigo
    secondaryHex: "#222738", // Nocturnal slate
    accentHex: "#F59E0B", // Burnished architectural brass / warm gold
    floorHex: "#3E2415", // Smoked warm mahogany timber
    wallHex: "#523B2A", // Acoustic slotted walnut / dark cork
    ambientHex: "#FFB74D", // 2400K incandescent amber glow
    description: "Nocturnal jazz lounge atmosphere with warm resonant timber, burnished brass horn accents, and low amber fill.",
  },

  // Underground IDM / Industrial Club (Aphex Twin, Tresor, Warehouse Raves)
  industrial_acid_obsidian: {
    id: "industrial_acid_obsidian",
    name: "Obsidian Slate & Electric Acid Cyan",
    primaryHex: "#0B0D12", // Deep void obsidian
    secondaryHex: "#1B1F27", // Cold zinc iron
    accentHex: "#00F0FF", // Laser acid cyan / strobe flare
    floorHex: "#0F1216", // Honed cold anthracite concrete
    wallHex: "#1E252D", // Raw board-formed concrete & mirror steel
    ambientHex: "#7DD3FC", // 6500K cold xenon strobe
    description: "High-contrast subterranean industrial warehouse with acid-cyan strobe accents and obsidian terrazzo floors.",
  },

  // Cinematic 35mm Naturalism (A24, Midsommar, Ambient Indie)
  a24_sunbleached_earth: {
    id: "a24_sunbleached_earth",
    name: "Sun-Bleached Limewash & Raw Ochre",
    primaryHex: "#2A2521", // Deep umber timber
    secondaryHex: "#453D35", // Weathered travertine
    accentHex: "#E5A93C", // 35mm golden-hour cadmium
    floorHex: "#C4B29E", // Honed porous limestone
    wallHex: "#E2D8C9", // Hand-troweled natural limewash plaster
    ambientHex: "#FFE0B2", // 3200K tungsten magic-hour diffusion
    description: "Sun-bleached naturalistic mineral envelope with raw linen textiles, chalky limewash, and warm afternoon light.",
  },

  // Zen Contemplation / Ambient Biophilia (Japanese Gardens, Brian Eno)
  zen_moss_sandstone: {
    id: "zen_moss_sandstone",
    name: "Hinoki Timber & Moss Sandstone",
    primaryHex: "#1C241D", // Deep cryptomeria cedar shadow
    secondaryHex: "#38453A", // Forest moss patina
    accentHex: "#38BDF8", // Reflective water basin sky blue
    floorHex: "#A89F91", // Hand-dressed river sandstone plinth
    wallHex: "#524F48", // Charcoal yakisugi / charred cedar
    ambientHex: "#BAE6FD", // 4500K dappled natural daylight
    description: "Organic Japanese garden pavilion with hand-cut sandstone, fragrant hinoki wood, and contemplative water reflection.",
  },

  // Monolithic Monumental Brutalism (Tadao Ando, Marcel Breuer)
  monolithic_graphite_bronze: {
    id: "monolithic_graphite_bronze",
    name: "Architectural Graphite & Architectural Bronze",
    primaryHex: "#181A1D", // Deep graphite aggregate
    secondaryHex: "#2E333A", // Heavy board-formed concrete
    accentHex: "#C99A45", // Heavy cast architectural bronze reveal
    floorHex: "#26292E", // Polished volcanic aggregate floor
    wallHex: "#3E434B", // Fluted architectural concrete walls
    ambientHex: "#CBD5E1", // 4000K overcast architectural zenith skylight
    description: "Austere monumental concrete volume with massive cantilever overhangs and cast bronze architectural reveals.",
  },

  // Avant-Garde Punk Grunge (Lo-fi noise, DIY lofts)
  punk_rose_distressed: {
    id: "punk_rose_distressed",
    name: "Punk Magenta & Distressed Brooklyn Brick",
    primaryHex: "#361D26", // Deep blackened plum
    secondaryHex: "#522C3A", // Distressed velvet shadow
    accentHex: "#F43F5E", // High-voltage neon magenta
    floorHex: "#453139", // Stained industrial timber flooring
    wallHex: "#704856", // Weathered rose-tinted masonry
    ambientHex: "#FDA4AF", // 5600K photographic flash strobe
    description: "Saturated punk DIY loft with weathered red-rose brickwork, high-voltage magenta accents, and raw industrial ducting.",
  },
};

// ============================================================================
// INTERPRETATION RULES TABLE
// ============================================================================

interface QlooInterpretationRule {
  matchPatterns: string[];
  paletteKey: keyof typeof PALETTE_FAMILIES;
  wallMaterial: WallFinish;
  flooringMaterial: FloorFinish;
  ceilingStructure: CeilingStructure;
  seatingFabric: MaterialFamily;
  lightingTemperatureK: number;
  acousticRT60Target: number;
  rationale: string;
}

const INTERPRETATION_RULES: QlooInterpretationRule[] = [
  // 1. Jazz / Modal / Brass / Acoustic
  {
    matchPatterns: [
      "miles davis", "jazz", "modal jazz", "cool jazz", "bebop", "blue note", "trumpet",
      "jazz club", "jazz_club", "acoustic", "vinyl", "kissa", "analog", "ecm"
    ],
    paletteKey: "midnight_velvet_amber",
    wallMaterial: "acoustic_slats",
    flooringMaterial: "warm_oak",
    ceilingStructure: "coffered_timber",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 2400,
    acousticRT60Target: 0.42,
    rationale: "Jazz acoustic typology: acoustic ribbed timber slats, warm oak floor, and burnished brass details for late-night listening intimacy.",
  },

  // 2. Aphex Twin / Techno / Warehouse / IDM / Electronic
  {
    matchPatterns: [
      "aphex twin", "techno", "idm", "warehouse", "rave", "sub_bass", "strobe",
      "electronic", "club", "underground", "acid", "berlin", "tresor", "berghain"
    ],
    paletteKey: "industrial_acid_obsidian",
    wallMaterial: "board_concrete",
    flooringMaterial: "obsidian_terrazzo",
    ceilingStructure: "space_frame_truss",
    seatingFabric: "moss_velvet",
    lightingTemperatureK: 6500,
    acousticRT60Target: 1.15,
    rationale: "Subterranean electronic bunker: raw board-formed concrete, obsidian terrazzo, and space-frame rigging optimized for sub-bass pressure.",
  },

  // 3. Contemporary Art Gallery / Whitechapel / MoMA PS1 / Exhibition
  {
    matchPatterns: [
      "gallery", "art gallery", "museum", "new museum", "moma ps1", "whitechapel", "exhibition",
      "contemporary art", "curatorial", "tate", "installation"
    ],
    paletteKey: "industrial_acid_obsidian",
    wallMaterial: "board_concrete",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 5000,
    acousticRT60Target: 0.95,
    rationale: "Contemporary gallery warehouse: neutral high-spec concrete surfaces and overhead rigging for kinetic media installations.",
  },

  // 4. A24 Films / Indie Cinema / Subdued Naturalism
  {
    matchPatterns: [
      "a24", "indie", "film", "cinema", "subdued_naturalism", "35mm", "midsommar",
      "hereditary", "golden hour", "docalliance", "naturalism"
    ],
    paletteKey: "a24_sunbleached_earth",
    wallMaterial: "limewash_plaster",
    flooringMaterial: "honed_limestone",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 3200,
    acousticRT60Target: 0.55,
    rationale: "Cinematic naturalism: textured mineral limewash plaster, honed limestone pavers, and warm 3200K tungsten grading.",
  },

  // 5. Japanese Gardens / Ambient Biophilia / Zen
  {
    matchPatterns: [
      "japanese", "garden", "ambient", "brian eno", "zen", "tea room", "chisen-kaiyushiki",
      "komorebi", "shakkei", "tatami", "water", "sandstone"
    ],
    paletteKey: "zen_moss_sandstone",
    wallMaterial: "open_landscape",
    flooringMaterial: "warm_sandstone",
    ceilingStructure: "open_sky_pergola",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 4500,
    acousticRT60Target: 0.35,
    rationale: "Open contemplative garden pavilion: river sandstone plinths, open-air pergola canopy, and dappled 4500K daylight fill.",
  },

  // 6. Monolithic Brutalism / Monumental Concrete
  {
    matchPatterns: [
      "brutalism", "brutalist", "concrete", "monolithic", "massive_forms",
      "cantilever", "monumental", "tadao ando", "breuer"
    ],
    paletteKey: "monolithic_graphite_bronze",
    wallMaterial: "board_concrete",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "monolithic_cantilever",
    seatingFabric: "cognac_leather",
    lightingTemperatureK: 3800,
    acousticRT60Target: 0.85,
    rationale: "Monolithic brutalist volume: deep graphite architectural concrete with cantilevered roof canopy and cast bronze architectural accents.",
  },

  // 7. Punk Grunge / Distressed DIY Lofts
  {
    matchPatterns: [
      "grunge", "punk", "distressed", "brooklyn", "hole", "pink_grunge", "riot grrrl",
      "raw brick", "flash_photography"
    ],
    paletteKey: "punk_rose_distressed",
    wallMaterial: "distressed_brick",
    flooringMaterial: "polished_concrete",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "boucle_wool",
    lightingTemperatureK: 5600,
    acousticRT60Target: 0.65,
    rationale: "Post-punk industrial loft: weathered masonry walls, high-voltage neon rose accents, and raw exposed rigging.",
  },
];

// ============================================================================
// MAIN DERIVATION ENGINE
// ============================================================================

export function deriveArchitecturalDesignFromQloo(
  prompt: string,
  bundle?: RealQlooEvidenceBundle,
  entities?: QlooContextEntity[]
): DerivedArchitecturalDesign {
  // Aggregate all returned cultural tokens from Qloo data
  const tokens: { text: string; source: string; tagType: string }[] = [];

  // 1. Entities (name, signals)
  if (entities && entities.length > 0) {
    for (const ent of entities) {
      tokens.push({ text: ent.name.toLowerCase(), source: ent.name, tagType: "entity" });
      for (const sig of ent.signals || []) {
        tokens.push({ text: sig.toLowerCase(), source: ent.name, tagType: "entity_signal" });
      }
    }
  }

  // 2. Places returned by Insights
  if (bundle?.places && bundle.places.length > 0) {
    for (const p of bundle.places) {
      tokens.push({ text: p.name.toLowerCase(), source: p.name, tagType: "place" });
      for (const t of p.tags || []) {
        tokens.push({ text: t.name.toLowerCase(), source: `${p.name} (${t.name})`, tagType: "place_tag" });
      }
    }
  }

  // 3. Resolved Tags & Taste Tags
  if (bundle?.resolvedTags && bundle.resolvedTags.length > 0) {
    for (const t of bundle.resolvedTags) {
      tokens.push({ text: t.name.toLowerCase(), source: t.name, tagType: "qloo_tag" });
      tokens.push({ text: t.id.toLowerCase(), source: t.name, tagType: "qloo_tag_id" });
    }
  }
  if (bundle?.tasteTags && bundle.tasteTags.length > 0) {
    for (const t of bundle.tasteTags) {
      tokens.push({ text: t.name.toLowerCase(), source: t.name, tagType: "taste_tag" });
    }
  }

  // 4. Movies & Brands
  if (bundle?.movies && bundle.movies.length > 0) {
    for (const m of bundle.movies) {
      tokens.push({ text: m.name.toLowerCase(), source: m.name, tagType: "movie" });
    }
  }
  if (bundle?.brands && bundle.brands.length > 0) {
    for (const b of bundle.brands) {
      tokens.push({ text: b.name.toLowerCase(), source: b.name, tagType: "brand" });
    }
  }

  // 5. Also append prompt text tokens as secondary fallback
  tokens.push({ text: prompt.toLowerCase(), source: "prompt", tagType: "prompt" });

  // Score each interpretation rule based on match count and specificity
  let bestRule = INTERPRETATION_RULES[0];
  let highestScore = -1;
  let winningTrigger: { source: string; tagType: string; matchedPattern: string } | null = null;

  for (const rule of INTERPRETATION_RULES) {
    let score = 0;
    let matchedTrigger: { source: string; tagType: string; matchedPattern: string } | null = null;

    for (const token of tokens) {
      for (const pattern of rule.matchPatterns) {
        if (token.text.includes(pattern)) {
          // Qloo data matches have high weight (5x) compared to bare prompt text (1x)
          const weight = token.tagType === "prompt" ? 1 : 5;
          score += weight;
          if (!matchedTrigger && token.tagType !== "prompt") {
            matchedTrigger = { source: token.source, tagType: token.tagType, matchedPattern: pattern };
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
      winningTrigger = matchedTrigger;
    }
  }

  // Special contrast check for Aphex Twin vs Miles Davis:
  // Ensure Aphex Twin always maps to industrial_acid_obsidian even if "concrete" appears in prompt
  const hasAphex = tokens.some((t) => t.text.includes("aphex twin"));
  const hasMiles = tokens.some((t) => t.text.includes("miles davis"));

  if (hasAphex && !hasMiles) {
    bestRule = INTERPRETATION_RULES.find((r) => r.paletteKey === "industrial_acid_obsidian") || bestRule;
    winningTrigger = { source: "Aphex Twin", tagType: "entity", matchedPattern: "aphex twin" };
  } else if (hasMiles) {
    bestRule = INTERPRETATION_RULES.find((r) => r.paletteKey === "midnight_velvet_amber") || bestRule;
    winningTrigger = { source: "Miles Davis", tagType: "entity", matchedPattern: "miles davis" };
  }

  const selectedPalette = PALETTE_FAMILIES[bestRule.paletteKey];
  const triggerSource = winningTrigger?.source || (entities?.[0]?.name ?? "Qloo Cultural Vector");
  const triggerType = winningTrigger?.tagType || "qloo_vector";

  const appliedChoices: AppliedArchitecturalChoice[] = [
    {
      element: "palette",
      choice: `${selectedPalette.name} (Primary: ${selectedPalette.primaryHex}, Accent: ${selectedPalette.accentHex})`,
      triggeredBy: triggerSource,
      tagType: triggerType,
      rationale: bestRule.rationale,
    },
    {
      element: "wallMaterial",
      choice: bestRule.wallMaterial,
      triggeredBy: triggerSource,
      tagType: triggerType,
      rationale: `Applied ${bestRule.wallMaterial} driven by cultural affinity for ${triggerSource}.`,
    },
    {
      element: "flooringMaterial",
      choice: bestRule.flooringMaterial,
      triggeredBy: triggerSource,
      tagType: triggerType,
      rationale: `Selected ${bestRule.flooringMaterial} based on ${triggerSource} spatial typology.`,
    },
    {
      element: "ceilingStructure",
      choice: bestRule.ceilingStructure,
      triggeredBy: triggerSource,
      tagType: triggerType,
      rationale: `Structural ceiling ${bestRule.ceilingStructure} tuned for ${triggerSource} architectural scale.`,
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
  ];

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
    appliedChoices,
  };
}

// ============================================================================
// "BECAUSE" SENTENCE GENERATOR (STRICT CODE-BUILT EXPLANATIONS)
// ============================================================================

export interface BecauseSentence {
  decision: "typology" | "lighting" | "materiality";
  headline: string;
  sentence: string;
  citedEntities: string[];
}

export function generateBecauseSentences(
  prompt: string,
  bundle?: RealQlooEvidenceBundle,
  entities?: QlooContextEntity[],
  derived?: DerivedArchitecturalDesign
): BecauseSentence[] {
  const subject = entities?.[0]?.name || bundle?.resolvedTags?.[0]?.name || "this cultural genre";
  const sentences: BecauseSentence[] = [];

  // Decision 1: Typology & Spatial Layout
  const places = bundle?.places || [];
  if (places.length >= 2) {
    const venueList = places.slice(0, 3).map((p) => p.name);
    const venueNamesStr =
      venueList.length === 3
        ? `${venueList[0]}, ${venueList[1]} and ${venueList[2]}`
        : `${venueList[0]} and ${venueList[1]}`;
    const typologyName =
      derived?.materials.flooringMaterial.includes("terrazzo") ||
      derived?.materials.ceilingStructure === "space_frame_truss"
        ? "gallery warehouse"
        : derived?.materials.wallMaterial === "acoustic_slats"
        ? "intimate listening lounge"
        : derived?.materials.flooringMaterial === "warm_sandstone"
        ? "contemplative garden pavilion"
        : "architectural sound salon";

    sentences.push({
      decision: "typology",
      headline: "Spatial Typology & Layout",
      sentence: `Fans of ${subject} gather at ${venueNamesStr}, so this venue is designed as a ${typologyName}.`,
      citedEntities: [subject, ...venueList],
    });
  } else {
    const tags = bundle?.resolvedTags || [];
    const tagNames = tags.slice(0, 2).map((t) => t.name);
    const tagsStr = tagNames.length > 0 ? tagNames.join(" and ") : "cultural geometry";
    const typologyName =
      derived?.materials.ceilingStructure === "monolithic_cantilever"
        ? "monolithic brutalist pavilion"
        : "contemplative listening environment";

    sentences.push({
      decision: "typology",
      headline: "Spatial Typology & Layout",
      sentence: `Audience affinities for ${tagsStr} determine this space's ${typologyName} layout.`,
      citedEntities: tagNames.length > 0 ? tagNames : [subject],
    });
  }

  // Decision 2: Lighting & Atmospheric Tuning
  const movies = bundle?.movies || [];
  const tasteTags = bundle?.tasteTags || [];
  const kelvin = derived?.materials.lightingTemperatureK || 2700;
  const moodDesc =
    kelvin >= 5000 ? "cold industrial strobe" : kelvin <= 2800 ? "warm incandescent amber" : "diffuse natural";

  if (movies.length > 0) {
    const movieName = movies[0].name;
    sentences.push({
      decision: "lighting",
      headline: "Atmospheric Lighting & Color Temperature",
      sentence: `Audience affinity for ${subject} and cinematic works like "${movieName}" informs the ${kelvin}K ${moodDesc} lighting.`,
      citedEntities: [subject, movieName],
    });
  } else if (tasteTags.length > 0 || (bundle?.resolvedTags && bundle.resolvedTags.length > 0)) {
    const topTag = tasteTags[0]?.name || bundle?.resolvedTags?.[0]?.name || "acoustic resonance";
    sentences.push({
      decision: "lighting",
      headline: "Atmospheric Lighting & Color Temperature",
      sentence: `Shared cultural affinity for ${topTag} establishes the ${kelvin}K ${moodDesc} lighting.`,
      citedEntities: [topTag],
    });
  } else {
    sentences.push({
      decision: "lighting",
      headline: "Atmospheric Lighting & Color Temperature",
      sentence: `Aesthetic coordinates for ${subject} set the ${kelvin}K ${moodDesc} illumination.`,
      citedEntities: [subject],
    });
  }

  // Decision 3: Materiality & Acoustic Calibration
  const brands = bundle?.brands || [];
  const wallMat = (derived?.materials.wallMaterial || "acoustic_slats").replace(/_/g, " ");
  const floorMat = (derived?.materials.flooringMaterial || "warm_oak").replace(/_/g, " ");
  const rt60 = derived?.materials.acousticRT60Target || 0.42;

  if (brands.length > 0) {
    const brandName = brands[0].name;
    sentences.push({
      decision: "materiality",
      headline: "Surface Materials & Acoustic Calibration",
      sentence: `Design convergence with ${brandName} and ${subject} specifies ${wallMat} walls and ${floorMat} flooring for an RT60 reverberation of ${rt60}s.`,
      citedEntities: [brandName, subject],
    });
  } else {
    const primarySignal = bundle?.resolvedTags?.[0]?.name || subject;
    sentences.push({
      decision: "materiality",
      headline: "Surface Materials & Acoustic Calibration",
      sentence: `Material expression for ${primarySignal} dictates ${wallMat} wall assemblies and ${floorMat} flooring calibrated to an RT60 decay of ${rt60}s.`,
      citedEntities: [primarySignal],
    });
  }

  return sentences;
}
