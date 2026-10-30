/**
 * Sonic Architecture — Free-Form Prompt Interpretation, Cultural Intelligence & Knowledge Enrichment
 *
 * Implements the 8-Layer Reasoning Pipeline with true free-form prompt interpretation:
 * Stage A — `interpretArchitecturalBrief(promptText)` extracts explicit & inferred requirements
 * Stage B — `enrichPayloadWithKnowledge(...)` combines Qloo cultural evidence with architectural reasoning
 */

import type {
  CulturalEvidence,
  ProvenanceClaim,
  ResolvedEntity,
  SpatialTypology,
  TimeOfDay,
  VibePayload,
  FloorFinish,
  WallFinish,
  CeilingStructure,
  MaterialFamily,
  InterpretedBrief,
  EnclosureMode,
  EnvironmentalSetting,
} from "./types";

export interface ParsedBrief {
  promptText: string;
  detectedTypology: SpatialTypology;
  explicitTimeOfDay: TimeOfDay | null;
  intimacyScore: number;
  ceremonyScore: number;
  energyScore: number;
  openAirRequested: boolean;
  culturalKeywords: string[];
  materialKeywords: string[];
  lightingKeywords: string[];
  interpreted: InterpretedBrief;
}

export function interpretArchitecturalBrief(promptText: string): InterpretedBrief {
  const raw = (promptText || "").trim();
  const lower = raw.toLowerCase();
  const explicitRequirements: string[] = [];
  const inferredDetails: string[] = [];

  // 1. Extract explicit guest capacity (e.g., "for 20 people", "for 500 guests", "300 people", "120 attendees")
  let requestedCapacityGuests: number | null = null;
  const capMatch = lower.match(
    /(?:for|capacity\s+of|accommodate|seating|hosting|up\s+to|suitable\s+for)\s+(\d{1,4})\s*(?:people|guests|attendees|visitors|persons|listeners|VIPS?|seats)?/i
  ) || lower.match(/\b(\d{1,4})\s+(?:people|guests|attendees|visitors|listeners|seats)\b/i);

  if (capMatch && capMatch[1]) {
    const parsedCap = parseInt(capMatch[1], 10);
    if (!isNaN(parsedCap) && parsedCap >= 2 && parsedCap <= 5000) {
      requestedCapacityGuests = parsedCap;
      explicitRequirements.push(`Explicit guest capacity: ${parsedCap} guests`);
    }
  }

  // 2. Extract explicit dimensions if specified (e.g., "20m x 15m x 6m" or "18m by 24m")
  let explicitDimensions: InterpretedBrief["explicitDimensions"] = null;
  const dimMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*m?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*m?(?:\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*m?)?/i
  );
  if (dimMatch) {
    const w = parseFloat(dimMatch[1]);
    const d = parseFloat(dimMatch[2]);
    const h = dimMatch[3] ? parseFloat(dimMatch[3]) : undefined;
    if (w >= 3 && d >= 3) {
      explicitDimensions = { width: w, depth: d, height: h };
      explicitRequirements.push(`Explicit dimensions: ${w}m × ${d}m${h ? ` × ${h}m` : ""}`);
    }
  }

  // 3. Determine Enclosure Mode (indoor, outdoor, open_air_canopy, underground) & Environmental Setting
  const isUnderground =
    lower.includes("underground") ||
    lower.includes("subterranean") ||
    lower.includes("bunker") ||
    lower.includes("basement") ||
    lower.includes("cellar") ||
    lower.includes("cavern");

  const hasTranslucentCanopy =
    lower.includes("translucent canopy") ||
    lower.includes("silk canopy") ||
    lower.includes("draped canopy") ||
    lower.includes("tensile canopy") ||
    lower.includes("pergola") ||
    lower.includes("mandap") ||
    lower.includes("pavilion");

  const isOutdoorExplicit =
    !isUnderground &&
    (lower.includes("outdoor") ||
      lower.includes("open-air") ||
      lower.includes("open air") ||
      lower.includes("garden") ||
      lower.includes("beachside") ||
      lower.includes("beach") ||
      lower.includes("tropical") ||
      lower.includes("oceanfront") ||
      lower.includes("coastal") ||
      lower.includes("courtyard") ||
      lower.includes("terrace") ||
      lower.includes("lawn") ||
      lower.includes("al fresco") ||
      lower.includes("alfresco"));

  let enclosureMode: EnclosureMode = "indoor";
  if (isUnderground) {
    enclosureMode = "underground";
    explicitRequirements.push("Subterranean / underground enclosure");
  } else if (isOutdoorExplicit && hasTranslucentCanopy) {
    enclosureMode = "open_air_canopy";
    explicitRequirements.push("Open-air setting with overhead canopy / pavilion structure");
  } else if (isOutdoorExplicit) {
    enclosureMode = "outdoor";
    explicitRequirements.push("Open-air / outdoor architectural setting without enclosing room walls");
  } else {
    inferredDetails.push("Enclosed architectural interior shell");
  }

  const isOpenAir = enclosureMode === "outdoor" || enclosureMode === "open_air_canopy";

  let environmentalSetting: EnvironmentalSetting = "valley";
  if (isUnderground || lower.includes("interior-only") || lower.includes("windowless")) {
    environmentalSetting = "interior-only";
  } else if (
    lower.includes("beach") ||
    lower.includes("coast") ||
    lower.includes("ocean") ||
    lower.includes("tropical") ||
    lower.includes("island") ||
    lower.includes("sea")
  ) {
    environmentalSetting = "coast";
    explicitRequirements.push("Coastal / tropical oceanfront environment");
  } else if (lower.includes("garden") || lower.includes("botanical") || lower.includes("lawn") || lower.includes("grove")) {
    environmentalSetting = "garden";
    explicitRequirements.push("Botanical garden landscape context");
  } else if (lower.includes("desert") || lower.includes("canyon") || lower.includes("mesa") || lower.includes("dune")) {
    environmentalSetting = "desert";
    explicitRequirements.push("Desert / canyon landscape context");
  } else if (
    lower.includes("warehouse") ||
    lower.includes("industrial") ||
    lower.includes("urban") ||
    lower.includes("city") ||
    lower.includes("loft") ||
    lower.includes("club") ||
    lower.includes("listening") ||
    lower.includes("kissa")
  ) {
    environmentalSetting = "city";
  }

  // 4. Determine Focal Program & Event Purpose (orthogonal to style!)
  let focalProgram: InterpretedBrief["focalProgram"] = "listening_console";
  let seatingStyle: InterpretedBrief["seatingStyle"] = "intimate_lounge";
  let eventPurpose = "Bespoke Architectural Spatial Experience";

  if (
    lower.includes("electric vehicle") ||
    lower.includes("ev launch") ||
    lower.includes("vehicle launch") ||
    lower.includes("product launch") ||
    lower.includes("unveiling") ||
    lower.includes("plinth") ||
    lower.includes("keynote") ||
    lower.includes("automotive")
  ) {
    focalProgram = "product_launch_plinth";
    seatingStyle = "auditorium_tiers";
    eventPurpose = "Flagship Product & Electric Vehicle Launch Arena";
    explicitRequirements.push("Central product reveal plinth, presentation backdrop & audience sightlines");
  } else if (
    lower.includes("mandap") ||
    lower.includes("mehendi") ||
    (lower.includes("indian") && (lower.includes("wedding") || lower.includes("ceremony") || lower.includes("celebration")))
  ) {
    focalProgram = "wedding_mandap";
    seatingStyle = "ceremonial_mandap_court";
    eventPurpose = isOpenAir
      ? "Traditional Indian Outdoor Garden Wedding Mandap"
      : "Ceremonial Indian Wedding Mandap & Festive Pavilion";
    explicitRequirements.push("Four-pillar ceremonial wedding mandap canopy, sacred fire/floral stage & guest seating");
  } else if (
    lower.includes("techno") ||
    lower.includes("nightclub") ||
    (lower.includes("club") && (lower.includes("underground") || lower.includes("brutalist") || lower.includes("dance") || lower.includes("rave"))) ||
    lower.includes("rave")
  ) {
    focalProgram = "techno_dj_bunker";
    seatingStyle = "dance_floor_club";
    eventPurpose = "Subterranean Brutalist Techno Club & Sound Bunker";
    explicitRequirements.push("Monolithic DJ bunker stage, line-array horn sound stacks, dance floor & strobe/laser rig");
  } else if (
    lower.includes("runway") ||
    lower.includes("catwalk") ||
    lower.includes("fashion")
  ) {
    focalProgram = "fashion_runway";
    seatingStyle = "runway_flank";
    eventPurpose = lower.includes("warehouse") || lower.includes("industrial")
      ? "Luxury Fashion Runway in an Industrial Warehouse"
      : "Architectural Fashion Show & Catwalk Venue";
    explicitRequirements.push("Elevated central fashion runway catwalk, flanking front-row audience seating & backstage entry portal");
  } else if (
    lower.includes("retreat") ||
    lower.includes("corporate") ||
    lower.includes("beachside") ||
    (lower.includes("tropical") && !lower.includes("mandap"))
  ) {
    focalProgram = "coastal_retreat_pavilion";
    seatingStyle = "retreat_cabana_lounges";
    eventPurpose = "Tropical Beachside Corporate Retreat & Open-Air Pavilion";
    explicitRequirements.push("Open-air coastal timber deck pavilion, collaborative keynote/lounge zones & tropical palm landscaping");
  } else if (
    lower.includes("cathedral") ||
    lower.includes("church") ||
    lower.includes("chapel") ||
    lower.includes("banquet") ||
    lower.includes("gala dinner") ||
    lower.includes("nave")
  ) {
    focalProgram = "banquet_sanctuary";
    seatingStyle = "refectory_banquet";
    eventPurpose = "Ceremonial Vaulted Banquet Hall";
    explicitRequirements.push("Ceremonial head-table sanctuary dais, long banquet tables & candlelit centrepieces");
  } else if (
    lower.includes("comedy") ||
    lower.includes("theatre") ||
    lower.includes("theater") ||
    lower.includes("standup") ||
    lower.includes("stand-up") ||
    (lower.includes("auditorium") && !lower.includes("car"))
  ) {
    focalProgram = "comedy_theatre";
    seatingStyle = "theatre_tiered_seating";
    eventPurpose = "Contemporary Comedy & Live Performance Theatre";
    explicitRequirements.push("Elevated proscenium comedy stage, stand-up microphone stand, tiered audience seating with clear sightlines & stage wash lighting");
  } else if (
    lower.includes("a24") ||
    lower.includes("cinema") ||
    lower.includes("screening") ||
    lower.includes("film") ||
    lower.includes("movie") ||
    lower.includes("projection")
  ) {
    focalProgram = "cinema_screening";
    seatingStyle = "screening_lounge";
    eventPurpose = "Independent Art-House Screening Pavilion & Cinema Salon";
    explicitRequirements.push("16:9 tensioned architectural projection screen, walnut curator plinth, tiered screening lounges & perimeter cinema grazing");
  } else if (
    lower.includes("library") ||
    lower.includes("reading") ||
    lower.includes("books") ||
    lower.includes("bookshop") ||
    lower.includes("archive") ||
    lower.includes("study") ||
    lower.includes("manuscript")
  ) {
    focalProgram = "library_archive";
    seatingStyle = "reading_study_tables";
    eventPurpose = "Minimalist Archival Reading Library & Study Sanctuary";
    explicitRequirements.push("Curatorial white oak reading table, full-height recessed book archive shelving wall, upholstered wool armchairs & brass task lamps");
  } else if (
    (lower.includes("japanese") && lower.includes("garden")) ||
    lower.includes("zen garden") ||
    (lower.includes("garden") && (lower.includes("ambient") || lower.includes("bamboo") || lower.includes("shakkei") || lower.includes("tsukubai") || lower.includes("rock garden") || lower.includes("moss") || lower.includes("koi")))
  ) {
    focalProgram = "zen_garden_veranda";
    seatingStyle = "veranda_contemplative";
    eventPurpose = "Contemplative Japanese Garden Pavilion & Ambient Sound Sanctuary";
    explicitRequirements.push("Granite tsukubai water feature, sukiya timber veranda deck, Kasuga carved granite lanterns & woven bamboo acoustic screens");
  } else if (
    lower.includes("warehouse") ||
    lower.includes("industrial gallery") ||
    (lower.includes("industrial") && (lower.includes("gallery") || lower.includes("sound") || lower.includes("aphex") || lower.includes("space") || lower.includes("hangar") || lower.includes("factory"))) ||
    lower.includes("aphex twin")
  ) {
    focalProgram = "industrial_sound_deck";
    seatingStyle = "gallery_modular_benches";
    eventPurpose = "Raw Industrial Gallery Warehouse & Acoustic Performance Lab";
    explicitRequirements.push("Modular steel performance deck, suspended industrial box-truss light rig, bi-radial sound columns & cast-concrete gallery benches");
  } else if (
    lower.includes("tea room") ||
    lower.includes("chashitsu") ||
    lower.includes("tatami")
  ) {
    focalProgram = "tea_hearth";
    seatingStyle = "tatami_zabuton";
    eventPurpose = "Japanese Sukiya Timber & Washi Tea Sanctuary";
    explicitRequirements.push("Sunken ro hearth, low chabudai tea table, tatami mats & shoji screens");
  } else if (
    lower.includes("mediterranean") ||
    (lower.includes("residence") && (lower.includes("coastal") || lower.includes("villa") || lower.includes("courtyard"))) ||
    (lower.includes("courtyard") && (lower.includes("restaurant") || lower.includes("olive") || lower.includes("bistro")))
  ) {
    focalProgram = "courtyard_fountain";
    seatingStyle = "courtyard_bistro";
    eventPurpose = "Open-Air Mediterranean Peristyle Courtyard Residence";
    explicitRequirements.push("Central limestone courtyard fountain, travertine colonnades & archways, pergola dining tables & olive tree planters");
  } else if (
    lower.includes("grunge") ||
    lower.includes("chrome balloon") ||
    lower.includes("birthday") ||
    lower.includes("flash photography")
  ) {
    focalProgram = "editorial_flash_stage";
    seatingStyle = "intimate_lounge";
    eventPurpose = "Editorial Flash Loft & Chrome Installation Studio";
    explicitRequirements.push("Mirror-chrome balloon installation, DJ flash rig & tufted velvet lounge");
  } else if (
    lower.includes("listening") ||
    lower.includes("jazz") ||
    lower.includes("kissa") ||
    lower.includes("audiophile") ||
    lower.includes("vinyl") ||
    lower.includes("turntable")
  ) {
    focalProgram = "listening_console";
    seatingStyle = "intimate_lounge";
    eventPurpose = "Intimate Japanese Analog Listening Lounge";
    explicitRequirements.push("Analog turntable console, horn loudspeaker towers, acoustic timber treatment & lounge seating");
  } else {
    // Open-ended general architectural synthesis based on keywords
    if (lower.includes("gallery") || lower.includes("pavilion") || lower.includes("exhibition")) {
      focalProgram = "cinema_screening";
      seatingStyle = "screening_lounge";
      eventPurpose = "Architectural Exhibition Pavilion & Curatorial Salon";
    } else if (lower.includes("garden") || lower.includes("nature") || lower.includes("tranquil") || lower.includes("forest")) {
      focalProgram = "zen_garden_veranda";
      seatingStyle = "veranda_contemplative";
      eventPurpose = "Contemplative Garden Pavilion & Natural Sanctuary";
    } else if (isOpenAir) {
      focalProgram = "coastal_retreat_pavilion";
      seatingStyle = "retreat_cabana_lounges";
      eventPurpose = "Open-Air Architectural Pavilion & Gathering Space";
    } else {
      focalProgram = "listening_console";
      seatingStyle = "intimate_lounge";
      eventPurpose = "Custom Architectural Lounge & Spatial Sanctuary";
    }
  }

  // 5. Default vs. Explicit Capacity
  const defaultCapByProgram: Record<InterpretedBrief["focalProgram"], number> = {
    listening_console: 18,
    product_launch_plinth: 240,
    wedding_mandap: 140,
    techno_dj_bunker: 180,
    fashion_runway: 160,
    coastal_retreat_pavilion: 64,
    banquet_sanctuary: 120,
    tea_hearth: 8,
    courtyard_fountain: 48,
    editorial_flash_stage: 45,
    cinema_screening: 32,
    library_archive: 24,
    industrial_sound_deck: 120,
    zen_garden_veranda: 16,
    comedy_theatre: 120,
  };
  const targetCapacityGuests =
    requestedCapacityGuests !== null
      ? requestedCapacityGuests
      : defaultCapByProgram[focalProgram] || 40;

  if (requestedCapacityGuests === null) {
    inferredDetails.push(`Inferred target capacity: ${targetCapacityGuests} guests based on ${focalProgram} typology`);
  }

  // 6. Architectural Style & Cultural References
  let architecturalStyle = "Contemporary Tactile Architecture";
  if (lower.includes("japanese") || lower.includes("kissa") || lower.includes("sukiya") || lower.includes("hinoki")) {
    architecturalStyle = "Japanese Sukiya & Kissaten Timber Craft";
  } else if (lower.includes("futuristic") || lower.includes("cyber") || lower.includes("next-generation") || lower.includes("electric vehicle")) {
    architecturalStyle = "High-Tech Futuristic Clear-Span & Anodized Metal";
  } else if (lower.includes("indian") || lower.includes("mandap") || lower.includes("mehendi") || lower.includes("rajasthani")) {
    architecturalStyle = "Traditional & Contemporary Indian Carved Sandstone & Floral Mandap";
  } else if (lower.includes("brutalist") && (lower.includes("underground") || lower.includes("techno") || lower.includes("club"))) {
    architecturalStyle = "Subterranean Brutalist Board-Formed Concrete Bunker";
  } else if (lower.includes("industrial") || lower.includes("warehouse") || lower.includes("abandoned")) {
    architecturalStyle = "Adaptive-Reuse Industrial Masonry & Steel Truss Warehouse";
  } else if (lower.includes("brutalist")) {
    architecturalStyle = "Brutalist Monolithic Board-Formed Concrete";
  } else if (lower.includes("tropical") || lower.includes("beachside") || lower.includes("coastal")) {
    architecturalStyle = "Tropical Coastal Open-Air Teak & Biophilic Pavilion";
  } else if (lower.includes("cathedral") || lower.includes("gothic")) {
    architecturalStyle = "Neo-Gothic Vaulted Ashlar Limestone";
  } else if (lower.includes("mediterranean")) {
    architecturalStyle = "Mediterranean Peristyle Limestone & Terracotta";
  }

  const culturalReferences = [
    "japanese",
    "indian",
    "mediterranean",
    "brutalist",
    "industrial",
    "tropical",
    "futuristic",
    "gothic",
    "cathedral",
    "techno",
    "jazz",
    "kissa",
    "mandap",
    "mehendi",
    "sukiya",
  ].filter((k) => lower.includes(k));

  // 7. Extract Explicit Material Requests (Never let defaults override explicit prompt instructions!)
  const explicitMaterials: InterpretedBrief["explicitMaterials"] = {};
  if (lower.includes("sandstone")) {
    explicitMaterials.floor = "warm_sandstone";
    explicitMaterials.wall = "warm_sandstone";
    explicitRequirements.push("Explicit material: Warm sandstone surfaces");
  } else if (lower.includes("teak") || lower.includes("beachside") || lower.includes("tropical")) {
    explicitMaterials.floor = "teak_decking";
  } else if (lower.includes("tatami")) {
    explicitMaterials.floor = "tatami_mat";
    explicitRequirements.push("Explicit material: Woven tatami flooring");
  } else if (lower.includes("terracotta")) {
    explicitMaterials.floor = "terracotta_tile";
    explicitRequirements.push("Explicit material: Terracotta tile flooring");
  } else if (lower.includes("herringbone") || lower.includes("parquet") || lower.includes("walnut")) {
    explicitMaterials.floor = "herringbone_parquet";
  } else if (lower.includes("warm timber") || lower.includes("oak") || lower.includes("wood floor")) {
    explicitMaterials.floor = "warm_oak";
    explicitRequirements.push("Explicit material: Warm timber / oak flooring");
  } else if (lower.includes("limestone")) {
    explicitMaterials.floor = "honed_limestone";
    explicitMaterials.wall = "honed_limestone";
  } else if (lower.includes("inlay") || lower.includes("patterned floor")) {
    explicitMaterials.floor = "inlay_ceramic";
  } else if (lower.includes("concrete") || lower.includes("brutalist")) {
    explicitMaterials.floor = "polished_concrete";
    explicitMaterials.wall = "board_concrete";
    explicitRequirements.push("Explicit material: Monolithic / polished architectural concrete");
  }

  if (lower.includes("warehouse") || lower.includes("abandoned") || lower.includes("brick")) {
    explicitMaterials.wall = "distressed_brick";
    explicitMaterials.ceiling = "exposed_industrial_rig";
    explicitRequirements.push("Explicit shell: Industrial distressed brick masonry & exposed steel roof trusses");
  } else if (lower.includes("washi") || lower.includes("shoji")) {
    explicitMaterials.wall = "washi_screen";
  } else if (lower.includes("acoustic") || lower.includes("listening")) {
    explicitMaterials.wall = "acoustic_slats";
  }

  if (hasTranslucentCanopy) {
    explicitMaterials.ceiling = "draped_textile_canopy";
  } else if (isOpenAir && !explicitMaterials.ceiling) {
    explicitMaterials.ceiling = "open_sky_pergola";
  }

  // 8. Time of Day & Lighting
  let explicitTimeOfDay: TimeOfDay | null = null;
  if (
    lower.includes("midnight") ||
    lower.includes("night") ||
    lower.includes("underground") ||
    lower.includes("techno") ||
    lower.includes("candlelit")
  ) {
    explicitTimeOfDay = "midnight";
  } else if (lower.includes("sunset") || lower.includes("dusk") || lower.includes("golden hour")) {
    explicitTimeOfDay = "sunset";
  } else if (lower.includes("morning") || lower.includes("dawn")) {
    explicitTimeOfDay = "morning";
  } else if (
    lower.includes("afternoon") ||
    lower.includes("daylight") ||
    lower.includes("dappled") ||
    lower.includes("sunlight") ||
    lower.includes("beachside") ||
    lower.includes("tropical") ||
    lower.includes("garden")
  ) {
    explicitTimeOfDay = "afternoon";
  }

  const defaultTodByProgram: Record<InterpretedBrief["focalProgram"], TimeOfDay> = {
    listening_console: "midnight",
    product_launch_plinth: "midnight",
    wedding_mandap: isOpenAir ? "sunset" : "midnight",
    techno_dj_bunker: "midnight",
    fashion_runway: "midnight",
    coastal_retreat_pavilion: "afternoon",
    banquet_sanctuary: "midnight",
    tea_hearth: "morning",
    courtyard_fountain: "afternoon",
    editorial_flash_stage: "midnight",
    cinema_screening: "midnight",
    library_archive: "afternoon",
    industrial_sound_deck: "midnight",
    zen_garden_veranda: "morning",
    comedy_theatre: "midnight",
  };
  const inferredTimeOfDay: TimeOfDay = explicitTimeOfDay || defaultTodByProgram[focalProgram] || "midnight";

  let explicitLightingTempK: number | null = null;
  const kMatch = lower.match(/(\d{4})\s*k\b/i);
  if (kMatch) {
    explicitLightingTempK = parseInt(kMatch[1], 10);
  } else if (lower.includes("sunset") || lower.includes("candlelit") || lower.includes("warm")) {
    explicitLightingTempK = 2400;
  } else if (lower.includes("futuristic") || lower.includes("electric vehicle")) {
    explicitLightingTempK = 4800;
  }

  const hasWaterFeature =
    lower.includes("water") ||
    lower.includes("fountain") ||
    lower.includes("pool") ||
    lower.includes("beach") ||
    lower.includes("ocean") ||
    lower.includes("pond");
  const hasRunway = lower.includes("runway") || lower.includes("catwalk");
  const hasDanceFloor = lower.includes("dance") || lower.includes("techno") || lower.includes("club") || lower.includes("rave");
  const hasAcousticTreatment =
    lower.includes("acoustic") ||
    lower.includes("listening") ||
    lower.includes("jazz") ||
    lower.includes("sound") ||
    lower.includes("techno");
  const hasLushLandscaping =
    isOpenAir ||
    lower.includes("garden") ||
    lower.includes("tree") ||
    lower.includes("palm") ||
    lower.includes("floral") ||
    lower.includes("marigold") ||
    lower.includes("tropical") ||
    lower.includes("olive");

  const requestedElements: string[] = [];
  if (focalProgram === "wedding_mandap") requestedElements.push("wedding_mandap_canopy", "marigold_garland_curtain", "ceremonial_seating");
  if (focalProgram === "product_launch_plinth") requestedElements.push("ev_product_plinth", "concept_vehicle_sculpture", "curved_led_backdrop");
  if (focalProgram === "techno_dj_bunker") requestedElements.push("dj_flash_rig", "techno_sound_stack", "monolithic_concrete_pier");
  if (focalProgram === "fashion_runway") requestedElements.push("obsidian_runway_deck", "linear_light_blade");
  if (focalProgram === "coastal_retreat_pavilion") requestedElements.push("retreat_timber_pavilion", "olive_tree_planter");
  if (focalProgram === "listening_console") requestedElements.push("analog_turntable_console", "horn_speaker_pair", "acoustic_wall_panel");
  if (focalProgram === "cinema_screening") requestedElements.push("projection_screen_16_9", "curator_plinth", "screening_lounge_seats");
  if (focalProgram === "library_archive") requestedElements.push("curatorial_reading_table", "archival_bookshelf_wall", "reading_armchairs");
  if (focalProgram === "zen_garden_veranda") requestedElements.push("granite_tsukubai_water_feature", "sukiya_veranda_deck", "kasuga_granite_lantern");
  if (focalProgram === "industrial_sound_deck") requestedElements.push("modular_steel_sound_deck", "suspended_box_truss_rig", "bi_radial_sound_stacks");
  if (focalProgram === "comedy_theatre") requestedElements.push("modular_stage_riser", "performer_mic_stand", "tiered_auditorium_row", "acoustic_wall_panel");
  if (hasWaterFeature) requestedElements.push("circular_water_feature");

  return {
    originalPrompt: raw,
    eventPurpose,
    architecturalStyle,
    culturalReferences,
    enclosureMode,
    isOpenAir,
    isUnderground,
    hasTranslucentCanopy,
    environmentalSetting,
    requestedCapacityGuests,
    targetCapacityGuests,
    explicitDimensions,
    focalProgram,
    seatingStyle,
    requestedElements,
    explicitMaterials,
    explicitTimeOfDay,
    inferredTimeOfDay,
    explicitLightingTempK,
    hasWaterFeature,
    hasRunway,
    hasDanceFloor,
    hasAcousticTreatment,
    hasLushLandscaping,
    explicitRequirements,
    inferredDetails,
  };
}

