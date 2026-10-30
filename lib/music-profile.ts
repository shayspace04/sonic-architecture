/**
 * Sonic Architecture — Step 1: Pure SceneSpec → MusicProfile Derivation & Validation
 *
 * Pure, deterministic, unit-testable functions that:
 * 1. Derive a rich `MusicProfile` from `SceneSpec` (typology, materials, lighting mood,
 *    time of day, guest count, real ISO 3382 acoustic numbers, and cultural provenance)
 *    plus optional Qloo music/artist entities.
 * 2. Validate any `MusicProfile` object at runtime with strict TypeScript guards (no `any`).
 * 3. Compute a deterministic FNV-1a scene-music hash for downstream caching in `/api/soundtrack`.
 */

import type {
  AcousticCharacterClass,
  ArtistRec,
  MaterialFamily,
  MusicMomentSpec,
  MusicProfile,
  ProvenanceClaim,
  ResolvedEntity,
  SceneSpec,
  SoundtrackMomentName,
  SoundtrackProvenanceLabel,
  SpatialTypology,
  TimeOfDay,
} from "./types";

export interface QlooMusicEntityInput {
  readonly id?: string;
  readonly name: string;
  readonly type?: string;
  readonly weight?: number;
  readonly tags?: readonly string[];
}

const CANONICAL_MOMENTS: readonly [
  SoundtrackMomentName,
  SoundtrackMomentName,
  SoundtrackMomentName,
  SoundtrackMomentName
] = ["arrival", "dining", "peak", "wind-down"];

interface TypologyMusicalBaseline {
  moodTags: readonly string[];
  baseEnergy: number;
  tempoRangeBpm: readonly [number, number];
  genres: readonly string[];
  era: string;
  instrumentation: readonly string[];
  momentCurve: readonly [number, number, number, number];
  momentFlavor: {
    arrival: string;
    dining: string;
    peak: string;
    "wind-down": string;
  };
}

