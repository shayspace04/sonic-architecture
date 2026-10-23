import type { VibePayload } from "./types";
import { detectGenreFamily } from "./spatial-rules";

export type SpatialTypology =
  | "listening_room"
  | "party_venue"
  | "scandinavian_living"
  | "futuristic_launch"
  | "gallery_pavilion"
  | "grand_hall"
  | "intimate_lounge"
  | "mediterranean_courtyard"
  | "industrial_loft";

export type WallFinish =
  | "acoustic_slats"
  | "distressed_plaster"
  | "raw_concrete"
  | "wood_panel"
  | "gallery_white"
  | "fluted_stone";

export type FloorFinish =
  | "warm_oak"
  | "glossy_concrete"
  | "polished_stone"
  | "terrazzo"
  | "industrial_cement";

export type CeilingStructure =
  | "cathedral_truss"
  | "acoustic_coffered"
  | "timber_pergola"
  | "concrete_beams"
  | "neon_lightgrid"
  | "minimal_soffit";

export type WallArchitecture =
  | "arched_colonnade"
  | "timber_slats"
  | "panoramic_glazing"
  | "fluted_stone"
  | "raw_concrete_panels"
  | "gallery_planes";

export interface SpatialObject {
  id: string;
  kind: "seat" | "surface" | "light" | "decor" | "structure" | "audio";
  label: string;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: string;
  material: string;
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
  rationale: string;
}

export interface SpatialZone {
  id: string;
  name: string;
  areaSqM: number;
  center: [number, number, number];
  dimensions: [number, number]; // width, depth
  color: string;
  rationale: string;
}

export interface EventCapacity {
  layoutMode: "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony";
  guests: number;
  maxCapacity: number;
  tablesCount: number;
  chairsCount: number;
  sqmPerGuest: number;
  status: "optimal" | "tight" | "over_capacity";
}

export interface SceneSpec {
  typology: SpatialTypology;
  typologyLabel: string;
  roomDimensions: { width: number; depth: number; height: number };
  wallFinish: WallFinish;
  floorFinish: FloorFinish;
  ceilingStructure: CeilingStructure;
  wallArchitecture: WallArchitecture;
  primaryColor: string;
  accentColor: string;
  lightingKelvin: number;
  objects: SpatialObject[];
  zones: SpatialZone[];
  hasWindowAperture: boolean;
  atmosphereNote: string;
  designIntent: string;
  qlooFlooring?: string;
  qlooSeating?: string;
  qlooLightingK?: number;
  qlooFeaturedArtist?: string;
  qlooEvidenceTags?: string[];
  eventCapacity?: EventCapacity;
}

function parseExplicitTypology(text: string): SpatialTypology | null {
  const t = text.toLowerCase();
  if (
    t.includes("wedding") ||
    t.includes("banquet") ||
    t.includes("grand hall") ||
    t.includes("cathedral") ||
    t.includes("ceremony") ||
    t.includes("reception") ||
    t.includes("ballroom") ||
    t.includes("feast") ||
    t.includes("timber truss") ||
    t.includes("spacely")
  ) {
    return "grand_hall";
  }
  if (
    t.includes("cocktail") ||
    t.includes("speakeasy") ||
    t.includes("lounge") ||
    t.includes("whiskey") ||
    t.includes("bar ") ||
    t.includes("bar,") ||
    t.includes("bar.") ||
    t.includes("velvet") ||
    t.includes("moody bar")
  ) {
    return "intimate_lounge";
  }
  if (
    t.includes("mehendi") ||
    t.includes("marigold") ||
    t.includes("indian celebration") ||
    t.includes("sangeet") ||
    t.includes("mediterranean") ||
    t.includes("courtyard") ||
    t.includes("riad") ||
    t.includes("patio") ||
    t.includes("orangery") ||
    t.includes("terracotta") ||
    t.includes("villa") ||
    t.includes("moroccan") ||
    t.includes("garden court") ||
    t.includes("fountain")
  ) {
    return "mediterranean_courtyard";
  }
  if (
    t.includes("industrial") ||
    t.includes("loft") ||
    t.includes("warehouse") ||
    t.includes("brewery") ||
    t.includes("taproom") ||
    t.includes("exposed brick") ||
    t.includes("distillery")
  ) {
    return "industrial_loft";
  }
  if (
    t.includes("tea room") ||
    t.includes("tea house") ||
    t.includes("washi") ||
    t.includes("tatami") ||
    t.includes("jazz") ||
    t.includes("listening") ||
    t.includes("audiophile") ||
    t.includes("vinyl") ||
    t.includes("hifi")
  ) {
    return "listening_room";
  }
  if (
    t.includes("party") ||
    t.includes("grunge") ||
    t.includes("birthday") ||
    t.includes("club") ||
    t.includes("rave") ||
    t.includes("dance") ||
    t.includes("cyberpunk")
  ) {
    return "party_venue";
  }
  if (
    t.includes("scandinavian") ||
    t.includes("nordic") ||
    t.includes("living room") ||
    t.includes("natural oak") ||
    t.includes("japandi") ||
    t.includes("minimalist")
  ) {
    return "scandinavian_living";
  }
  if (
    t.includes("fashion") ||
    t.includes("runway") ||
    t.includes("brutalist") ||
    t.includes("electric vehicle") ||
    t.includes("vehicle launch") ||
    t.includes("product reveal") ||
    t.includes("futuristic") ||
    t.includes("launch") ||
    t.includes("reflective") ||
    t.includes("cyber") ||
    t.includes("product launch") ||
    t.includes("monolith")
  ) {
    return "futuristic_launch";
  }
  if (
    t.includes("gallery") ||
    t.includes("exhibition") ||
    t.includes("museum") ||
    t.includes("sculptur") ||
    t.includes("art pavilion")
  ) {
    return "gallery_pavilion";
  }
  return null;
}

function mapQlooFloorToFinish(flooringText: string): FloorFinish {
  const f = flooringText.toLowerCase();
  if (f.includes("oak") || f.includes("timber") || f.includes("wood") || f.includes("plank")) {
    return "warm_oak";
  }
  if (
    f.includes("stone") ||
    f.includes("basalt") ||
    f.includes("travertine") ||
    f.includes("limestone") ||
    f.includes("marble") ||
    f.includes("slate")
  ) {
    return "polished_stone";
  }
  if (f.includes("terrazzo")) {
    return "terrazzo";
  }
  if (f.includes("polyurethane") || f.includes("gloss")) {
    return "glossy_concrete";
  }
  return "industrial_cement";
}

/* ---------------------------------------------------------------------------
   Typology Builders
--------------------------------------------------------------------------- */

