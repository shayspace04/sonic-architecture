/**
 * Sonic Architecture — Authoritative Type Definitions
 * Single Source of Truth for Cultural Intelligence, Provenance, Spatial Rules,
 * Free-Form Prompt Interpretation, Composable Scene Planning, 3D Procedural Architecture,
 * Revisions, and the Scene-Driven Soundtrack / MusicProfile Pipeline.
 */

import type {
  DerivedFrom,
  ProgramNotesSpec,
  TraceStep,
  AgentTraceSummary,
} from "./agent/types";

export type ProvenanceSource =
  | "qloo_evidence"
  | "llm_knowledge"
  | "design_inference"
  | "fallback";

export type SpatialTypology =
  | "listening_room"
  | "futuristic_launch"
  | "cathedral_banquet"
  | "mediterranean_courtyard"
  | "pavilion_celebration"
  | "brutalist_runway"
  | "tea_room"
  | "grunge_loft"
  | "gallery_pavilion"
  | "intimate_lounge"
  | "garden_mandap"
  | "underground_club"
  | "industrial_warehouse"
  | "coastal_retreat"
  | "custom_hybrid";

export type LayoutMode =
  | "listening"
  | "showcase"
  | "banquet"
  | "courtyard"
  | "ceremony"
  | "runway"
  | "sanctuary"
  | "lounge"
  | "club"
  | "retreat";

export type TimeOfDay = "morning" | "afternoon" | "sunset" | "midnight";

export type QualityTier = "low" | "medium" | "high" | "ultra";

export type EnclosureMode = "indoor" | "outdoor" | "open_air_canopy" | "underground";

export type EnvironmentalSetting =
  | "valley"
  | "desert"
  | "coast"
  | "city"
  | "garden"
  | "interior-only";

export type MaterialFamily =
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

export type WallFinish =
  | "acoustic_slats"
  | "vertical_timber_slats"
  | "limewash_plaster"
  | "board_concrete"
  | "honed_limestone"
  | "warm_sandstone"
  | "washi_screen"
  | "distressed_brick"
  | "stacked_brick"
  | "strata_rock"
  | "mullioned_glass"
  | "frosted_mullioned_glass"
  | "anodized_panel"
  | "carved_sandstone"
  | "open_landscape";

export type FloorFinish =
  | "warm_oak"
  | "herringbone_parquet"
  | "polished_concrete"
  | "obsidian_terrazzo"
  | "honed_limestone"
  | "warm_sandstone"
  | "terracotta_tile"
  | "inlay_ceramic"
  | "tatami_mat"
  | "teak_decking";

export type CeilingStructure =
  | "coffered_timber"
  | "gothic_ribbed_vault"
  | "space_frame_truss"
  | "open_sky_pergola"
  | "draped_textile_canopy"
  | "monolithic_cantilever"
  | "hinoki_rafters"
  | "exposed_industrial_rig"
  | "open_sky";

export type ObjectCategory =
  | "Architecture"
  | "Structure"
  | "Furniture"
  | "Lighting"
  | "Decoration"
  | "Planting"
  | "Event Installations";

export type ObjectArchetype =
  | "horn_speaker_pair"
  | "analog_turntable_console"
  | "vinyl_record_shelf"
  | "low_lounge_chair"
  | "listening_sofa"
  | "acoustic_wall_panel"
  | "woven_area_rug"
  | "tokonoma_alcove"
  | "ev_product_plinth"
  | "concept_vehicle_sculpture"
  | "curved_led_backdrop"
  | "tiered_auditorium_row"
  | "space_frame_truss_bay"
  | "gothic_pointed_arch"
  | "banquet_long_table"
  | "candelabra_floral_centerpiece"
  | "brass_ring_chandelier"
  | "ceremonial_altar_dais"
  | "peristyle_stone_column"
  | "olive_tree_planter"
  | "bistro_courtyard_table"
  | "limestone_fountain"
  | "pergola_linen_canopy"
  | "mandap_scalloped_arch"
  | "marigold_garland_curtain"
  | "diwan_bolster_lounge"
  | "ceremonial_jhula_swing"
  | "monolithic_concrete_pier"
  | "obsidian_runway_deck"
  | "sculptural_concrete_bench"
  | "linear_light_blade"
  | "shoji_sliding_screen"
  | "chabudai_tea_table"
  | "zabuton_floor_cushion"
  | "sunken_ro_hearth"
  | "chrome_balloon_cluster"
  | "tufted_grunge_sofa"
  | "dj_flash_rig"
  | "wedding_mandap_canopy"
  | "circular_water_feature"
  | "techno_sound_stack"
  | "warehouse_truss_portal"
  | "retreat_timber_pavilion"
  | "dramatic_entry_portal"
  | "translucent_canopy";