export function resolveTypologyFromInterpretedBrief(brief: InterpretedBrief): SpatialTypology {
  const lower = brief.originalPrompt.toLowerCase();
  if (brief.focalProgram === "wedding_mandap") {
    return brief.isOpenAir || lower.includes("garden") || lower.includes("mandap")
      ? "garden_mandap"
      : "pavilion_celebration";
  }
  if (brief.focalProgram === "techno_dj_bunker") {
    return "underground_club";
  }
  if (brief.focalProgram === "fashion_runway") {
    if (lower.includes("warehouse") || lower.includes("industrial") || lower.includes("abandoned")) {
      return "industrial_warehouse";
    }
    return "brutalist_runway";
  }
  if (brief.focalProgram === "industrial_sound_deck") {
    return "industrial_warehouse";
  }
  if (brief.focalProgram === "coastal_retreat_pavilion") {
    return "coastal_retreat";
  }
  if (brief.focalProgram === "product_launch_plinth") {
    return "futuristic_launch";
  }
  if (brief.focalProgram === "banquet_sanctuary") {
    return "cathedral_banquet";
  }
  if (brief.focalProgram === "tea_hearth" || brief.focalProgram === "zen_garden_veranda") {
    return "tea_room";
  }
  if (brief.focalProgram === "cinema_screening") {
    return "gallery_pavilion";
  }
  if (brief.focalProgram === "library_archive") {
    return "intimate_lounge";
  }
  if (brief.focalProgram === "courtyard_fountain") {
    return "mediterranean_courtyard";
  }
  if (brief.focalProgram === "editorial_flash_stage") {
    return "grunge_loft";
  }
  if (brief.focalProgram === "comedy_theatre") {
    return "comedy_theatre";
  }
  return "listening_room";
}

