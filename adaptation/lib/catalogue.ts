/**
 * Sonic Architecture — Master Approved Kit Catalogue
 * (/adaptation/lib/catalogue.ts)
 *
 * Implements Phase 5: Expanded Expressive Kit
 * - 15 typologies (exceeds requirement of >= 12)
 * - 31 physical PBR material sets (exceeds requirement of >= 20)
 * - 50 props across 7 cultural categories (exceeds requirement of >= 40)
 * - Real-world metric dimensions
 * - Procedural canvas text textures for dynamic Qloo cultural artifacts
 */

export interface TypologyDefinition {
  id: string;
  name: string;
  description: string;
  defaultEnclosure: "indoor" | "outdoor" | "hybrid" | "underground";
  defaultMassing: { width: number; height: number; depth: number; ceiling: string };
  defaultMaterials: { floor: string; walls: string; ceiling: string; featureWall: string };
  defaultLighting: { fixtureStyle: string; practicals: string[]; temperatureK: number; intensity: number };
  defaultSeating: { mode: "seated" | "standing" | "lounge" | "mixed"; capacity: number; flow: string };
  typicalZones: string[];
  acousticTargetRT60: number;
}

export const APPROVED_TYPOLOGIES: Record<string, TypologyDefinition> = {
  listening_room: {
    id: "listening_room",
    name: "Audiophile Analog Listening Room",
    description: "Shoebox acoustic proportions with quarter-sawn oak, Helmholtz slats, and dedicated sweet spot.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 12.0, height: 3.8, depth: 9.0, ceiling: "coffered_timber" },
    defaultMaterials: { floor: "warm_oak", walls: "acoustic_slats", ceiling: "coffered_timber", featureWall: "vertical_timber_slats" },
    defaultLighting: { fixtureStyle: "brass_conical_pendants", practicals: ["brass_task_lamp", "warm_wall_graze"], temperatureK: 2400, intensity: 0.85 },
    defaultSeating: { mode: "lounge", capacity: 24, flow: "equilateral_listening_triangle" },
    typicalZones: ["audio stage", "primary listening sweet-spot", "vinyl archive wall", "tokonoma entry"],
    acousticTargetRT60: 0.38,
  },
  comedy_theatre: {
    id: "comedy_theatre",
    name: "Contemporary Comedy Revue & Theatre",
    description: "Curved thrust performance stage, velvet drapes, and cabaret table seating with speech acoustic tuning.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 15.0, height: 5.2, depth: 18.0, ceiling: "space_frame_truss" },
    defaultMaterials: { floor: "herringbone_parquet", walls: "distressed_brick", ceiling: "exposed_industrial_rig", featureWall: "velvet_theatre_curtain" },
    defaultLighting: { fixtureStyle: "theatrical_overhead_spots", practicals: ["follow_spot", "cocktail_table_candle"], temperatureK: 2700, intensity: 1.1 },
    defaultSeating: { mode: "seated", capacity: 85, flow: "cabaret_semi_circular_sightlines" },
    typicalZones: ["thrust comedy stage", "cabaret seating court", "cocktail bar corner", "backstage entrance"],
    acousticTargetRT60: 0.42,
  },
  industrial_warehouse: {
    id: "industrial_warehouse",
    name: "Industrial Raw Warehouse & Sound Lab",
    description: "Monumental clear-span volume with concrete formwork, steel box trusses, and high reverberation.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 22.0, height: 7.2, depth: 16.0, ceiling: "space_frame_truss" },
    defaultMaterials: { floor: "polished_concrete", walls: "board_concrete", ceiling: "space_frame_truss", featureWall: "distressed_brick" },
    defaultLighting: { fixtureStyle: "industrial_high_bay_metal_halide", practicals: ["linear_light_blade", "strobe_strip"], temperatureK: 5200, intensity: 1.25 },
    defaultSeating: { mode: "standing", capacity: 250, flow: "open_dispersed_dancefloor" },
    typicalZones: ["central performance dais", "sound stack flanks", "industrial bar", "chillout perimeter"],
    acousticTargetRT60: 0.65,
  },
  tea_room: {
    id: "tea_room",
    name: "Sukiya Contemplative Tea Room",
    description: "Intimate Japanese proportions with Igusa tatami mats, charred Hinoki joinery, and shakkei garden views.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 10.0, height: 3.2, depth: 8.5, ceiling: "hinoki_rafters" },
    defaultMaterials: { floor: "tatami_mat", walls: "washi_screen", ceiling: "hinoki_rafters", featureWall: "charred_hinoki" },
    defaultLighting: { fixtureStyle: "washi_diffused_lanterns", practicals: ["kasuga_stone_lantern", "hearth_glow"], temperatureK: 2200, intensity: 0.65 },
    defaultSeating: { mode: "seated", capacity: 16, flow: "tatami_perimeter_contemplation" },
    typicalZones: ["sunken ro hearth", "tokonoma alcove", "veranda viewing deck", "water basin arrival"],
    acousticTargetRT60: 0.32,
  },
  gallery_pavilion: {
    id: "gallery_pavilion",
    name: "Minimalist Art Gallery & Screening Pavilion",
    description: "Neutral white-cube envelope with limestone flooring, directional track lighting, and curatorial plinths.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 14.0, height: 4.2, depth: 11.0, ceiling: "coffered_timber" },
    defaultMaterials: { floor: "honed_limestone", walls: "limewash_plaster", ceiling: "coffered_timber", featureWall: "limewash_plaster" },
    defaultLighting: { fixtureStyle: "recessed_gallery_wash", practicals: ["curatorial_track_spot", "lightbox_glow"], temperatureK: 4000, intensity: 0.95 },
    defaultSeating: { mode: "lounge", capacity: 35, flow: "unobstructed_perimeter_circulation" },
    typicalZones: ["central sculpture plinth", "exhibition gallery wall", "cinema screening alcove", "curator reading lounge"],
    acousticTargetRT60: 0.44,
  },
  grunge_loft: {
    id: "grunge_loft",
    name: "Editorial Photo Loft & Creative Studio",
    description: "Clear-span daylight loft with paper cyclorama, strobe stands, tufted velvet seating, and exposed brick.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 15.0, height: 4.4, depth: 12.0, ceiling: "exposed_industrial_rig" },
    defaultMaterials: { floor: "herringbone_parquet", walls: "distressed_brick", ceiling: "exposed_industrial_rig", featureWall: "boucle_wool" },
    defaultLighting: { fixtureStyle: "photographic_strobe_monolights", practicals: ["dj_flash_rig", "neon_cultural_sign"], temperatureK: 5600, intensity: 1.2 },
    defaultSeating: { mode: "lounge", capacity: 30, flow: "perimeter_loft_lounge" },
    typicalZones: ["cyclorama photo stage", "editorial velvet lounge", "equipment prep bar", "wardrobe rack aisle"],
    acousticTargetRT60: 0.52,
  },
  garden_mandap: {
    id: "garden_mandap",
    name: "Celebratory Garden Mandap Pavilion",
    description: "Open-air floral pavilion with carved sandstone columns, marigold garlands, and silk bolster seating.",
    defaultEnclosure: "outdoor",
    defaultMassing: { width: 16.0, height: 3.8, depth: 13.0, ceiling: "draped_textile_canopy" },
    defaultMaterials: { floor: "warm_sandstone", walls: "open_landscape", ceiling: "draped_textile_canopy", featureWall: "marigold_silk" },
    defaultLighting: { fixtureStyle: "open_sky_ambient_glow", practicals: ["brass_oil_diya_lanterns", "warm_string_garlands"], temperatureK: 2600, intensity: 0.9 },
    defaultSeating: { mode: "seated", capacity: 80, flow: "concentric_ceremonial_court" },
    typicalZones: ["central sacred mandap dais", "ceremonial jhula swing", "guest diwan seating", "marigold threshold portal"],
    acousticTargetRT60: 0.36,
  },
  mediterranean_courtyard: {
    id: "mediterranean_courtyard",
    name: "Mediterranean Travertine Colonnade Courtyard",
    description: "Peristyle courtyard with central limestone fountain, terracotta paving, and olive tree planters.",
    defaultEnclosure: "hybrid",
    defaultMassing: { width: 17.0, height: 4.0, depth: 13.0, ceiling: "open_sky_pergola" },
    defaultMaterials: { floor: "terracotta_tile", walls: "honed_limestone", ceiling: "open_sky_pergola", featureWall: "honed_limestone" },
    defaultLighting: { fixtureStyle: "sunset_golden_graze", practicals: ["wrought_iron_sconces", "fountain_underwater_glow"], temperatureK: 3000, intensity: 0.85 },
    defaultSeating: { mode: "seated", capacity: 45, flow: "perimeter_colonnade_bistro" },
    typicalZones: ["central limestone fountain", "olive grove dining court", "pergola shaded lounge", "wine hospitality credenza"],
    acousticTargetRT60: 0.40,
  },
  underground_club: {
    id: "underground_club",
    name: "Subterranean Electronic Club Bunker",
    description: "Low-ceilinged concrete basement tuned for visceral sub-bass containment with linear LED blades.",
    defaultEnclosure: "underground",
    defaultMassing: { width: 18.0, height: 4.8, depth: 14.0, ceiling: "monolithic_cantilever" },
    defaultMaterials: { floor: "obsidian_terrazzo", walls: "board_concrete", ceiling: "monolithic_cantilever", featureWall: "acoustic_slats" },
    defaultLighting: { fixtureStyle: "dynamic_linear_led_blades", practicals: ["subwoofer_halo", "cocktail_well_dim"], temperatureK: 6500, intensity: 0.7 },
    defaultSeating: { mode: "standing", capacity: 180, flow: "central_pit_with_perimeter_booths" },
    typicalZones: ["dj performance bunker", "central bass pit", "flanking banquette booths", "underground cocktail bar"],
    acousticTargetRT60: 0.75,
  },
  futuristic_launch: {
    id: "futuristic_launch",
    name: "Kinetic Technology Launch Sanctuary",
    description: "Sleek obsidian plinth with curved LED backdrops, mirror chrome accents, and directional acoustic beams.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 20.0, height: 5.6, depth: 14.0, ceiling: "space_frame_truss" },
    defaultMaterials: { floor: "obsidian_terrazzo", walls: "anodized_aluminum", ceiling: "space_frame_truss", featureWall: "mirror_chrome" },
    defaultLighting: { fixtureStyle: "architectural_light_cove", practicals: ["plinth_undermount_led", "linear_light_blade"], temperatureK: 4800, intensity: 1.15 },
    defaultSeating: { mode: "mixed", capacity: 120, flow: "amphitheatre_presentation_tiers" },
    typicalZones: ["concept product plinth", "curved led backdrop stage", "tiered VIP seating", "interactive hospitality bar"],
    acousticTargetRT60: 0.48,
  },
  cathedral_banquet: {
    id: "cathedral_banquet",
    name: "Gothic Vaulted Refectory Sanctuary",
    description: "Soaring ribbed vaults with limestone clustered piers, long communal banquet tables, and candelabras.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 14.0, height: 8.5, depth: 22.0, ceiling: "gothic_ribbed_vault" },
    defaultMaterials: { floor: "honed_limestone", walls: "honed_limestone", ceiling: "gothic_ribbed_vault", featureWall: "mullioned_glass" },
    defaultLighting: { fixtureStyle: "brass_ring_chandeliers", practicals: ["candelabra_floral_centerpiece", "stained_glass_daylight"], temperatureK: 2600, intensity: 0.8 },
    defaultSeating: { mode: "seated", capacity: 140, flow: "axial_processional_refectory" },
    typicalZones: ["central high table dais", "communal banquet aisles", "altar choral end", "narthex arrival vestibule"],
    acousticTargetRT60: 1.45,
  },
  brutalist_runway: {
    id: "brutalist_runway",
    name: "Monolithic Concrete Fashion Runway",
    description: "Massive board-concrete piers flanking an obsidian catwalk deck with high-contrast linear lighting.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 16.0, height: 6.2, depth: 24.0, ceiling: "monolithic_cantilever" },
    defaultMaterials: { floor: "board_concrete", walls: "board_concrete", ceiling: "monolithic_cantilever", featureWall: "obsidian_terrazzo" },
    defaultLighting: { fixtureStyle: "overhead_linear_catwalk_blades", practicals: ["footlight_wash", "pier_uplighting"], temperatureK: 5000, intensity: 1.3 },
    defaultSeating: { mode: "seated", capacity: 160, flow: "dual_flank_linear_rows" },
    typicalZones: ["central obsidian runway deck", "flanking concrete seating tiers", "model entrance portal", "media riser platform"],
    acousticTargetRT60: 0.58,
  },
  coastal_retreat: {
    id: "coastal_retreat",
    name: "Open-Air Oceanic Teak Pavilion",
    description: "Teak decking with linen canopies, expansive sea vistas, low daybeds, and soft sea breeze acoustics.",
    defaultEnclosure: "outdoor",
    defaultMassing: { width: 18.0, height: 4.2, depth: 14.0, ceiling: "open_sky_pergola" },
    defaultMaterials: { floor: "teak_decking", walls: "open_landscape", ceiling: "open_sky_pergola", featureWall: "raw_linen" },
    defaultLighting: { fixtureStyle: "driftwood_lantern_ambient", practicals: ["storm_lantern_candles", "deck_recessed_glow"], temperatureK: 2800, intensity: 0.75 },
    defaultSeating: { mode: "lounge", capacity: 40, flow: "ocean_facing_daybed_clusters" },
    typicalZones: ["sunset observation deck", "shaded linen cabana lounge", "outdoor raw bar", "reflection pool edge"],
    acousticTargetRT60: 0.30,
  },
  intimate_lounge: {
    id: "intimate_lounge",
    name: "Velvet Speakeasy & Acoustic Salon",
    description: "Low-lit salon with emerald moss velvet booths, walnut paneling, and cocktail tables.",
    defaultEnclosure: "indoor",
    defaultMassing: { width: 12.0, height: 3.6, depth: 10.0, ceiling: "coffered_timber" },
    defaultMaterials: { floor: "herringbone_parquet", walls: "vertical_timber_slats", ceiling: "coffered_timber", featureWall: "moss_velvet" },
    defaultLighting: { fixtureStyle: "shaded_brass_table_lamps", practicals: ["bar_backlight_amber", "cove_perimeter_glow"], temperatureK: 2200, intensity: 0.6 },
    defaultSeating: { mode: "lounge", capacity: 36, flow: "intimate_alcove_clusters" },
    typicalZones: ["artisan cocktail bar", "curved velvet booths", "piano acoustic stage", "curated record shelving"],
    acousticTargetRT60: 0.35,
  },
  pavilion_celebration: {
    id: "pavilion_celebration",
    name: "Celebratory Draped Pavilion & Garden",
    description: "Grand draped textile canopy with warm ambient fairy lighting, banquet tables, and dance floor.",
    defaultEnclosure: "hybrid",
    defaultMassing: { width: 20.0, height: 5.0, depth: 18.0, ceiling: "draped_textile_canopy" },
    defaultMaterials: { floor: "polished_concrete", walls: "open_landscape", ceiling: "draped_textile_canopy", featureWall: "raw_linen" },
    defaultLighting: { fixtureStyle: "canopy_festoon_glow", practicals: ["brass_ring_chandelier", "perimeter_flood"], temperatureK: 2900, intensity: 1.0 },
    defaultSeating: { mode: "mixed", capacity: 150, flow: "banquet_flanked_dancefloor" },
    typicalZones: ["central celebration dancefloor", "flanking banquet tables", "champagne bar credenza", "garden arrival lawn"],
    acousticTargetRT60: 0.45,
  },
};