/**
 * Step 3 (E + F + G) — Procedural Architectural Shell Kit Specification
 */
export type ArchProfileType =
  | "pointed_gothic"
  | "glazed_barrel"
  | "semicircular_arcade"
  | "scalloped_mandap"
  | "monolithic_portal"
  | "sukiya_lintel";

export type ColumnStyleType =
  | "clustered_limestone"
  | "fluted_classical"
  | "board_concrete_pier"
  | "hinoki_post"
  | "anodized_steel_box"
  | "cast_iron_truss_stanchion";

export type CeilingKitType =
  | "glazed_barrel_vault"
  | "gothic_ribbed_vault"
  | "space_frame_truss"
  | "coffered_acoustic_grid"
  | "open_pergola_canopy"
  | "monolithic_waffle_slab"
  | "hinoki_exposed_rafters";

export type WallArticulationType =
  | "extruded_acoustic_slats"
  | "ashlar_pilaster_arcade"
  | "kumiko_shoji_screens"
  | "board_concrete_reveals"
  | "curtain_wall_glazing"
  | "recessed_gallery_niches";

export interface ArchitecturalKitSpec {
  bayCount: number;
  baySpacingMeters: number;
  archProfile: ArchProfileType;
  columnStyle: ColumnStyleType;
  columnRadiusMeters: number;
  ceilingKit: CeilingKitType;
  wallArticulation: WallArticulationType;
  hasClerestoryGlazing: boolean;
  hasMezzanineBalcony: boolean;
  mezzanineHeightMeters: number;
  mezzanineDepthMeters: number;
  corniceProjectionMeters: number;
  baseboardHeightMeters: number;
  wallRevealDepthMeters: number;
  /** Accounts for coffers, vaults, and 3D slat surface expansion in Sabine RT60 */
  surfaceAreaMultiplier: number;
  /** Subtracted from gross box volume when computing net room volume V */
  structuralVolumeDisplacementCubicMeters: number;
}

/**
 * Step 4 (H + I) — High-Threshold Selective Post-Processing & Debug Overlay Spec
 */
export interface PostProcessingSpec {
  /** Enables selective emissive bloom halo + optical vignette (default true on high/medium) */
  bloomEnabled?: boolean;
  /** Luminance threshold >= 1.10 so ONLY toneMapped:false emissives bloom, never walls/floors */
  bloomLuminanceThreshold?: number;
  /** Selective bloom intensity (0.15–0.85, default 0.42) */
  bloomIntensity?: number;
  /** Selective bloom halo radius in meters (default 0.65) */
  bloomRadius?: number;
  /** Optical vignette corner darkness (0.0–0.75, default 0.42) */
  vignetteDarkness?: number;
  /** Optical vignette radial offset (0.35–0.85, default 0.56) */
  vignetteOffset?: number;
}

export interface DebugOverlaysSpec {
  /** 1st-order ISO 3382 acoustic reflection rays (OFF by default) */
  showAcousticRays?: boolean;
  /** Loudspeaker dispersion cones (OFF by default) */
  showDispersionCones?: boolean;
  /** IBC crowd egress flow vectors (OFF by default) */
  showEgressPaths?: boolean;
  /** 3D CAD dimension witness lines (OFF by default) */
  showDimensionCallouts?: boolean;
}