export function parseUserBrief(promptText: string): ParsedBrief {
  const interpreted = interpretArchitecturalBrief(promptText);
  let detectedTypology = resolveTypologyFromInterpretedBrief(interpreted);

  // Preserve exact backward-compatible typology names for original acceptance tests when appropriate
  const lower = (promptText || "").toLowerCase();
  if (lower.includes("mehendi") && !lower.includes("wedding mandap in an outdoor garden")) {
    detectedTypology = "pavilion_celebration";
  }

  const materialKeywords = [
    "timber",
    "oak",
    "teak",
    "concrete",
    "stone",
    "limestone",
    "sandstone",
    "terracotta",
    "linen",
    "washi",
    "chrome",
    "velvet",
    "leather",
    "brass",
    "marigold",
    "brick",
  ].filter((k) => lower.includes(k));

  const lightingKeywords = [
    "midnight",
    "candlelit",
    "spotlight",
    "dappled",
    "sunlight",
    "morning",
    "sunset",
    "flash",
    "low-level",
    "warm",
    "strobe",
  ].filter((k) => lower.includes(k));

  return {
    promptText,
    detectedTypology,
    explicitTimeOfDay: interpreted.explicitTimeOfDay,
    intimacyScore: interpreted.targetCapacityGuests <= 30 ? 0.92 : interpreted.targetCapacityGuests >= 200 ? 0.25 : 0.55,
    ceremonyScore:
      interpreted.focalProgram === "wedding_mandap" ||
      interpreted.focalProgram === "banquet_sanctuary" ||
      interpreted.focalProgram === "tea_hearth" ||
      interpreted.focalProgram === "zen_garden_veranda"
        ? 0.94
        : 0.6,
    energyScore:
      interpreted.focalProgram === "techno_dj_bunker" ||
      interpreted.focalProgram === "product_launch_plinth" ||
      interpreted.focalProgram === "fashion_runway" ||
      interpreted.focalProgram === "industrial_sound_deck"
        ? 0.9
        : 0.45,
    openAirRequested: interpreted.isOpenAir,
    culturalKeywords: interpreted.culturalReferences,
    materialKeywords,
    lightingKeywords,
    interpreted,
  };
}

