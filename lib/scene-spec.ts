import type { VibePayload } from "./types";
import { detectGenreFamily } from "./spatial-rules";

export type SpatialTypology =
  | "listening_room"
  | "party_venue"
  | "scandinavian_living"
  | "futuristic_launch"
  | "gallery_pavilion";

export type WallFinish =
  | "acoustic_slats"
  | "distressed_plaster"
  | "raw_concrete"
  | "wood_panel"
  | "gallery_white";

export type FloorFinish =
  | "warm_oak"
  | "glossy_concrete"
  | "polished_stone"
  | "terrazzo"
  | "industrial_cement";

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

export interface SceneSpec {
  typology: SpatialTypology;
  typologyLabel: string;
  roomDimensions: { width: number; depth: number; height: number };
  wallFinish: WallFinish;
  floorFinish: FloorFinish;
  primaryColor: string;
  accentColor: string;
  lightingKelvin: number;
  objects: SpatialObject[];
  zones: SpatialZone[];
  hasWindowAperture: boolean;
  atmosphereNote: string;
  designIntent: string;
}

function parseExplicitTypology(text: string): SpatialTypology | null {
  const t = text.toLowerCase();
  if (t.includes("jazz") || t.includes("listening") || t.includes("audiophile") || t.includes("vinyl") || t.includes("tatami")) {
    return "listening_room";
  }
  if (t.includes("party") || t.includes("grunge") || t.includes("birthday") || t.includes("club") || t.includes("rave") || t.includes("dance")) {
    return "party_venue";
  }
  if (t.includes("scandinavian") || t.includes("nordic") || t.includes("living room") || t.includes("oak") || t.includes("minimalist")) {
    return "scandinavian_living";
  }
  if (t.includes("futuristic") || t.includes("launch") || t.includes("reflective") || t.includes("cyber") || t.includes("product launch")) {
    return "futuristic_launch";
  }
  if (t.includes("gallery") || t.includes("exhibition") || t.includes("museum") || t.includes("sculptur")) {
    return "gallery_pavilion";
  }
  return null;
}