export interface InterpretedBrief {
  originalPrompt: string;
  eventPurpose: string;
  architecturalStyle: string;
  culturalReferences: string[];
  enclosureMode: EnclosureMode;
  isOpenAir: boolean;
  isUnderground: boolean;
  hasTranslucentCanopy: boolean;
  environmentalSetting: EnvironmentalSetting;
  requestedCapacityGuests: number | null;
  targetCapacityGuests: number;
  explicitDimensions: { width?: number; depth?: number; height?: number } | null;
  focalProgram:
    | "listening_console"
    | "product_launch_plinth"
    | "wedding_mandap"
    | "techno_dj_bunker"
    | "fashion_runway"
    | "coastal_retreat_pavilion"
    | "banquet_sanctuary"
    | "tea_hearth"
    | "courtyard_fountain"
    | "editorial_flash_stage";
  seatingStyle:
    | "intimate_lounge"
    | "auditorium_tiers"
    | "ceremonial_mandap_court"
    | "dance_floor_club"
    | "runway_flank"
    | "retreat_cabana_lounges"
    | "refectory_banquet"
    | "tatami_zabuton"
    | "courtyard_bistro";
  requestedElements: string[];
  explicitMaterials: {
    floor?: FloorFinish;
    wall?: WallFinish;
    ceiling?: CeilingStructure;
    furniture?: MaterialFamily;
    accent?: MaterialFamily;
  };
  explicitTimeOfDay: TimeOfDay | null;
  inferredTimeOfDay: TimeOfDay;
  explicitLightingTempK: number | null;
  hasWaterFeature: boolean;
  hasRunway: boolean;
  hasDanceFloor: boolean;
  hasAcousticTreatment: boolean;
  hasLushLandscaping: boolean;
  explicitRequirements: string[];
  inferredDetails: string[];
}

export interface Track {
  title: string;
  artist: string;
}

export interface ResolvedEntity {
  id: string;
  name: string;
  type: string;
  searchTerm: string;
  affinityScore?: number;
  culturalContext?: string;
}

export interface ArtistRec {
  id: string;
  name: string;
  sourceEntity: string;
}

export interface CulturalEvidence {
  genreTags: string[];
  styleTags: string[];
  themeTags: string[];
  adjectives: string[];
}

export interface ProvenanceClaim {
  id: string;
  source: ProvenanceSource;
  domain: "architecture" | "material" | "lighting" | "acoustics" | "layout" | "culture";
  label: string;
  insight: string;
  architecturalEffect: string;
  targetProperty: string;
  entityReference?: string;
  confidence: "verified" | "established" | "inferred" | "default";
}

export interface DesignReasoning {
  source: "qloo" | "qloo-partial" | "llm-enriched" | "local-fallback";
  evidence: string[];
  rules: Record<string, string>;
  provenanceClaims: ProvenanceClaim[];
}

export interface QuotaInfo {
  limit?: number;
  remaining?: number;
  reset?: number;
}

export interface VibePayload {
  promptText?: string;
  typology?: SpatialTypology;
  interpretedBrief?: InterpretedBrief;
  primaryColorHex: string;
  secondaryColorHex?: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  timeOfDay?: TimeOfDay;
  flooringMaterial: FloorFinish;
  wallMaterial?: WallFinish;
  ceilingStructure?: CeilingStructure;
  seatingFabric: MaterialFamily;
  tracks: Track[];
  menu: string;
  fallback: boolean;
  reasoning: DesignReasoning;
  resolvedEntities?: ResolvedEntity[];
  unresolvedTerms?: string[];
  evidence?: CulturalEvidence;
  artistRecommendations?: ArtistRec[];
  quota?: QuotaInfo;
  limitations?: string[];
}