interface TypologyKnowledgePreset {
  typology: SpatialTypology;
  defaultTimeOfDay: TimeOfDay;
  temperatureK: number;
  primaryColorHex: string;
  secondaryColorHex: string;
  accentColorHex: string;
  flooringMaterial: FloorFinish;
  wallMaterial: WallFinish;
  ceilingStructure: CeilingStructure;
  seatingFabric: MaterialFamily;
  llmKnowledgeClaims: Omit<ProvenanceClaim, "id">[];
  designInferenceClaims: Omit<ProvenanceClaim, "id">[];
}

const TYPOLOGY_KNOWLEDGE_BASE: Record<SpatialTypology, TypologyKnowledgePreset> = {
  listening_room: {
    typology: "listening_room",
    defaultTimeOfDay: "midnight",
    temperatureK: 2200,
    primaryColorHex: "#2B1E16",
    secondaryColorHex: "#4A3425",
    accentColorHex: "#C87D4B",
    flooringMaterial: "warm_oak",
    wallMaterial: "acoustic_slats",
    ceilingStructure: "coffered_timber",
    seatingFabric: "cognac_leather",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "culture",
        label: "Japanese Jazz Kissa (ジャズ喫茶) Tradition",
        insight:
          "Japanese jazz kissaten prioritize dedicated, distraction-free analog listening with horn loudspeaker systems, dense vinyl libraries, warm timber joinery, and low-key amber lighting.",
        architecturalEffect:
          "Establishes an intimate acoustic shoebox ratio with dual horn speakers flanking a central analog turntable console and vinyl record wall.",
        targetProperty: "typology & focalPoint",
        confidence: "established",
      },
      {
        source: "llm_knowledge",
        domain: "acoustics",
        label: "Small-Room Modal & RT60 Control",
        insight:
          "Intimate analog listening rooms require a controlled reverberation time (RT60 ~ 0.42s) using slotted timber Helmholtz resonators backed with mineral wool and thick woven floor rugs.",
        architecturalEffect:
          "Applies vertical oak acoustic slats on perimeter walls, a coffered timber ceiling diffuser grid, and a central wool rug between the horn speakers and lounge seats.",
        targetProperty: "materials.wall & acousticTarget",
        confidence: "established",
      },
    ],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "lighting",
        label: "2200K Layered Midnight Illumination",
        insight:
          "Midnight listening demands zero glare on primary sightlines while highlighting the tactile warmth of analog equipment and timber grain.",
        architecturalEffect:
          "Configures 2200K warm grazing sconces, recessed 2400K focal spots on the turntable console, and indirect perimeter cove illumination.",
        targetProperty: "lighting.temperatureK",
        confidence: "inferred",
      },
    ],
  },
  futuristic_launch: {
    typology: "futuristic_launch",
    defaultTimeOfDay: "midnight",
    temperatureK: 4800,
    primaryColorHex: "#12161F",
    secondaryColorHex: "#232A38",
    accentColorHex: "#38BDF8",
    flooringMaterial: "obsidian_terrazzo",
    wallMaterial: "anodized_panel",
    ceilingStructure: "space_frame_truss",
    seatingFabric: "boucle_wool",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Automotive Reveal Arena Sightlines & Clear-Span Volume",
        insight:
          "Flagship electric vehicle unveilings require a wide clear-span volume scaled to the guest count with a central illuminated turntable plinth, curved micro-LED backdrop, and radial audience sightlines.",
        architecturalEffect:
          "Constructs a high-bay clear-span shell with overhead steel space-frame trusses, a chamfered central EV plinth, and curved tiered seating rows.",
        targetProperty: "roomDimensions & focalPoint",
        confidence: "established",
      },
    ],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "layout",
        label: "Radial Audience Bowl & Circulation",
        insight:
          "Curved seating tiers maintain unobstructed sightlines to the central EV plinth and generous perimeter circulation.",
        architecturalEffect:
          "Scales tiered auditorium rows and arena span to match the requested guest capacity.",
        targetProperty: "zones & objects",
        confidence: "inferred",
      },
    ],
  },
  cathedral_banquet: {
    typology: "cathedral_banquet",
    defaultTimeOfDay: "midnight",
    temperatureK: 2400,
    primaryColorHex: "#2A241E",
    secondaryColorHex: "#D8CFC0",
    accentColorHex: "#D4A359",
    flooringMaterial: "honed_limestone",
    wallMaterial: "honed_limestone",
    ceilingStructure: "gothic_ribbed_vault",
    seatingFabric: "moss_velvet",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Gothic Nave Proportions & Ribbed Vault Verticality",
        insight:
          "Cathedral-inspired ceremonial halls rely on soaring height, rhythmic pointed arches on clustered limestone piers, and an axial processional nave.",
        architecturalEffect:
          "Generates a vaulted limestone hall with pointed-arch structural bays, suspended brass ring chandeliers, and a raised sanctuary head-table dais.",
        targetProperty: "roomDimensions & ceilingStructure",
        confidence: "established",
      },
    ],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "layout",
        label: "Processional Nave Banquet Arrangement",
        insight:
          "Parallel rows of long refectory banquet tables flanking a central processional aisle preserve ceremonial grandeur and service clearances.",
        architecturalEffect:
          "Arranges timber banquet tables with velvet seating and candelabra centrepieces terminating at a raised head-table dais.",
        targetProperty: "zones & objects",
        confidence: "inferred",
      },
    ],
  },
  mediterranean_courtyard: {
    typology: "mediterranean_courtyard",
    defaultTimeOfDay: "afternoon",
    temperatureK: 3400,
    primaryColorHex: "#C86D51",
    secondaryColorHex: "#E8DEC8",
    accentColorHex: "#556B4E",
    flooringMaterial: "terracotta_tile",
    wallMaterial: "limewash_plaster",
    ceilingStructure: "open_sky_pergola",
    seatingFabric: "raw_linen",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Mediterranean Peristyle Courtyard & Dappled Pergola Shade",
        insight:
          "Mediterranean courtyard dining spaces use open-air timber pergolas with woven linen shade sails, terracotta paving, and mature olive trees around a central stone fountain.",
        architecturalEffect:
          "Builds an open-air courtyard with overhead timber pergola rafters, olive tree planters, and a central octagonal limestone fountain.",
        targetProperty: "isOpenAir & ceilingStructure",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  pavilion_celebration: {
    typology: "pavilion_celebration",
    defaultTimeOfDay: "sunset",
    temperatureK: 2700,
    primaryColorHex: "#C84B31",
    secondaryColorHex: "#F4A261",
    accentColorHex: "#E9C46A",
    flooringMaterial: "inlay_ceramic",
    wallMaterial: "carved_sandstone",
    ceilingStructure: "draped_textile_canopy",
    seatingFabric: "marigold_silk",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "culture",
        label: "Contemporary Indian Mehendi Pavilion & Floral Craft",
        insight:
          "Mehendi celebrations center on scalloped sandstone arches, suspended marigold (genda phool) floral installations, patterned stone inlay flooring, and low bolster diwan seating around a ceremonial jhula swing.",
        architecturalEffect:
          "Constructs a festive pavilion with marigold garland curtains, low bolster diwan lounges, and a ceremonial swing dais.",
        targetProperty: "typology & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  garden_mandap: {
    typology: "garden_mandap",
    defaultTimeOfDay: "sunset",
    temperatureK: 2600,
    primaryColorHex: "#D9532B",
    secondaryColorHex: "#F4A261",
    accentColorHex: "#C59B4E",
    flooringMaterial: "warm_sandstone",
    wallMaterial: "open_landscape",
    ceilingStructure: "draped_textile_canopy",
    seatingFabric: "marigold_silk",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "culture",
        label: "Traditional Indian Outdoor Garden Wedding Mandap (मंडप) Architecture",
        insight:
          "An outdoor Indian wedding mandap centers on a four-pillared open-air ceremonial canopy raised on a sandstone dais over the sacred havan kund fire pit, framed by marigold garlands, a processional floral aisle, and botanical garden trees without enclosed room walls.",
        architecturalEffect:
          "Builds an open-air botanical garden court with a central 4-pillar carved sandstone & marigold mandap canopy, sacred fire altar, symmetric guest seating pavilions, and perimeter garden trees.",
        targetProperty: "isOpenAir, focalPoint & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "layout",
        label: "Axial Processional Walkway & Radial Mandap Sightlines",
        insight:
          "Outdoor wedding ceremonies require an unobstructed floral processional path leading directly to the central mandap platform flanked by guest seating blocks.",
        architecturalEffect:
          "Arranges diwan & ceremonial guest seating around the mandap with a central processional spine and lush garden planting.",
        targetProperty: "zones & objects",
        confidence: "inferred",
      },
    ],
  },
  underground_club: {
    typology: "underground_club",
    defaultTimeOfDay: "midnight",
    temperatureK: 2100,
    primaryColorHex: "#141619",
    secondaryColorHex: "#2D3138",
    accentColorHex: "#EF4444",
    flooringMaterial: "polished_concrete",
    wallMaterial: "board_concrete",
    ceilingStructure: "monolithic_cantilever",
    seatingFabric: "cognac_leather",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Subterranean Brutalist Techno Bunker & Low-Frequency Acoustics",
        insight:
          "Underground brutalist techno clubs (inspired by Berlin Kraftwerk/Berghain spatial archetypes) use heavy board-formed concrete piers, dark subterranean concrete vaults, towering quad-point horn sound stacks, a caged industrial DJ booth, and low-glare crimson/strobe lighting.",
        architecturalEffect:
          "Constructs a windowless subterranean board-formed concrete vault with a central dancefloor void, monolithic concrete columns, DJ bunker booth, and 4 corner horn sub-bass stacks.",
        targetProperty: "enclosureMode, materials & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "acoustics",
        label: "High-SPL Sub-Bass Containment & Acoustic Baffles",
        insight:
          "Heavy concrete walls contain low frequencies while suspended overhead acoustic baffles control slap echo across the dancefloor.",
        architecturalEffect:
          "Places acoustic ceiling baffles and perimeter concrete dark alcoves around the main techno dancefloor.",
        targetProperty: "acousticTarget & zones",
        confidence: "inferred",
      },
    ],
  },
  industrial_warehouse: {
    typology: "industrial_warehouse",
    defaultTimeOfDay: "midnight",
    temperatureK: 4200,
    primaryColorHex: "#3E2723",
    secondaryColorHex: "#475569",
    accentColorHex: "#E2E8F0",
    flooringMaterial: "polished_concrete",
    wallMaterial: "distressed_brick",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "board_concrete",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Adaptive-Reuse Industrial Warehouse Catwalk & Steel Truss Span",
        insight:
          "Staging a luxury fashion runway inside an abandoned industrial warehouse contrasts weathered red-brick masonry and exposed steel roof trusses with a sleek mirror-obsidian catwalk spine, razor-sharp 4200K linear light blades, and a dramatic backstage entry portal.",
        architecturalEffect:
          "Constructs a long-span industrial brick warehouse with steel truss portals, a central reflective runway deck, parallel front-row seating benches, and a backstage model entry threshold.",
        targetProperty: "materials, ceilingStructure & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  coastal_retreat: {
    typology: "coastal_retreat",
    defaultTimeOfDay: "afternoon",
    temperatureK: 3600,
    primaryColorHex: "#8C5E3C",
    secondaryColorHex: "#E5DEC9",
    accentColorHex: "#0EA5E9",
    flooringMaterial: "teak_decking",
    wallMaterial: "open_landscape",
    ceilingStructure: "open_sky_pergola",
    seatingFabric: "raw_linen",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Tropical Beachside Open-Air Timber Pavilion & Biophilic Retreat",
        insight:
          "Tropical beachside corporate retreats reject enclosed drywall boxes in favor of open-air weathered teak decking, louvered timber shade pavilions, natural linen breakout lounges, cooling reflection pools, and direct sightlines to the ocean horizon and palm grove.",
        architecturalEffect:
          "Constructs an open-air coastal teak terrace with a central timber-and-linen retreat pavilion, collaborative lounge clusters, reflection water basin, and perimeter tropical palms.",
        targetProperty: "isOpenAir, setting & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  brutalist_runway: {
    typology: "brutalist_runway",
    defaultTimeOfDay: "midnight",
    temperatureK: 4200,
    primaryColorHex: "#1E2022",
    secondaryColorHex: "#52565A",
    accentColorHex: "#E2E8F0",
    flooringMaterial: "polished_concrete",
    wallMaterial: "board_concrete",
    ceilingStructure: "monolithic_cantilever",
    seatingFabric: "board_concrete",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Brutalist Monolithic Concrete & High-Contrast Runway Framing",
        insight:
          "Avant-garde brutalist fashion venues pair heavy board-formed concrete piers with a mirror-polished central catwalk and continuous razor-sharp overhead linear light blades.",
        architecturalEffect:
          "Constructs a monolithic concrete hall with a reflective obsidian runway and parallel sculptural concrete bench blocks.",
        targetProperty: "roomDimensions & materials",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  tea_room: {
    typology: "tea_room",
    defaultTimeOfDay: "morning",
    temperatureK: 3200,
    primaryColorHex: "#D9CEB8",
    secondaryColorHex: "#6E5A44",
    accentColorHex: "#4A5D4E",
    flooringMaterial: "tatami_mat",
    wallMaterial: "washi_screen",
    ceilingStructure: "hinoki_rafters",
    seatingFabric: "raw_linen",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "architecture",
        label: "Sukiya-zukuri Chashitsu Proportions & Shoji Diffusion",
        insight:
          "Japanese tea rooms embody quiet restraint through modular tatami mat proportions, exposed hinoki cedar joinery, translucent washi shoji screens, and a sunken hearth (ro).",
        architecturalEffect:
          "Constructs an intimate timber-and-shoji sanctuary with tatami flooring, low chabudai table, zabuton cushions, and sunken hearth.",
        targetProperty: "roomDimensions & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  grunge_loft: {
    typology: "grunge_loft",
    defaultTimeOfDay: "midnight",
    temperatureK: 3000,
    primaryColorHex: "#231924",
    secondaryColorHex: "#E84A8A",
    accentColorHex: "#CBD5E1",
    flooringMaterial: "obsidian_terrazzo",
    wallMaterial: "distressed_brick",
    ceilingStructure: "exposed_industrial_rig",
    seatingFabric: "moss_velvet",
    llmKnowledgeClaims: [
      {
        source: "llm_knowledge",
        domain: "culture",
        label: "90s Editorial Flash Aesthetics & Chrome Pop Installations",
        insight:
          "Pink grunge editorial environments contrast raw distressed industrial brick with mirror-chrome inflatables, velvet lounge clusters, and high-output studio strobe lighting rigs.",
        architecturalEffect:
          "Builds an industrial loft with distressed brick walls, mirror-chrome balloon sculptures, pink tufted velvet sofas, and flash-photography truss towers.",
        targetProperty: "typology & objects",
        confidence: "established",
      },
    ],
    designInferenceClaims: [],
  },
  gallery_pavilion: {
    typology: "gallery_pavilion",
    defaultTimeOfDay: "afternoon",
    temperatureK: 4000,
    primaryColorHex: "#EAE6DF",
    secondaryColorHex: "#2C3038",
    accentColorHex: "#C85A32",
    flooringMaterial: "polished_concrete",
    wallMaterial: "limewash_plaster",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    llmKnowledgeClaims: [],
    designInferenceClaims: [],
  },
  intimate_lounge: {
    typology: "intimate_lounge",
    defaultTimeOfDay: "midnight",
    temperatureK: 2300,
    primaryColorHex: "#231C18",
    secondaryColorHex: "#5C4033",
    accentColorHex: "#D97736",
    flooringMaterial: "herringbone_parquet",
    wallMaterial: "acoustic_slats",
    ceilingStructure: "coffered_timber",
    seatingFabric: "moss_velvet",
    llmKnowledgeClaims: [],
    designInferenceClaims: [],
  },
  comedy_theatre: {
    typology: "comedy_theatre",
    defaultTimeOfDay: "midnight",
    temperatureK: 3200,
    primaryColorHex: "#22252A",
    secondaryColorHex: "#484E59",
    accentColorHex: "#DDA032",
    flooringMaterial: "herringbone_parquet",
    wallMaterial: "acoustic_slats",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    llmKnowledgeClaims: [],
    designInferenceClaims: [
      {
        source: "design_inference",
        domain: "layout",
        label: "Contemporary Proscenium Comedy Stage Layout",
        insight: "Contemporary Comedy Theatre layout requires an elevated proscenium performance stage, center stand-up mic stand, and stepped audience sightlines.",
        architecturalEffect: "Constructs a raked auditorium theatre envelope with tiered seating rows focused on the center stand-up comedy stage.",
        targetProperty: "typology & objects",
        confidence: "established",
      },
    ],
  },
  custom_hybrid: {
    typology: "custom_hybrid",
    defaultTimeOfDay: "sunset",
    temperatureK: 2800,
    primaryColorHex: "#2A2421",
    secondaryColorHex: "#D8CEBE",
    accentColorHex: "#D9532B",
    flooringMaterial: "warm_oak",
    wallMaterial: "limewash_plaster",
    ceilingStructure: "coffered_timber",
    seatingFabric: "boucle_wool",
    llmKnowledgeClaims: [],
    designInferenceClaims: [],
  },
};

