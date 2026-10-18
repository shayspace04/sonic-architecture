import type { CulturalEvidence, DesignConcept } from "./types";

export interface SpatialMapping {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
  source: "qloo" | "qloo-partial";
  evidence: string[];
  rules: Record<string, string>;
  concept: DesignConcept;
}

type GenreFamily = "electronic" | "hiphop" | "punk" | "atmospheric" | "neutral";

const FAMILY_TITLES: Record<GenreFamily, string> = {
  electronic: "VOLTAGE HALL",
  hiphop: "GOLDEN HOUR BLOCK",
  punk: "RAW SIGNAL ROOM",
  atmospheric: "SOFT FOCUS PAVILION",
  neutral: "OPEN FREQUENCY ROOM",
};

const FAMILY_ATMOSPHERE: Record<GenreFamily, string> = {
  electronic: "Cool neon haze over reflective surfaces; the room hums like a circuit.",
  hiphop: "Warm urban glow on dense materials; confident, social, grounded.",
  punk: "High contrast and raw edges; nothing polished that does not earn it.",
  atmospheric: "Soft diffusion and long light; the room breathes at walking pace.",
  neutral: "Quiet neutral field ready to absorb whatever the culture brings.",
};

const FAMILY_COMPOSITION: Record<GenreFamily, string> = {
  electronic: "Long sightlines to a luminous bar spine; tight seating clusters at the perimeter.",
  hiphop: "Central gathering floor with low seating islands and a strong entry axis.",
  punk: "Asymmetric plan; hard corners, visible structure, deliberate collisions of scale.",
  atmospheric: "Layered thresholds and blurred zones; circulation reads as a slow gradient.",
  neutral: "Balanced rectangular plan with flexible mid-floor and a clear anchor bar.",
};

const KNOWN_GENRES = [
  "electronic", "house", "techno", "edm", "electro", "trance", "dubstep", "bass", "dance",
  "hip hop", "rap", "trap", "crunk",
  "punk", "rock", "alternative", "hardcore", "grunge", "emo",
  "ambient", "psychedelic", "indie", "atmospheric", "melodic",
];

const KNOWN_MOODS = [
  "energetic", "high-energy", "dynamic", "upbeat", "danceable",
  "dark", "gritty", "raw", "aggressive", "intense",
  "atmospheric", "melodic", "uplifting",
];

function detectFamily(evidence: CulturalEvidence): GenreFamily {
  const genreText = evidence.genreTags.join(" ").toLowerCase();
  const has = (words: string[]) => words.some((w) => genreText.includes(w));
  if (has(["electronic", "house", "techno", "edm", "electro", "trance", "dubstep", "bass", "dance"])) return "electronic";
  if (has(["hip hop", "rap", "trap", "crunk"])) return "hiphop";
  if (has(["punk", "rock", "alternative", "hardcore", "grunge", "emo"])) return "punk";
  if (has(["ambient", "psychedelic", "indie", "atmospheric", "melodic"])) return "atmospheric";
  return "neutral";
}

function buildConcept(
  family: GenreFamily,
  evidence: CulturalEvidence,
  design: { primaryColorHex: string; flooringMaterial: string; seatingFabric: string; lightingTemperatureK: number },
  anchorNames: string[]
): DesignConcept {
  const anchors = anchorNames.length > 0 ? anchorNames.slice(0, 3).join(", ") : "the signals below";
  const topTags = [...evidence.genreTags, ...evidence.themeTags, ...evidence.adjectives].slice(0, 3);
  const cueText = topTags.length > 0 ? ` Qloo cues: ${topTags.join(", ")}.` : "";
  return {
    title: FAMILY_TITLES[family],
    thesis: `Built from ${anchors}. ${family === "neutral" ? "Unrecognized genre families, so the translation stays deliberately neutral" : `The ${family} family`}, translated into ${design.primaryColorHex} light, ${design.flooringMaterial.toLowerCase()} underfoot, and ${design.seatingFabric.toLowerCase()} seating at ${design.lightingTemperatureK}K.${cueText}`,
    atmosphere: FAMILY_ATMOSPHERE[family],
    spatialComposition: FAMILY_COMPOSITION[family],
    lightingDirection:
      design.lightingTemperatureK >= 5500
        ? "Cool overhead wash with sharp accent points; light falls fast and clean."
        : design.lightingTemperatureK <= 3800
          ? "Low warm rake from the sides; long shadows, slow falloff into the corners."
          : "Neutral mid-temperature key light with violet depth in the perimeter zones.",
  };
}