export interface AcousticTarget {
  targetRT60Seconds: number;
  calculatedRT60Seconds: number;
  bassRatio: number;
  clarityC80dB: number;
  noiseCriteriaNC: number;
  averageAbsorptionAlpha: number;
  complianceStatus: "optimal" | "acceptable" | "reverberant" | "over_damped";
}

export interface MaterialSpec {
  id: MaterialFamily;
  name: string;
  colorHex: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
  /** Optional Step 2 tangent-space normal map intensity (0.15–1.2) */
  normalScale?: number;
  /** Optional Step 2 physical meters per UV tile repeat (default 1.6m) */
  tileSizeMeters?: number;
  /** Optional Step 2 clearcoat layer intensity (0.0–1.0) */
  clearcoat?: number;
  /** Optional Step 2 fabric/textile sheen intensity (0.0–1.0) */
  sheen?: number;
  opacity?: number;
  emissiveHex?: string;
  emissiveIntensity?: number;
  patternType:
    | "wood_grain"
    | "herringbone"
    | "concrete_formwork"
    | "stone_vein"
    | "terrazzo_fleck"
    | "terracotta_grid"
    | "woven_tatami"
    | "slat_grille"
    | "plaster_matte"
    | "brushed_metal"
    | "fabric_weave"
    | "ornate_tile";
}

/**
 * Step 2 (C + D) — Palette Contrast Guard Report
 */
export interface PaletteContrastReport {
  floorHex: string;
  wallHex: string;
  primaryHex: string;
  accentHex: string;
  floorWallDeltaL: number;
  wallPrimaryDeltaL: number;
  maxSurfaceLightness: number;
  wasAdjusted: boolean;
  adjustmentsApplied: string[];
}

export interface LightSourceSpec {
  id: string;
  name: string;
  type: "ambient" | "directional" | "spot" | "point" | "hemisphere" | "rect_area";
  position: [number, number, number];
  target?: [number, number, number];
  colorHex: string;
  temperatureK: number;
  intensity: number;
  distance?: number;
  decay?: number;
  angleRad?: number;
  penumbra?: number;
  castShadow: boolean;
}

/**
 * Step 1 & Step 4 (I) — Automated Whitewash & Exposure Guard Telemetry
 */
export interface ExposureGuardTelemetry {
  meanLuminance: number;
  highlightClipRatio: number;
  /** Step 4 fraction of pixels with high luminance (Y > 0.82) and bleached low saturation (S < 0.08) */
  nearWhiteRatio?: number;
  /** Step 4 fraction of crushed shadow pixels (Y < 0.03) */
  shadowCrushRatio?: number;
  saturationSpread: number;
  /** Step 4 P90 / P10 luminance contrast ratio */
  contrastRatio?: number;
  status:
    | "balanced"
    | "overexposed_whitewash"
    | "underexposed_muddy"
    | "low_contrast_flat";
  recommendedExposure: number;
  appliedDelta: number;
  /** Step 4 multiplier applied to ambient/hemisphere fill when whitewash is detected */
  ambientTrimMultiplier?: number;
  /** Step 4 diagnostic messages when exposure or ambient trim triggers */
  warnings?: string[];
}

export interface SpatialZone {
  id: string;
  name: string;
  role: "focal" | "seating" | "circulation" | "threshold" | "service" | "acoustic" | "landscape";
  bounds: {
    x: number;
    z: number;
    width: number;
    depth: number;
  };
  clearanceMeters: number;
  colorHex: string;
  description: string;
}

export interface SpatialObject {
  id: string;
  name: string;
  category: ObjectCategory;
  archetype: ObjectArchetype;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number]; // [width, height, depth] in meters
  materialId: MaterialFamily;
  secondaryMaterialId?: MaterialFamily;
  colorHex: string;
  accentColorHex?: string;
  provenanceId: string;
  designNote: string;
  /** Optional Step 3 per-object AO contact shadow decal opacity (default 0.62) */
  contactShadowOpacity?: number;
  procurement?: ObjectProcurementMetadata;
}