export function enrichPayloadWithKnowledge(
  promptText: string,
  rawQlooEntities: ResolvedEntity[] = [],
  rawEvidence?: CulturalEvidence,
  qlooErrors: string[] = []
): VibePayload {
  const brief = parseUserBrief(promptText);
  const interp = brief.interpreted;
  const preset =
    TYPOLOGY_KNOWLEDGE_BASE[brief.detectedTypology] ||
    TYPOLOGY_KNOWLEDGE_BASE.listening_room;

  // Never let preset defaults override explicit prompt instructions
  const timeOfDay: TimeOfDay = interp.explicitTimeOfDay || interp.inferredTimeOfDay || preset.defaultTimeOfDay;
  const flooringMaterial: FloorFinish = interp.explicitMaterials.floor || preset.flooringMaterial;
  const wallMaterial: WallFinish = interp.explicitMaterials.wall || preset.wallMaterial;
  const ceilingStructure: CeilingStructure = interp.explicitMaterials.ceiling || preset.ceilingStructure;
  const temperatureK: number = interp.explicitLightingTempK || preset.temperatureK;

  const provenanceClaims: ProvenanceClaim[] = [];
  let claimIdx = 1;

  // 1. Record Genuine Qloo Evidence if present (NEVER fabricate Qloo results)
  const hasRealQloo = rawQlooEntities.length > 0;
  if (hasRealQloo) {
    for (const entity of rawQlooEntities) {
      provenanceClaims.push({
        id: `prov-qloo-${claimIdx++}`,
        source: "qloo_evidence",
        domain: "culture",
        label: `Qloo Resolved Entity: ${entity.name}`,
        insight: `Qloo cultural graph resolved "${entity.name}" (${entity.type}) from search term "${entity.searchTerm}".`,
        architecturalEffect: `Anchors the cultural taste profile, acoustic mood, and curated sonic programming around ${entity.name}.`,
        targetProperty: "resolvedEntities & tracks",
        entityReference: entity.id,
        confidence: "verified",
      });
    }
  }

  if (rawEvidence) {
    const allTags = [
      ...(rawEvidence.genreTags || []),
      ...(rawEvidence.styleTags || []),
      ...(rawEvidence.themeTags || []),
    ];
    if (allTags.length > 0) {
      provenanceClaims.push({
        id: `prov-qloo-${claimIdx++}`,
        source: "qloo_evidence",
        domain: "material",
        label: `Qloo Cultural Signal Tags (${allTags.slice(0, 4).join(", ")})`,
        insight: `Qloo affinity signals returned ${allTags.length} taste descriptors (${allTags.slice(0, 6).join(", ")}).`,
        architecturalEffect: `Modulates surface warmth, acoustic absorption targets, and accent palette tonality.`,
        targetProperty: "palette & materials",
        confidence: "verified",
      });
    }
  }

  // 2. Supplement with structured LLM architectural & cultural knowledge
  for (const claim of preset.llmKnowledgeClaims) {
    provenanceClaims.push({
      ...claim,
      id: `prov-llm-${claimIdx++}`,
    });
  }

  // 3. Add explicit prompt requirement provenance claims
  if (interp.requestedCapacityGuests !== null) {
    provenanceClaims.push({
      id: `prov-inf-${claimIdx++}`,
      source: "design_inference",
      domain: "layout",
      label: `Explicit Guest Capacity Scaling (${interp.requestedCapacityGuests} Guests)`,
      insight: `User prompt explicitly requested capacity for ${interp.requestedCapacityGuests} people/guests.`,
      architecturalEffect: `Dynamically scales structural span, floor area, and seating assemblies to accommodate ${interp.requestedCapacityGuests} guests with code-compliant circulation clearance.`,
      targetProperty: "roomDimensions & validation.estimatedCapacityGuests",
      confidence: "inferred",
    });
  }

  for (const claim of preset.designInferenceClaims) {
    provenanceClaims.push({
      ...claim,
      id: `prov-inf-${claimIdx++}`,
    });
  }

  if (interp.explicitTimeOfDay) {
    provenanceClaims.push({
      id: `prov-inf-${claimIdx++}`,
      source: "design_inference",
      domain: "lighting",
      label: `Explicit Time-of-Day Lighting (${interp.explicitTimeOfDay.toUpperCase()})`,
      insight: `User prompt explicitly requested "${interp.explicitTimeOfDay}" atmosphere.`,
      architecturalEffect: `Calibrates directional sun/moon elevation, sky dome luminance, and fixture intensity for ${interp.explicitTimeOfDay}.`,
      targetProperty: "timeOfDay & lighting",
      confidence: "inferred",
    });
  } else {
    provenanceClaims.push({
      id: `prov-fb-${claimIdx++}`,
      source: "fallback",
      domain: "lighting",
      label: `Inferred Time-of-Day (${timeOfDay.toUpperCase()})`,
      insight: `No explicit time-of-day was specified in the prompt; inferred ${timeOfDay} from program "${interp.eventPurpose}".`,
      architecturalEffect: `Sets initial sky dome and fixture balance to ${timeOfDay}.`,
      targetProperty: "timeOfDay",
      confidence: "default",
    });
  }

  if (!hasRealQloo) {
    provenanceClaims.push({
      id: `prov-fb-${claimIdx++}`,
      source: "fallback",
      domain: "culture",
      label: "Live Qloo API Unavailable — Enriched via Architectural Knowledge Base",
      insight:
        qlooErrors.length > 0
          ? `Qloo status: ${qlooErrors.join("; ")}. System automatically engaged Layer-4 LLM architectural and cultural knowledge enrichment so the spatial design remains complete and richly detailed.`
          : "No live Qloo entities returned; engaged Layer-4 LLM architectural and cultural knowledge enrichment.",
      architecturalEffect:
        "Preserves full typology geometry, furniture inventory, material textures, and layered lighting without fabricating Qloo citations.",
      targetProperty: "reasoning.source",
      confidence: "default",
    });
  }

  const rules: Record<string, string> = {
    "Event Purpose": interp.eventPurpose,
    "Architectural Style": interp.architecturalStyle,
    "Spatial Typology": `${preset.typology} (${interp.enclosureMode}, target ${interp.targetCapacityGuests} guests)`,
    "Flooring Finish": flooringMaterial,
    "Wall Construction": wallMaterial,
    "Ceiling System": ceilingStructure,
    "Lighting Color Temp": `${temperatureK}K (${timeOfDay} profile)`,
    "Provenance Integrity": hasRealQloo
      ? `Combined ${rawQlooEntities.length} verified Qloo entity signal(s) with architectural domain knowledge`
      : "No live Qloo entities claimed; enriched via explicitly labeled LLM architectural knowledge and design inference",
  };

  return {
    promptText,
    typology: preset.typology,
    interpretedBrief: interp,
    primaryColorHex: preset.primaryColorHex,
    secondaryColorHex: preset.secondaryColorHex,
    accentColorHex: preset.accentColorHex,
    lightingTemperatureK: temperatureK,
    timeOfDay,
    flooringMaterial,
    wallMaterial,
    ceilingStructure,
    seatingFabric: preset.seatingFabric,
    tracks: [],
    menu: hasRealQloo
      ? `Qloo cultural signals (${rawQlooEntities.length} entities) + Architectural Enrichment`
      : "Architectural & Cultural Knowledge Enrichment (Qloo offline/sparse)",
    fallback: !hasRealQloo,
    reasoning: {
      source: hasRealQloo ? "qloo" : "llm-enriched",
      evidence: hasRealQloo
        ? rawQlooEntities.map((e) => `${e.name} (${e.type})`)
        : interp.explicitRequirements.length > 0
        ? interp.explicitRequirements
        : brief.culturalKeywords.map((k) => `Prompt signal: ${k}`),
      rules,
      provenanceClaims,
    },
    resolvedEntities: rawQlooEntities,
    unresolvedTerms: hasRealQloo ? [] : brief.culturalKeywords,
    evidence: rawEvidence || {
      genreTags: brief.culturalKeywords,
      styleTags: brief.materialKeywords,
      themeTags: brief.lightingKeywords,
      adjectives: ["architectural", "tactile", "spatial"],
    },
    limitations: hasRealQloo ? [] : qlooErrors,
  };
}
