/**
 * Sonic Architecture — Qloo Sample Fixtures (/lib/fixtures/qlooSamples.ts)
 *
 * Ground-truth fixture data used when live Qloo backend is not connected.
 * Tagged strictly with provenance: "sample-fixture" or "inferred".
 *
 * When the real Qloo API is connected locally, the adapter outputs
 * "qloo-evidence" instead and this fixture file serves as the fallback/cache.
 */

import type { QlooContext, Provenance } from "@/lib/types";
import { STARTER_PROMPTS, type StarterPrompt } from "@/lib/starters";

export { STARTER_PROMPTS };
export type { StarterPrompt };

export const QLOO_SAMPLE_FIXTURES: Record<string, QlooContext> = {
  // ==========================================================================
  // 1. JAZZ + BRUTALIST ARCHITECTURE
  // ==========================================================================
  "jazz + brutalist architecture": {
    prompt: "Jazz + Brutalist Architecture",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["modal jazz", "hard bop", "cool jazz", "post-bop"],
      styleTags: ["brutalism", "board-formed concrete", "modernism", "coffered grid"],
      themeTags: ["containment paradox", "late-night intimacy", "austere warmth"],
      adjectives: ["tactile", "resonant", "chiaroscuro", "monolithic", "warm-amber"],
    },
    entities: [
      {
        id: "artist:miles-davis",
        name: "Miles Davis",
        type: "musician",
        signals: [
          "harmonic_warmth",
          "modal_improvisation",
          "muted_trumpet_timbre",
          "late_night_intimacy",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Warm 2400K–2700K amber focal spots; deep minor-key color palette; open floor circulation for organic listening movement.",
      },
      {
        id: "style:brutalism",
        name: "Brutalist Architecture",
        type: "architectural_style",
        signals: [
          "raw_board_concrete",
          "monolithic_portal_piers",
          "coffered_slab_acoustics",
          "austere_permanence",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Unfinished board-formed concrete walls; deep recessed lighting reveals; monolithic piers defining sightlines.",
      },
      {
        id: "record_label:blue-note",
        name: "Blue Note Records Era",
        type: "record_label",
        signals: [
          "hard_bop_pulse",
          "reid_miles_typography",
          "chiaroscuro_photography",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "High-contrast grazing spotlights; deep indigo shadow zones; brushed brass detailing against matte aggregate.",
      },
      {
        id: "culture:japanese-kissa-overlap",
        name: "Kissaten Audiophile Tradition",
        type: "cultural_movement",
        signals: [
          "concentrated_listening",
          "horn_loaded_speakers",
          "timber_counterweight",
        ],
        provenance: "inferred",
        drivenChoice:
          "Slotted oak acoustic baffles embedded within concrete bays to prevent 5kHz flutter echoes.",
      },
      {
        id: "mood:intimate-scale",
        name: "Intimate Scale (Containment Paradox)",
        type: "spatial_mood",
        signals: [
          "jazz_performance_tradition",
          "brutalist_mass",
          "human_scaled_enclosure",
        ],
        provenance: "inferred",
        drivenChoice:
          "Massive concrete portal frames paired with low-slung leather seating so the listener feels simultaneously sheltered and surrounded.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Jazz Modal Harmony",
        signal: "harmonic_suspension, resolving_tension",
        spatial_translation:
          "Curved ceiling arches that create acoustic pockets; listeners experience harmonic drift in different zones.",
      },
      {
        domain: "architecture",
        entity: "Brutalist Mass",
        signal: "weight, gravity, permanence",
        spatial_translation:
          "Heavy concrete beams define sightlines; flooring is polished aggregate with embedded brass accents (warmth against cold).",
      },
      {
        domain: "lighting",
        entity: "Late-Night Jazz Club Tradition",
        signal: "dim_intimate, warm_pools, stage_hierarchy",
        spatial_translation:
          "Spotlights at 2700K (warm amber) above performance zones; surrounding areas dim to 10% ambient; no overhead glare.",
      },
      {
        domain: "acoustics",
        entity: "Modal Resonance & Horn Projection",
        signal: "brass_bite, dry_bass_punch, room_decay_balance",
        spatial_translation:
          "Targeted 0.58s RT60 tuning via slotted acoustic slats opposing concrete load-bearing sheer walls.",
      },
    ],
    fallbackChoices: [
      {
        choice: "String lights in brutalist venue",
        reason:
          "Qloo data on jazz clubs + brutalism is sparse; interpolated from live-music venues + modernist restaurants.",
        provenance: "inferred",
      },
      {
        choice: "Polished brass reveal trim between floor and board-concrete walls",
        reason:
          "Direct Qloo taste affinity lacked interior joinery specs; interpolated from mid-century modernist civic hall conventions.",
        provenance: "inferred",
      },
    ],
  },

  // ==========================================================================
  // 2. A24 FILMS + INDIE MUSIC
  // ==========================================================================
  "a24 films + indie music": {
    prompt: "A24 Films + Indie Music",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["indie folk", "lo-fi indie", "chamber pop", "slowcore"],
      styleTags: ["subdued naturalism", "liminal spaces", "limewash", "linen"],
      themeTags: ["nostalgia", "emotional resonance", "film grain", "magic hour"],
      adjectives: ["hazy", "cinematic", "still", "vulnerable", "introspective"],
    },
    entities: [
      {
        id: "studio:a24-films",
        name: "A24 Production Aesthetic",
        type: "cinema_studio",
        signals: [
          "subdued_naturalism",
          "slow_burn_tension",
          "architectural_framing",
          "35mm_kodak_grain",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Asymmetrical axial sightlines; limewash plaster and raw linen textures; deep optical vignette framing perimeter entries.",
      },
      {
        id: "artist:phoebe-bridgers",
        name: "Phoebe Bridgers / Boygenius",
        type: "musician",
        signals: [
          "intimate_folk_confessional",
          "doubled_vocal_reverb",
          "haunted_chamber_warmth",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Raw linen perimeter acoustic drapery; 2800K low-intensity candlelit floor illumination.",
      },
      {
        id: "director:charlotte-wells",
        name: "Charlotte Wells / Aftersun",
        type: "film_director",
        signals: [
          "liminal_spaces",
          "memory_fragmentation",
          "sun_bleached_nostalgia",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Pale travertine deck with sunken conversation pit; clerestory daylight slot allowing soft diagonal sun shafts.",
      },
      {
        id: "mood:quiet-melancholy",
        name: "Quiet Cinematic Melancholy",
        type: "spatial_mood",
        signals: [
          "cinematic_framing",
          "acoustic_stillness",
          "negative_space",
        ],
        provenance: "inferred",
        drivenChoice:
          "Submerged seating zone with mono-material acoustic envelope and zero clutter.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "cinema",
        entity: "A24 Negative Space Framing",
        signal: "isolation, psychological_depth, stillness",
        spatial_translation:
          "Uncluttered 6.4m floor clearance with singular focal listening installation; deliberate cinematic pause zones.",
      },
      {
        domain: "music",
        entity: "Chamber Folk Intimacy",
        signal: "extended_decay, dry_whisper_vocal",
        spatial_translation:
          "High absorption ceiling and fabric-draped alcoves tuned to 0.45s RT60 preventing slap-back.",
      },
      {
        domain: "lighting",
        entity: "Magic Hour Natural Light Diffusion",
        signal: "golden_roll_off, soft_shadow_penumbra",
        spatial_translation:
          "3200K diffused ceiling wash with 0.85 penumbra spot grazing the focal stage plinth.",
      },
    ],
    fallbackChoices: [
      {
        choice: "Raw linen perimeter acoustic curtains",
        reason:
          "Qloo cross-affinity for film studios does not mandate specific drapery; interpolated from art house screening pavilions.",
        provenance: "inferred",
      },
    ],
  },

  // ==========================================================================
  // 3. JAPANESE GARDENS + AMBIENT
  // ==========================================================================
  "japanese gardens + ambient": {
    prompt: "Japanese Gardens + Ambient",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["kankyo ongaku", "ambient", "minimalism", "field recordings"],
      styleTags: ["chisen-kaiyushiki", "tatami", "hinoki", "wabi-sabi"],
      themeTags: ["borrowed scenery", "water ripple", "meditation", "organic flow"],
      adjectives: ["tranquil", "transparent", "dappled", "reverent", "crystalline"],
    },
    entities: [
      {
        id: "landscape:chisen-kaiyushiki",
        name: "Chisen-Kaiyūshiki Strolling Garden",
        type: "landscape_tradition",
        signals: [
          "borrowed_scenery_shakkei",
          "stepping_stones_tobiishi",
          "contemplative_asymmetry",
          "water_reflection",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Central organic reflection basin; honed limestone plinths; exterior pine silhouette canopy with open air enclosure.",
      },
      {
        id: "artist:hiroshi-yoshimura",
        name: "Hiroshi Yoshimura",
        type: "composer",
        signals: [
          "kankyo_ongaku",
          "environmental_waveforms",
          "glass_like_fender_rhodes",
          "water_drop_resonance",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Sound-reflective water feature creating natural acoustic shimmer; transparent pavilion enclosure.",
      },
      {
        id: "artist:brian-eno",
        name: "Brian Eno",
        type: "musician",
        signals: [
          "generative_music",
          "non_teleological_flow",
          "ambient_acoustics",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Seamless glass-to-garden perimeter; 3000K warm diffuse horizon wash; multi-directional acoustic diffusion.",
      },
      {
        id: "mood:meditative-stillness",
        name: "Meditative Garden Sanctuary",
        type: "spatial_mood",
        signals: [
          "garden_stillness",
          "ambient_immersion",
          "subtle_tactility",
        ],
        provenance: "inferred",
        drivenChoice:
          "Low tatami and hinoki benches oriented outward toward the water basin; zero glare on viewing axis.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Kankyo Ongaku Environmental Waves",
        signal: "pure_sine, natural_reverb, water_integration",
        spatial_translation:
          "Water surface acts as high-frequency reflector balancing timber absorptive ceiling for crystal clear ambient soundscapes.",
      },
      {
        domain: "architecture",
        entity: "Engawa Verandah Boundary",
        signal: "indoor_outdoor_blur, threshold_dissolution",
        spatial_translation:
          "Covered wooden walkway encircling the room with open colonnade facing garden terrain.",
      },
      {
        domain: "lighting",
        entity: "Dappled Garden Sunlight (Komorebi)",
        signal: "leaf_shadow_play, gentle_contrast",
        spatial_translation:
          "Overhead timber pergola creating dynamic shadow stripes that drift across tatami mats.",
      },
    ],
    fallbackChoices: [
      {
        choice: "Slotted hinoki pergola spacing (0.24m)",
        reason:
          "Interpolated from Kyoto temple structures to balance solar shading and diffuse sky exposure.",
        provenance: "inferred",
      },
    ],
  },

  // ==========================================================================
  // 4. CHROME + CLUB CULTURE
  // ==========================================================================
  "chrome + club culture": {
    prompt: "Chrome + Club Culture",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["berlin techno", "electro", "idm", "industrial"],
      styleTags: ["y2k futurism", "mirror chrome", "obsidian terrazzo", "industrial"],
      themeTags: ["hypnotic repetition", "sound immersion", "chiaroscuro", "sub-bass"],
      adjectives: ["reflective", "heavy", "pulsing", "monolithic", "high-contrast"],
    },
    entities: [
      {
        id: "material_movement:y2k-futurism",
        name: "Y2K Chrome & Metallic Futurism",
        type: "design_movement",
        signals: [
          "high_gloss_mirror_chrome",
          "fluid_organic_metallics",
          "cold_reflections",
          "strobe_highlights",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Polished mirror-chrome columns and ceiling truss rails; liquid metal focal plinth; high metalness PBR surfaces.",
      },
      {
        id: "club:berghain-tresor",
        name: "Berlin Industrial Club Culture",
        type: "cultural_movement",
        signals: [
          "industrial_sound_containment",
          "sub_bass_monoliths",
          "no_photo_sanctuary",
          "heavy_curtains",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Sunken central dance floor bounded by obsidian terrazzo and acoustic felt baffles; zero exterior windows.",
      },
      {
        id: "artist:aphex-twin",
        name: "Aphex Twin / Richard D. James",
        type: "musician",
        signals: [
          "complex_drum_programming",
          "acid_synth_textures",
          "laser_precision",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Narrow 15° beam angle moving spotlights; cold 5600K key strobes with 2000K amber underglow.",
      },
      {
        id: "mood:hypnotic-sensory",
        name: "Hypnotic Industrial Immersion",
        type: "spatial_mood",
        signals: [
          "kinetic_strobe",
          "dark_containment",
          "bass_resonance",
        ],
        provenance: "inferred",
        drivenChoice:
          "High contrast chiaroscuro perimeter; 1.8m speaker stacks placed symmetrically in corners.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Sub-Bass 130BPM Shockwaves",
        signal: "low_end_punch, transient_snap",
        spatial_translation:
          "Heavy aggregate concrete walls prevent low-end standing waves; floor isolated on floating acoustic pads.",
      },
      {
        domain: "materials",
        entity: "Specularity vs Absorption",
        signal: "mirror_reflection, acoustic_deadness",
        spatial_translation:
          "Chrome highlights catch strobes while rear walls feature matte acoustic felt to maintain tight 0.52s RT60.",
      },
      {
        domain: "lighting",
        entity: "Strobe Chiaroscuro",
        signal: "strobe_burst, shadow_vacuum",
        spatial_translation:
          "5600K high-intensity narrow spotlights contrasting against pitch-black perimeter circulation rings.",
      },
    ],
    fallbackChoices: [
      {
        choice: "Industrial mesh safety balustrades",
        reason:
          "Safety egress requirements interpolated from commercial club assembly regulations.",
        provenance: "fallback",
      },
    ],
  },
  // ==========================================================================
  // 5. PINK GRUNGE EDITORIAL LOFT & FLASH STUDIO
  // ==========================================================================
  "pink grunge editorial loft & flash studio": {
    prompt: "Pink Grunge Editorial Loft & Flash Studio",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["90s Grunge", "Riot Grrrl", "Alternative Rock", "Shoegaze"],
      styleTags: ["Loft Architecture", "Punk Glam", "Industrial Editorial", "Distressed Chic"],
      themeTags: ["Subversive Elegance", "Raw Vulnerability", "High-Contrast Flash"],
      adjectives: ["visceral", "saturated-pink", "caustic", "unapologetic", "editorial"],
    },
    entities: [
      {
        id: "artist:hole-courtney-love",
        name: "Hole (Courtney Love)",
        type: "musician",
        signals: [
          "pink_grunge_aesthetic",
          "raw_distortion",
          "riot_grrrl_attitude",
          "distressed_femininity",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Blush and dusty punk-pink surfaces juxtaposed against dark charcoal grunge architecture.",
      },
      {
        id: "movement:90s-grunge-fashion",
        name: "90s Editorial Grunge Movement",
        type: "fashion_movement",
        signals: [
          "distressed_plaster",
          "raw_industrial_brick",
          "heavy_shadows",
          "flash_photography",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "Stacked weathered loft brick, exposed raw timber roof beams, and high-contrast flash lighting.",
      },
      {
        id: "style:editorial-photo-loft",
        name: "Commercial Editorial Photo Studio",
        type: "venue_typology",
        signals: [
          "cyclorama_curved_wall",
          "strobe_lighting_grids",
          "open_clear_span_loft",
          "mirror_chrome_accents",
        ],
        provenance: "sample-fixture",
        drivenChoice:
          "5600K daylight photographic strobe key lighting, central seamless cyclorama backdrop roll, and chrome studio hardware.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "fashion",
        entity: "90s Grunge Aesthetic",
        signal: "pink_satin_slip_with_combat_boots",
        spatial_translation:
          "Soft tufted velvet lounge seating in deep rose set against cold industrial concrete and weathered brick.",
      },
      {
        domain: "lighting",
        entity: "Editorial Monolight Strobe",
        signal: "5600k_hard_strobe_flash",
        spatial_translation:
          "High-elevation 5600K directional spotlights with sharp falloff replicating professional flash umbrellas.",
      },
    ],
    fallbackChoices: [
      {
        choice: "Acoustic absorption felt baffles behind cyclorama",
        reason:
          "Tuned Sabine RT60 to 0.52s to control industrial brick slap-back flutter echo.",
        provenance: "inferred",
      },
    ],
  },
};

/**
 * Resolves a prompt to its matching Qloo sample fixture if one exists.
 * Supports exact match, lowercased match, or key phrase detection.
 */
export function getQlooFixture(promptText: string): QlooContext | null {
  const clean = (promptText || "").trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct match
  if (QLOO_SAMPLE_FIXTURES[clean]) {
    return QLOO_SAMPLE_FIXTURES[clean];
  }

  // 2. Key phrases
  if (clean.includes("miles davis") || (clean.includes("jazz") && (clean.includes("brutal") || clean.includes("concrete")))) {
    return QLOO_SAMPLE_FIXTURES["jazz + brutalist architecture"];
  }
  if (clean.includes("aphex twin") || ((clean.includes("chrome") || clean.includes("club") || clean.includes("warehouse")) && (clean.includes("techno") || clean.includes("gallery")))) {
    return QLOO_SAMPLE_FIXTURES["chrome + club culture"];
  }
  if (clean.includes("pink") || clean.includes("grunge") || clean.includes("flash studio")) {
    return QLOO_SAMPLE_FIXTURES["pink grunge editorial loft & flash studio"];
  }
  if ((clean.includes("a24") || clean.includes("indie")) && (clean.includes("film") || clean.includes("music"))) {
    return QLOO_SAMPLE_FIXTURES["a24 films + indie music"];
  }
  if (clean.includes("garden") && (clean.includes("ambient") || clean.includes("japanese"))) {
    return QLOO_SAMPLE_FIXTURES["japanese gardens + ambient"];
  }
  if ((clean.includes("chrome") || clean.includes("club")) && (clean.includes("techno") || clean.includes("culture"))) {
    return QLOO_SAMPLE_FIXTURES["chrome + club culture"];
  }

  return null;
}