export interface ValidationReport {
  isValid: boolean;
  circulationClearanceMeters: number;
  minRequiredClearanceMeters: number;
  estimatedCapacityGuests: number;
  areaSqMeters: number;
  volumeCubicMeters: number;
  densityStatus: "optimal" | "tight" | "spacious";
  warnings: string[];
  checksPassed: string[];
}

// ============================================================================
// SOUNDTRACK & MUSIC PROFILE TYPES (STEPS 1–5)
// ============================================================================

/**
 * Strict honesty provenance label carried by every recommended track and artist:
 * - "qloo-evidence": directly derived from live Qloo entity / artist data
 * - "inferred": derived via LLM / cultural-spatial reasoning from scene features
 * - "fallback": selected from the deterministic local per-typology catalog rules
 */
export type SoundtrackProvenanceLabel =
  | "qloo-evidence"
  | "inferred"
  | "fallback"
  | "sample-fixture";

export type SoundtrackMomentName =
  | "arrival"
  | "dining"
  | "peak"
  | "wind-down";

export type AcousticCharacterClass =
  | "intimate/dry"
  | "warm/absorptive"
  | "open-air/dispersive"
  | "balanced/studio"
  | "lively/resonant"
  | "reverberant/cavernous";

export interface MusicMomentSpec {
  name: SoundtrackMomentName;
  description: string;
  /** Target energy in [0, 1] for this phase of the event */
  targetEnergy: number;
  /** Number of verified track slots allocated to this moment */
  trackSlots: number;
}

export interface MusicProfile {
  moodTags: string[];
  /** Overall scene musical energy in [0, 1] */
  energy: number;
  /** Tempo bounds [minBpm, maxBpm] calibrated to typology & RT60 reverberation */
  tempoRangeBpm: [number, number];
  genres: string[];
  era: string;
  instrumentation: string[];
  /**
   * Acoustic character derived from the scene's real ISO 3382 numbers
   * (e.g., "intimate/dry (RT60 0.41s, α 0.36, 164 m³)" vs "reverberant/cavernous (RT60 1.58s, α 0.16, 6300 m³)")
   */
  acousticCharacter: string;
  moments: [
    MusicMomentSpec,
    MusicMomentSpec,
    MusicMomentSpec,
    MusicMomentSpec
  ];
  provenanceSummary?: {
    primarySource: SoundtrackProvenanceLabel;
    qlooEntitiesUsed: string[];
    derivationSignals: string[];
  };
}

export interface ResolvedTrack {
  providerId: "itunes" | "spotify-embed" | "deezer";
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl: string | null;
  embedUrl?: string;
  externalSearchUrl: string;
  storeUrl?: string;
  durationMs?: number;
  releaseYear?: number;
  genreName?: string;
}

export interface SoundtrackTrackItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl: string | null;
  embedUrl?: string;
  externalSearchUrl: string;
  storeUrl?: string;
  durationMs?: number;
  moment: SoundtrackMomentName;
  targetEnergy: number;
  estimatedEnergy: number;
  bpmEstimate?: number;
  provenance: SoundtrackProvenanceLabel;
  provenanceSourceDetail: string;
  /** Scene-feature-tied explanation, e.g. "Warm timber and low 3.4m ceilings (RT60 0.41s) favor intimate acoustic trio recordings." */
  whyThisFits: string;
}

export interface SoundtrackMomentPlaylist {
  name: SoundtrackMomentName;
  description: string;
  targetEnergy: number;
  trackSlots: number;
  tracks: SoundtrackTrackItem[];
}

export interface SoundtrackPlaylist {
  sceneHash: string;
  generatedAtIso: string;
  cacheStatus: "miss" | "hit" | "fallback-quota" | "fallback-offline";
  providerUsed: string;
  musicProfile: MusicProfile;
  moments: [
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist
  ];
  tracks: SoundtrackTrackItem[];
  verificationStats: {
    candidatesGenerated: number;
    candidatesVerified: number;
    candidatesDroppedUnresolved: number;
    duplicatesRemoved: number;
    qlooEvidenceCount: number;
    inferredCount: number;
    fallbackCount: number;
  };
  quota: {
    remainingRequests: number;
    maxRequestsPerWindow: number;
    resetAtIso: string;
  };
  warnings: string[];
}

