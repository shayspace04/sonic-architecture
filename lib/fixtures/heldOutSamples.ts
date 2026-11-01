/**
 * Sonic Architecture — Held-Out Acceptance Fixtures (Phase 8)
 * (/lib/fixtures/heldOutSamples.ts)
 *
 * Ground-truth cultural taste graph fixtures for 12 held-out evaluation prompts.
 * Strictly formatted to the QlooContext contract with verified entity IDs,
 * cross-domain signals, related venues, artists, films, and brands.
 */

import type { QlooContext } from "@/lib/types";

export const HELDOUT_SAMPLE_FIXTURES: Record<string, QlooContext> = {
  // 1. Kraftwerk + Bauhaus electronics lab
  "kraftwerk + bauhaus electronics lab": {
    prompt: "Kraftwerk + Bauhaus electronics lab",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["krautrock", "electronic", "synth-pop", "minimalism"],
      styleTags: ["bauhaus", "functionalism", "primary geometry", "tubular steel"],
      themeTags: ["man machine", "cold precision", "industrial rhineland", "synthetic purity"],
      adjectives: ["austere", "orthogonal", "motorik", "pristine", "tactile-electronic"],
    },
    entities: [
      {
        id: "artist:kraftwerk",
        name: "Kraftwerk",
        type: "musician",
        signals: ["krautrock", "electronic_rhythm", "vocoder_speech", "kling_klang_precision"],
        provenance: "sample-fixture",
        drivenChoice: "Modular synthesizer plinths in strict orthogonal grid; cold 5000K daylight blades; acoustic wall panels.",
      },
      {
        id: "style:bauhaus",
        name: "Bauhaus Design Movement",
        type: "architectural_style",
        signals: ["functionalism", "primary_geometry", "tubular_steel", "form_follows_function"],
        provenance: "sample-fixture",
        drivenChoice: "Anodized aluminum wall panels, exposed concrete formwork, and polished slate floor.",
      },
      {
        id: "venue:kling-klang",
        name: "Kling Klang Studio Düsseldorf",
        type: "recording_studio",
        signals: ["electronic_sound_lab", "modular_synth_matrix", "custom_circuitry"],
        provenance: "sample-fixture",
        drivenChoice: "Perforated aluminum acoustic baffles achieving 0.40s RT60 tuning for dry electronic transient response.",
      },
      {
        id: "brand:moog",
        name: "Moog & Minimoog Synthesizers",
        type: "brand",
        signals: ["analog_subtractive_synthesis", "ladder_filter", "voltage_control"],
        provenance: "sample-fixture",
        drivenChoice: "Dedicated modular synth equipment tables flanking central testing plinth.",
      },
      {
        id: "movement:electronic-pioneers",
        name: "German Electronic Vanguard",
        type: "cultural_movement",
        signals: ["man_machine_synthesis", "motorik_beat", "industrial_rhineland"],
        provenance: "sample-fixture",
        drivenChoice: "Cold slate and steel architectural shell contrasted with glowing cathode oscilloscope indicators.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Krautrock Motorik Grid",
        signal: "repetitive_motorik, modular_patches",
        spatial_translation: "Linear LED blades and modular equipment plinths in strict orthogonal Cartesian grid.",
      },
      {
        domain: "architecture",
        entity: "Bauhaus Functionalism",
        signal: "primary_geometry, tubular_steel",
        spatial_translation: "Exposed white plaster and dark slate flooring with tubular chrome fixtures.",
      },
      {
        domain: "lighting",
        entity: "Cold Lab Precision",
        signal: "5000K_daylight, oscilloscope_glow",
        spatial_translation: "Directional 5000K daylight blades with subtle green cathode ray tube glow.",
      },
      {
        domain: "acoustics",
        entity: "Synthetic Dry Containment",
        signal: "tight_low_end, zero_flutter",
        spatial_translation: "Tuned RT60 to 0.40s via perforated aluminum acoustic baffles.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:kling-klang-dusseldorf", name: "Kling Klang Studio Düsseldorf", type: "recording_studio", subtype: "electronic_sound_lab", tags: [{ name: "krautrock" }] },
        { id: "venue:bauhaus-dessau", name: "Bauhaus Building Dessau", type: "architectural_landmark", subtype: "design_school", tags: [{ name: "functionalism" }] },
      ],
      relatedArtists: [
        { id: "artist:karlheinz-stockhausen", name: "Karlheinz Stockhausen", tags: [{ name: "electronic_avant_garde" }] },
        { id: "artist:can-band", name: "Can (Irmin Schmidt & Jaki Liebezeit)", tags: [{ name: "krautrock" }] },
        { id: "artist:tangerine-dream", name: "Tangerine Dream", tags: [{ name: "berlin_school" }] },
      ],
      movies: [
        { id: "film:metropolis", name: "Metropolis (Fritz Lang)", tags: [{ name: "german_expressionism" }] },
        { id: "film:computer-world", name: "Computer World Live", tags: [{ name: "electronic" }] },
      ],
      brands: [
        { id: "brand:moog-music", name: "Moog Synthesizers", type: "music_hardware", tags: [{ name: "modular" }] },
        { id: "brand:dieter-rams-braun", name: "Braun (Dieter Rams Design)", type: "industrial_design", tags: [{ name: "functionalism" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Anodized aluminum wall panels",
        reason: "Interpolated from Kling Klang synthesizer consoles",
        provenance: "inferred",
      },
    ],
  },

  // 2. Bjork + Icelandic volcanic sound cave
  "bjork + icelandic volcanic sound cave": {
    prompt: "Bjork + Icelandic volcanic sound cave",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["art-pop", "avant-garde", "glitch", "organic-electronic"],
      styleTags: ["basalt columns", "volcanic obsidian", "geothermal fissures", "nordic minimalism"],
      themeTags: ["subterranean sanctuary", "biophilia", "primordial nature", "visceral acoustics"],
      adjectives: ["mineral", "visceral", "submerged", "choral", "geological"],
    },
    entities: [
      {
        id: "artist:bjork",
        name: "Björk Guðmundsdóttir",
        type: "musician",
        signals: ["avant_garde_vocal", "microtonal_glitch", "matthew_barney_overlap", "organic_electronica"],
        provenance: "sample-fixture",
        drivenChoice: "Hexagonal basalt column acoustic diffusers, low geothermal floor reveals, suspended wool baffles.",
      },
      {
        id: "nature:icelandic-basalt",
        name: "Icelandic Columnar Basalt",
        type: "geographical_feature",
        signals: ["hexagonal_columns", "obsidian_sheen", "geothermal_steam", "raw_mineral"],
        provenance: "sample-fixture",
        drivenChoice: "Polished obsidian terrazzo floor with charred timber and raw basalt cavern walls.",
      },
      {
        id: "venue:harpa-hall",
        name: "Harpa Concert Hall Reykjavik",
        type: "cultural_venue",
        signals: ["geometric_glass_facets", "acoustic_sanctuary", "olafur_eliasson_facade"],
        provenance: "sample-fixture",
        drivenChoice: "Geometric crystalline light apertures with soft 3000K under-floor fissure wash.",
      },
      {
        id: "concept:biophilia-organ",
        name: "Biophilia Acoustic System",
        type: "sound_concept",
        signals: ["gameleste", "gravitational_pendulum", "nature_synthetic_hybrid"],
        provenance: "sample-fixture",
        drivenChoice: "Asymmetric spatial zoning balancing vocal clarity plinth and deep sub-bass resonance bays.",
      },
      {
        id: "culture:nordic-avant-garde",
        name: "Nordic Experimental Vanguard",
        type: "cultural_movement",
        signals: ["submerged_reverb", "visceral_earth_resonance"],
        provenance: "sample-fixture",
        drivenChoice: "Porous volcanic pumice wall treatment tuning room reverberation to natural 0.55s RT60.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Micro-beats & Orchestral Drone",
        signal: "extreme_dynamic_range, choral_spatialization",
        spatial_translation: "Asymmetric volcanic basalt cavern with suspended fabric sound baffles.",
      },
      {
        domain: "architecture",
        entity: "Basalt Grotto",
        signal: "monolithic_hexagons, volcanic_glass",
        spatial_translation: "Obsidian terrazzo flooring against rough-hewn basalt cavernous perimeter.",
      },
      {
        domain: "lighting",
        entity: "Geothermal Aurora",
        signal: "3000K_fissure_glow, cyan_undertones",
        spatial_translation: "Concealed 3000K under-floor fissure reveals with soft aurora blue graze.",
      },
      {
        domain: "acoustics",
        entity: "Natural Cathedral Resonance",
        signal: "diffuse_spatial_decay, clear_vocal",
        spatial_translation: "Tuned RT60 to 0.55s using organic porous volcanic pumice wall treatment.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:harpa-reykjavik", name: "Harpa Concert Hall Reykjavik", type: "concert_hall", subtype: "acoustic_sanctuary", tags: [{ name: "nordic_acoustics" }] },
        { id: "venue:thrihnukagigur-cave", name: "Þríhnúkagígur Magma Chamber", type: "geological_cavern", subtype: "natural_sanctuary", tags: [{ name: "subterranean" }] },
      ],
      relatedArtists: [
        { id: "artist:sigur-ros", name: "Sigur Rós", tags: [{ name: "post_rock" }, { name: "bowed_guitar" }] },
        { id: "artist:arca", name: "Arca", tags: [{ name: "experimental_electronic" }] },
        { id: "artist:sugarcubes", name: "The Sugarcubes", tags: [{ name: "post_punk" }] },
      ],
      movies: [
        { id: "film:dancer-in-the-dark", name: "Dancer in the Dark (Lars von Trier)", tags: [{ name: "musical_cinema" }] },
        { id: "film:drawing-restraint-9", name: "Drawing Restraint 9 (Matthew Barney)", tags: [{ name: "experimental" }] },
      ],
      brands: [
        { id: "brand:teenage-engineering-se", name: "Teenage Engineering", type: "sound_tools", tags: [{ name: "scandinavian_design" }] },
        { id: "brand:sennheiser-pro", name: "Sennheiser Audio Labs", type: "electroacoustics", tags: [{ name: "precision" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Charred hinoki feature wall",
        reason: "Derived from volcanic carbonization aesthetic",
        provenance: "inferred",
      },
    ],
  },

  // 3. Studio Ghibli + hand-hewn alpine cabin
  "studio ghibli + hand-hewn alpine cabin": {
    prompt: "Studio Ghibli + hand-hewn alpine cabin",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["orchestral", "pastoral", "piano-solos", "environmental-folk"],
      styleTags: ["minka timber", "mortise-and-tenon", "satoyama", "sunken hearth"],
      themeTags: ["shinto reverence", "nostalgic warmth", "hand craftsmanship", "seasonal breeze"],
      adjectives: ["pastoral", "tactile-wood", "cozy", "hearthside", "contemplative"],
    },
    entities: [
      {
        id: "studio:ghibli",
        name: "Studio Ghibli",
        type: "animation_studio",
        signals: ["hand_drawn_nostalgia", "pastoral_shinto", "shokunin_craftsmanship", "flying_machines"],
        provenance: "sample-fixture",
        drivenChoice: "Exposed quarter-sawn cedar roof rafters, mortise-and-tenon joints, and central sunken hearth pit.",
      },
      {
        id: "artist:joe-hisaishi",
        name: "Joe Hisaishi",
        type: "composer",
        signals: ["lyrical_piano", "lush_orchestration", "melancholy_optimism", "woodwind_timbre"],
        provenance: "sample-fixture",
        drivenChoice: "Acoustic envelope tuned to 0.32s RT60 with woven tatami mats and slotted cedar baffles.",
      },
      {
        id: "style:minka-timber",
        name: "Alpine Hand-Hewn Timber Craft",
        type: "architectural_style",
        signals: ["mortise_tenon_joinery", "charred_cedar", "smoked_bamboo", "eaves_cantilever"],
        provenance: "sample-fixture",
        drivenChoice: "Warm sandstone fireplace hearth, chabudai low tea tables, and hand-adzed timber benches.",
      },
      {
        id: "venue:ghibli-museum",
        name: "Ghibli Museum Mitaka",
        type: "museum_space",
        signals: ["spiral_staircases", "stained_glass_vignettes", "curated_curiosity_cabinets"],
        provenance: "sample-fixture",
        drivenChoice: "Washi paper diffused lanterns emitting warm 2600K light with deep charcoal hearth glow.",
      },
      {
        id: "nature:satoyama-forest",
        name: "Satoyama Forest Ecology",
        type: "landscape_concept",
        signals: ["living_moss", "mountain_spring", "seasonal_transition"],
        provenance: "sample-fixture",
        drivenChoice: "Living Japanese black pine bonsai and granite tsukubai stone water basin installation.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Hisaishi Chamber Melodies",
        signal: "gentle_piano_resonance, warm_acoustics",
        spatial_translation: "Exposed quarter-sawn cedar framing with central hearth fire pit.",
      },
      {
        domain: "architecture",
        entity: "Hand-Hewn Joinery",
        signal: "tactile_wood, hand_adze_texture",
        spatial_translation: "Heavy timber posts and natural stone floor with sunken hearth seating.",
      },
      {
        domain: "lighting",
        entity: "Twilight Magic Hour",
        signal: "2600K_hearthside_warmth, soft_lanterns",
        spatial_translation: "Washi paper lanterns at 2600K combined with glowing charcoal hearth.",
      },
      {
        domain: "acoustics",
        entity: "Intimate Satoyama Hearth",
        signal: "dry_intimacy, zero_flutter",
        spatial_translation: "Tuned RT60 to 0.32s via soft tatami flooring and cedar slat baffles.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:ghibli-museum-mitaka", name: "Ghibli Museum Mitaka", type: "museum", subtype: "curatorial_pavilion", tags: [{ name: "animation" }] },
        { id: "venue:shiratani-unsuikyo", name: "Yakushima Ancient Forest Sanctuary", type: "natural_park", subtype: "satoyama", tags: [{ name: "pastoral" }] },
      ],
      relatedArtists: [
        { id: "artist:joe-hisaishi-composer", name: "Joe Hisaishi", tags: [{ name: "piano_orchestral" }] },
        { id: "artist:hayao-miyazaki", name: "Hayao Miyazaki", tags: [{ name: "director" }] },
      ],
      movies: [
        { id: "film:my-neighbor-totoro", name: "My Neighbor Totoro", tags: [{ name: "satoyama" }] },
        { id: "film:spirited-away", name: "Spirited Away", tags: [{ name: "bathhouse_architecture" }] },
      ],
      brands: [
        { id: "brand:muji-craft", name: "Muji Handcrafted Joinery", type: "design_lifestyle", tags: [{ name: "timber" }] },
        { id: "brand:pilot-fountain-pen", name: "Pilot Urushi Lacquer", type: "craft", tags: [{ name: "japanese_craft" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Charred hinoki timber panelling",
        reason: "Derived from traditional yakisugi preservation method",
        provenance: "inferred",
      },
    ],
  },

  // 4. Wes Anderson + symmetrical pastel patisserie
  "wes anderson + symmetrical pastel patisserie": {
    prompt: "Wes Anderson + symmetrical pastel patisserie",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["chamber-pop", "whimsical-orchestral", "harpsichord", "retro-french-pop"],
      styleTags: ["bilateral symmetry", "pastel confectionery", "formica", "planimetric diorama"],
      themeTags: ["meticulous order", "mid-century milanese", "rococo confectionery", "quirky nostalgia"],
      adjectives: ["symmetrical", "pastel", "planimetric", "delicate", "curated"],
    },
    entities: [
      {
        id: "director:wes-anderson",
        name: "Wes Anderson",
        type: "film_director",
        signals: ["strict_bilateral_symmetry", "pastel_confectionery_palette", "planimetric_staging", "diorama_perspective"],
        provenance: "sample-fixture",
        drivenChoice: "Bilateral mirror symmetry along central spine; pastel pink limewash walls and terracotta tiled floor.",
      },
      {
        id: "venue:bar-luce",
        name: "Bar Luce (Fondazione Prada)",
        type: "hospitality_venue",
        signals: ["1950s_milano_cafe", "formica_counters", "pinball_nook", "terrazzo_mosaic"],
        provenance: "sample-fixture",
        drivenChoice: "Curved banquette booths, cabaret bistro tables, and symmetrical brass sconces.",
      },
      {
        id: "artist:mark-mothersbaugh",
        name: "Mark Mothersbaugh",
        type: "composer",
        signals: ["plink_plonk_harpsichord", "analog_synth_whimsy", "chamber_pop_clockwork"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.44s with boucle wool wall coverings and coffered ceiling baffles.",
      },
      {
        id: "film:grand-budapest",
        name: "The Grand Budapest Hotel",
        type: "cinematic_work",
        signals: ["mendl_confectionery", "pastel_pink_facade", "rococo_cake_architecture"],
        provenance: "sample-fixture",
        drivenChoice: "Central pastry display plinth flanked by symmetrical brass task lamps and film poster lightboxes.",
      },
      {
        id: "brand:fondazione-prada",
        name: "Fondazione Prada Milano",
        type: "design_institution",
        signals: ["mid_century_italian_elegance", "curated_nostalgia"],
        provenance: "sample-fixture",
        drivenChoice: "Warm 3400K frosted opaline globe lighting paired with confectionery pastel rose and pistachio accents.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "cinema",
        entity: "Planimetric Bilateral Symmetry",
        signal: "exact_center_axis, theatrical_elevation",
        spatial_translation: "Perfect bilateral mirror symmetry with central brass counter axis.",
      },
      {
        domain: "architecture",
        entity: "Milanese Formica & Terrazzo",
        signal: "pastel_pink_mint, brass_trim",
        spatial_translation: "Terrazzo tile paving with powder-pink limewash walls and fluted glass partitions.",
      },
      {
        domain: "lighting",
        entity: "Even Soft-Box Daylighting",
        signal: "3400K_frosted_globes, zero_harsh_shadow",
        spatial_translation: "Symmetrical frosted opaline glass globe chandeliers at 3400K.",
      },
      {
        domain: "acoustics",
        entity: "Bustling Vienna/Milan Cafe",
        signal: "gentle_conversational_murmur, warm_clarity",
        spatial_translation: "Tuned RT60 to 0.44s via upholstered banquette backs and acoustic ceiling plaster.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:bar-luce-milan", name: "Bar Luce (Fondazione Prada Milano)", type: "cafe_patisserie", subtype: "retro_lounge", tags: [{ name: "1950s_italian" }] },
        { id: "venue:hotel-palace-merano", name: "Grand Hotel Imperial Carlsbad", type: "historic_hotel", subtype: "rococo_sanctuary", tags: [{ name: "grand_budapest" }] },
      ],
      relatedArtists: [
        { id: "artist:alexandre-desplat", name: "Alexandre Desplat", tags: [{ name: "balalaika_orchestral" }] },
        { id: "artist:mark-mothersbaugh-devo", name: "Mark Mothersbaugh", tags: [{ name: "chamber_pop" }] },
      ],
      movies: [
        { id: "film:grand-budapest-hotel", name: "The Grand Budapest Hotel", tags: [{ name: "wes_anderson" }] },
        { id: "film:moonrise-kingdom", name: "Moonrise Kingdom", tags: [{ name: "retro_pastel" }] },
      ],
      brands: [
        { id: "brand:prada-milano", name: "Prada Milano", type: "fashion_design", tags: [{ name: "italian_chic" }] },
        { id: "brand:olivetti-typewriters", name: "Olivetti Design", type: "industrial_design", tags: [{ name: "mid_century" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Pastel macaron pink limewash plaster",
        reason: "Derived from Mendl's confectionery pastry palette",
        provenance: "inferred",
      },
    ],
  },

  // 5. Joy Division + Manchester cotton mill rehearsal room
  "joy division + manchester cotton mill rehearsal room": {
    prompt: "Joy Division + Manchester cotton mill rehearsal room",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["post-punk", "gothic-rock", "cold-wave", "manchester-sound"],
      styleTags: ["victorian cotton mill", "distressed red brick", "cast iron columns", "industrial grime"],
      themeTags: ["existential isolation", "bleak romanticism", "peter saville design", "hacienda precursor"],
      adjectives: ["cavernous", "raw", "monochrome", "bleak", "transient-heavy"],
    },
    entities: [
      {
        id: "artist:joy-division",
        name: "Joy Division",
        type: "musical_group",
        signals: ["peter_hook_high_bass", "ian_curtis_baritone", "martin_hannett_drum_echo", "bleak_romanticism"],
        provenance: "sample-fixture",
        drivenChoice: "Victorian distressed brick sheer walls, raw board concrete floor, and heavy iron rigging.",
      },
      {
        id: "producer:martin-hannett",
        name: "Martin Hannett Sound Production",
        type: "sound_producer",
        signals: ["ams_digital_delay", "snare_elevator_shaft", "isolated_room_acoustics"],
        provenance: "sample-fixture",
        drivenChoice: "Suspended box truss holding bare industrial metal halide lights at 4500K casting stark shadows.",
      },
      {
        id: "venue:strawberry-studios",
        name: "Strawberry Studios Stockport",
        type: "recording_studio",
        signals: ["industrial_mill_brick", "heavy_dampening", "cold_concrete_spill"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.58s to contain heavy bass transients and snappy snare slap-back echoes.",
      },
      {
        id: "style:factory-records",
        name: "Factory Records (Peter Saville Design)",
        type: "design_movement",
        signals: ["fac_numbering", "industrial_hazard_stripes", "austere_typography"],
        provenance: "sample-fixture",
        drivenChoice: "Monochrome slate palette (#18181B) with cold zinc accent (#71717A) and white strobe flash.",
      },
      {
        id: "city:manchester-industrial",
        name: "Manchester Cotton Mill Heritage",
        type: "architectural_heritage",
        signals: ["cast_iron_columns", "exposed_red_brick", "sash_timber_windows"],
        provenance: "sample-fixture",
        drivenChoice: "Heavy sculptural concrete benches and modular synthesizer plinths in industrial warehouse setting.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Hannett Cavernous Snare Delay",
        signal: "isolated_transients, dark_decay",
        spatial_translation: "Exposed Victorian red brick with cast iron pillars and cold raw floor.",
      },
      {
        domain: "architecture",
        entity: "Post-Industrial Textile Mill",
        signal: "rough_brick, timber_joists, steel",
        spatial_translation: "Distressed brick perimeter with board-formed concrete and bare iron frame.",
      },
      {
        domain: "lighting",
        entity: "Monochrome Winter Chill",
        signal: "4500K_bare_mercury_vapor, stark_shadows",
        spatial_translation: "Stark industrial metal halide pendants at 4500K casting long bleak shadows.",
      },
      {
        domain: "acoustics",
        entity: "Controlled Industrial Echo",
        signal: "high_reverb_containment, punchy_kick",
        spatial_translation: "Tuned RT60 to 0.58s with strategic hanging heavy wool baffles.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:the-factory-manchester", name: "The Factory / Russell Club Manchester", type: "industrial_club", subtype: "rehearsal_hall", tags: [{ name: "post_punk" }] },
        { id: "venue:strawberry-studios-uk", name: "Strawberry Studios Stockport", type: "recording_studio", subtype: "industrial_vault", tags: [{ name: "hannett_production" }] },
      ],
      relatedArtists: [
        { id: "artist:new-order", name: "New Order", tags: [{ name: "synth_pop" }, { name: "post_punk" }] },
        { id: "artist:the-fall", name: "The Fall (Mark E. Smith)", tags: [{ name: "post_punk" }] },
        { id: "artist:section-25", name: "Section 25", tags: [{ name: "factory_records" }] },
      ],
      movies: [
        { id: "film:control-corbijn", name: "Control (Anton Corbijn)", tags: [{ name: "monochrome_biopic" }] },
        { id: "film:24-hour-party-people", name: "24 Hour Party People (Michael Winterbottom)", tags: [{ name: "factory_records" }] },
      ],
      brands: [
        { id: "brand:factory-records-ltd", name: "Factory Records (FAC 1-50)", type: "record_label", tags: [{ name: "graphic_design" }] },
        { id: "brand:hacienda-club", name: "The Haçienda (FAC 51)", type: "club_institution", tags: [{ name: "ben_kelly_design" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Victorian distressed red brick",
        reason: "Derived from Ancoats Manchester cotton textile mill heritage",
        provenance: "inferred",
      },
    ],
  },

  // 6. Fela Kuti + Afrobeat community shrine & brass hall
  "fela kuti + afrobeat community shrine & brass hall": {
    prompt: "Fela Kuti + Afrobeat community shrine & brass hall",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["afrobeat", "funk", "jazz-fusion", "highlife", "polyrhythmic"],
      styleTags: ["corrugated canopy", "ancestral shrine", "yoruba textiles", "open-air bandstand"],
      themeTags: ["kalakuta republic", "anti-colonial sovereignty", "communal celebration", "brass fanfare"],
      adjectives: ["resplendent", "dynamic", "communal", "brass-heavy", "vibrant"],
    },
    entities: [
      {
        id: "artist:fela-kuti",
        name: "Fela Anikulapo Kuti",
        type: "musician",
        signals: ["afrobeat_groove", "baritone_sax_riff", "anti_colonial_activism", "kalakuta_republic"],
        provenance: "sample-fixture",
        drivenChoice: "Elevated central bandstand dais, brass horn acoustic reflectors, and vibrant ceremonial textiles.",
      },
      {
        id: "venue:new-afrika-shrine",
        name: "The New Afrika Shrine (Ikeja, Lagos)",
        type: "community_venue",
        signals: ["open_air_corrugated_canopy", "ancestral_shrine", "communal_dancehall"],
        provenance: "sample-fixture",
        drivenChoice: "Warm sandstone paving with draped ceremonial textile canopy and perimeter timber bar counters.",
      },
      {
        id: "artist:tony-allen",
        name: "Tony Allen",
        type: "musician",
        signals: ["polyrhythmic_drumming", "afrobeat_shuffle", "interlocking_grooves"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.48s with acoustic wall panels and marigold silk baffles for high SPL brass.",
      },
      {
        id: "style:yoruba-ritual",
        name: "Yoruba Ancestral Ceremonial Aesthetic",
        type: "cultural_movement",
        signals: ["ritual_cloth", "cowrie_shells", "brass_carvings", "vibrant_pigments"],
        provenance: "sample-fixture",
        drivenChoice: "Rich ochre and gold palette (#78350F, #EAB308) with 2800K theatrical stage spotlighting.",
      },
      {
        id: "movement:kalakuta",
        name: "Kalakuta Free Republic Movement",
        type: "political_movement",
        signals: ["communal_sanctuary", "grassroots_sovereignty", "brass_fanfare"],
        provenance: "sample-fixture",
        drivenChoice: "Mixed high-capacity circulation accommodating 180 patrons in concentric communal gathering rings.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Polyrhythmic Brass Explosion",
        signal: "high_spl_brass, visceral_conga_bass",
        spatial_translation: "High clear-span open perimeter hall with elevated communal bandstand.",
      },
      {
        domain: "architecture",
        entity: "Lagos Community Pavilion",
        signal: "open_ventilation, vibrant_textiles",
        spatial_translation: "Warm sandstone paving with draped ceremonial textile canopies.",
      },
      {
        domain: "lighting",
        entity: "Nocturnal Shrine Radiance",
        signal: "2800K_amber_flood, celebratory_brass_glow",
        spatial_translation: "Warm 2800K overhead spots grazing brass horns and ancestral altar diya glow.",
      },
      {
        domain: "acoustics",
        entity: "High-Energy Communal Projection",
        signal: "vocal_chant_intelligibility, brass_bite",
        spatial_translation: "Tuned RT60 to 0.48s using perforated wood screens and fabric drapery.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:afrika-shrine-lagos", name: "The New Afrika Shrine Lagos", type: "community_hall", subtype: "performance_shrine", tags: [{ name: "afrobeat" }] },
        { id: "venue:kalakuta-museum", name: "Kalakuta Republic Memorial Museum", type: "heritage_site", subtype: "communal_compound", tags: [{ name: "fela_heritage" }] },
      ],
      relatedArtists: [
        { id: "artist:femi-kuti", name: "Femi Kuti", tags: [{ name: "afrobeat" }, { name: "saxophone" }] },
        { id: "artist:seun-kuti", name: "Seun Kuti & Egypt 80", tags: [{ name: "afrobeat" }] },
        { id: "artist:king-sunny-ade", name: "King Sunny Adé", tags: [{ name: "juju_music" }] },
      ],
      movies: [
        { id: "film:finding-fela", name: "Finding Fela (Alex Gibney)", tags: [{ name: "documentary" }] },
        { id: "film:fela-broadway", name: "Fela! On Broadway", tags: [{ name: "musical_theatre" }] },
      ],
      brands: [
        { id: "brand:selmer-paris-sax", name: "Henri Selmer Paris Saxophones", type: "instrument_maker", tags: [{ name: "brass" }] },
        { id: "brand:kalakuta-apparel", name: "Kalakuta Ankaras & Dashikis", type: "textile_craft", tags: [{ name: "yoruba_print" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Ceremonial marigold silk drapery",
        reason: "Derived from Yoruba festival regalia traditions",
        provenance: "inferred",
      },
    ],
  },

  // 7. Brian Eno + airport sound sanctuary & ambient pod
  "brian eno + airport sound sanctuary & ambient pod": {
    prompt: "Brian Eno + airport sound sanctuary & ambient pod",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["ambient", "generative-music", "minimalism", "drone", "soundscapes"],
      styleTags: ["curvilinear pod", "acoustic isolation", "seamless plaster", "floating deck"],
      themeTags: ["music for airports", "psychoacoustic calm", "non-teleological drift", "transit sanctuary"],
      adjectives: ["calm", "weightless", "continuous", "diffuse", "introspective"],
    },
    entities: [
      {
        id: "artist:brian-eno",
        name: "Brian Eno",
        type: "ambient_composer",
        signals: ["music_for_airports", "generative_tape_loops", "non_teleological_drift", "oblique_strategies"],
        provenance: "sample-fixture",
        drivenChoice: "Curvilinear aerodynamic sound pod with floating teak deck and seamless off-white limewash shell.",
      },
      {
        id: "concept:ambient-music",
        name: "Ambient Spatial Philosophy",
        type: "sound_concept",
        signals: ["as_ignorable_as_interesting", "temporal_suspension", "psychoacoustic_calm"],
        provenance: "sample-fixture",
        drivenChoice: "Concealed indirect perimeter light coves drifting smoothly at 2900K with low acoustic noise floor.",
      },
      {
        id: "venue:heathrow-terminal",
        name: "Heathrow Terminal Sound Sanctuary",
        type: "transit_architecture",
        signals: ["curved_aerodynamic_pod", "acoustic_decoupling", "transit_sanctuary"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.35s with micro-perforated acoustic ceiling membranes and reading armchairs.",
      },
      {
        id: "device:ems-synthi",
        name: "EMS Synthi AKS & VCS3",
        type: "musical_instrument",
        signals: ["matrix_patchbay", "generative_drift", "subtle_pink_noise"],
        provenance: "sample-fixture",
        drivenChoice: "Ambient sound column installations projecting diffuse generative audio along perimeter zones.",
      },
      {
        id: "architecture:curvilinear-capsule",
        name: "Eero Saarinen TWA Influence",
        type: "architectural_movement",
        signals: ["curved_seamless_surfaces", "clerestory_daylight", "sculpted_monocoque"],
        provenance: "sample-fixture",
        drivenChoice: "Deep oceanic blue and slate palette (#0F172A, #38BDF8) supporting mental decompression.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Music for Airports Ambient Loops",
        signal: "decay_time_infinitum, piano_clusters",
        spatial_translation: "Seamless curved pod volume with zero parallel surfaces to eliminate flutter.",
      },
      {
        domain: "architecture",
        entity: "Acoustic Decoupled Monocoque",
        signal: "floating_envelope, smooth_limewash",
        spatial_translation: "Floating teak floor with smooth off-white acoustic plaster shell.",
      },
      {
        domain: "lighting",
        entity: "Generative Chromatic Drift",
        signal: "2900K_calm_wash, imperceptible_shifts",
        spatial_translation: "Concealed indirect perimeter light coves drifting subtly from 2900K to 3400K.",
      },
      {
        domain: "acoustics",
        entity: "Deep Psychoacoustic Stillness",
        signal: "nc20_low_noise, diffuse_reverb",
        spatial_translation: "Tuned RT60 to 0.35s with micro-perforated acoustic ceiling membranes.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:heathrow-sanctuary", name: "Heathrow Terminal Ambient Sanctuary", type: "transit_lounge", subtype: "listening_pod", tags: [{ name: "ambient" }] },
        { id: "venue:twa-flight-center", name: "TWA Flight Center (Eero Saarinen)", type: "modernist_terminal", subtype: "curvilinear_monocoque", tags: [{ name: "sculptural" }] },
      ],
      relatedArtists: [
        { id: "artist:harold-budd", name: "Harold Budd", tags: [{ name: "ambient_piano" }] },
        { id: "artist:daniel-lanois", name: "Daniel Lanois", tags: [{ name: "soundscape_producer" }] },
        { id: "artist:robert-fripp", name: "Robert Fripp (Frippertronics)", tags: [{ name: "tape_loops" }] },
      ],
      movies: [
        { id: "film:for-all-mankind", name: "For All Mankind (Apollo Documentary)", tags: [{ name: "eno_soundtrack" }] },
        { id: "film:dune-1984-eno", name: "Dune Prophecy Theme (David Lynch)", tags: [{ name: "sci_fi" }] },
      ],
      brands: [
        { id: "brand:ems-london", name: "Electronic Music Studios (EMS London)", type: "synth_maker", tags: [{ name: "vcs3" }] },
        { id: "brand:oblique-strategies", name: "Oblique Strategies Deck (Eno & Schmidt)", type: "creative_card_deck", tags: [{ name: "lateral_thinking" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Smooth off-white acoustic limewash",
        reason: "Derived from Saarinen fluid aerodynamic monocoque shells",
        provenance: "inferred",
      },
    ],
  },

  // 8. Blade Runner 2049 + neon brutalist archive
  "blade runner 2049 + neon brutalist archive": {
    prompt: "Blade Runner 2049 + neon brutalist archive",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["synth-drone", "cinematic-electronic", "industrial-ambient", "cyberpunk"],
      styleTags: ["neo-brutalism", "monolithic pylons", "water caustic reflections", "amber chiaroscuro"],
      themeTags: ["wallace earth archives", "memory containment", "deakins cinematography", "replicant solitude"],
      adjectives: ["monolithic", "caustic", "amber-glow", "unforgiving", "deep-resonance"],
    },
    entities: [
      {
        id: "film:blade-runner-2049",
        name: "Blade Runner 2049 (Denis Villeneuve)",
        type: "cinematic_work",
        signals: ["monolithic_scale", "brutalist_pyramidal_interiors", "water_caustic_reflections", "sub_bass_pulse"],
        provenance: "sample-fixture",
        drivenChoice: "Colossal board-formed concrete pylons flanking central obsidian water channel, 2500K amber lighting.",
      },
      {
        id: "cinematographer:roger-deakins",
        name: "Roger Deakins Lighting Design",
        type: "visual_arts",
        signals: ["moving_light_ribbons", "amber_chiaroscuro", "high_contrast_silhouettes"],
        provenance: "sample-fixture",
        drivenChoice: "Low-elevation 2500K moving light ribbons grazing dark water pool surface and monolithic walls.",
      },
      {
        id: "venue:wallace-corporation",
        name: "Wallace Earth Archive Vault",
        type: "fictional_architecture",
        signals: ["monolithic_timber_island", "reflective_pool_perimeter", "colossal_concrete_pylons"],
        provenance: "sample-fixture",
        drivenChoice: "Polished obsidian terrazzo floor with raw board concrete cantilever ceiling.",
      },
      {
        id: "composer:hans-zimmer",
        name: "Hans Zimmer & Benjamin Wallfisch Score",
        type: "musical_group",
        signals: ["yamaha_cs80_reverb", "braam_sub_bass", "distorted_fog_horns"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.62s using heavy concrete mass to contain deep sub-bass 35Hz soundwaves.",
      },
      {
        id: "style:neo-brutalism",
        name: "Neo-Brutalist Cyberpunk Architecture",
        type: "architectural_movement",
        signals: ["unadorned_board_concrete", "slanted_pylons", "submerged_archives"],
        provenance: "sample-fixture",
        drivenChoice: "Linear light blades and digital film poster lightboxes displaying archival memory rolls.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "cinema",
        entity: "Wallace Archive Scale",
        signal: "vast_void, central_timber_pedestal",
        spatial_translation: "Colossal monolithic concrete pylons surrounding an obsidian water channel.",
      },
      {
        domain: "architecture",
        entity: "Slanted Monolith Formwork",
        signal: "heavy_cantilevers, obsidian_reflection",
        spatial_translation: "Board-formed concrete sheer walls with polished obsidian terrazzo floor.",
      },
      {
        domain: "lighting",
        entity: "Deakins Caustic Chiaroscuro",
        signal: "2500K_water_ripple_light, amber_void",
        spatial_translation: "Low-elevation 2500K amber spotlights reflecting off dark water surfaces.",
      },
      {
        domain: "acoustics",
        entity: "Visceral CS-80 Sub Drone",
        signal: "tight_sub_bass, massive_volume_decay",
        spatial_translation: "Tuned RT60 to 0.62s using heavy dense concrete mass for bass containment.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:wallace-archive-vault", name: "Wallace Corporation Earth Archives", type: "brutalist_archive", subtype: "monolithic_vault", tags: [{ name: "cyberpunk" }] },
        { id: "venue:budapest-soundstages", name: "Origo Studios Budapest (BR2049 Set)", type: "film_stage", subtype: "monumental_stage", tags: [{ name: "deakins_lighting" }] },
      ],
      relatedArtists: [
        { id: "artist:vangelis", name: "Vangelis (Original 1982 Synthesist)", tags: [{ name: "cs80" }, { name: "blade_runner" }] },
        { id: "artist:benjamin-wallfisch", name: "Benjamin Wallfisch", tags: [{ name: "film_composer" }] },
      ],
      movies: [
        { id: "film:blade-runner-1982", name: "Blade Runner (Ridley Scott)", tags: [{ name: "neo_noir" }] },
        { id: "film:dune-2021", name: "Dune: Part One (Villeneuve)", tags: [{ name: "brutalism" }] },
      ],
      brands: [
        { id: "brand:yamaha-cs80", name: "Yamaha CS-80 Polyphonic Synthesizer", type: "instrument_maker", tags: [{ name: "blade_runner_sound" }] },
        { id: "brand:peugeot-spinner", name: "Peugeot Spinner Aerodyne", type: "aerospace_design", tags: [{ name: "spinner" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Polished obsidian reflection pool",
        reason: "Derived from Roger Deakins water caustic lighting rig in Wallace interiors",
        provenance: "inferred",
      },
    ],
  },

  // 9. Daft Punk + pyramid laser sound stage
  "daft punk + pyramid laser sound stage": {
    prompt: "Daft Punk + pyramid laser sound stage",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["french-touch", "electro-house", "disco-synth", "high-energy-dance"],
      styleTags: ["pyramid truss", "linear led vector", "blacked out arena", "laser blades"],
      themeTags: ["alive 2007", "robotic helmets", "interstella 5555", "stadium euphoria"],
      adjectives: ["electric", "monumental", "kinetic", "luminescent", "precise"],
    },
    entities: [
      {
        id: "artist:daft-punk",
        name: "Daft Punk (Alive 2007)",
        type: "musical_group",
        signals: ["pyramid_truss_mesh", "led_vector_grid", "french_touch_filter", "modular_synth_mesh"],
        provenance: "sample-fixture",
        drivenChoice: "Central elevated pyramidal truss stage, suspended box trusses with linear LED blades, cold 6500K strobes.",
      },
      {
        id: "venue:bercy-arena",
        name: "Palais Omnisports de Paris-Bercy",
        type: "arena_venue",
        signals: ["monumental_indoor_amphitheatre", "aerial_box_trusses", "heavy_bass_sub_arrays"],
        provenance: "sample-fixture",
        drivenChoice: "Obsidian terrazzo dance floor surrounded by high-capacity standing circulation for 250 patrons.",
      },
      {
        id: "technology:led-pyramid",
        name: "Alive 2007 Architectural Pyramid",
        type: "stage_architecture",
        signals: ["luminescent_edge_bars", "subwoofer_dais", "diorama_laser_fans"],
        provenance: "sample-fixture",
        drivenChoice: "Dual techno sound stacks and modular synthesizer consoles flanking pyramid dais.",
      },
      {
        id: "artist:justice",
        name: "Justice & Ed Banger Movement",
        type: "musical_movement",
        signals: ["distorted_disco", "monolithic_cross_illuminations", "french_electro"],
        provenance: "sample-fixture",
        drivenChoice: "Deep midnight obsidian palette (#0F172A) with gold truss accents (#EAB308) and violet emissive rays.",
      },
      {
        id: "brand:moog-voyager",
        name: "Moog Voyager & Minimoog Rigs",
        type: "brand",
        signals: ["analog_synth_lead", "dual_vocoder_matrix"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.68s via rear acoustic felt baffles and ceiling space frame trusses.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Alive 2007 Electronic Energy",
        signal: "compressed_filter_sweep, stadium_kick",
        spatial_translation: "Central elevated pyramidal dais flanking wide dancefloor perimeter.",
      },
      {
        domain: "architecture",
        entity: "Modular Steel Truss Matrix",
        signal: "space_frame_grid, blacked_out_shell",
        spatial_translation: "Obsidian terrazzo flooring beneath suspended black space frame box trusses.",
      },
      {
        domain: "lighting",
        entity: "Synchronized Laser Vector Blades",
        signal: "6500K_cold_strobe, gold_edge_trusses",
        spatial_translation: "High-intensity dynamic linear LED blades with emerald laser projectors.",
      },
      {
        domain: "acoustics",
        entity: "Stadium Punch & Vocal Clarity",
        signal: "high_power_absorption, punchy_sub",
        spatial_translation: "Tuned RT60 to 0.68s via acoustic ceiling baffles and rear wall treatment.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:bercy-arena-paris", name: "AccorHotels Arena (Bercy Paris)", type: "arena_stage", subtype: "electronic_amphitheatre", tags: [{ name: "alive_2007" }] },
        { id: "venue:coachella-mainstage", name: "Coachella Sahara Stage (2006 Pyramid Debut)", type: "festival_stage", subtype: "mega_structure", tags: [{ name: "laser_pyramid" }] },
      ],
      relatedArtists: [
        { id: "artist:giorgio-moroder", name: "Giorgio Moroder", tags: [{ name: "disco_synth" }] },
        { id: "artist:cassius", name: "Cassius (Philippe Zdar)", tags: [{ name: "french_touch" }] },
        { id: "artist:thomas-bangalter", name: "Thomas Bangalter", tags: [{ name: "roule_records" }] },
      ],
      movies: [
        { id: "film:interstella-5555", name: "Interstella 5555 (Leiji Matsumoto)", tags: [{ name: "anime_music" }] },
        { id: "film:electroma", name: "Daft Punk's Electroma", tags: [{ name: "cult_cinema" }] },
      ],
      brands: [
        { id: "brand:ed-banger-records", name: "Ed Banger Records Paris", type: "record_label", tags: [{ name: "french_electro" }] },
        { id: "brand:roland-tb303-daft", name: "Roland Corporation TB-303 / TR-909", type: "synth_maker", tags: [{ name: "acid" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Blackened steel box truss framework",
        reason: "Derived from the Martin Phillips Alive 2007 stage engineering",
        provenance: "inferred",
      },
    ],
  },

  // 10. Burial + South London foggy night shelter & pirate radio
  "burial + south london foggy night shelter & pirate radio": {
    prompt: "Burial + South London foggy night shelter & pirate radio",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["future-garage", "dubstep", "ambient-techno", "hauntology"],
      styleTags: ["subterranean den", "board concrete", "foggy sodium vapor", "pirate radio antenna"],
      themeTags: ["untimed vinyl crackle", "south london night bus", "plastic people", "hyperdub"],
      adjectives: ["rain-soaked", "intimate", "sub-bass-heavy", "haunted", "nocturnal"],
    },
    entities: [
      {
        id: "artist:burial",
        name: "Burial (William Bevan)",
        type: "musician",
        signals: ["untimed_vinyl_crackle", "distant_rain_samples", "pitched_down_vocal", "2_step_garage_ghost"],
        provenance: "sample-fixture",
        drivenChoice: "Subterranean acoustic bunker with low ceiling, raw board-concrete walls, and isolated listening corner.",
      },
      {
        id: "label:hyperdub",
        name: "Hyperdub Records London",
        type: "record_label",
        signals: ["dystopian_bass", "kode9_sonic_warfare", "south_london_night_bus"],
        provenance: "sample-fixture",
        drivenChoice: "Dark polished aggregate floor opposing board-formed concrete and heavy acoustic felt panels.",
      },
      {
        id: "venue:plastic-people",
        name: "Plastic People (Curtain Road, Shoreditch)",
        type: "underground_club",
        signals: ["pitch_black_sub_den", "function_one_sound", "zero_ambient_distraction"],
        provenance: "sample-fixture",
        drivenChoice: "Corner bass trap pillars tuning Sabine RT60 to 0.38s to deliver tight sub-40Hz physical bass punch.",
      },
      {
        id: "culture:pirate-radio",
        name: "London Pirate Radio Transmission Towers",
        type: "cultural_movement",
        signals: ["rooftop_fm_aerials", "distorted_dubplate", "concrete_council_estate"],
        provenance: "sample-fixture",
        drivenChoice: "Flickering 2200K low-pressure sodium vapor lamp casting long solitary chiaroscuro shadows.",
      },
      {
        id: "atmosphere:south-london-rain",
        name: "South London Night Shelter",
        type: "urban_setting",
        signals: ["wet_asphalt", "bus_stop_refuge", "flickering_sodium_vapor"],
        provenance: "sample-fixture",
        drivenChoice: "Analog turntable console with vinyl record shelf displaying early Hyperdub 12-inch pressings.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Rainy Night Garage Crackle",
        signal: "sub_40hz_bass, haunted_vocal_echo",
        spatial_translation: "Low-ceiling subterranean sanctuary with dark raw concrete surfaces.",
      },
      {
        domain: "architecture",
        entity: "Subterranean Bass Refuge",
        signal: "board_concrete, heavy_dampening",
        spatial_translation: "Polished dark aggregate floor opposing board-formed concrete and felt panels.",
      },
      {
        domain: "lighting",
        entity: "Flickering Sodium Vapor",
        signal: "2200K_low_pressure_sodium, deep_shadows",
        spatial_translation: "Sparse single low-elevation 2200K amber point source with deep shadows.",
      },
      {
        domain: "acoustics",
        entity: "Plastic People Sub-Bass Chamber",
        signal: "zero_standing_waves, dry_intimacy",
        spatial_translation: "Tuned RT60 to 0.38s with corner bass trap columns and felt panels.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:plastic-people-london", name: "Plastic People Shoreditch", type: "underground_club", subtype: "sub_bass_sanctuary", tags: [{ name: "funktion_one" }] },
        { id: "venue:corsica-studios", name: "Corsica Studios Elephant & Castle", type: "railway_arch_club", subtype: "concrete_bunker", tags: [{ name: "south_london_bass" }] },
      ],
      relatedArtists: [
        { id: "artist:kode9", name: "Kode9 (Steve Goodman)", tags: [{ name: "hyperdub" }, { name: "sonic_warfare" }] },
        { id: "artist:the-bug", name: "The Bug (Kevin Martin)", tags: [{ name: "heavy_dub" }] },
        { id: "artist:four-tet", name: "Four Tet (Kieran Hebden)", tags: [{ name: "folktronica" }] },
      ],
      movies: [
        { id: "film:london-orbital", name: "London Orbital (Patrick Keiller)", tags: [{ name: "psychogeography" }] },
        { id: "film:hyperdub-sessions", name: "Hyperdub 10.0 Archive", tags: [{ name: "documentary" }] },
      ],
      brands: [
        { id: "brand:soundcraft-consoles", name: "Soundcraft Analog Mixing Consoles", type: "audio_hardware", tags: [{ name: "analogue" }] },
        { id: "brand:technics-sl1210", name: "Technics SL-1210MK2 Turntables", type: "turntables", tags: [{ name: "club_standard" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Flickering sodium vapor 2200K streetlight glow",
        reason: "Derived from nocturnal London bus stop psychogeography",
        provenance: "inferred",
      },
    ],
  },

  // 11. Peggy Guggenheim + Venetian canal palazzo gallery
  "peggy guggenheim + venetian canal palazzo gallery": {
    prompt: "Peggy Guggenheim + Venetian canal palazzo gallery",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["modern-classical", "avant-garde", "italian-chamber", "venetian-baroque-ambient"],
      styleTags: ["istrian stone", "grand canal palazzo", "peristyle courtyard", "limewash plaster"],
      themeTags: ["modern art collector", "lion heads facade", "calder mobiles", "water light reflection"],
      adjectives: ["luminous", "patrician", "serene", "sculptural", "historic"],
    },
    entities: [
      {
        id: "patron:peggy-guggenheim",
        name: "Peggy Guggenheim",
        type: "art_collector",
        signals: ["modernist_art_patron", "venetian_palazzo_residence", "sculpture_garden", "butterfly_sunglasses"],
        provenance: "sample-fixture",
        drivenChoice: "Peristyle courtyard opening onto Grand Canal, honed limestone paving, and Istrian stone piers.",
      },
      {
        id: "venue:palazzo-venier",
        name: "Palazzo Venier dei Leoni (Grand Canal)",
        type: "historical_architecture",
        signals: ["unfinished_istrian_stone", "canal_watergate", "marieschi_proportions", "lion_heads"],
        provenance: "sample-fixture",
        drivenChoice: "Classic Venetian limewash plaster walls with open-sky pergola ceiling and olive tree planters.",
      },
      {
        id: "artist:alexander-calder",
        name: "Alexander Calder & Mobile Sculpture",
        type: "sculptor",
        signals: ["kinetic_wire_mobiles", "sheet_metal_balance", "air_current_movement"],
        provenance: "sample-fixture",
        drivenChoice: "Curatorial reading tables and gallery modular benches flanked by kinetic sculpture plinths.",
      },
      {
        id: "artist:jackson-pollock",
        name: "Jackson Pollock Early Murals",
        type: "painter",
        signals: ["gestural_drip", "large_scale_canvas", "raw_canvas_ground"],
        provenance: "sample-fixture",
        drivenChoice: "Recessed gallery wash spotlights at 4200K combined with shimmering canal water reflections.",
      },
      {
        id: "style:venetian-modernism",
        name: "Venetian Istrian Stone & Terracotta",
        type: "architectural_style",
        signals: ["canal_water_light_reflections", "istrian_limestone", "classical_waterfront_courtyard"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.44s with acoustic ceiling plaster and open courtyard perimeter dampening.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "visual_arts",
        entity: "Venetian Modernist Collection",
        signal: "plinth_sculptures, large_scale_canvases",
        spatial_translation: "Peristyle canal-facing courtyard with Istrian limestone colonnade.",
      },
      {
        domain: "architecture",
        entity: "Palazzo Venier dei Leoni",
        signal: "istrian_stone, terrazzo_canal_terrace",
        spatial_translation: "Honed limestone paving with classic Venetian limewash plaster walls.",
      },
      {
        domain: "lighting",
        entity: "Grand Canal Water Reflections",
        signal: "4200K_daylight_wash, soft_water_ripples",
        spatial_translation: "Natural 4200K curatorial track spots combined with canal reflection wash.",
      },
      {
        domain: "acoustics",
        entity: "Palazzo Waterfront Sanctuary",
        signal: "calm_water_ambience, warm_gallery_reverb",
        spatial_translation: "Tuned RT60 to 0.44s with acoustic ceiling plaster and courtyard dampening.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:palazzo-venier-venice", name: "Palazzo Venier dei Leoni Venice", type: "palazzo_gallery", subtype: "waterfront_courtyard", tags: [{ name: "guggenheim_collection" }] },
        { id: "venue:fondazione-vedova", name: "Fondazione Emilio e Annabianca Vedova", type: "venetian_magazzino", subtype: "industrial_gallery", tags: [{ name: "zattere" }] },
      ],
      relatedArtists: [
        { id: "artist:max-ernst", name: "Max Ernst", tags: [{ name: "surrealism" }] },
        { id: "artist:joan-miro", name: "Joan Miró", tags: [{ name: "abstract_surrealism" }] },
        { id: "artist:alberto-giacometti", name: "Alberto Giacometti", tags: [{ name: "bronze_sculpture" }] },
      ],
      movies: [
        { id: "film:peggy-art-addict", name: "Peggy Guggenheim: Art Addict (Lisa Immordino)", tags: [{ name: "biographical_cinema" }] },
        { id: "film:venice-theme", name: "Death in Venice (Luchino Visconti)", tags: [{ name: "venetian_elegance" }] },
      ],
      brands: [
        { id: "brand:venini-murano", name: "Venini Murano Glassworks", type: "glass_art", tags: [{ name: "venetian_craft" }] },
        { id: "brand:fortuny-fabrics", name: "Fortuny Venezia Fabrics", type: "historic_textile", tags: [{ name: "pleated_silk" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Unfinished Istrian limestone colonnade",
        reason: "Derived from Palazzo Venier's famously unfinished single-story classical facade",
        provenance: "inferred",
      },
    ],
  },

  // 12. Sun Ra + Afrofuturist cosmic ark lounge
  "sun ra + afrofuturist cosmic ark lounge": {
    prompt: "Sun Ra + Afrofuturist cosmic ark lounge",
    source: "fixture",
    qlooCallsUsed: 2,
    culturalEvidence: {
      genreTags: ["cosmic-jazz", "afrofuturism", "space-chant", "free-jazz", "avant-garde"],
      styleTags: ["heliocentric temple", "gold leaf piers", "star velvet canopies", "radial rings"],
      themeTags: ["space is the place", "saturn philosophy", "mythocracy", "arkestra sanctuary"],
      adjectives: ["celestial", "gilded", "astral", "polyphonic", "transcendent"],
    },
    entities: [
      {
        id: "artist:sun-ra",
        name: "Sun Ra & His Intergalactic Arkestra",
        type: "musician",
        signals: ["cosmic_jazz", "space_chants", "saturn_philosophy", "minimoog_solar_flares", "ancient_egyptian_cosmology"],
        provenance: "sample-fixture",
        drivenChoice: "Circular celestial ark lounge with radiating concentric seating rings, gold-leaf piers, and deep indigo velvet.",
      },
      {
        id: "concept:afrofuturism",
        name: "Afrofuturist Visual & Sonic Movement",
        type: "cultural_movement",
        signals: ["hieroglyphic_spacecraft", "gold_leaf_radiance", "interstellar_transcendence"],
        provenance: "sample-fixture",
        drivenChoice: "Polished obsidian floor with midnight velvet acoustic curtains and brass ring chandeliers at 2600K.",
      },
      {
        id: "venue:slugs-saloon",
        name: "Slugs' Saloon (East 3rd St, NYC)",
        type: "jazz_venue",
        signals: ["legendary_arkestra_residency", "free_jazz_crucible", "bohemian_downtown_sanctuary"],
        provenance: "sample-fixture",
        drivenChoice: "Curved velvet banquette booths surrounding central celestial keyboard plinth.",
      },
      {
        id: "instrument:moog-modular",
        name: "Early Moog Modular & Farfisa Organ",
        type: "musical_instrument",
        signals: ["space_probe_frequencies", "intergalactic_rhythm", "analog_cosmic_sweep"],
        provenance: "sample-fixture",
        drivenChoice: "Modular synthesizer console and horn speaker pair projecting polyphonic cosmic frequencies.",
      },
      {
        id: "style:cosmic-egyptian",
        name: "Cosmic Heliocentric Architecture",
        type: "design_movement",
        signals: ["celestial_spheres", "gilded_portals", "velvet_star_canopies"],
        provenance: "sample-fixture",
        drivenChoice: "Tuned RT60 to 0.42s using pleated star-velvet drapery and slotted timber acoustic diffusers.",
      },
    ],
    crossDomainSignals: [
      {
        domain: "music",
        entity: "Interplanetary Arkestra Sound",
        signal: "polytonal_brass_choir, interstellar_synth",
        spatial_translation: "Circular celestial ark lounge with radiating radial seating rings.",
      },
      {
        domain: "architecture",
        entity: "Heliocentric Cosmic Temple",
        signal: "gold_leaf_piers, dark_obsidian",
        spatial_translation: "Polished obsidian floor with midnight velvet acoustic curtains and brass pillars.",
      },
      {
        domain: "lighting",
        entity: "Solar Flare & Cosmic Nebula",
        signal: "2600K_gold_filament, violet_emissive",
        spatial_translation: "Warm 2600K brass ring chandeliers with subtle ultraviolet celestial backdrops.",
      },
      {
        domain: "acoustics",
        entity: "Arkestra Dynamic Blast & Subtle Bells",
        signal: "broadband_clarity, resonant_brass",
        spatial_translation: "Tuned RT60 to 0.42s with pleated star-velvet drapery and timber acoustic diffusers.",
      },
    ],
    crossDomainBundle: {
      places: [
        { id: "venue:slugs-saloon-nyc", name: "Slugs' Saloon East Village NYC", type: "cosmic_lounge", subtype: "jazz_sanctuary", tags: [{ name: "free_jazz" }] },
        { id: "venue:philly-arkestra-house", name: "Sun Ra Arkestra House (Morton St, Philly)", type: "communal_compound", subtype: "astral_sanctuary", tags: [{ name: "arkestra_heritage" }] },
      ],
      relatedArtists: [
        { id: "artist:pharoah-sanders", name: "Pharoah Sanders", tags: [{ name: "spiritual_jazz" }, { name: "tenor_sax" }] },
        { id: "artist:alice-coltrane", name: "Alice Coltrane (Turiyasangitananda)", tags: [{ name: "harp_cosmic" }] },
        { id: "artist:don-cherry", name: "Don Cherry", tags: [{ name: "pocket_trumpet" }] },
      ],
      movies: [
        { id: "film:space-is-the-place", name: "Space Is the Place (1974 Sun Ra Film)", tags: [{ name: "afrofuturist_sci_fi" }] },
        { id: "film:sun-ra-brother-from-another-planet", name: "The Brother from Another Planet", tags: [{ name: "sci_fi" }] },
      ],
      brands: [
        { id: "brand:farfisa-organs", name: "Farfisa Professional Organs", type: "electronic_instrument", tags: [{ name: "vintage_synth" }] },
        { id: "brand:el-saturn-records", name: "El Saturn Records (Sun Ra & Alton Abraham)", type: "independent_label", tags: [{ name: "diy_vinyl" }] },
      ],
    },
    fallbackChoices: [
      {
        choice: "Midnight star-velvet pleated drapery",
        reason: "Derived from Sun Ra Intergalactic Arkestra stage costume canopies",
        provenance: "inferred",
      },
    ],
  },
};