const TYPOLOGY_BASELINES: Record<SpatialTypology, TypologyMusicalBaseline> = {
  listening_room: {
    moodTags: ["intimate", "nocturnal", "audiophile", "tactile-warmth", "contemplative"],
    baseEnergy: 0.42,
    tempoRangeBpm: [68, 96],
    genres: ["Modal Jazz", "Japanese Jazz Kissa", "Post-Bop", "Warm Ambient"],
    era: "1958–1976 Golden-Era Analog & Contemporary Tokyo Kissa",
    instrumentation: [
      "Tenor Saxophone",
      "Upright Double Bass",
      "Fender Rhodes Electric Piano",
      "Brushed Jazz Kit",
      "Muted Trumpet",
    ],
    momentCurve: [0.30, 0.40, 0.56, 0.26],
    momentFlavor: {
      arrival: "Needle-drop vinyl warmth welcoming listeners into the slotted-oak acoustic shell",
      dining: "Unfurling modal quartet conversations balanced for low-level whisky & glass service",
      peak: "Deep-stage horn dispersion showcase with full upright bass and Rhodes harmonic bloom",
      "wind-down": "Late-night solo piano and sparse ambient resonance for the final record side",
    },
  },
  cathedral_banquet: {
    moodTags: ["ceremonial", "sacred-grandeur", "reverberant", "candlelit", "processional"],
    baseEnergy: 0.38,
    tempoRangeBpm: [54, 84],
    genres: ["Sacred Minimalism", "Neo-Classical Chamber", "Early Polyphony", "Ethereal Modern Classical"],
    era: "Renaissance Polyphony Meets Late-20th-Century Sacred Minimalism (1976–Present)",
    instrumentation: [
      "Pipe Organ",
      "Solo Cello",
      "Chamber String Consort",
      "Concert Harp",
      "Soprano & Choral Voices",
    ],
    momentCurve: [0.32, 0.38, 0.50, 0.24],
    momentFlavor: {
      arrival: "Processional harp and sustained string harmonics decaying across the vaulted limestone nave",
      dining: "Candlelit chamber consort and lyrical cello suites paced for long-table refectory courses",
      peak: "Soaring organ pedal points and polyphonic choral swells filling the 12.5m Gothic vault",
      "wind-down": "Whispering tintinnabuli strings and solo piano reflections as taper candles dim",
    },
  },
  grunge_loft: {
    moodTags: ["raw-editorial", "rebellious", "distorted-glamour", "flash-lit", "kinetic"],
    baseEnergy: 0.78,
    tempoRangeBpm: [104, 136],
    genres: ["90s Alternative Grunge", "Shoegaze", "Indie Sleaze", "Industrial Big Beat"],
    era: "1991–1998 Pacific Northwest Grunge & Late-90s Editorial Loft Underground",
    instrumentation: [
      "Overdriven Fender Jaguar Guitar",
      "Fuzz Bass",
      "Close-Miked Live Drum Kit",
      "Analog MS-20 Synth",
      "Tape-Saturated Vocals",
    ],
    momentCurve: [0.58, 0.70, 0.90, 0.48],
    momentFlavor: {
      arrival: "Slacker-cool basslines and fuzz-pedal feedback humming against distressed brick and chrome",
      dining: "Mid-tempo shoegaze wall-of-sound and lo-fi alt-rock grooves under studio flash strobes",
      peak: "High-gain 90s grunge anthems and propulsive breakbeats bouncing off mirror-chrome balloons",
      "wind-down": "Dream-pop guitar reverb tails and smoky trip-hop downtempo in the velvet pit",
    },
  },
  futuristic_launch: {
    moodTags: ["precision", "cybernetic", "cinematic-scale", "propulsive", "high-contrast"],
    baseEnergy: 0.74,
    tempoRangeBpm: [108, 128],
    genres: ["Cinematic Synthwave", "Melodic Techno", "IDM", "Electro-Acoustic Score"],
    era: "2015–Present Precision Electronic & Neo-Brutalist Sound Design",
    instrumentation: [
      "Yamaha CS-80 Polyphonic Synth",
      "Modular Eurorack Arpeggiator",
      "Sub-Bass Pulse",
      "Hybrid Brass & String Ensemble",
      "Glitch Percussion",
    ],
    momentCurve: [0.52, 0.64, 0.92, 0.44],
    momentFlavor: {
      arrival: "Spatialized modular pulses and crystalline arpeggios welcoming guests around the dark plinth",
      dining: "Sleek mid-tempo melodic electronics accompanying technical networking and gallery walk-arounds",
      peak: "High-impact wide-spectrum synth brass and driving 122 BPM reveal telemetry for the keynote unveiling",
      "wind-down": "Warm analog pad horizons and horizon-line ambient textures for close-up inspection",
    },
  },
  garden_mandap: {
    moodTags: ["auspicious", "botanical-festive", "devotional-joy", "open-air", "twilight-warmth"],
    baseEnergy: 0.64,
    tempoRangeBpm: [76, 118],
    genres: ["Hindustani Classical Fusion", "Raag Yaman Instrumental", "Contemporary Indian Folk", "Sufi Acoustic"],
    era: "Traditional Gharana Classical & Contemporary South Asian Acoustic Fusion",
    instrumentation: [
      "Sitar",
      "Tabla & Dholak",
      "Santoor",
      "Bansuri Bamboo Flute",
      "Tanpura Drone",
    ],
    momentCurve: [0.48, 0.60, 0.82, 0.38],
    momentFlavor: {
      arrival: "Bansuri flute and 100-string santoor ripples drifting across the marigold-draped sandstone lawn",
      dining: "Lyrical sitar gat and warm tabla theka supporting twilight courtyard hospitality",
      peak: "Celebratory dholak, shehnai, and Sufi ensemble crescendos for the sacred havan kund ceremony",
      "wind-down": "Serene evening Raag Yaman alap and acoustic sarangi under open garden stars",
    },
  },
  pavilion_celebration: {
    moodTags: ["vibrant", "celebratory", "marigold-warmth", "rhythmic", "artisan"],
    baseEnergy: 0.70,
    tempoRangeBpm: [88, 124],
    genres: ["Indian Festive Acoustic", "Rajasthani Folk Fusion", "Indo-Jazz Groove", "Sufi Qawwali"],
    era: "Contemporary Craft Heritage & Modern South Asian Celebration",
    instrumentation: [
      "Dholak",
      "Sarangi",
      "Sitar",
      "Harmonium",
      "Acoustic Guitar & Brass Bells",
    ],
    momentCurve: [0.54, 0.66, 0.86, 0.42],
    momentFlavor: {
      arrival: "Upbeat santoor and rhythmic ghungroo bells framing the marigold jhula swing",
      dining: "Warm Rajasthani acoustic folk and Indo-jazz grooves across the silk diwan bolster courts",
      peak: "High-spirited dholak and celebratory ensemble peaks for dance and mehendi rituals",
      "wind-down": "Intimate ghazal acoustics and warm harmonium melodies for late-evening conversation",
    },
  },
  underground_club: {
    moodTags: ["subterranean", "hypnotic", "industrial-monolith", "sub-bass-heavy", "nocturnal"],
    baseEnergy: 0.88,
    tempoRangeBpm: [124, 140],
    genres: ["Berlin Dub Techno", "Industrial Techno", "Hypnotic Minimal", "Acid Electro"],
    era: "1993–Present Detroit-Berlin Subterranean Bunker Lineage",
    instrumentation: [
      "Roland TR-909 Drum Machine",
      "TB-303 Acid Bassline",
      "Chord-Stab Dub Delay",
      "Folded-Horn Sub-Bass Synth",
      "Industrial Metallic Percussion",
    ],
    momentCurve: [0.66, 0.78, 0.96, 0.58],
    momentFlavor: {
      arrival: "Deep dub-techno chord echoes pressurizing the board-formed concrete bunker",
      dining: "Rolling 126 BPM hypnotic minimal grooves in the perimeter recovery alcoves",
      peak: "Unrelenting 134 BPM 909 kick-and-horn sub-bass lock across the central dancefloor void",
      "wind-down": "Submerged ambient dub and cavernous low-pass filter sweeps at dawn",
    },
  },
  industrial_warehouse: {
    moodTags: ["editorial-edge", "catwalk-tension", "architectural-electro", "raw-brick", "sleek"],
    baseEnergy: 0.76,
    tempoRangeBpm: [112, 128],
    genres: ["French Electro", "Darkwave Catwalk", "Minimal EBM", "Leftfield House"],
    era: "2001–Present European Runway & Adaptive-Reuse Warehouse Clubbing",
    instrumentation: [
      "Analog Juno-106 Bass",
      "Crisp 808/909 Electro Kit",
      "Arpeggiated FM Synth",
      "Processed Staccato Strings",
      "Vocoder Textures",
    ],
    momentCurve: [0.56, 0.68, 0.88, 0.46],
    momentFlavor: {
      arrival: "Minimalist electro pulses echoing beneath riveted steel Pratt trusses and brick pilasters",
      dining: "Taut mid-tempo darkwave and leftfield house along the front-row concrete benches",
      peak: "Razor-sharp 122 BPM runway walk tracks synchronized to the 22m overhead linear light blade",
      "wind-down": "Cool synth-pop and downtempo lounge beats for backstage and post-show champagne",
    },
  },
  brutalist_runway: {
    moodTags: ["monolithic", "avant-garde", "austere", "sculptural", "high-tension"],
    baseEnergy: 0.74,
    tempoRangeBpm: [110, 126],
    genres: ["Avant-Garde Electronic", "Minimal Techno", "Industrial Chamber", "Deconstructed Club"],
    era: "Contemporary Architectural Sound Art & High-Fashion Runway",
    instrumentation: [
      "Sub-Bass Sine Generator",
      "Prepared Piano",
      "Metallic FM Percussion",
      "Bowed Cello Drone",
      "Analog Step Sequencer",
    ],
    momentCurve: [0.54, 0.66, 0.86, 0.42],
    momentFlavor: {
      arrival: "Sub-bass architectural drones and sparse prepared piano against board-formed concrete",
      dining: "Geometric minimal pulses framing guest arrival along the monolithic bench galleries",
      peak: "Propulsive 120 BPM sculptural techno driving the 20m mirror-obsidian catwalk spine",
      "wind-down": "Spatialized ambient decay and warm analog chords as the linear light blade dims",
    },
  },
  mediterranean_courtyard: {
    moodTags: ["sun-drenched", "al-fresco", "organic", "breezy", "convivial"],
    baseEnergy: 0.52,
    tempoRangeBpm: [78, 110],
    genres: ["Mediterranean Acoustic", "Balearic Bossa Nova", "Chamber Folk", "Italian Cinematic Lounge"],
    era: "1960s Mediterranean Cinema & Contemporary Balearic Al-Fresco",
    instrumentation: [
      "Nylon-String Classical Guitar",
      "Mandolin",
      "Upright Acoustic Bass",
      "Light Hand Percussion & Cajón",
      "Accordion & Warm Strings",
    ],
    momentCurve: [0.42, 0.54, 0.68, 0.34],
    momentFlavor: {
      arrival: "Sunlit nylon-string guitar arpeggios blending with the octagonal limestone fountain",
      dining: "Warm Mediterranean bossa and chamber folk across the flax-linen bistro tables under olive trees",
      peak: "Lively golden-hour acoustic grooves and cinematic Italian lounge as festoon bulbs glow",
      "wind-down": "Gentle nocturnal guitar duets and breeze-like ambient chords under open stars",
    },
  },
  coastal_retreat: {
    moodTags: ["biophilic", "oceanic-horizon", "restorative", "sunlit-teak", "balearic"],
    baseEnergy: 0.54,
    tempoRangeBpm: [84, 112],
    genres: ["Balearic Downtempo", "Organic House", "Tropical Acoustic", "Ambient Dub"],
    era: "Contemporary Ibiza/Tulum Biophilic Retreat & Organic Chillout",
    instrumentation: [
      "Wooden Marimba & Kalimba",
      "Nylon Acoustic Guitar",
      "Warm Rhodes Piano",
      "Shakers & Congas",
      "Oceanic Synth Pads",
    ],
    momentCurve: [0.44, 0.52, 0.70, 0.32],
    momentFlavor: {
      arrival: "Breezy marimba and acoustic guitar welcoming guests onto the Burmese teak deck",
      dining: "Restorative Balearic downtempo beside the shallow turquoise reflection pool",
      peak: "Sunlit organic house and melodic percussion beneath the louvered timber pavilion",
      "wind-down": "Horizon-line ambient pads and soft acoustic plucks matching the coastal tide",
    },
  },
  tea_room: {
    moodTags: ["wabi-sabi", "meditative", "stillness", "komorebi", "micro-acoustic"],
    baseEnergy: 0.22,
    tempoRangeBpm: [48, 72],
    genres: ["Japanese Gagaku & Koto", "Kankyō Ongaku (Environmental Music)", "Zen Minimalism", "Micro-Ambient"],
    era: "Traditional Sukiya Tea Ceremony & 1980s Japanese Kankyō Ongaku",
    instrumentation: [
      "13-String Koto",
      "Shakuhachi Bamboo Flute",
      "Singing Bowl & Rin Chime",
      "Soft Felt Piano",
      "Natural Hinoki & Water Resonance",
    ],
    momentCurve: [0.20, 0.24, 0.32, 0.14],
    momentFlavor: {
      arrival: "Sparse koto plucks and soft komorebi light filtering through mulberry washi shoji screens",
      dining: "Quiet kankyō ongaku environmental tones alongside the sunken ro charcoal hearth",
      peak: "Expressive shakuhachi breath phrasing and resonant singing bowls across the 4.5-mat tatami",
      "wind-down": "Near-silent felt piano and fading kettle steam resonance for contemplative closure",
    },
  },
  gallery_pavilion: {
    moodTags: ["curatorial", "luminous", "architectural-clarity", "minimalist", "airy"],
    baseEnergy: 0.46,
    tempoRangeBpm: [74, 106],
    genres: ["Ambient Chamber", "Minimalist Piano", "Electro-Acoustic Art Pop", "Modern Jazz Trio"],
    era: "1978–Present Ambient Minimalism & Contemporary Gallery Soundscapes",
    instrumentation: [
      "Grand Piano",
      "Vibraphone",
      "Solo Violin",
      "Modular Ambient Pad",
      "Brushed Upright Bass",
    ],
    momentCurve: [0.36, 0.46, 0.62, 0.28],
    momentFlavor: {
      arrival: "Crystalline vibraphone and piano motifs beneath the glazed barrel vault",
      dining: "Articulate chamber jazz and electro-acoustic textures across the travertine court",
      peak: "Luminous ensemble swells during the curatorial toast and mezzanine viewing",
      "wind-down": "Quiet ambient reflections along the glass curtain wall",
    },
  },
  intimate_lounge: {
    moodTags: ["velvet-nocturne", "chiaroscuro", "sultry", "analog-soul", "late-night"],
    baseEnergy: 0.48,
    tempoRangeBpm: [72, 102],
    genres: ["Cool Jazz", "Neo-Soul", "Cinematic Lounge", "Downtempo Trip-Hop"],
    era: "1960s Midnight Cocktail Jazz & 1990s Bristol/Paris Downtempo",
    instrumentation: [
      "Warm Electric Hollowbody Guitar",
      "Wurlitzer Electric Piano",
      "Muted Flugelhorn",
      "Upright Bass",
      "Laid-Back Rimshot Drums",
    ],
    momentCurve: [0.38, 0.48, 0.64, 0.30],
    momentFlavor: {
      arrival: "Smoky Wurlitzer chords and upright bass welcoming guests into the walnut and velvet booths",
      dining: "Intimate cool jazz and neo-soul grooves under 2200K table lamps",
      peak: "Rich flugelhorn solos and deep midnight downtempo across the cocktail bar",
      "wind-down": "Slow cinematic torch ballads and warm vinyl crackle at last call",
    },
  },
  custom_hybrid: {
    moodTags: ["bespoke", "architectural", "atmospheric", "curated", "spatial"],
    baseEnergy: 0.55,
    tempoRangeBpm: [82, 116],
    genres: ["Contemporary Instrumental", "Nu-Jazz", "Melodic Downtempo", "Modern Classical"],
    era: "Contemporary Cross-Genre Spatial Curation",
    instrumentation: [
      "Acoustic Piano",
      "Warm Analog Synthesizer",
      "Upright Bass",
      "Chamber Strings",
      "Textural Percussion",
    ],
    momentCurve: [0.42, 0.54, 0.72, 0.34],
    momentFlavor: {
      arrival: "Inviting spatial textures calibrated to the architectural threshold",
      dining: "Balanced conversational grooves tailored to the room's acoustic envelope",
      peak: "Expressive focal-stage energy aligned with the primary architectural installation",
      "wind-down": "Warm restorative harmonic decay as the spatial lighting softens",
    },
  },
  comedy_theatre: {
    moodTags: ["theatrical", "charismatic", "speech-articulate", "warm-cabaret", "dynamic"],
    baseEnergy: 0.68,
    tempoRangeBpm: [90, 120],
    genres: ["Neo-Soul", "Contemporary R&B", "Live Stand-Up Walk-On Stabs", "Classic Soul & Funk"],
    era: "1990s–Present Live Entertainment Lounge & Comedy Club Lineage",
    instrumentation: [
      "Hammond B3 Organ",
      "Brass Section Stabs",
      "Fender Rhodes Electric Piano",
      "Electric Bass Groove",
      "Crisp Snare & Kick Drum",
    ],
    momentCurve: [0.50, 0.65, 0.88, 0.40],
    momentFlavor: {
      arrival: "Punchy Hammond B3 chords and warm brass riffs welcoming guests into the cabaret tiers",
      dining: "Mid-tempo contemporary R&B and neo-soul grooves supporting table beverage service",
      peak: "High-impact walk-on brass stabs, syncopated soul drums, and crowd energy as performer takes the mic",
      "wind-down": "Mellow electric piano ballads and soulful outro riffs as guests linger for post-show drinks",
    },
  },
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function dedupeStrings(items: ReadonlyArray<string>, maxItems = 8): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
      if (result.length >= maxItems) break;
    }
  }
  return result;
}