export interface SceneSpec {
  id: string;
  title: string;
  subtitle: string;
  promptText: string;
  typology: SpatialTypology;
  layoutMode: LayoutMode;
  timeOfDay: TimeOfDay;
  isOpenAir: boolean;
  enclosureMode?: EnclosureMode;
  setting?: EnvironmentalSetting;
  interpretedBrief?: InterpretedBrief;
  /** Optional Step 3 procedural architectural shell & bay kit configuration */
  architecturalKit?: ArchitecturalKitSpec;
  /** Optional Step 3 global contact shadow decal opacity (0.0–1.0, default 0.62) */
  contactShadowOpacity?: number;
  /** Optional Step 3 exterior 3D terrain elevation relief amplitude in meters (default 3.8) */
  terrainReliefMeters?: number;
  /** Optional Step 3 exterior foliage cluster density multiplier (0.5–2.0, default 1.0) */
  foliageDensityMultiplier?: number;
  /** Optional Step 4 selective bloom & optical vignette post-processing configuration */
  postProcessing?: PostProcessingSpec;
  /** Optional Step 4 debug overlay visibility flags (all false by default) */
  debugOverlays?: DebugOverlaysSpec;
  /** Optional Step 1 Soundtrack MusicProfile derived from SceneSpec & Qloo cultural signals */
  musicProfile?: MusicProfile;
  /** Optional Step 2 Verified 4-moment SoundtrackPlaylist */
  soundtrack?: SoundtrackPlaylist;
  roomDimensions: {
    width: number;  // X axis (meters)
    height: number; // Y axis clear height (meters)
    depth: number;  // Z axis length (meters)
    ridgeHeight: number;
    wallThickness: number;
    netVolumeCubicMeters?: number;
    effectiveSurfaceAreaSqMeters?: number;
  };
  palette: {
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
    floorHex: string;
    wallHex: string;
    ambientHex: string;
    isFallback?: boolean;
    fallbackNotice?: string;
  };
  materials: {
    floor: MaterialSpec;
    wall: MaterialSpec;
    ceiling: MaterialSpec;
    primaryFurniture: MaterialSpec;
    secondaryAccent: MaterialSpec;
  };
  ceilingStructure: CeilingStructure;
  lighting: {
    temperatureK: number;
    ambientIntensity: number;
    sunAzimuthDeg: number;
    sunElevationDeg: number;
    fogDensity: number;
    exposure?: number;
    environmentIntensity?: number;
    hemiGroundHex?: string;
    fillLightIntensity?: number;
    practicalBudgetCount?: number;
    sources: LightSourceSpec[];
  };
  acousticTarget: AcousticTarget;
  zones: SpatialZone[];
  objects: SpatialObject[];
  focalPoint: {
    name: string;
    position: [number, number, number];
    description: string;
  };
  cameraDefaults: {
    overviewPosition: [number, number, number];
    overviewTarget: [number, number, number];
    interiorPosition: [number, number, number];
    interiorTarget: [number, number, number];
    focalPosition: [number, number, number];
    focalTarget: [number, number, number];
  };
  provenance: ProvenanceClaim[];
  validation: ValidationReport;
  revisionHistory: {
    timestamp: string;
    instruction: string;
    changesApplied: string[];
  }[];
  /** Structured breakdown of Qloo entities, cross-domain signals, fallbacks, and physical SceneSpec impacts */
  qloo_evidence?: QlooEvidencePayload;
  /** Provenance source indicator for Qloo intelligence */
  qlooSource?: "live" | "cache" | "fixture" | "fallback";
  /** Fair-test comparison against plain ungrounded baseline generation */
  comparison?: SceneComparison;
  /** Agent provenance map binding design choices to verified tool call IDs */
  provenanceMap?: Record<string, DerivedFrom>;
  /** Cultural cross-domain program and service hints */
  programNotes?: ProgramNotesSpec;
  /** Live agent trace of tool calls and reasoning */
  agentTrace?: TraceStep[];
  /** Summary of agent tool calls, cache hits, and domains */
  agentSummary?: AgentTraceSummary;
  /** Plain "because" design rationales constructed strictly from real Qloo data */
  becauseSentences?: Array<{
    decision: "typology" | "lighting" | "materiality";
    headline: string;
    sentence: string;
    citedEntities: string[];
  }>;
}