export const APPROVED_MATERIALS: Record<string, { id: string; name: string; family: string; defaultHex: string; roughness: number; metalness: number }> = {
  warm_oak: { id: "warm_oak", name: "Quarter-Sawn Japanese Oak", family: "wood", defaultHex: "#7D5130", roughness: 0.58, metalness: 0.04 },
  herringbone_parquet: { id: "herringbone_parquet", name: "Smoked Walnut Herringbone Parquet", family: "wood", defaultHex: "#5C3820", roughness: 0.45, metalness: 0.05 },
  charred_hinoki: { id: "charred_hinoki", name: "Shou Sugi Ban Charred Hinoki", family: "wood", defaultHex: "#A47B4F", roughness: 0.52, metalness: 0.02 },
  tatami_mat: { id: "tatami_mat", name: "Woven Igusa Rush Tatami", family: "fiber", defaultHex: "#9E9264", roughness: 0.82, metalness: 0.0 },
  board_concrete: { id: "board_concrete", name: "Board-Formed Architectural Concrete", family: "concrete", defaultHex: "#52565C", roughness: 0.84, metalness: 0.05 },
  polished_concrete: { id: "polished_concrete", name: "Honed Anthracite Concrete", family: "concrete", defaultHex: "#2D3137", roughness: 0.24, metalness: 0.12 },
  obsidian_terrazzo: { id: "obsidian_terrazzo", name: "Polished Obsidian Terrazzo", family: "stone", defaultHex: "#171C24", roughness: 0.18, metalness: 0.18 },
  honed_limestone: { id: "honed_limestone", name: "Honed Bath Ashlar Limestone", family: "stone", defaultHex: "#B5A48B", roughness: 0.72, metalness: 0.02 },
  warm_sandstone: { id: "warm_sandstone", name: "Carved Jaisalmer Sandstone", family: "stone", defaultHex: "#C48B52", roughness: 0.74, metalness: 0.02 },
  veined_marble: { id: "veined_marble", name: "Calacatta Viola Veined Marble", family: "stone", defaultHex: "#C6BCB0", roughness: 0.28, metalness: 0.06 },
  terracotta_tile: { id: "terracotta_tile", name: "Unglazed Tuscan Terracotta Tile", family: "ceramic", defaultHex: "#A45735", roughness: 0.78, metalness: 0.0 },
  inlay_ceramic: { id: "inlay_ceramic", name: "Glazed Cobalt Ceramic Inlay", family: "ceramic", defaultHex: "#2A4B7C", roughness: 0.15, metalness: 0.1 },
  limewash_plaster: { id: "limewash_plaster", name: "Natural Matte Limewash Plaster", family: "plaster", defaultHex: "#D8D2C4", roughness: 0.88, metalness: 0.0 },
  acoustic_slats: { id: "acoustic_slats", name: "Slotted Acoustic Timber Slats", family: "acoustic", defaultHex: "#68482A", roughness: 0.62, metalness: 0.03 },
  vertical_timber_slats: { id: "vertical_timber_slats", name: "Vertical Cedar Acoustic Fins", family: "wood", defaultHex: "#8B5A36", roughness: 0.6, metalness: 0.02 },
  acoustic_felt: { id: "acoustic_felt", name: "Compressed Basalt Acoustic Felt", family: "acoustic", defaultHex: "#3A3D42", roughness: 0.94, metalness: 0.0 },
  washi_screen: { id: "washi_screen", name: "Translucent Kozo Washi Paper", family: "paper", defaultHex: "#E8E2D5", roughness: 0.85, metalness: 0.0 },
  brushed_brass: { id: "brushed_brass", name: "Hand-Rubbed Brushed Brass", family: "metal", defaultHex: "#C59B4E", roughness: 0.32, metalness: 0.88 },
  anodized_aluminum: { id: "anodized_aluminum", name: "Matte Slate Anodized Aluminum", family: "metal", defaultHex: "#5E6573", roughness: 0.38, metalness: 0.82 },
  mirror_chrome: { id: "mirror_chrome", name: "Specular High-Polished Chrome", family: "metal", defaultHex: "#E2E8F0", roughness: 0.06, metalness: 0.98 },
  cognac_leather: { id: "cognac_leather", name: "Full-Grain Cognac Saddle Leather", family: "leather", defaultHex: "#7C3F23", roughness: 0.55, metalness: 0.05 },
  moss_velvet: { id: "moss_velvet", name: "Deep Emerald Moss Velvet", family: "fabric", defaultHex: "#2F5A4C", roughness: 0.72, metalness: 0.0 },
  boucle_wool: { id: "boucle_wool", name: "Textured Heavy Bouclé Wool", family: "fabric", defaultHex: "#8C5167", roughness: 0.85, metalness: 0.0 },
  raw_linen: { id: "raw_linen", name: "Natural Unbleached Flax Linen", family: "fabric", defaultHex: "#C8BCA8", roughness: 0.8, metalness: 0.0 },
  marigold_silk: { id: "marigold_silk", name: "Woven Festive Marigold Silk", family: "fabric", defaultHex: "#D97706", roughness: 0.45, metalness: 0.15 },
  distressed_brick: { id: "distressed_brick", name: "Reclaimed Kiln-Fired Red Brick", family: "masonry", defaultHex: "#8B3E2F", roughness: 0.85, metalness: 0.0 },
  stacked_brick: { id: "stacked_brick", name: "Engineered Linear Stacked Brick", family: "masonry", defaultHex: "#523B33", roughness: 0.82, metalness: 0.0 },
  strata_rock: { id: "strata_rock", name: "Natural Quarry Strata Rock", family: "stone", defaultHex: "#484D55", roughness: 0.9, metalness: 0.02 },
  teak_decking: { id: "teak_decking", name: "Marine-Grade Oiled Teak Decking", family: "wood", defaultHex: "#8B6538", roughness: 0.5, metalness: 0.02 },
  translucent_canopy: { id: "translucent_canopy", name: "Tensile ETFE Translucent Membrane", family: "membrane", defaultHex: "#E5E7EB", roughness: 0.25, metalness: 0.05 },
  mullioned_glass: { id: "mullioned_glass", name: "Low-Iron Architectural Mullioned Glass", family: "glass", defaultHex: "#94A3B8", roughness: 0.08, metalness: 0.1 },
};