function buildGrandHall(): SceneSpec {
  return {
    typology: "grand_hall",
    typologyLabel: "Cathedral Timber Banquet Hall & Celebration Venue",
    roomDimensions: { width: 14, depth: 22, height: 7.2 },
    wallFinish: "distressed_plaster",
    floorFinish: "polished_stone",
    ceilingStructure: "cathedral_truss",
    wallArchitecture: "arched_colonnade",
    primaryColor: "#D99B52",
    accentColor: "#2F5A4C",
    lightingKelvin: 2700,
    hasWindowAperture: true,
    atmosphereNote:
      "Cathedral volume with exposed timber roof trusses, warm glowing crystal chandeliers, candlelit glass hurricane lanterns lining the aisle, and banquet tables with tall botanical floral centerpieces.",
    designIntent:
      "Symmetrical celebration architecture inspired by European cathedral halls, rhythmic arched side window colonnades, and multi-tier ambient candle illumination.",
    zones: [
      {
        id: "z-aisle",
        name: "Candlelit Central Runway & Procession",
        areaSqM: 48,
        center: [0, 0, 0],
        dimensions: [4.0, 18.0],
        color: "#D99B52",
        rationale:
          "Unobstructed central procession runway flanked by glass hurricane lanterns casting warm golden reflections on polished limestone.",
      },
      {
        id: "z-tables",
        name: "Banquet Dining & Reception Wings",
        areaSqM: 110,
        center: [0, 0, 0],
        dimensions: [12.0, 17.0],
        color: "#2F5A4C",
        rationale:
          "Dual symmetrical long dining tables with floor-length linens, Chiavari chairs, and elevated floral centerpieces.",
      },
      {
        id: "z-altar",
        name: "Ceremonial Altar & Floral Arch",
        areaSqM: 35,
        center: [0, 0, -8.5],
        dimensions: [8.0, 4.5],
        color: "#E8B878",
        rationale:
          "Focal destination framed by a grand botanical arch, arched window portal, and ceremonial altar credenza.",
      },
    ],
    objects: [
      {
        id: "chandelier-1",
        kind: "light",
        label: "Grand Baroque Multi-Tier Crystal Chandelier",
        position: [0, 5.2, -4.5],
        rotation: [0, 0, 0],
        dimensions: "1.8m diameter × 2.4m high",
        material: "Faceted Bohemian Crystal & Hand-Antiqued Brass",
        color: "#FFF4DD",
        roughness: 0.1,
        metalness: 0.9,
        emissive: "#FFD992",
        emissiveIntensity: 2.8,
        rationale:
          "Central focal jewel casting sparkling multi-directional ambient illumination across the timber trusses.",
      },
      {
        id: "chandelier-2",
        kind: "light",
        label: "Grand Baroque Multi-Tier Crystal Chandelier",
        position: [0, 5.2, 4.5],
        rotation: [0, 0, 0],
        dimensions: "1.8m diameter × 2.4m high",
        material: "Faceted Bohemian Crystal & Hand-Antiqued Brass",
        color: "#FFF4DD",
        roughness: 0.1,
        metalness: 0.9,
        emissive: "#FFD992",
        emissiveIntensity: 2.8,
        rationale:
          "Secondary crystal chandelier maintaining warm atmospheric equilibrium across the high cathedral volume.",
      },
      {
        id: "floral-arch",
        kind: "decor",
        label: "Cathedral Botanical Floral Archway",
        position: [0, 2.8, -9.5],
        rotation: [0, 0, 0],
        dimensions: "4.5m × 1.2m × 4.8m arch",
        material: "Trailing Silver Dollar Eucalyptus, White Garden Roses, and Hydrangeas",
        color: "#2E4733",
        roughness: 0.9,
        metalness: 0.05,
        rationale: "Framing the ceremonial altar backdrop in organic living greenery.",
      },
      {
        id: "banquet-table-left",
        kind: "surface",
        label: "Floor-Length Draped Linen Banquet Table (Left)",
        position: [-3.8, 0.42, 0],
        rotation: [0, 0, 0],
        dimensions: "1.6m × 14.0m × 0.78m",
        material: "Heavy Washed Ivory Belgian Linen & Solid Oak Base",
        color: "#F4F0E8",
        roughness: 0.92,
        metalness: 0.02,
        rationale: "Symmetrical long-table communal seating arrangement optimizing dining sightlines.",
      },
      {
        id: "banquet-table-right",
        kind: "surface",
        label: "Floor-Length Draped Linen Banquet Table (Right)",
        position: [3.8, 0.42, 0],
        rotation: [0, 0, 0],
        dimensions: "1.6m × 14.0m × 0.78m",
        material: "Heavy Washed Ivory Belgian Linen & Solid Oak Base",
        color: "#F4F0E8",
        roughness: 0.92,
        metalness: 0.02,
        rationale: "Paired right-wing banquet table mirroring the left procession.",
      },
      {
        id: "floral-pedestal-1",
        kind: "decor",
        label: "Elevated Trumpet Urn Floral Centerpiece",
        position: [-3.8, 1.45, -3.8],
        rotation: [0, 0, 0],
        dimensions: "0.8m diameter × 1.6m high",
        material: "Polished Brass Trumpet Stand with White Roses & Ruscus",
        color: "#E8E2D5",
        roughness: 0.7,
        metalness: 0.3,
        rationale: "Elevated centerpieces keep eye-level sightlines open across the table.",
      },
      {
        id: "floral-pedestal-2",
        kind: "decor",
        label: "Elevated Trumpet Urn Floral Centerpiece",
        position: [-3.8, 1.45, 3.8],
        rotation: [0, 0, 0],
        dimensions: "0.8m diameter × 1.6m high",
        material: "Polished Brass Trumpet Stand with White Roses & Ruscus",
        color: "#E8E2D5",
        roughness: 0.7,
        metalness: 0.3,
        rationale: "Rhythmic floral height variation along the banquet length.",
      },
      {
        id: "floral-pedestal-3",
        kind: "decor",
        label: "Elevated Trumpet Urn Floral Centerpiece",
        position: [3.8, 1.45, -3.8],
        rotation: [0, 0, 0],
        dimensions: "0.8m diameter × 1.6m high",
        material: "Polished Brass Trumpet Stand with White Roses & Ruscus",
        color: "#E8E2D5",
        roughness: 0.7,
        metalness: 0.3,
        rationale: "Matched right-side elevated floral centerpiece.",
      },
      {
        id: "floral-pedestal-4",
        kind: "decor",
        label: "Elevated Trumpet Urn Floral Centerpiece",
        position: [3.8, 1.45, 3.8],
        rotation: [0, 0, 0],
        dimensions: "0.8m diameter × 1.6m high",
        material: "Polished Brass Trumpet Stand with White Roses & Ruscus",
        color: "#E8E2D5",
        roughness: 0.7,
        metalness: 0.3,
        rationale: "Matched right-side elevated floral centerpiece.",
      },
      {
        id: "candle-lantern-l1",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [-1.6, 0.22, -6.5],
        rotation: [0, 0.15, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Aisle-bordering candle lantern casting romantic floor glows.",
      },
      {
        id: "candle-lantern-l2",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [-1.6, 0.22, -2.5],
        rotation: [0, -0.1, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Mid-aisle candle reflection guide.",
      },
      {
        id: "candle-lantern-l3",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [-1.6, 0.22, 1.5],
        rotation: [0, 0.2, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Mid-aisle candle reflection guide.",
      },
      {
        id: "candle-lantern-l4",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [-1.6, 0.22, 5.5],
        rotation: [0, -0.15, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Entrance threshold candle lantern.",
      },
      {
        id: "candle-lantern-r1",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [1.6, 0.22, -6.5],
        rotation: [0, -0.15, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Paired right-side aisle candle lantern.",
      },
      {
        id: "candle-lantern-r2",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [1.6, 0.22, -2.5],
        rotation: [0, 0.1, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Paired right-side aisle candle lantern.",
      },
      {
        id: "candle-lantern-r3",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [1.6, 0.22, 1.5],
        rotation: [0, -0.2, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Paired right-side aisle candle lantern.",
      },
      {
        id: "candle-lantern-r4",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [1.6, 0.22, 5.5],
        rotation: [0, 0.15, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass Panes & Antiqued Brass Frame",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Entrance threshold candle lantern.",
      },
      {
        id: "altar-table",
        kind: "structure",
        label: "Ceremonial Altar Credenza with Draped Linens",
        position: [0, 0.45, -9.0],
        rotation: [0, 0, 0],
        dimensions: "2.8m × 0.9m × 0.9m",
        material: "Solid Chestnut Timber & Ivory Raw Silk",
        color: "#282522",
        roughness: 0.75,
        metalness: 0.1,
        rationale: "Architectural focal altar anchoring the perspective convergence point.",
      },
    ],
  };
}

function buildIntimateLounge(): SceneSpec {
  return {
    typology: "intimate_lounge",
    typologyLabel: "Mid-Century Cocktail Lounge & Velvet Speakeasy",
    roomDimensions: { width: 13, depth: 17, height: 4.2 },
    wallFinish: "fluted_stone",
    floorFinish: "polished_stone",
    ceilingStructure: "acoustic_coffered",
    wallArchitecture: "fluted_stone",
    primaryColor: "#9A3B26",
    accentColor: "#E8B878",
    lightingKelvin: 2500,
    hasWindowAperture: false,
    atmosphereNote:
      "Deep amber warmth, fluted walnut bar counter with backlit spirit tiers, curved mohair velvet banquettes, and an architectural travertine hearth.",
    designIntent:
      "Intimate nocturnal hospitality layout balancing social bar mixology, acoustic absorption, and secluded velvet booth alcoves.",
    zones: [
      {
        id: "z-bar",
        name: "Cocktail Mixology & Tasting Spine",
        areaSqM: 36,
        center: [0, 0, -4.8],
        dimensions: [8.5, 4.2],
        color: "#9A3B26",
        rationale:
          "Fluted walnut bar counter with brass footrail and illuminated back-shelf tiers anchoring the service axis.",
      },
      {
        id: "z-banquette",
        name: "Curved Velvet Conversation Salons",
        areaSqM: 45,
        center: [0, 0, 1.2],
        dimensions: [10.0, 5.8],
        color: "#E8B878",
        rationale:
          "Symmetrical semi-private curved velvet banquettes flanking low smoked glass tasting tables.",
      },
      {
        id: "z-hearth",
        name: "Architectural Travertine Hearth",
        areaSqM: 22,
        center: [-4.2, 0, -1.2],
        dimensions: [3.8, 5.2],
        color: "#C47D42",
        rationale:
          "Low cantilevered travertine fireplace plinth providing glowing amber embers and soft firelight warmth.",
      },
    ],
    objects: [
      {
        id: "bar-counter",
        kind: "structure",
        label: "Fluted Dark Walnut & Honed Brass Cocktail Bar",
        position: [0, 0.55, -5.2],
        rotation: [0, 0, 0],
        dimensions: "4.4m × 1.1m × 1.12m",
        material: "Fluted Solid Walnut, Honed Brass Footrail & Nero Marquina Marble Top",
        color: "#2C1B10",
        roughness: 0.45,
        metalness: 0.4,
        rationale:
          "Architectural bar spine housing cocktail mixology station and illuminated spirit bottle shelving.",
      },
      {
        id: "bar-stool-1",
        kind: "seat",
        label: "Curved Brass & Mohair Velvet Bar Stool",
        position: [-1.4, 0.42, -4.1],
        rotation: [0, 0, 0],
        dimensions: "0.48m × 0.48m × 0.82m",
        material: "Antiqued Brass Base & Amber Velvet",
        color: "#8B4226",
        roughness: 0.8,
        metalness: 0.3,
        rationale: "High-comfort bar seating angled toward mixologist workspace.",
      },
      {
        id: "bar-stool-2",
        kind: "seat",
        label: "Curved Brass & Mohair Velvet Bar Stool",
        position: [0, 0.42, -4.1],
        rotation: [0, 0, 0],
        dimensions: "0.48m × 0.48m × 0.82m",
        material: "Antiqued Brass Base & Amber Velvet",
        color: "#8B4226",
        roughness: 0.8,
        metalness: 0.3,
        rationale: "Central bar stool companion.",
      },
      {
        id: "bar-stool-3",
        kind: "seat",
        label: "Curved Brass & Mohair Velvet Bar Stool",
        position: [1.4, 0.42, -4.1],
        rotation: [0, 0, 0],
        dimensions: "0.48m × 0.48m × 0.82m",
        material: "Antiqued Brass Base & Amber Velvet",
        color: "#8B4226",
        roughness: 0.8,
        metalness: 0.3,
        rationale: "Right-wing bar stool companion.",
      },
      {
        id: "sofa-banquette-left",
        kind: "seat",
        label: "Curved Modular Banquette in Crushed Mohair Velvet",
        position: [-3.8, 0.45, 1.6],
        rotation: [0, 0.5, 0],
        dimensions: "3.6m × 1.2m × 0.85m",
        material: "Crushed Rust Mohair Velvet & Fluted Walnut Base",
        color: "#6D2B1C",
        roughness: 0.88,
        metalness: 0.08,
        rationale: "Deep acoustic lounge envelope sheltering intimate conversation.",
      },
      {
        id: "sofa-banquette-right",
        kind: "seat",
        label: "Curved Modular Banquette in Crushed Mohair Velvet",
        position: [3.8, 0.45, 1.6],
        rotation: [0, -0.5, 0],
        dimensions: "3.6m × 1.2m × 0.85m",
        material: "Crushed Rust Mohair Velvet & Fluted Walnut Base",
        color: "#6D2B1C",
        roughness: 0.88,
        metalness: 0.08,
        rationale: "Mirrored right-side velvet banquette.",
      },
      {
        id: "coffee-table-1",
        kind: "surface",
        label: "Smoked Glass & Antiqued Brass Cocktail Table",
        position: [-3.2, 0.24, 0.8],
        rotation: [0, 0, 0],
        dimensions: "1.1m diameter × 0.42m",
        material: "Tempered Smoked Bronze Glass & Spun Brass Pedestal",
        color: "#3A2A1E",
        roughness: 0.2,
        metalness: 0.7,
        rationale: "Reflects low candlelight and amber pendant illumination.",
      },
      {
        id: "coffee-table-2",
        kind: "surface",
        label: "Smoked Glass & Antiqued Brass Cocktail Table",
        position: [3.2, 0.24, 0.8],
        rotation: [0, 0, 0],
        dimensions: "1.1m diameter × 0.42m",
        material: "Tempered Smoked Bronze Glass & Spun Brass Pedestal",
        color: "#3A2A1E",
        roughness: 0.2,
        metalness: 0.7,
        rationale: "Right-wing companion cocktail table.",
      },
      {
        id: "hearth-fireplace",
        kind: "structure",
        label: "Cantilevered Roman Travertine Fireplace Hearth",
        position: [-4.8, 0.35, -1.2],
        rotation: [0, Math.PI / 2, 0],
        dimensions: "2.8m × 0.9m × 0.65m",
        material: "Honed Roman Travertine & Cast Iron Ember Bed",
        color: "#DDD2C0",
        roughness: 0.7,
        metalness: 0.1,
        emissive: "#FFA034",
        emissiveIntensity: 1.6,
        rationale: "Architectural firebox anchoring the room with living thermal glow.",
      },
      {
        id: "shelving-wall-spirits",
        kind: "decor",
        label: "Floor-to-Ceiling Back-Bar Glass & Brass Spirit Cellar",
        position: [0, 2.1, -6.6],
        rotation: [0, 0, 0],
        dimensions: "6.2m × 0.42m × 3.6m",
        material: "Illuminated Ribbed Glass, Solid Walnut & Brushed Brass",
        color: "#241812",
        roughness: 0.35,
        metalness: 0.5,
        emissive: "#FFB048",
        emissiveIntensity: 1.4,
        rationale: "Glowing backdrop wall illuminating curated craft spirits and vintage glassware.",
      },
      {
        id: "pendant-amber-1",
        kind: "light",
        label: "Mouth-Blown Amber Teardrop Glass Pendant",
        position: [-3.2, 2.4, 0.8],
        rotation: [0, 0, 0],
        dimensions: "0.45m diameter × 0.7m",
        material: "Hand-Blown Amber Murano Glass",
        color: "#FFAE4A",
        roughness: 0.1,
        metalness: 0.1,
        emissive: "#FF9C28",
        emissiveIntensity: 2.4,
        rationale: "Intimate downlight pool focused directly on lounge table.",
      },
      {
        id: "pendant-amber-2",
        kind: "light",
        label: "Mouth-Blown Amber Teardrop Glass Pendant",
        position: [3.2, 2.4, 0.8],
        rotation: [0, 0, 0],
        dimensions: "0.45m diameter × 0.7m",
        material: "Hand-Blown Amber Murano Glass",
        color: "#FFAE4A",
        roughness: 0.1,
        metalness: 0.1,
        emissive: "#FF9C28",
        emissiveIntensity: 2.4,
        rationale: "Right-side companion pendant fixture.",
      },
    ],
  };
}

function buildMediterraneanCourtyard(): SceneSpec {
  return {
    typology: "mediterranean_courtyard",
    typologyLabel: "Sunlit Mediterranean Riad Courtyard & Orangery",
    roomDimensions: { width: 14, depth: 18, height: 5.2 },
    wallFinish: "distressed_plaster",
    floorFinish: "polished_stone",
    ceilingStructure: "timber_pergola",
    wallArchitecture: "arched_colonnade",
    primaryColor: "#C46238",
    accentColor: "#3B6350",
    lightingKelvin: 3200,
    hasWindowAperture: true,
    atmosphereNote:
      "Open timber rafter pergola filtering warm golden sunlight, central carved limestone fountain basin, terracotta tile flooring, potted olive trees, and shaded linen perimeter daybeds.",
    designIntent:
      "Biophilic architectural courtyard inspired by Andalusian and Moroccan riads, centered on water acoustic resonance and cooling breezes.",
    zones: [
      {
        id: "z-fountain",
        name: "Central Water Fountain Basin & Plinth",
        areaSqM: 32,
        center: [0, 0, 0],
        dimensions: [6.0, 6.0],
        color: "#3B6350",
        rationale:
          "Carved limestone octagonal water fountain providing continuous acoustic masking and visual centering.",
      },
      {
        id: "z-pergola-lounge",
        name: "Shaded Pergola Divan Veranda",
        areaSqM: 42,
        center: [0, 0, 5.2],
        dimensions: [10.5, 4.2],
        color: "#C46238",
        rationale:
          "Perimeter daybeds upholstered in washed Belgian linen sheltered under climbing vine rafters.",
      },
      {
        id: "z-citrus-garden",
        name: "Olive & Citrus Tree Promenade",
        areaSqM: 36,
        center: [0, 0, -5.2],
        dimensions: [11.0, 4.0],
        color: "#7E9462",
        rationale:
          "Avenue of hand-thrown Tuscan terracotta urns planted with mature fruiting citrus and olive trees.",
      },
    ],
    objects: [
      {
        id: "fountain-basin",
        kind: "structure",
        label: "Carved Limestone Octagonal Water Fountain",
        position: [0, 0.4, 0],
        rotation: [0, 0, 0],
        dimensions: "2.8m × 2.8m × 0.82m",
        material: "Hand-Chiseled Crema Marfil Limestone & Aged Brass Spout",
        color: "#DDD6C8",
        roughness: 0.6,
        metalness: 0.15,
        rationale:
          "Central architectural focal water element filling the riad with gentle acoustic reverberation.",
      },
      {
        id: "tree-planter-1",
        kind: "decor",
        label: "Mature Tuscan Olive Tree in Handmade Terracotta Urn",
        position: [-3.8, 1.3, -4.5],
        rotation: [0, 0.4, 0],
        dimensions: "1.4m diameter × 2.8m high",
        material: "Impruneta Raw Terracotta & Silvery Olive Foliage",
        color: "#A85332",
        roughness: 0.85,
        metalness: 0.05,
        rationale: "Biophilic architectural anchor framing the courtyard entryway.",
      },
      {
        id: "tree-planter-2",
        kind: "decor",
        label: "Mature Tuscan Olive Tree in Handmade Terracotta Urn",
        position: [3.8, 1.3, -4.5],
        rotation: [0, -0.4, 0],
        dimensions: "1.4m diameter × 2.8m high",
        material: "Impruneta Raw Terracotta & Silvery Olive Foliage",
        color: "#A85332",
        roughness: 0.85,
        metalness: 0.05,
        rationale: "Symmetrical olive urn balancing the courtyard axis.",
      },
      {
        id: "sofa-divan-left",
        kind: "seat",
        label: "Deep Built-In Daybed in Washed Belgian Linen",
        position: [-3.8, 0.4, 4.8],
        rotation: [0, 0.35, 0],
        dimensions: "3.4m × 1.3m × 0.75m",
        material: "Natural Unbleached Belgian Linen & Cedar Base",
        color: "#EFE8DA",
        roughness: 0.92,
        metalness: 0.02,
        rationale: "Generous daybed platform for lounging, reading, and relaxed gatherings.",
      },
      {
        id: "sofa-divan-right",
        kind: "seat",
        label: "Deep Built-In Daybed in Washed Belgian Linen",
        position: [3.8, 0.4, 4.8],
        rotation: [0, -0.35, 0],
        dimensions: "3.4m × 1.3m × 0.75m",
        material: "Natural Unbleached Belgian Linen & Cedar Base",
        color: "#EFE8DA",
        roughness: 0.92,
        metalness: 0.02,
        rationale: "Mirrored right-side courtyard daybed.",
      },
      {
        id: "coffee-table-cedar",
        kind: "surface",
        label: "Carved Atlas Mountain Cedar Low Table",
        position: [0, 0.22, 4.6],
        rotation: [0, 0, 0],
        dimensions: "1.8m × 0.9m × 0.38m",
        material: "Aromatic Atlas Cedar & Inlaid Bone Geometry",
        color: "#8B623E",
        roughness: 0.7,
        metalness: 0.05,
        rationale: "Central tea table serving the shaded perimeter divans.",
      },
      {
        id: "candle-lantern-c1",
        kind: "light",
        label: "Perforated Wrought Iron Moorish Candle Lantern",
        position: [-1.8, 0.3, -1.8],
        rotation: [0, 0.2, 0],
        dimensions: "0.38m × 0.38m × 0.65m",
        material: "Blackened Hand-Punched Iron & Fluted Glass",
        color: "#FFDE9E",
        roughness: 0.5,
        metalness: 0.7,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Casts intricate geometric shadow patterns across the terracotta floor.",
      },
      {
        id: "candle-lantern-c2",
        kind: "light",
        label: "Perforated Wrought Iron Moorish Candle Lantern",
        position: [1.8, 0.3, -1.8],
        rotation: [0, -0.2, 0],
        dimensions: "0.38m × 0.38m × 0.65m",
        material: "Blackened Hand-Punched Iron & Fluted Glass",
        color: "#FFDE9E",
        roughness: 0.5,
        metalness: 0.7,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Symmetrical candle lantern balancing fountain perimeter.",
      },
    ],
  };
}

function buildIndustrialLoft(): SceneSpec {
  return {
    typology: "industrial_loft",
    typologyLabel: "Industrial Warehouse Taproom & Roastery Loft",
    roomDimensions: { width: 13, depth: 19, height: 5.0 },
    wallFinish: "distressed_plaster",
    floorFinish: "industrial_cement",
    ceilingStructure: "concrete_beams",
    wallArchitecture: "raw_concrete_panels",
    primaryColor: "#B55328",
    accentColor: "#3A4D45",
    lightingKelvin: 2800,
    hasWindowAperture: true,
    atmosphereNote:
      "Heavy industrial concrete cross-beams, blackened steel tap counter with brass fixtures, communal reclaimed timber trestle tables, and suspended filament bulb arrays.",
    designIntent:
      "Utilitarian honesty inspired by adaptive reuse industrial warehouses, craft micro-breweries, and specialty coffee tasting roasteries.",
    zones: [
      {
        id: "z-tap",
        name: "Craft Tap Bar & Barista Core",
        areaSqM: 38,
        center: [0, 0, -5.5],
        dimensions: [8.5, 4.5],
        color: "#B55328",
        rationale:
          "Heavy steel-framed tap station with draft manifolds and espresso machinery.",
      },
      {
        id: "z-communal",
        name: "Communal Timber Trestle Hall",
        areaSqM: 65,
        center: [0, 0, 1.0],
        dimensions: [9.5, 7.5],
        color: "#3A4D45",
        rationale:
          "Long reclaimed timber work tables encouraging spontaneous social overlap.",
      },
      {
        id: "z-roaster",
        name: "Industrial Roasting & Grain Alcove",
        areaSqM: 24,
        center: [-4.2, 0, 4.8],
        dimensions: [3.8, 5.2],
        color: "#786552",
        rationale:
          "Raw production zone showcasing processing machinery and jute coffee sacks.",
      },
    ],
    objects: [
      {
        id: "bar-counter-industrial",
        kind: "structure",
        label: "Blackened Steel & Poured Concrete Tap Bar",
        position: [0, 0.55, -5.8],
        rotation: [0, 0, 0],
        dimensions: "4.2m × 1.1m × 1.1m",
        material: "Perforated Blackened Steel & Polished Dark Concrete Top",
        color: "#222020",
        roughness: 0.5,
        metalness: 0.6,
        rationale: "High-durability hospitality counter with integrated tap tower.",
      },
      {
        id: "banquet-table-trestle-1",
        kind: "surface",
        label: "Heavy Reclaimed Chestnut Trestle Table",
        position: [-2.6, 0.42, 1.2],
        rotation: [0, 0, 0],
        dimensions: "1.4m × 6.8m × 0.78m",
        material: "150-Year Salvaged Factory Chestnut & Cast Iron Legs",
        color: "#5C4028",
        roughness: 0.8,
        metalness: 0.2,
        rationale: "Communal gathering surface with tactile wood grain.",
      },
      {
        id: "banquet-table-trestle-2",
        kind: "surface",
        label: "Heavy Reclaimed Chestnut Trestle Table",
        position: [2.6, 0.42, 1.2],
        rotation: [0, 0, 0],
        dimensions: "1.4m × 6.8m × 0.78m",
        material: "150-Year Salvaged Factory Chestnut & Cast Iron Legs",
        color: "#5C4028",
        roughness: 0.8,
        metalness: 0.2,
        rationale: "Paired communal trestle table.",
      },
      {
        id: "shelving-wall-bottles",
        kind: "decor",
        label: "Floor-to-Ceiling Steel Grid Keg & Archive Wall",
        position: [0, 2.2, -7.5],
        rotation: [0, 0, 0],
        dimensions: "5.5m × 0.45m × 3.8m",
        material: "Welded Structural Angle Iron & Wire Mesh",
        color: "#18181A",
        roughness: 0.6,
        metalness: 0.7,
        rationale: "Displays fermentation vessels, bottled vintages, and heritage tools.",
      },
      {
        id: "chandelier-filaments",
        kind: "light",
        label: "Suspended Industrial Filament Edison Bulb Cluster",
        position: [0, 3.8, 1.2],
        rotation: [0, 0, 0],
        dimensions: "3.2m × 1.2m cluster",
        material: "Braided Cotton Cord, Brass Sockets & Amber Filament Globes",
        color: "#FFDF9E",
        roughness: 0.2,
        metalness: 0.5,
        emissive: "#FFA834",
        emissiveIntensity: 2.6,
        rationale: "Warm pool of downlight directly framing the communal dining tables.",
      },
    ],
  };
}

function buildListeningRoom(): SceneSpec {
  return {
    typology: "listening_room",
    typologyLabel: "Japanese Jazz Listening Lounge & Audiophile Salon",
    roomDimensions: { width: 11, depth: 14, height: 3.4 },
    wallFinish: "acoustic_slats",
    floorFinish: "warm_oak",
    ceilingStructure: "acoustic_coffered",
    wallArchitecture: "timber_slats",
    primaryColor: "#D9532B",
    accentColor: "#E8B878",
    lightingKelvin: 2800,
    hasWindowAperture: true,
    atmosphereNote:
      "Intimate, warm acoustic cocoon with diffused washi paper lantern glow, solid walnut turntable credenza, horn speakers, and deep timber textures.",
    designIntent:
      "Optimized for deep listening sessions: acoustic absorption slats, low tatami-scale seating, and turntable focal credenza.",
    zones: [
      {
        id: "z-focal",
        name: "Acoustic Stage & Audiophile Console",
        areaSqM: 24,
        center: [0, 0, -4.8],
        dimensions: [7.2, 3.8],
        color: "#D9532B",
        rationale:
          "Focal acoustic zone optimized for stereo horn imaging, turntable playback, and timber diffusion.",
      },
      {
        id: "z-lounge",
        name: "Intimate Listening Hearth",
        areaSqM: 32,
        center: [0, 0, -0.6],
        dimensions: [6.4, 4.8],
        color: "#2F5A4C",
        rationale:
          "Low-profile velvet seating envelope directly aligned inside the primary sweet-spot soundstage.",
      },
      {
        id: "z-library",
        name: "Vinyl Archive & Ingress",
        areaSqM: 20,
        center: [-3.8, 0, 1.4],
        dimensions: [3.4, 6.2],
        color: "#E8B878",
        rationale:
          "Perimeter vinyl archive acting as sound absorption diffusion along entry threshold.",
      },
    ],
    objects: [
      {
        id: "audio-console",
        kind: "audio",
        label: "Solid Walnut Turntable Credenza & Amplifiers",
        position: [0, 0.45, -5.2],
        rotation: [0, 0, 0],
        dimensions: "2.8m × 0.7m × 0.9m",
        material: "Dark Smoked Walnut & Brass Knobs",
        color: "#3B2618",
        roughness: 0.6,
        metalness: 0.2,
        rationale: "Focal architectural piece anchoring the room's acoustic listening identity.",
      },
      {
        id: "speaker-l",
        kind: "audio",
        label: "Studio Monitor Horn Speaker (Left)",
        position: [-2.6, 0.9, -4.8],
        rotation: [0, 0.25, 0],
        dimensions: "0.65m × 0.55m × 1.8m",
        material: "Hand-Crafted Plywood Horn & Cast Iron",
        color: "#2C1B10",
        roughness: 0.5,
        metalness: 0.3,
        rationale: "Positioned at equilateral triangle for precise stereo soundstage.",
      },
      {
        id: "speaker-r",
        kind: "audio",
        label: "Studio Monitor Horn Speaker (Right)",
        position: [2.6, 0.9, -4.8],
        rotation: [0, -0.25, 0],
        dimensions: "0.65m × 0.55m × 1.8m",
        material: "Hand-Crafted Plywood Horn & Cast Iron",
        color: "#2C1B10",
        roughness: 0.5,
        metalness: 0.3,
        rationale: "Matched acoustic horn paired with left channel.",
      },
      {
        id: "lantern-central",
        kind: "light",
        label: "Washi Paper Sphere Pendant (Primary)",
        position: [0, 2.3, -0.5],
        rotation: [0, 0, 0],
        dimensions: "0.9m diameter",
        material: "Translucent Mulberry Washi Paper",
        color: "#FFF0D4",
        roughness: 0.9,
        metalness: 0.05,
        emissive: "#FFD28A",
        emissiveIntensity: 1.8,
        rationale:
          "Low-hanging warm ambient glow emulating traditional Japanese lantern illumination.",
      },
      {
        id: "lantern-left",
        kind: "light",
        label: "Washi Paper Lantern (Secondary)",
        position: [-3.2, 2.1, -2.4],
        rotation: [0, 0, 0],
        dimensions: "0.6m diameter",
        material: "Mulberry Washi Paper & Bamboo Ribs",
        color: "#FFEAD0",
        roughness: 0.9,
        metalness: 0.05,
        emissive: "#FFAE4A",
        emissiveIntensity: 1.2,
        rationale: "Perimeter softness preventing harsh shadows.",
      },
      {
        id: "rug-listening",
        kind: "surface",
        label: "Woven Sisal & Wool Acoustic Hearth Rug",
        position: [0, 0.015, -0.6],
        rotation: [0, 0, 0],
        dimensions: "5.4m × 4.6m",
        material: "Natural Woven Sisal & Unbleached Wool",
        color: "#C2B299",
        roughness: 0.95,
        metalness: 0.0,
        rationale: "Flooring dampening to eliminate room flutter echo.",
      },
      {
        id: "lounge-chair-1",
        kind: "seat",
        label: "Low-Slung Armchair in Raw Umber Velvet",
        position: [-1.4, 0.38, -0.4],
        rotation: [0, 0.35, 0],
        dimensions: "0.95m × 0.9m × 0.72m",
        material: "Brushed Walnut Frame & Heavy Wool Velvet",
        color: "#38291F",
        roughness: 0.85,
        metalness: 0.1,
        rationale: "Ergonomic seating angled toward the acoustic sweet-spot.",
      },
      {
        id: "lounge-chair-2",
        kind: "seat",
        label: "Low-Slung Armchair in Raw Umber Velvet",
        position: [1.4, 0.38, -0.4],
        rotation: [0, -0.35, 0],
        dimensions: "0.95m × 0.9m × 0.72m",
        material: "Brushed Walnut Frame & Heavy Wool Velvet",
        color: "#38291F",
        roughness: 0.85,
        metalness: 0.1,
        rationale: "Companion listening chair facing focal music altar.",
      },
      {
        id: "coffee-table",
        kind: "surface",
        label: "Low Solid Hinoki Wood Tasting Table",
        position: [0, 0.22, -0.5],
        rotation: [0, 0, 0],
        dimensions: "1.4m × 0.75m × 0.4m",
        material: "Natural Hinoki Cypress Wood",
        color: "#7E5E3D",
        roughness: 0.65,
        metalness: 0.05,
        rationale: "Low-profile tea and vinyl sleeve surface.",
      },
      {
        id: "record-credenza-shelf",
        kind: "decor",
        label: "Floor-to-Ceiling Vinyl Record Library Wall",
        position: [-4.9, 1.7, 0.5],
        rotation: [0, Math.PI / 2, 0],
        dimensions: "4.8m × 0.45m × 3.2m",
        material: "Dark Stained Acoustic Grid Shelving",
        color: "#251C17",
        roughness: 0.75,
        metalness: 0.15,
        rationale: "Vinyl record collection acting as natural sound diffusers.",
      },
    ],
  };
}

function buildPartyVenue(): SceneSpec {
  return {
    typology: "party_venue",
    typologyLabel: "Underground Cyberpunk / Grunge Celebration Club",
    roomDimensions: { width: 14, depth: 18, height: 5.2 },
    wallFinish: "distressed_plaster",
    floorFinish: "glossy_concrete",
    ceilingStructure: "neon_lightgrid",
    wallArchitecture: "raw_concrete_panels",
    primaryColor: "#FF2A85",
    accentColor: "#00F0FF",
    lightingKelvin: 5200,
    hasWindowAperture: false,
    atmosphereNote:
      "Slick dark concrete with hot neon pink and cyan reflections, suspended geometric light grids, exposed metal framework, and chrome furniture.",
    designIntent:
      "High-energy social celebration layout with open dance area, high cocktail perches, and architectural neon framing.",
    zones: [
      {
        id: "z-dj",
        name: "Elevated DJ & Performance Core",
        areaSqM: 26,
        center: [0, 0, -6.8],
        dimensions: [7.0, 4.0],
        color: "#FF2A85",
        rationale:
          "Commanding audio nexus framed by suspended magenta neon architectural portal.",
      },
      {
        id: "z-dance",
        name: "Central Specular Dance Floor",
        areaSqM: 54,
        center: [0, 0, -1.5],
        dimensions: [8.5, 6.5],
        color: "#00F0FF",
        rationale:
          "High-traffic core maximizing glossy concrete specular bounce under angled neon rays.",
      },
      {
        id: "z-lounge",
        name: "Grunge Velvet Social Banquette",
        areaSqM: 28,
        center: [4.8, 0, 1.8],
        dimensions: [3.8, 6.8],
        color: "#9C27B0",
        rationale: "Recessed conversational recovery envelope with plush acoustic dampening.",
      },
    ],
    objects: [
      {
        id: "dj-booth",
        kind: "structure",
        label: "Brutalist Steel DJ Console & Sound Racks",
        position: [0, 0.6, -7.2],
        rotation: [0, 0, 0],
        dimensions: "3.4m × 1.1m × 1.2m",
        material: "Perforated Raw Steel & Backlit Acrylic",
        color: "#18181F",
        roughness: 0.4,
        metalness: 0.8,
        emissive: "#FF1493",
        emissiveIntensity: 1.5,
        rationale: "Elevated performance centerpiece commanding the party floor.",
      },
      {
        id: "neon-frame-1",
        kind: "light",
        label: "Suspended Neon Pink Architectural Portal",
        position: [0, 3.2, -6.8],
        rotation: [0, 0, 0],
        dimensions: "5.5m × 3.6m rectangular arch",
        material: "High-Luminance Magenta Gas Tube",
        color: "#FF1493",
        roughness: 0.2,
        metalness: 0.1,
        emissive: "#FF007F",
        emissiveIntensity: 3.5,
        rationale:
          "Creates dramatic cinematic depth and hot color washes across the concrete floor.",
      },
      {
        id: "neon-frame-2",
        kind: "light",
        label: "Cyan Accent Geometric Light Bar",
        position: [0, 4.4, -1.5],
        rotation: [0, 0, Math.PI / 12],
        dimensions: "6.0m × 0.12m",
        material: "Electric Cyan LED Tube",
        color: "#00F0FF",
        roughness: 0.1,
        metalness: 0.2,
        emissive: "#00E5FF",
        emissiveIntensity: 2.8,
        rationale: "Cross-temperature visual counterpoint cutting through pink saturation.",
      },
      {
        id: "chrome-table-1",
        kind: "surface",
        label: "Polished Chrome High Cocktail Table",
        position: [-3.8, 0.55, -2.5],
        rotation: [0, 0, 0],
        dimensions: "0.85m diameter × 1.1m high",
        material: "Mirror Polished Stainless Steel",
        color: "#D0D4DC",
        roughness: 0.12,
        metalness: 0.95,
        rationale: "Reflects neon illumination into specular flares.",
      },
      {
        id: "chrome-stool-1",
        kind: "seat",
        label: "Tubular Chrome Bar Stool",
        position: [-3.8, 0.4, -1.8],
        rotation: [0, 0, 0],
        dimensions: "0.45m × 0.45m × 0.8m",
        material: "Chrome Tubing & Black Gloss Vinyl",
        color: "#C4C8D2",
        roughness: 0.15,
        metalness: 0.92,
        rationale: "High cocktail seating enabling fluid social circulation.",
      },
      {
        id: "chrome-table-2",
        kind: "surface",
        label: "Polished Chrome High Cocktail Table",
        position: [3.8, 0.55, -2.5],
        rotation: [0, 0, 0],
        dimensions: "0.85m diameter × 1.1m high",
        material: "Mirror Polished Stainless Steel",
        color: "#D0D4DC",
        roughness: 0.12,
        metalness: 0.95,
        rationale: "Right perimeter social anchor point.",
      },
      {
        id: "lounge-banquette",
        kind: "seat",
        label: "Distressed Magenta Velvet Modular Lounge",
        position: [5.4, 0.45, 1.8],
        rotation: [0, -Math.PI / 2, 0],
        dimensions: "4.2m × 1.0m × 0.85m",
        material: "Tufted Grunge Velvet & Oxidized Brass",
        color: "#85164B",
        roughness: 0.8,
        metalness: 0.15,
        rationale: "Opulent grunge banquette for recovery and conversation.",
      },
    ],
  };
}

function buildScandinavianLiving(): SceneSpec {
  return {
    typology: "scandinavian_living",
    typologyLabel: "Minimalist Nordic Light Pavilion",
    roomDimensions: { width: 12, depth: 15, height: 4.0 },
    wallFinish: "wood_panel",
    floorFinish: "warm_oak",
    ceilingStructure: "minimal_soffit",
    wallArchitecture: "panoramic_glazing",
    primaryColor: "#58705C",
    accentColor: "#D97746",
    lightingKelvin: 4200,
    hasWindowAperture: true,
    atmosphereNote:
      "Bathed in low raking Nordic sunlight with warm natural oak, tactile bouclé upholstery, and calm airy breathing room.",
    designIntent:
      "Biophilic architectural living space balancing clean geometry, natural timber grain, and soft woven comfort.",
    zones: [
      {
        id: "z-hearth",
        name: "Nordic Conversation Hearth",
        areaSqM: 32,
        center: [0, 0, -0.2],
        dimensions: [6.8, 5.2],
        color: "#58705C",
        rationale:
          "Natural oak plinth and textured cream bouclé social hub anchoring the room.",
      },
      {
        id: "z-glazing",
        name: "Morning Sun Glazing Bay",
        areaSqM: 26,
        center: [4.2, 0, 0],
        dimensions: [3.4, 7.8],
        color: "#D97746",
        rationale:
          "Raking morning light aperture connecting interior textures with natural daylight.",
      },
      {
        id: "z-flora",
        name: "Biophilic Flora & Credenza Alcove",
        areaSqM: 20,
        center: [-3.8, 0, -4.5],
        dimensions: [3.5, 4.8],
        color: "#354E35",
        rationale:
          "Living olive tree and horizontal slatted oak credenza creating serene perimeter views.",
      },
    ],
    objects: [
      {
        id: "sofa-modular",
        kind: "seat",
        label: "Low Modular Nordic Sofa in Sand Bouclé",
        position: [0, 0.42, 0.8],
        rotation: [0, 0, 0],
        dimensions: "3.6m × 1.2m × 0.78m",
        material: "Textured Cream Wool Bouclé & White Oak Plinth",
        color: "#E2DDD3",
        roughness: 0.92,
        metalness: 0.05,
        rationale:
          "Central gathering archipelago oriented toward the morning sunlight garden view.",
      },
      {
        id: "coffee-table-oak",
        kind: "surface",
        label: "Sculptural Solid Oak Pedestal Coffee Table",
        position: [0, 0.22, -1.1],
        rotation: [0, 0.2, 0],
        dimensions: "1.6m × 0.85m × 0.38m",
        material: "Bleached Natural White Oak",
        color: "#CDB99E",
        roughness: 0.55,
        metalness: 0.05,
        rationale: "Organic rounded silhouette softening the architectural lines.",
      },
      {
        id: "lounge-chair-nordic",
        kind: "seat",
        label: "Curved Oak & Saddle Leather Lounge Chair",
        position: [-2.6, 0.38, -0.6],
        rotation: [0, 0.65, 0],
        dimensions: "0.85m × 0.88m × 0.74m",
        material: "Steam-bent White Oak & Natural Saddle Leather",
        color: "#A26E4A",
        roughness: 0.6,
        metalness: 0.1,
        rationale: "Individual reading chair positioned inside the sunlight rake angle.",
      },
      {
        id: "wool-rug-nordic",
        kind: "surface",
        label: "High-Pile Hand-Knotted Undyed Wool Rug",
        position: [0, 0.015, -0.2],
        rotation: [0, 0, 0],
        dimensions: "4.8m × 4.2m",
        material: "100% Organic New Zealand Sheep Wool",
        color: "#EAE5DA",
        roughness: 0.98,
        metalness: 0.0,
        rationale: "Grounding tactile layer providing warmth and acoustic softness.",
      },
      {
        id: "credenza-nordic",
        kind: "surface",
        label: "Slatted Oak Media & Art Credenza",
        position: [0, 0.45, -6.2],
        rotation: [0, 0, 0],
        dimensions: "3.2m × 0.5m × 0.65m",
        material: "Slatted White Oak & Travertine Top",
        color: "#BCA688",
        roughness: 0.5,
        metalness: 0.1,
        rationale: "Low horizon furniture piece preserving the eye-level wall view.",
      },
      {
        id: "tree-planter",
        kind: "decor",
        label: "Architectural Potted Olive Tree in Raw Terracotta",
        position: [4.4, 1.2, -5.2],
        rotation: [0, 0, 0],
        dimensions: "1.2m diameter × 2.6m high",
        material: "Handmade Tuscan Terracotta & Lush Olive Foliage",
        color: "#B25838",
        roughness: 0.88,
        metalness: 0.05,
        rationale: "Living biophilic element connecting internal space with nature.",
      },
    ],
  };
}

function buildFuturisticLaunch(): SceneSpec {
  return {
    typology: "futuristic_launch",
    typologyLabel: "Kinetic Horizon Product Stage",
    roomDimensions: { width: 16, depth: 22, height: 6.0 },
    wallFinish: "raw_concrete",
    floorFinish: "glossy_concrete",
    ceilingStructure: "concrete_beams",
    wallArchitecture: "raw_concrete_panels",
    primaryColor: "#00E5FF",
    accentColor: "#7B61FF",
    lightingKelvin: 6500,
    hasWindowAperture: false,
    atmosphereNote:
      "Mirror-finish floors, monochromatic obsidian surfaces, crisp blue-violet perimeter horizons, and cinematic focal plinths.",
    designIntent:
      "High-contrast architectural stage designed to frame and spotlight hero product forms with razor-sharp light lines.",
    zones: [
      {
        id: "z-monolith",
        name: "Hero Display Monolith Stage",
        areaSqM: 38,
        center: [0, 0, -4.5],
        dimensions: [7.8, 5.2],
        color: "#00E5FF",
        rationale:
          "Cantilevered obsidian plinth directly below overhead surgical light canopy.",
      },
      {
        id: "z-promenade",
        name: "Reflective Spectator Runway",
        areaSqM: 60,
        center: [0, 0, 1.8],
        dimensions: [9.5, 7.8],
        color: "#7B61FF",
        rationale: "Axial circulation flanked by aerospace titanium seating ribbons.",
      },
      {
        id: "z-portal",
        name: "Horizon Perimeter Portal",
        areaSqM: 28,
        center: [0, 0, -8.5],
        dimensions: [12.0, 3.2],
        color: "#00F0FF",
        rationale: "Monolithic raw concrete perimeter framing back-of-house circulation.",
      },
    ],
    objects: [
      {
        id: "hero-plinth",
        kind: "structure",
        label: "Monolithic Cantilevered Display Plinth",
        position: [0, 0.45, -4.5],
        rotation: [0, 0, 0],
        dimensions: "4.0m × 2.0m × 0.85m",
        material: "Honed Black Obsidian & Undermount LED Sheet",
        color: "#0F1116",
        roughness: 0.15,
        metalness: 0.85,
        emissive: "#00E5FF",
        emissiveIntensity: 1.8,
        rationale: "Zero-gravity visual effect elevating the key product reveal.",
      },
      {
        id: "light-canopy",
        kind: "light",
        label: "Recessed Architectural Light Ring Array",
        position: [0, 5.2, -4.5],
        rotation: [0, 0, 0],
        dimensions: "6.0m diameter geometric hexagon",
        material: "Diffusion Glass & 6500K High-CRI LED Matrix",
        color: "#E2F4FF",
        roughness: 0.2,
        metalness: 0.3,
        emissive: "#C6EEFF",
        emissiveIntensity: 3.2,
        rationale: "Surgical daylight-spectrum flood illuminating the central stage.",
      },
      {
        id: "bench-ribbon-left",
        kind: "seat",
        label: "Linear Anodized Titanium Bench Ribbon",
        position: [-5.6, 0.24, -1.0],
        rotation: [0, 0, 0],
        dimensions: "6.2m × 0.7m × 0.48m",
        material: "Bead-blasted Aerospace Titanium",
        color: "#6B7280",
        roughness: 0.3,
        metalness: 0.85,
        rationale: "Perimeter spectator ribbon with uninterrupted sightlines.",
      },
      {
        id: "bench-ribbon-right",
        kind: "seat",
        label: "Linear Anodized Titanium Bench Ribbon",
        position: [5.6, 0.24, -1.0],
        rotation: [0, 0, 0],
        dimensions: "6.2m × 0.7m × 0.48m",
        material: "Bead-blasted Aerospace Titanium",
        color: "#6B7280",
        roughness: 0.3,
        metalness: 0.85,
        rationale: "Balanced symmetric seating ribbon flanking the runway.",
      },
    ],
  };
}

function buildGalleryPavilion(pColor: string, aColor: string, kelvin: number): SceneSpec {
  return {
    typology: "gallery_pavilion",
    typologyLabel: "Sculptural Contemporary Art Pavilion",
    roomDimensions: { width: 13, depth: 16, height: 4.4 },
    wallFinish: "gallery_white",
    floorFinish: "polished_stone",
    ceilingStructure: "minimal_soffit",
    wallArchitecture: "gallery_planes",
    primaryColor: pColor,
    accentColor: aColor,
    lightingKelvin: kelvin,
    hasWindowAperture: true,
    atmosphereNote:
      "Spatially pure, calm museum proportions with controlled spotlighting and open circulation paths.",
    designIntent:
      "Pure architectural backdrop allowing materials, sound resonance, and sculptural artifacts to command focus.",
    zones: [
      {
        id: "z-plinth",
        name: "Central Sculptural Plinth Anchor",
        areaSqM: 32,
        center: [0, 0, -3.2],
        dimensions: [6.4, 5.6],
        color: "#D9532B",
        rationale:
          "Primary exhibition pedestal commanding clean 360-degree observation angles.",
      },
      {
        id: "z-bench",
        name: "Contemplative Observation Deck",
        areaSqM: 30,
        center: [0, 0, 1.2],
        dimensions: [6.8, 4.6],
        color: "#2F5A4C",
        rationale:
          "Cast concrete observation bench positioned for extended acoustic and visual contemplation.",
      },
      {
        id: "z-perimeter",
        name: "Curated Promenade Corridor",
        areaSqM: 34,
        center: [-4.2, 0, 0],
        dimensions: [3.4, 8.8],
        color: "#E8B878",
        rationale:
          "Uninterrupted perimeter circulation path along washed plaster exhibition walls.",
      },
    ],
    objects: [
      {
        id: "gallery-bench",
        kind: "seat",
        label: "Cast Concrete & Smoked Glass Observation Bench",
        position: [0, 0.25, 0],
        rotation: [0, 0, 0],
        dimensions: "2.8m × 0.9m × 0.48m",
        material: "Cast Ultra-Dense Architectural Concrete",
        color: "#54524F",
        roughness: 0.65,
        metalness: 0.1,
        rationale: "Central vantage point for contemplative spatial observation.",
      },
      {
        id: "sculpture-plinth-1",
        kind: "structure",
        label: "Honed Roman Travertine Sculpture Pedestal",
        position: [-3.6, 0.55, -4.2],
        rotation: [0, 0.4, 0],
        dimensions: "1.0m × 1.0m × 1.1m",
        material: "Unfilled Roman Travertine Marble",
        color: "#D8CFBE",
        roughness: 0.7,
        metalness: 0.05,
        rationale: "Left perimeter sculptural focal station.",
      },
      {
        id: "sculpture-plinth-2",
        kind: "structure",
        label: "Black Basalt Monolith Pedestal",
        position: [3.6, 0.55, -4.2],
        rotation: [0, -0.4, 0],
        dimensions: "1.0m × 1.0m × 1.1m",
        material: "Honed Volcanic Basalt",
        color: "#232426",
        roughness: 0.55,
        metalness: 0.2,
        rationale: "Right perimeter balance pedestal.",
      },
    ],
  };
}

/* ---------------------------------------------------------------------------
   Universal Dynamic Generator (Any prompt + Any Qloo combination)
--------------------------------------------------------------------------- */

export interface SceneSpecOptions {
  layoutMode?: "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony";
  guestCount?: number;
  ceilingHeightDelta?: number;
  wallFinishOverride?: WallFinish;
  wallArchitectureOverride?: WallArchitecture;
  floorFinishOverride?: FloorFinish;
  ceilingStructureOverride?: CeilingStructure;
}

export function generateSceneSpec(
  prompt: string,
  vibe: VibePayload,
  options?: SceneSpecOptions
): SceneSpec {
  const explicit = parseExplicitTypology(prompt);
  const family = detectGenreFamily(vibe.evidence);

  const evidenceText = [
    ...(vibe.evidence.genreTags || []),
    ...(vibe.evidence.styleTags || []),
    ...(vibe.evidence.themeTags || []),
    ...(vibe.evidence.adjectives || []),
    ...(vibe.evidence.characteristics || []),
  ]
    .join(" ")
    .toLowerCase();

  // Determine typology from explicit prompt or cultural evidence
  let typology: SpatialTypology = "scandinavian_living";
  if (explicit) {
    typology = explicit;
  } else if (
    evidenceText.includes("cocktail") ||
    evidenceText.includes("whiskey") ||
    evidenceText.includes("bar") ||
    evidenceText.includes("velvet") ||
    evidenceText.includes("speakeasy")
  ) {
    typology = "intimate_lounge";
  } else if (
    evidenceText.includes("courtyard") ||
    evidenceText.includes("riad") ||
    evidenceText.includes("mediterranean") ||
    evidenceText.includes("terracotta")
  ) {
    typology = "mediterranean_courtyard";
  } else if (
    evidenceText.includes("industrial") ||
    evidenceText.includes("warehouse") ||
    evidenceText.includes("taproom")
  ) {
    typology = "industrial_loft";
  } else if (family === "electronic") {
    typology = "futuristic_launch";
  } else if (family === "punk") {
    typology = "party_venue";
  } else if (family === "atmospheric") {
    typology = "listening_room";
  } else if (family === "hiphop") {
    typology = "intimate_lounge";
  }

  const pColor = vibe.primaryColorHex || "#D9532B";
  const aColor = vibe.accentColorHex || "#2F5A4C";
  const kelvin = vibe.lightingTemperatureK || 3400;

  // Initialize base typology
  let spec: SceneSpec;
  switch (typology) {
    case "grand_hall":
      spec = buildGrandHall();
      break;
    case "intimate_lounge":
      spec = buildIntimateLounge();
      break;
    case "mediterranean_courtyard":
      spec = buildMediterraneanCourtyard();
      break;
    case "industrial_loft":
      spec = buildIndustrialLoft();
      break;
    case "listening_room":
      spec = buildListeningRoom();
      break;
    case "party_venue":
      spec = buildPartyVenue();
      break;
    case "scandinavian_living":
      spec = buildScandinavianLiving();
      break;
    case "futuristic_launch":
      spec = buildFuturisticLaunch();
      break;
    default:
      spec = buildGalleryPavilion(pColor, aColor, kelvin);
      break;
  }

  // ---------------------------------------------------------------------------
  // DYNAMIC QLOO ELEMENT & EVIDENCE INJECTION PASS
  // ---------------------------------------------------------------------------

  // 1. Flooring Material Integration (only from real Qloo evidence, not fallback defaults)
  if (!vibe.fallback && vibe.flooringMaterial && vibe.flooringMaterial.trim().length > 0) {
    spec.qlooFlooring = vibe.flooringMaterial;
    spec.floorFinish = mapQlooFloorToFinish(vibe.flooringMaterial);
    spec.designIntent += ` Grounded on ${vibe.flooringMaterial.toLowerCase()} per Qloo cultural evidence.`;
  }

  // 2. Seating Fabric Dynamic Mutation (only from real Qloo evidence)
  if (!vibe.fallback && vibe.seatingFabric && vibe.seatingFabric.trim().length > 0) {
    spec.qlooSeating = vibe.seatingFabric;
    const fabric = vibe.seatingFabric;

    // Mutate all seats, sofas, banquettes, chairs in the room to incorporate the Qloo fabric
    spec.objects = spec.objects.map((obj) => {
      const isSeat =
        obj.kind === "seat" ||
        obj.id.includes("sofa") ||
        obj.id.includes("chair") ||
        obj.id.includes("banquette") ||
        obj.id.includes("divan") ||
        obj.id.includes("stool") ||
        obj.id.includes("bench");

      if (isSeat) {
        return {
          ...obj,
          material: `${fabric} on Architectural Frame`,
          rationale: `Upholstered in ${fabric.toLowerCase()} per Qloo cultural evidence, balancing tactile warmth with acoustic dampening.`,
        };
      }
      return obj;
    });
  }

  // 3. Lighting Kelvin & Lighting Direction Integration
  if (!vibe.fallback && vibe.lightingTemperatureK) {
    spec.lightingKelvin = vibe.lightingTemperatureK;
    spec.qlooLightingK = vibe.lightingTemperatureK;
  }
  if (!vibe.fallback && vibe.concept && vibe.concept.lightingDirection) {
    spec.atmosphereNote += ` ${vibe.concept.lightingDirection}`;
  }

  // 4. Qloo Featured Cultural Artist Showcase Node
  if (vibe.artists && vibe.artists.length > 0) {
    const featuredArtist = vibe.artists[0];
    spec.qlooFeaturedArtist = featuredArtist.name;

    // Ensure we don't duplicate
    if (!spec.objects.some((o) => o.id === "qloo-cultural-showcase")) {
      const showcaseObject: SpatialObject = {
        id: "qloo-cultural-showcase",
        kind: "audio",
        label: `Acoustic Showcase — ${featuredArtist.name}`,
        position: [spec.roomDimensions.width * 0.3, 0.55, -spec.roomDimensions.depth * 0.32],
        rotation: [0, -0.4, 0],
        dimensions: "1.2m × 0.8m × 1.1m plinth",
        material: "Honed Architectural Travertine & Brushed Brass Sound Plaque",
        color: pColor,
        roughness: 0.35,
        metalness: 0.65,
        emissive: aColor,
        emissiveIntensity: 1.2,
        rationale: `Curated acoustic showcase celebrating ${featuredArtist.name}, surfaced via Qloo cross-domain affinity analysis from ${featuredArtist.sourceEntity || "cultural input"}. Features dedicated acoustic playback and archival vinyl display.`,
      };

      spec.objects.push(showcaseObject);

      // Add corresponding zone to layout planning HUD and 2D schematic blueprint
      spec.zones.push({
        id: "z-qloo-showcase",
        name: `Cultural Showcase (${featuredArtist.name})`,
        areaSqM: 18,
        center: showcaseObject.position,
        dimensions: [3.6, 3.6],
        color: aColor,
        rationale: `Curated cultural anchor station spotlighting affinity artist ${featuredArtist.name}.`,
      });
    }
  }

  // 5. Dynamic Evidence Tag Features
  const allTags = [
    ...(vibe.evidence.genreTags || []),
    ...(vibe.evidence.styleTags || []),
    ...(vibe.evidence.themeTags || []),
    ...(vibe.evidence.adjectives || []),
    ...(vibe.evidence.characteristics || []),
  ];
  spec.qlooEvidenceTags = allTags;

  // If evidence suggests cocktails/beverages and room has no bar, spawn one
  const hasBar = spec.objects.some((o) => o.id.includes("bar"));
  if (
    !hasBar &&
    (evidenceText.includes("cocktail") ||
      evidenceText.includes("whiskey") ||
      evidenceText.includes("drinks") ||
      evidenceText.includes("wine"))
  ) {
    spec.objects.push({
      id: "bar-counter-tag",
      kind: "structure",
      label: "Fluted Craft Cocktail Bar & Brass Rail",
      position: [spec.roomDimensions.width * 0.32, 0.55, 0],
      rotation: [0, -Math.PI / 2, 0],
      dimensions: "3.6m × 1.0m × 1.1m",
      material: "Fluted Dark Walnut & Honed Brass Footrail",
      color: "#2C1B10",
      roughness: 0.45,
      metalness: 0.4,
      rationale:
        "Secondary cocktail hospitality station integrated from Qloo beverage/cocktail affinity tags.",
    });
  }

  // If evidence suggests books/library/vinyl and room has no shelving, spawn grid shelving
  const hasShelving = spec.objects.some((o) => o.id.includes("shelf") || o.id.includes("library"));
  if (
    !hasShelving &&
    (evidenceText.includes("books") ||
      evidenceText.includes("library") ||
      evidenceText.includes("vinyl") ||
      evidenceText.includes("records"))
  ) {
    spec.objects.push({
      id: "shelving-wall-tag",
      kind: "decor",
      label: "Floor-to-Ceiling Grid Vinyl & Book Archive",
      position: [-spec.roomDimensions.width * 0.42, 1.8, 0],
      rotation: [0, Math.PI / 2, 0],
      dimensions: "4.8m × 0.45m × 3.4m",
      material: "Acoustic Walnut Grid Shelving",
      color: "#251C17",
      roughness: 0.75,
      metalness: 0.15,
      rationale:
        "Full-height vinyl record and literature archive providing sound diffusion and cultural grounding.",
    });
  }

  // If evidence suggests candlelit/romantic intimacy and room has no candles, add candle lanterns
  const hasCandles = spec.objects.some((o) => o.id.includes("candle"));
  if (
    !hasCandles &&
    (evidenceText.includes("candle") ||
      evidenceText.includes("romantic") ||
      evidenceText.includes("intimate"))
  ) {
    spec.objects.push(
      {
        id: "candle-lantern-tag-1",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [-1.4, 0.22, -1.5],
        rotation: [0, 0.2, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass & Antiqued Brass",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Flickering candle lantern casting localized romantic glows.",
      },
      {
        id: "candle-lantern-tag-2",
        kind: "light",
        label: "Glass Hurricane Candle Lantern",
        position: [1.4, 0.22, 1.5],
        rotation: [0, -0.2, 0],
        dimensions: "0.3m × 0.3m × 0.45m",
        material: "Beveled Glass & Antiqued Brass",
        color: "#FFDE9E",
        roughness: 0.15,
        metalness: 0.8,
        emissive: "#FFAE34",
        emissiveIntensity: 2.2,
        rationale: "Companion candle lantern creating warm low-level illumination.",
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Architectural Event Capacity & Layout Planning Calculations (Lintel-style)
  // ---------------------------------------------------------------------------
  const floorArea = spec.roomDimensions.width * spec.roomDimensions.depth;
  const layout =
    options?.layoutMode ||
    (spec.typology === "grand_hall"
      ? "banquet"
      : spec.typology === "futuristic_launch"
        ? "theatre"
        : spec.typology === "intimate_lounge"
          ? "cocktail"
          : "lounge");

  const areaFactor =
    layout === "banquet" ? 2.4 : layout === "theatre" ? 1.3 : layout === "cocktail" ? 1.1 : 2.6;
  const maxCapacity = Math.round(floorArea / areaFactor);
  const guests =
    options?.guestCount ?? Math.min(maxCapacity, Math.max(20, Math.round(maxCapacity * 0.72)));
  const sqmPerGuest = Number((floorArea / guests).toFixed(1));
  const status: "optimal" | "tight" | "over_capacity" =
    sqmPerGuest >= 1.8 ? "optimal" : sqmPerGuest >= 1.2 ? "tight" : "over_capacity";

  const tablesCount =
    layout === "banquet"
      ? Math.max(2, Math.ceil(guests / 10))
      : layout === "cocktail"
        ? Math.max(4, Math.ceil(guests / 8))
        : 2;

  const chairsCount =
    layout === "cocktail"
      ? Math.round(guests * 0.45)
      : guests;

  spec.eventCapacity = {
    layoutMode: layout,
    guests,
    maxCapacity,
    tablesCount,
    chairsCount,
    sqmPerGuest,
    status,
  };

  // ---------------------------------------------------------------------------
  // 7. Conversational Design Revisions / Parameter Overrides
  // ---------------------------------------------------------------------------
  if (options?.ceilingHeightDelta) {
    spec.roomDimensions.height = Math.max(
      3.2,
      Number((spec.roomDimensions.height + options.ceilingHeightDelta).toFixed(1))
    );
  }
  if (options?.wallFinishOverride) {
    spec.wallFinish = options.wallFinishOverride;
  }
  if (options?.wallArchitectureOverride) {
    spec.wallArchitecture = options.wallArchitectureOverride;
    if (options.wallArchitectureOverride === "panoramic_glazing") {
      spec.hasWindowAperture = true;
    }
  }
  if (options?.floorFinishOverride) {
    spec.floorFinish = options.floorFinishOverride;
  }
  if (options?.ceilingStructureOverride) {
    spec.ceilingStructure = options.ceilingStructureOverride;
  }

  return spec;
}