// ============================================================================
// PROVENANCE & FAIR-TEST COMPARISON TYPES
// ============================================================================

export type Provenance =
  | "qloo-evidence"
  | "inferred"
  | "fallback"
  | "sample-fixture";

export type QlooEntityProvenance = Provenance;

export type DiffCategory =
  | "palette"
  | "materials"
  | "lighting"
  | "geometry"
  | "acoustics"
  | "soundtrack"
  | "program"
  | "furniture";

export interface DiffItem {
  category: DiffCategory;
  baselineValue: string;
  groundedValue: string;
  changedBy?: {
    entityName: string;
    entityType: string;
    signal: string;
    provenance: Provenance;
  };
  magnitude?: number; // computed in code [0, 1]
}

export interface SceneComparison {
  prompt: string;
  baseline: SceneSpec;
  grounded: SceneSpec;
  seed: number;
  qlooCallsUsed: number;
  diff: DiffItem[];
  isSampleFixture?: boolean;
  source?: "live" | "cache" | "fixture" | "fallback";
  baselineMode?: "prompt-only design" | "llm-prompt-only";
  unresolvedCandidates?: { name: string; reason: string }[];
  matchedTags?: any[];
}

export interface QlooContextEntity {
  id: string;
  name: string;
  type: string;
  signals: string[];
  provenance: Provenance;
  drivenChoice?: string;
}

export interface QlooContext {
  prompt: string;
  entities: QlooContextEntity[];
  culturalEvidence?: {
    genreTags: string[];
    styleTags: string[];
    themeTags: string[];
    adjectives: string[];
  };
  crossDomainSignals?: QlooCrossDomainSignal[];
  fallbackChoices?: QlooFallbackChoice[];
  source: "live" | "cache" | "fixture" | "fallback";
  qlooCallsUsed?: number;
  unresolved?: { name: string; reason: string }[];
  crossDomainBundle?: any;
}

export interface QlooResolvedEntity {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  qloo_signal: string;
  provenance: QlooEntityProvenance;
  driven_choice: string;
}

export interface QlooCrossDomainSignal {
  domain: string;
  entity: string;
  signal: string;
  spatial_translation: string;
}

export interface QlooFallbackChoice {
  choice: string;
  reason: string;
  provenance: "inferred" | "fallback";
}

export interface QlooSceneSpecImpact {
  geometry: string;
  materials: Record<string, Record<string, string | number>>;
  lighting: Array<{
    type: string;
    temp: string;
    intensity: number;
    target?: string;
    color?: string;
  }>;
  acoustics: {
    reverberation_time: string;
    absorption_zones: string;
  };
}

export interface QlooEvidencePayload {
  input_parsed: string;
  source?: "live" | "cache" | "fixture" | "fallback";
  resolved_entities: QlooResolvedEntity[];
  cross_domain_signals: QlooCrossDomainSignal[];
  fallback_choices: QlooFallbackChoice[];
  scene_spec_impact: QlooSceneSpecImpact;
}

// ============================================================================
// REAL-WORLD SOURCING, PRODUCT MATCHING & BUDGET-AWARE PROCUREMENT TYPES
// ============================================================================

export type SourcingMethod = "buy" | "rent" | "custom";

export type BudgetTierPreference = "economy" | "balanced" | "premium" | "luxury";

export type SourcingModePreference = "buy" | "rent" | "hybrid" | "custom";

export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP" | "JPY";