export function mapFromEvidence(
  evidence: CulturalEvidence,
  anchorNames: string[] = []
): SpatialMapping {
  const moodText = [...evidence.styleTags, ...evidence.adjectives, ...evidence.characteristics].join(" ").toLowerCase();
  const hasMood = (words: string[]) => words.some((w) => moodText.includes(w));
  const isHighEnergy = hasMood(["energetic", "high-energy", "dynamic", "upbeat", "danceable"]);
  const isDark = hasMood(["dark", "gritty", "raw", "aggressive", "intense"]);

  const genreEvidence = evidence.genreTags.filter((t) => KNOWN_GENRES.some((w) => t.includes(w)));
  const moodEvidence = [...evidence.adjectives, ...evidence.characteristics].filter((t) => KNOWN_MOODS.includes(t));
  const matchedEvidence = [...new Set([...genreEvidence, ...moodEvidence])];

  const family = detectFamily(evidence);
  const rules: Record<string, string> = {};

  let primaryColorHex = "#808080";
  let accentColorHex = "#BFBFBF";
  let lightingTemperatureK = 4500;
  let flooringMaterial = "Micro-cement Screed Core";
  let seatingFabric = "Brushed Matte Canvas";

  if (family !== "neutral") {
    if (family === "electronic") {
      primaryColorHex = "#00E5FF";
      accentColorHex = "#FF00AA";
      flooringMaterial = "High-Gloss Polyurethane Core";
      seatingFabric = "Technical Ribbed Neoprene";
      rules.primaryColorHex = "Matched Qloo genre tags (electronic/house/techno) to a cool neon palette.";
      rules.flooringMaterial = "Electronic/club genre tags -> High-Gloss Polyurethane Core.";
      rules.seatingFabric = "Electronic/club genre tags -> Technical Ribbed Neoprene.";
    } else if (family === "hiphop") {
      primaryColorHex = "#FF6B35";
      accentColorHex = "#FFD166";
      flooringMaterial = "Polished Black Basalt";
      seatingFabric = "Brushed Matte Canvas";
      rules.primaryColorHex = "Matched Qloo genre tags (hip hop/rap/trap) to a warm urban palette.";
      rules.flooringMaterial = "Hip-hop genre tags -> Polished Black Basalt.";
      rules.seatingFabric = "Hip-hop genre tags -> Brushed Matte Canvas.";
    } else if (family === "punk") {
      primaryColorHex = "#FF3366";
      accentColorHex = "#FF99AA";
      flooringMaterial = "Industrial Micro-cement";
      seatingFabric = "Distressed Moss Velvet";
      rules.primaryColorHex = "Matched Qloo genre tags (punk/rock/alternative) to a high-contrast palette.";
      rules.flooringMaterial = "Punk/rock genre tags -> Industrial Micro-cement.";
      rules.seatingFabric = "Punk/rock genre tags -> Distressed Moss Velvet.";
    } else {
      primaryColorHex = "#7B68EE";
      accentColorHex = "#B39DDB";
      flooringMaterial = "Bleached Oak Planking";
      seatingFabric = "Raw Linen Twill";
      rules.primaryColorHex = "Matched Qloo genre tags (atmospheric/psychedelic/indie) to a soft palette.";
      rules.flooringMaterial = "Atmospheric genre tags -> Bleached Oak Planking.";
      rules.seatingFabric = "Atmospheric genre tags -> Raw Linen Twill.";
    }

    if (isHighEnergy) {
      lightingTemperatureK = 6000;
      rules.lightingTemperatureK = "High-energy Qloo style/adjective tags -> 6000K cool energetic lighting.";
    } else if (isDark) {
      lightingTemperatureK = 4500;
      rules.lightingTemperatureK = "Dark/gritty Qloo tags -> 4500K neutral lighting.";
    } else if (family === "atmospheric") {
      lightingTemperatureK = 3500;
      rules.lightingTemperatureK = "Atmospheric Qloo tags -> 3500K soft warm lighting.";
    } else {
      lightingTemperatureK = 4500;
      rules.lightingTemperatureK = "No clear mood tags; 4500K default.";
    }
    rules.accentColorHex = "Complementary accent for the selected palette.";
  } else {
    rules.primaryColorHex = "No recognized Qloo genre family; neutral default color.";
    rules.accentColorHex = "No recognized Qloo genre family; neutral default accent.";
    rules.lightingTemperatureK = "No recognized Qloo mood tags; 4500K default.";
    rules.flooringMaterial = "No recognized Qloo material tags; neutral default flooring.";
    rules.seatingFabric = "No recognized Qloo material tags; neutral default seating.";
  }

  const design = { primaryColorHex, flooringMaterial, seatingFabric, lightingTemperatureK };

  return {
    ...design,
    accentColorHex,
    source: family === "neutral" ? "qloo-partial" : "qloo",
    evidence: matchedEvidence.slice(0, 8),
    rules,
    concept: buildConcept(family, evidence, design, anchorNames),
  };
}

export function neutralSpatialMapping(anchorNames: string[] = []): SpatialMapping {
  return mapFromEvidence({ genreTags: [], styleTags: [], themeTags: [], adjectives: [], characteristics: [] }, anchorNames);
}