/**
 * Derives the room's acoustic character string and classification directly from
 * the scene's real ISO 3382 numbers (`calculatedRT60Seconds`, `averageAbsorptionAlpha`,
 * `clarityC80dB`, `bassRatio`, `isOpenAir`, and net room volume in m³).
 */
export function deriveAcousticCharacter(spec: SceneSpec): {
  characterClass: AcousticCharacterClass;
  formatted: string;
  rt60: number;
  absorptionAlpha: number;
  volumeM3: number;
} {
  const w = spec.roomDimensions?.width || 10;
  const h = spec.roomDimensions?.height || 3.5;
  const d = spec.roomDimensions?.depth || 10;
  const volumeM3 = Math.round(
    spec.roomDimensions?.netVolumeCubicMeters ?? w * h * d
  );

  const rt60 = Number(
    (
      spec.acousticTarget?.calculatedRT60Seconds ??
      spec.acousticTarget?.targetRT60Seconds ??
      0.55
    ).toFixed(2)
  );
  const absorptionAlpha = Number(
    (spec.acousticTarget?.averageAbsorptionAlpha ?? 0.26).toFixed(2)
  );
  const clarityC80 = Number(
    (spec.acousticTarget?.clarityC80dB ?? 2.4).toFixed(1)
  );

  if (spec.isOpenAir || spec.enclosureMode === "outdoor" || spec.enclosureMode === "open_air_canopy") {
    const characterClass: AcousticCharacterClass = "open-air/dispersive";
    return {
      characterClass,
      formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, ${volumeM3} m³ open-air canopy dispersion)`,
      rt60,
      absorptionAlpha,
      volumeM3,
    };
  }

  if (rt60 >= 1.20 || (volumeM3 >= 3200 && rt60 >= 1.0)) {
    const characterClass: AcousticCharacterClass = "reverberant/cavernous";
    return {
      characterClass,
      formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, C80 ${clarityC80}dB, ${volumeM3} m³ monumental volume)`,
      rt60,
      absorptionAlpha,
      volumeM3,
    };
  }

  if (rt60 <= 0.44 && absorptionAlpha >= 0.28) {
    const characterClass: AcousticCharacterClass = "intimate/dry";
    return {
      characterClass,
      formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, C80 +${Math.abs(clarityC80)}dB, ${volumeM3} m³ near-field studio)`,
      rt60,
      absorptionAlpha,
      volumeM3,
    };
  }

  const floorId: MaterialFamily | string = spec.materials?.floor?.id || "warm_oak";
  const wallId: MaterialFamily | string = spec.materials?.wall?.id || "acoustic_slats";
  const isWarmTimberOrTextile =
    /oak|hinoki|parquet|tatami|slats|velvet|leather|linen|washi/.test(
      `${floorId} ${wallId}`
    );

  if (rt60 <= 0.65 && isWarmTimberOrTextile) {
    const characterClass: AcousticCharacterClass = "warm/absorptive";
    return {
      characterClass,
      formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, ${volumeM3} m³ damped timber/textile shell)`,
      rt60,
      absorptionAlpha,
      volumeM3,
    };
  }

  if (rt60 >= 0.85) {
    const characterClass: AcousticCharacterClass = "lively/resonant";
    return {
      characterClass,
      formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, ${volumeM3} m³ reflective architectural hall)`,
      rt60,
      absorptionAlpha,
      volumeM3,
    };
  }

  const characterClass: AcousticCharacterClass = "balanced/studio";
  return {
    characterClass,
    formatted: `${characterClass} (RT60 ${rt60}s, α ${absorptionAlpha}, C80 ${clarityC80}dB, ${volumeM3} m³ controlled room)`,
    rt60,
    absorptionAlpha,
    volumeM3,
  };
}

/**
 * Pure, deterministic derivation of `MusicProfile` from a `SceneSpec` plus
 * optional Qloo `ResolvedEntity` and `ArtistRec` arrays.
 *
 * Guarantees clearly different profiles across contrasting scenes (e.g., a
 * `cathedral_banquet` vs. a `grunge_loft` vs. a `listening_room`) while reflecting
 * material changes, lighting kelvin, time of day, guest capacity, and Qloo signals.
 */
export function deriveMusicProfile(
  spec: SceneSpec,
  qlooEntities: ReadonlyArray<ResolvedEntity> = [],
  artistRecommendations: ReadonlyArray<ArtistRec> = []
): MusicProfile {
  const typology: SpatialTypology = spec.typology || "listening_room";
  const baseline =
    TYPOLOGY_BASELINES[typology] || TYPOLOGY_BASELINES.custom_hybrid;

  const acoustic = deriveAcousticCharacter(spec);
  const floorId = spec.materials?.floor?.id || "warm_oak";
  const wallId = spec.materials?.wall?.id || "acoustic_slats";
  const furnId = spec.materials?.primaryFurniture?.id || "cognac_leather";
  const floorName = spec.materials?.floor?.name || floorId.replace(/_/g, " ");
  const wallName = spec.materials?.wall?.name || wallId.replace(/_/g, " ");
  const tempK = spec.lighting?.temperatureK || 2400;
  const timeOfDay: TimeOfDay = spec.timeOfDay || "midnight";
  const guestCount =
    spec.validation?.estimatedCapacityGuests ??
    spec.interpretedBrief?.targetCapacityGuests ??
    40;

  const moodTags: string[] = [...baseline.moodTags];
  const genres: string[] = [...baseline.genres];
  const instrumentation: string[] = [...baseline.instrumentation];
  const derivationSignals: string[] = [
    `typology:${typology}`,
    `acoustic:${acoustic.characterClass}(RT60=${acoustic.rt60}s)`,
    `materials:${floorId}+${wallId}`,
    `lighting:${tempK}K@${timeOfDay}`,
    `guests:${guestCount}`,
  ];

  // 1. Material-Driven Modifiers
  if (/oak|hinoki|parquet|slats|tatami|teak/.test(`${floorId} ${wallId}`)) {
    moodTags.push("warm-timber-resonance");
    if (!instrumentation.some((i) => /bass|cello|guitar|koto/i.test(i))) {
      instrumentation.push("Acoustic Upright Bass");
    }
  }
  if (/brick|concrete|terrazzo|chrome|aluminum/.test(`${floorId} ${wallId}`)) {
    moodTags.push("specular-industrial-edge");
  }
  if (/limestone|sandstone|marble/.test(`${floorId} ${wallId}`)) {
    moodTags.push("stone-harmonic-sustain");
  }
  if (/velvet|leather|boucle|silk/.test(furnId)) {
    moodTags.push("plush-hf-damping");
  }

  // 2. Lighting Temperature & Time-of-Day Modifiers
  let energyDelta = 0;
  let bpmShift = 0;

  if (tempK <= 2450) {
    moodTags.push("amber-candlelit-2400K");
    energyDelta -= 0.04;
  } else if (tempK >= 4000) {
    moodTags.push("high-kelvin-precision");
    energyDelta += 0.05;
    bpmShift += 4;
  }

  if (timeOfDay === "midnight") {
    moodTags.push("midnight-session");
  } else if (timeOfDay === "sunset") {
    moodTags.push("golden-hour-transition");
  } else if (timeOfDay === "morning") {
    moodTags.push("morning-clarity");
    energyDelta -= 0.05;
  } else if (timeOfDay === "afternoon") {
    moodTags.push("daylight-openness");
  }

  // 3. Guest Capacity & Room Acoustic RT60 Modifiers
  if (guestCount <= 25) {
    moodTags.push("small-group-intimacy");
    energyDelta -= 0.04;
  } else if (guestCount >= 250) {
    moodTags.push("arena-scale-crowd");
    energyDelta += 0.06;
    bpmShift += 4;
  }

  // Long reverberation time (RT60 >= 1.2s) requires slower tempo ceiling so transients don't muddy
  if (acoustic.rt60 >= 1.20) {
    bpmShift -= 6;
    energyDelta -= 0.03;
  } else if (acoustic.rt60 <= 0.42) {
    moodTags.push("high-transient-definition");
  }

  // 4. Cultural Notes & Qloo Evidence Integration
  const qlooClaims: ProvenanceClaim[] = (spec.provenance || []).filter(
    (c) => c.source === "qloo_evidence"
  );
  const qlooEntityNames = dedupeStrings([
    ...qlooEntities.map((e) => e.name),
    ...artistRecommendations.map((a) => a.name),
    ...qlooClaims
      .map((c) => c.entityReference || c.label.replace(/^Qloo.*?:\s*/i, ""))
      .filter(Boolean),
  ]);

  const culturalCorpus = [
    spec.promptText || "",
    ...(spec.provenance || []).map((p) => `${p.label} ${p.insight}`),
    ...qlooEntityNames,
  ]
    .join(" ")
    .toLowerCase();

  if (/sakamoto|kanky|hosono|ambient|ando/.test(culturalCorpus)) {
    genres.unshift("Japanese Ambient & Kankyō Ongaku");
    instrumentation.push("Prophet-5 & Prepared Piano");
  }
  if (/wong kar|in the mood|nocturnal|velvet/.test(culturalCorpus)) {
    genres.unshift("Cinematic Nocturnal Ballad & Latin Bolero");
    moodTags.push("wong-kar-wai-chiaroscuro");
  }
  if (/berghain|detroit|villeneuve|bunker|acid/.test(culturalCorpus)) {
    genres.unshift("Subterranean Berlin-Detroit Techno");
  }
  if (/miles davis|coltrane|bill evans|blue note|ecm/.test(culturalCorpus)) {
    genres.unshift("Blue Note & ECM Modal Jazz");
  }
  if (/sabyasachi|raag|sitar|jaipur|udaipur/.test(culturalCorpus)) {
    genres.unshift("Royal Hindustani Classical & Sufi Acoustic");
  }
  if (/nirvana|shoegaze|my bloody valentine|sonic youth|90s/.test(culturalCorpus)) {
    genres.unshift("90s Shoegaze & Seattle Grunge");
  }

  const hasQlooEvidence = qlooEntityNames.length > 0;
  const hasInferredClaims = (spec.provenance || []).some(
    (c) => c.source === "llm_knowledge" || c.source === "design_inference"
  );
  const primarySource: SoundtrackProvenanceLabel = hasQlooEvidence
    ? "qloo-evidence"
    : hasInferredClaims
    ? "inferred"
    : "fallback";

  const overallEnergy = clamp01(baseline.baseEnergy + energyDelta);
  const minBpm = Math.max(42, Math.min(180, Math.round(baseline.tempoRangeBpm[0] + bpmShift)));
  const maxBpm = Math.max(
    minBpm + 8,
    Math.min(200, Math.round(baseline.tempoRangeBpm[1] + bpmShift))
  );

  const ceilingH = spec.roomDimensions?.height ?? 3.6;
  const focalName = spec.focalPoint?.name || "central focal stage";

  const moments: [
    MusicMomentSpec,
    MusicMomentSpec,
    MusicMomentSpec,
    MusicMomentSpec
  ] = [
    {
      name: "arrival",
      description: `${baseline.momentFlavor.arrival} — tuned for ${floorName.toLowerCase()}, ${tempK}K ${timeOfDay} lighting, and ${acoustic.rt60}s RT60.`,
      targetEnergy: clamp01(baseline.momentCurve[0] + energyDelta * 0.6),
      trackSlots: 3,
    },
    {
      name: "dining",
      description: `${baseline.momentFlavor.dining} — balanced for ${guestCount} guests across ${wallName.toLowerCase()} (${ceilingH}m ceiling).`,
      targetEnergy: clamp01(baseline.momentCurve[1] + energyDelta * 0.7),
      trackSlots: 3,
    },
    {
      name: "peak",
      description: `${baseline.momentFlavor.peak} — anchored around ${focalName} at ${minBpm}–${maxBpm} BPM.`,
      targetEnergy: clamp01(baseline.momentCurve[2] + energyDelta * 0.9),
      trackSlots: 3,
    },
    {
      name: "wind-down",
      description: `${baseline.momentFlavor["wind-down"]} — gentle acoustic decay suited to ${acoustic.characterClass} (${acoustic.rt60}s RT60).`,
      targetEnergy: clamp01(baseline.momentCurve[3] + energyDelta * 0.5),
      trackSlots: 3,
    },
  ];

  return {
    moodTags: dedupeStrings(moodTags, 8),
    energy: overallEnergy,
    tempoRangeBpm: [minBpm, maxBpm],
    genres: dedupeStrings(genres, 6),
    era: baseline.era,
    instrumentation: dedupeStrings(instrumentation, 6),
    acousticCharacter: acoustic.formatted,
    moments,
    provenanceSummary: {
      primarySource,
      qlooEntitiesUsed: qlooEntityNames,
      derivationSignals,
    },
  };
}

/**
 * Runtime validator for `MusicProfile` with strict TypeScript narrowing (no `any`).
 */
export function validateMusicProfile(candidate: unknown): {
  valid: boolean;
  profile: MusicProfile | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (typeof candidate !== "object" || candidate === null) {
    return {
      valid: false,
      profile: null,
      errors: ["musicProfile must be a non-null object."],
    };
  }

  const rec = candidate as Record<string, unknown>;

  if (
    !Array.isArray(rec.moodTags) ||
    rec.moodTags.length === 0 ||
    !rec.moodTags.every((t) => typeof t === "string" && t.trim().length > 0)
  ) {
    errors.push("moodTags must be a non-empty array of non-empty strings.");
  }

  if (
    typeof rec.energy !== "number" ||
    !Number.isFinite(rec.energy) ||
    rec.energy < 0 ||
    rec.energy > 1
  ) {
    errors.push("energy must be a finite number in [0, 1].");
  }

  if (
    !Array.isArray(rec.tempoRangeBpm) ||
    rec.tempoRangeBpm.length !== 2 ||
    typeof rec.tempoRangeBpm[0] !== "number" ||
    typeof rec.tempoRangeBpm[1] !== "number" ||
    !Number.isFinite(rec.tempoRangeBpm[0]) ||
    !Number.isFinite(rec.tempoRangeBpm[1]) ||
    rec.tempoRangeBpm[0] < 30 ||
    rec.tempoRangeBpm[1] > 240 ||
    rec.tempoRangeBpm[0] > rec.tempoRangeBpm[1]
  ) {
    errors.push(
      "tempoRangeBpm must be a [min, max] tuple with 30 <= min <= max <= 240."
    );
  }

  if (
    !Array.isArray(rec.genres) ||
    rec.genres.length === 0 ||
    !rec.genres.every((g) => typeof g === "string" && g.trim().length > 0)
  ) {
    errors.push("genres must be a non-empty array of non-empty strings.");
  }

  if (typeof rec.era !== "string" || rec.era.trim().length === 0) {
    errors.push("era must be a non-empty string.");
  }

  if (
    !Array.isArray(rec.instrumentation) ||
    rec.instrumentation.length === 0 ||
    !rec.instrumentation.every(
      (inst) => typeof inst === "string" && inst.trim().length > 0
    )
  ) {
    errors.push("instrumentation must be a non-empty array of non-empty strings.");
  }

  if (
    typeof rec.acousticCharacter !== "string" ||
    rec.acousticCharacter.trim().length === 0
  ) {
    errors.push("acousticCharacter must be a non-empty string.");
  }

  if (!Array.isArray(rec.moments) || rec.moments.length !== 4) {
    errors.push(
      'moments must be a 4-tuple ordered ["arrival", "dining", "peak", "wind-down"].'
    );
  } else {
    rec.moments.forEach((mItem, idx) => {
      const expectedName = CANONICAL_MOMENTS[idx];
      if (typeof mItem !== "object" || mItem === null) {
        errors.push(`moments[${idx}] must be an object.`);
        return;
      }
      const mRec = mItem as Record<string, unknown>;
      if (mRec.name !== expectedName) {
        errors.push(
          `moments[${idx}].name must be "${expectedName}" (got "${String(mRec.name)}").`
        );
      }
      if (
        typeof mRec.description !== "string" ||
        mRec.description.trim().length === 0
      ) {
        errors.push(`moments[${idx}].description must be a non-empty string.`);
      }
      if (
        typeof mRec.targetEnergy !== "number" ||
        !Number.isFinite(mRec.targetEnergy) ||
        mRec.targetEnergy < 0 ||
        mRec.targetEnergy > 1
      ) {
        errors.push(
          `moments[${idx}].targetEnergy must be a finite number in [0, 1].`
        );
      }
      if (
        typeof mRec.trackSlots !== "number" ||
        !Number.isInteger(mRec.trackSlots) ||
        mRec.trackSlots < 1 ||
        mRec.trackSlots > 10
      ) {
        errors.push(`moments[${idx}].trackSlots must be an integer in [1, 10].`);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, profile: null, errors };
  }

  return {
    valid: true,
    profile: candidate as MusicProfile,
    errors: [],
  };
}

/**
 * Computes a deterministic FNV-1a 32-bit hex hash of all music-relevant fields
 * in `SceneSpec` so `/api/soundtrack` can cache playlists by scene fingerprint.
 */
export function computeSceneMusicHash(
  spec: SceneSpec,
  qlooEntities: ReadonlyArray<ResolvedEntity> = []
): string {
  const payload = JSON.stringify({
    typology: spec.typology,
    layoutMode: spec.layoutMode,
    timeOfDay: spec.timeOfDay,
    isOpenAir: spec.isOpenAir,
    dims: [
      spec.roomDimensions?.width,
      spec.roomDimensions?.height,
      spec.roomDimensions?.depth,
    ],
    materials: [
      spec.materials?.floor?.id,
      spec.materials?.wall?.id,
      spec.materials?.primaryFurniture?.id,
    ],
    tempK: spec.lighting?.temperatureK,
    rt60: spec.acousticTarget?.calculatedRT60Seconds,
    guests: spec.validation?.estimatedCapacityGuests,
    qloo: qlooEntities.map((e) => e.id || e.name).sort(),
    prompt: (spec.promptText || "").trim().toLowerCase().slice(0, 160),
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `smh_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Pure helper that derives, validates, and attaches `musicProfile` to a `SceneSpec`.
 */
export function attachMusicProfileToSceneSpec(
  spec: SceneSpec,
  qlooEntities: ReadonlyArray<ResolvedEntity> = [],
  artistRecommendations: ReadonlyArray<ArtistRec> = []
): SceneSpec {
  const derived = deriveMusicProfile(spec, qlooEntities, artistRecommendations);
  const check = validateMusicProfile(derived);
  if (!check.valid || !check.profile) {
    return spec;
  }
  return {
    ...spec,
    musicProfile: check.profile,
  };
}