export type PriceVerificationStatus =
  | "estimated_cost"
  | "advertised_price"
  | "verified_quote"
  | "unverified_availability";

export type MatchClassification =
  | "exact_specification"
  | "similar_alternative"
  | "custom_commission_spec"
  | "supplier_search_link";

export interface ObjectProcurementMetadata {
  objectId: string;
  category: ObjectCategory;
  subtype: string;
  dimensionsMeters: [number, number, number];
  unit: "m";
  materialName: string;
  finish: string;
  colorHex: string;
  style: string;
  quantity: number;
  intendedFunction: string;
  essentialAttributes: string[];
  optionalAttributes: string[];
  suggestedMethods: SourcingMethod[];
}

export interface ProductOptionMatch {
  id: string;
  objectId: string;
  sceneObjectName: string;
  title: string;
  sourcingMethod: SourcingMethod;
  tier: "economy" | "recommended" | "premium";
  matchClassification: MatchClassification;
  isMockReferenceData: boolean;
  dataSourceLabel: string;
  matchScorePct: number;
  matchedAttributes: string[];
  dimensionFitNote: string;
  materialFitNote: string;
  unitPriceUSD: number;
  pricingPeriod: "per_unit" | "per_day" | "per_event" | "per_sqm" | "lump_sum";
  recommendedQuantity: number;
  estimatedLineTotalInUserCurrency: number;
  currency: CurrencyCode;
  priceStatus: PriceVerificationStatus;
  priceVerifiedTimestamp: string | null;
  availabilityStatus: string;
  leadTimeOrDeliveryNote: string;
  minimumOrderQuantity: number;
  deliveryRadiusKm?: number;
  installationRequirement: string;
  supplierName: string;
  supplierRegion: string;
  isLocalVendorMatch: boolean;
  productUrl: string;
  supplierSearchUrl: string;
  budgetFitStatus: "optimal_fit" | "within_budget" | "stretch_tier" | "over_allocation";
  budgetFitExplanation: string;
}

export interface ProjectBudgetConfig {
  currency: CurrencyCode;
  location: string;
  totalBudget: number;
  tierPreference: BudgetTierPreference;
  sourcingPreference: SourcingModePreference;
  eventDate: string;
  rentalDurationDays: number;
  categoryAllocationsPct: Record<ObjectCategory, number>;
}

export interface ProcurementLineItem {
  lineId: string;
  objectId: string;
  sceneObjectName: string;
  category: ObjectCategory;
  selectedOption: ProductOptionMatch;
  sourcingMethod: SourcingMethod;
  tier: "economy" | "recommended" | "premium";
  quantity: number;
  rentalDurationDays: number;
  unitPriceInCurrency: number;
  pricingPeriod: ProductOptionMatch["pricingPeriod"];
  lineTotalInCurrency: number;
  currency: CurrencyCode;
  supplierName: string;
  sourceUrl: string;
  priceStatus: PriceVerificationStatus;
  availabilityStatus: string;
  matchScorePct: number;
  savedAtTimestamp: string;
  notes?: string;
}

export interface ProjectProcurementSummary {
  currency: CurrencyCode;
  location: string;
  totalBudget: number;
  rentalDurationDays: number;
  items: ProcurementLineItem[];
  buySubtotal: number;
  rentSubtotal: number;
  customSubtotal: number;
  grandTotalEstimated: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  categoryBreakdown: Record<ObjectCategory, CategoryBudgetBreakdown>;
  disclaimer?: string;
}

export interface CategoryBudgetBreakdown {
  allocated: number;
  estimated: number;
  disclaimer?: string;
}

export type {
  QlooClient,
  QlooDomain,
  ToolCall,
  ToolResult,
  TraceStep,
  AgentEvent,
  DerivedFrom,
  ProgramNotesSpec,
  AgentTraceSummary,
  ClarificationPayload,
  ResolvedEntityItem,
  TasteSignalItem,
  CrossDomainLinkItem,
} from "./agent/types";