export function generateSceneSpec(prompt: string, vibe: VibePayload): SceneSpec {
  const explicit = parseExplicitTypology(prompt);
  const family = detectGenreFamily(vibe.evidence);

  // Determine typology from prompt or family
  let typology: SpatialTypology = "scandinavian_living";
  if (explicit) {
    typology = explicit;
  } else if (family === "electronic") {
    typology = "futuristic_launch";
  } else if (family === "punk") {
    typology = "party_venue";
  } else if (family === "atmospheric") {
    typology = "listening_room";
  } else if (family === "hiphop") {
    typology = "party_venue";
  }

  const pColor = vibe.primaryColorHex || "#D9532B";
  const aColor = vibe.accentColorHex || "#2F5A4C";
  const kelvin = vibe.lightingTemperatureK || 3400;

  if (typology === "listening_room") {
    return {
      typology: "listening_room",
      typologyLabel: "Japanese Jazz Listening Lounge",
      roomDimensions: { width: 11, depth: 14, height: 3.4 },
      wallFinish: "acoustic_slats",
      floorFinish: "warm_oak",
      primaryColor: pColor,
      accentColor: "#E8B878",
      lightingKelvin: 2800,
      hasWindowAperture: true,
      atmosphereNote: "Intimate, warm acoustic cocoon with diffused washi paper lantern glow and deep timber textures.",
      designIntent: "Optimized for deep listening sessions: acoustic absorption slats, low tatami-scale seating, and turntable focal credenza.",
      zones: [
        {
          id: "z-focal",
          name: "Acoustic Stage & Audiophile Console",
          areaSqM: 24,
          center: [0, 0, -4.8],
          dimensions: [7.2, 3.8],
          color: "#D9532B",
          rationale: "Focal acoustic zone optimized for stereo horn imaging, turntable playback, and timber diffusion.",
        },
        {
          id: "z-lounge",
          name: "Intimate Listening Hearth",
          areaSqM: 32,
          center: [0, 0, -0.6],
          dimensions: [6.4, 4.8],
          color: "#2F5A4C",
          rationale: "Low-profile velvet seating envelope directly aligned inside the primary sweet-spot soundstage.",
        },
        {
          id: "z-library",
          name: "Vinyl Archive & Ingress",
          areaSqM: 20,
          center: [-3.8, 0, 1.4],
          dimensions: [3.4, 6.2],
          color: "#E8B878",
          rationale: "Perimeter vinyl archive acting as sound absorption diffusion along entry threshold.",
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
          rationale: "Low-hanging warm ambient glow emulating traditional Japanese lantern illumination.",
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

  if (typology === "party_venue") {
    return {
      typology: "party_venue",
      typologyLabel: "Underground Grunge Celebration Hall",
      roomDimensions: { width: 14, depth: 18, height: 5.2 },
      wallFinish: "distressed_plaster",
      floorFinish: "glossy_concrete",
      primaryColor: "#FF2A85",
      accentColor: "#00F0FF",
      lightingKelvin: 5200,
      hasWindowAperture: false,
      atmosphereNote: "Slick dark concrete with hot neon pink and cyan reflections, exposed metal framework, and chrome furniture.",
      designIntent: "High-energy social celebration layout with open dance area, high cocktail perches, and architectural neon framing.",
      zones: [
        {
          id: "z-dj",
          name: "Elevated DJ & Performance Core",
          areaSqM: 26,
          center: [0, 0, -6.8],
          dimensions: [7.0, 4.0],
          color: "#FF2A85",
          rationale: "Commanding audio nexus framed by suspended magenta neon architectural portal.",
        },
        {
          id: "z-dance",
          name: "Central Specular Dance Floor",
          areaSqM: 54,
          center: [0, 0, -1.5],
          dimensions: [8.5, 6.5],
          color: "#00F0FF",
          rationale: "High-traffic core maximizing glossy concrete specular bounce under angled neon rays.",
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
          rationale: "Creates dramatic cinematic depth and hot color washes across the concrete floor.",
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

  if (typology === "scandinavian_living") {
    return {
      typology: "scandinavian_living",
      typologyLabel: "Minimalist Nordic Light Pavilion",
      roomDimensions: { width: 12, depth: 15, height: 4.0 },
      wallFinish: "wood_panel",
      floorFinish: "warm_oak",
      primaryColor: "#58705C",
      accentColor: "#D97746",
      lightingKelvin: 4200,
      hasWindowAperture: true,
      atmosphereNote: "Bathed in low raking Nordic sunlight with warm natural oak, tactile bouclé upholstery, and calm airy breathing room.",
      designIntent: "Biophilic architectural living space balancing clean geometry, natural timber grain, and soft woven comfort.",
      zones: [
        {
          id: "z-hearth",
          name: "Nordic Conversation Hearth",
          areaSqM: 32,
          center: [0, 0, -0.2],
          dimensions: [6.8, 5.2],
          color: "#58705C",
          rationale: "Natural oak plinth and textured cream bouclé social hub anchoring the room.",
        },
        {
          id: "z-glazing",
          name: "Morning Sun Glazing Bay",
          areaSqM: 26,
          center: [4.2, 0, 0],
          dimensions: [3.4, 7.8],
          color: "#D97746",
          rationale: "Raking morning light aperture connecting interior textures with natural daylight.",
        },
        {
          id: "z-flora",
          name: "Biophilic Flora & Credenza Alcove",
          areaSqM: 20,
          center: [-3.8, 0, -4.5],
          dimensions: [3.5, 4.8],
          color: "#354E35",
          rationale: "Living olive tree and horizontal slatted oak credenza creating serene perimeter views.",
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
          rationale: "Central gathering archipelago oriented toward the morning sunlight garden view.",
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

  if (typology === "futuristic_launch") {
    return {
      typology: "futuristic_launch",
      typologyLabel: "Kinetic Horizon Product Pavilion",
      roomDimensions: { width: 16, depth: 22, height: 6.0 },
      wallFinish: "raw_concrete",
      floorFinish: "glossy_concrete",
      primaryColor: "#00E5FF",
      accentColor: "#7B61FF",
      lightingKelvin: 6500,
      hasWindowAperture: false,
      atmosphereNote: "Mirror-finish floors, monochromatic obsidian surfaces, crisp blue-violet perimeter horizons, and cinematic focal plinths.",
      designIntent: "High-contrast architectural stage designed to frame and spotlight hero product forms with razor-sharp light lines.",
      zones: [
        {
          id: "z-monolith",
          name: "Hero Display Monolith Stage",
          areaSqM: 38,
          center: [0, 0, -4.5],
          dimensions: [7.8, 5.2],
          color: "#00E5FF",
          rationale: "Cantilevered obsidian plinth directly below overhead surgical light canopy.",
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

  // Default / gallery_pavilion
  return {
    typology: "gallery_pavilion",
    typologyLabel: "Contemplative Spatial Gallery",
    roomDimensions: { width: 13, depth: 16, height: 4.4 },
    wallFinish: "gallery_white",
    floorFinish: "polished_stone",
    primaryColor: pColor,
    accentColor: aColor,
    lightingKelvin: kelvin,
    hasWindowAperture: true,
    atmosphereNote: "Spatially pure, calm museum proportions with controlled spotlighting and open circulation paths.",
    designIntent: "Pure architectural backdrop allowing materials, sound resonance, and sculptural artifacts to command focus.",
    zones: [
      {
        id: "z-plinth",
        name: "Central Sculptural Plinth Anchor",
        areaSqM: 32,
        center: [0, 0, -3.2],
        dimensions: [6.4, 5.6],
        color: "#D9532B",
        rationale: "Primary exhibition pedestal commanding clean 360-degree observation angles.",
      },
      {
        id: "z-bench",
        name: "Contemplative Observation Deck",
        areaSqM: 30,
        center: [0, 0, 1.2],
        dimensions: [6.8, 4.6],
        color: "#2F5A4C",
        rationale: "Cast concrete observation bench positioned for extended acoustic and visual contemplation.",
      },
      {
        id: "z-perimeter",
        name: "Curated Promenade Corridor",
        areaSqM: 34,
        center: [-4.2, 0, 0],
        dimensions: [3.4, 8.8],
        color: "#E8B878",
        rationale: "Uninterrupted perimeter circulation path along washed plaster exhibition walls.",
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