export const APPROVED_PROPS: Record<string, { id: string; name: string; category: string; defaultDimensions: [number, number, number] }> = {
  // Category 1: Audio & Sound Equipment
  horn_speaker_pair: { id: "horn_speaker_pair", name: "West Coast Alnico Wood Horn Loudspeaker", category: "audio", defaultDimensions: [0.95, 1.7, 0.78] },
  analog_turntable_console: { id: "analog_turntable_console", name: "Slate & Hinoki Dual Rotary Turntable Console", category: "audio", defaultDimensions: [2.2, 0.95, 0.65] },
  vinyl_record_shelf: { id: "vinyl_record_shelf", name: "Floor-to-Ceiling Archival Vinyl Library", category: "audio", defaultDimensions: [3.2, 2.7, 0.42] },
  techno_sound_stack: { id: "techno_sound_stack", name: "Heavy Sub-Bass Horn Stack Enclosure", category: "audio", defaultDimensions: [1.4, 2.4, 1.1] },
  ambient_sound_column: { id: "ambient_sound_column", name: "Vertical Array Ambient Sound Column", category: "audio", defaultDimensions: [0.35, 2.1, 0.35] },
  performer_mic_stand: { id: "performer_mic_stand", name: "Vintage Ribbon Microphone on Cast-Iron Stand", category: "audio", defaultDimensions: [0.45, 1.55, 0.45] },
  tube_amplifier_rack: { id: "tube_amplifier_rack", name: "Glowing 300B Vacuum Tube Monoblock Rack", category: "audio", defaultDimensions: [0.8, 1.2, 0.55] },
  modular_synth_table: { id: "modular_synth_table", name: "Modular Analog Synthesizer Patch Table", category: "audio", defaultDimensions: [1.6, 0.9, 0.75] },

  // Category 2: Seating & Lounging
  low_lounge_chair: { id: "low_lounge_chair", name: "Low-Slung Cognac Leather Acoustic Chair", category: "seating", defaultDimensions: [0.92, 0.78, 0.94] },
  listening_sofa: { id: "listening_sofa", name: "Tiered Low-Back Wool Settee", category: "seating", defaultDimensions: [2.3, 0.82, 0.95] },
  tufted_grunge_sofa: { id: "tufted_grunge_sofa", name: "Tufted Rose Velvet Editorial Sofa", category: "seating", defaultDimensions: [2.1, 0.85, 0.95] },
  curved_banquette_booth: { id: "curved_banquette_booth", name: "Fluted Velvet Curved Banquette Booth", category: "seating", defaultDimensions: [2.4, 1.1, 1.05] },
  reading_armchair: { id: "reading_armchair", name: "Ergonomic Curatorial Reading Armchair", category: "seating", defaultDimensions: [0.88, 0.92, 0.88] },
  diwan_bolster_lounge: { id: "diwan_bolster_lounge", name: "Ceremonial Silk Bolster Diwan Platform", category: "seating", defaultDimensions: [2.4, 0.55, 1.2] },
  tatami_bench: { id: "tatami_bench", name: "Hinoki Frame Igusa Tatami Bench", category: "seating", defaultDimensions: [1.8, 0.42, 0.65] },
  gallery_modular_bench: { id: "gallery_modular_bench", name: "Minimalist Honed Limestone Island Bench", category: "seating", defaultDimensions: [2.0, 0.45, 0.7] },

  // Category 3: Tables & Surfaces
  chabudai_tea_table: { id: "chabudai_tea_table", name: "Low Cedar Chabudai Tea Table", category: "tables", defaultDimensions: [1.2, 0.35, 0.8] },
  cabaret_cocktail_table: { id: "cabaret_cocktail_table", name: "Cast-Brass Rimmed Cabaret Cocktail Table", category: "tables", defaultDimensions: [0.65, 0.74, 0.65] },
  curatorial_reading_table: { id: "curatorial_reading_table", name: "Oak Curatorial Reading & Specimen Table", category: "tables", defaultDimensions: [2.4, 0.76, 1.0] },
  banquet_long_table: { id: "banquet_long_table", name: "Solid Timber Communal Refectory Table", category: "tables", defaultDimensions: [4.2, 0.78, 1.1] },
  bistro_courtyard_table: { id: "bistro_courtyard_table", name: "Wrought-Iron Travertine Bistro Table", category: "tables", defaultDimensions: [0.8, 0.75, 0.8] },
  sculptural_concrete_bench: { id: "sculptural_concrete_bench", name: "Monolithic Cast Concrete Low Surface", category: "tables", defaultDimensions: [1.4, 0.38, 0.7] },

  // Category 4: Lighting & Atmospheric Fixtures
  brass_ring_chandelier: { id: "brass_ring_chandelier", name: "Concentric Brass Ring Chandelier", category: "lighting", defaultDimensions: [1.8, 0.4, 1.8] },
  linear_light_blade: { id: "linear_light_blade", name: "Suspended Linear LED Blade Fixture", category: "lighting", defaultDimensions: [3.0, 0.12, 0.08] },
  suspended_box_truss: { id: "suspended_box_truss", name: "Overhead Aluminum Rigging Box Truss", category: "lighting", defaultDimensions: [4.0, 0.45, 0.45] },
  dj_flash_rig: { id: "dj_flash_rig", name: "High-Contrast Daylight Strobe Monolight on C-Stand", category: "lighting", defaultDimensions: [0.8, 2.2, 0.8] },
  kasuga_stone_lantern: { id: "kasuga_stone_lantern", name: "Hand-Carved Kasuga Granite Lantern", category: "lighting", defaultDimensions: [0.55, 1.6, 0.55] },
  brass_task_lamp: { id: "brass_task_lamp", name: "Counterweighted Brass Reading Task Lamp", category: "lighting", defaultDimensions: [0.35, 0.65, 0.35] },
  candelabra_floral_centerpiece: { id: "candelabra_floral_centerpiece", name: "Patinated Brass Banquet Candelabra", category: "lighting", defaultDimensions: [0.6, 0.85, 0.6] },
  neon_cultural_sign: { id: "neon_cultural_sign", name: "Hand-Blown Glass Neon Artistic Signage", category: "lighting", defaultDimensions: [1.8, 0.6, 0.08] },

  // Category 5: Cultural Signage & Art Installations (Runtime Qloo Grounded)
  artist_record_wall: { id: "artist_record_wall", name: "Curated Qloo Artist Archival Feature Display", category: "cultural_artifacts", defaultDimensions: [3.6, 2.4, 0.18] },
  film_poster_lightbox: { id: "film_poster_lightbox", name: "Cinematic Backlit Poster Lightbox Plane", category: "cultural_artifacts", defaultDimensions: [1.2, 1.8, 0.12] },
  venue_category_signage: { id: "venue_category_signage", name: "Architectural Venue Category Signage Plane", category: "cultural_artifacts", defaultDimensions: [2.0, 0.6, 0.06] },
  brand_merch_corner: { id: "brand_merch_corner", name: "Curated Brand Merchandising & Hospitality Corner", category: "cultural_artifacts", defaultDimensions: [1.8, 1.5, 0.6] },
  cinema_projection_screen: { id: "cinema_projection_screen", name: "Seamless Matte Cinema Projection Screen", category: "cultural_artifacts", defaultDimensions: [4.5, 2.6, 0.08] },
  concept_vehicle_sculpture: { id: "concept_vehicle_sculpture", name: "Kinetic Concept Sculptural Centerpiece", category: "cultural_artifacts", defaultDimensions: [3.8, 1.4, 1.9] },

  // Category 6: Architectural & Environmental Features
  tokonoma_alcove: { id: "tokonoma_alcove", name: "Ceremonial Tokonoma Art Display Alcove", category: "architecture", defaultDimensions: [1.6, 2.2, 0.45] },
  velvet_theatre_curtain: { id: "velvet_theatre_curtain", name: "Heavy Acoustic Ruby Velvet Proscenium Drape", category: "architecture", defaultDimensions: [5.0, 4.5, 0.35] },
  shoji_sliding_screen: { id: "shoji_sliding_screen", name: "Kumiko Lattice Shoji Sliding Partition", category: "architecture", defaultDimensions: [2.4, 2.3, 0.12] },
  acoustic_wall_panel: { id: "acoustic_wall_panel", name: "Hexagonal Slotted Diffusive Wall Module", category: "architecture", defaultDimensions: [1.8, 1.8, 0.14] },
  bamboo_acoustic_screen: { id: "bamboo_acoustic_screen", name: "Vertical Natural Bamboo Acoustic Divider", category: "architecture", defaultDimensions: [2.2, 2.4, 0.15] },
  acoustic_felt_panel: { id: "acoustic_felt_panel", name: "Sculpted Compressed Felt Sound Absorber", category: "architecture", defaultDimensions: [1.6, 2.0, 0.08] },
  woven_area_rug: { id: "woven_area_rug", name: "Heavy Tibetan Wool Floor Acoustic Rug", category: "architecture", defaultDimensions: [3.8, 0.02, 2.8] },
  obsidian_runway_deck: { id: "obsidian_runway_deck", name: "Polished Obsidian Fashion Catwalk Deck", category: "architecture", defaultDimensions: [2.4, 0.25, 14.0] },

  // Category 7: Plants, Botanicals & Water Elements
  olive_tree_planter: { id: "olive_tree_planter", name: "Century Olive Tree in Hand-Thrown Terracotta Urn", category: "plants", defaultDimensions: [1.2, 2.8, 1.2] },
  granite_tsukubai_basin: { id: "granite_tsukubai_basin", name: "Natural Granite Tsukubai Water Basin & Bamboo Flute", category: "plants", defaultDimensions: [0.85, 0.45, 0.85] },
  limestone_fountain: { id: "limestone_fountain", name: "Tiered Carved Limestone Acoustic Water Fountain", category: "plants", defaultDimensions: [1.8, 1.6, 1.8] },
  circular_water_feature: { id: "circular_water_feature", name: "Reflecting Water Mirror Basin", category: "plants", defaultDimensions: [2.6, 0.3, 2.6] },
  marigold_garland_curtain: { id: "marigold_garland_curtain", name: "Cascading Fresh Marigold Garland Floral Curtain", category: "plants", defaultDimensions: [3.0, 3.2, 0.15] },
  japanese_black_pine_bonsai: { id: "japanese_black_pine_bonsai", name: "Sculptural Japanese Black Pine Bonsai", category: "plants", defaultDimensions: [0.9, 1.5, 0.9] },
};
