/**
 * Sonic Architecture — Step 2: Server-Side Soundtrack Verification, Cache & Quota Pipeline
 *
 * Implements:
 * 1. Three-tier candidate generation with strict honesty provenance labels:
 *    - Tier 1 (`"qloo-evidence"`): Extracted from Qloo music/artist entities present in
 *      `qlooSignals` or `scene.provenance` (`source === "qloo"`).
 *    - Tier 2 (`"inferred"`): Scene-aware cultural/acoustic reasoning candidates filling gaps
 *      for specific materials, lighting temperature, timeOfDay, and cultural motifs.
 *    - Tier 3 (`"fallback"`): Deterministic local catalog rules per `SpatialTypology`.
 * 2. Catalog Verification via `MusicProvider.search(artist, title)`:
 *    - Every candidate is resolved against the real catalog search.
 *    - Unresolved candidates are strictly dropped (`candidatesDroppedUnresolved`).
 *    - Tracks are deduplicated by normalized `artist::title` and `trackId`.
 *    - Artist repeat cap enforced (`maxPerArtist = 2` across playlist, `1` per moment).
 *    - Candidates are matched and balanced to each moment's `targetEnergy` (`arrival`, `dining`, `peak`, `wind-down`).
 * 3. Scene-Feature `"whyThisFits"` Generator:
 *    - Ties every track directly to concrete scene features (`materials.wall.name`, `roomDimensions.height`,
 *      `acousticTarget.targetRT60Seconds`, `lighting.temperatureK`, `ceilingStructure`).
 * 4. Dedicated Soundtrack Cache (`computeSceneMusicHash(scene)`) with configurable TTL
 *    and sliding-window Request Budget / Quota (completely independent of `/api/vibe`).
 * 5. Labeled Offline / Quota Fallback Playlist:
 *    - When over request quota (`cacheStatus: "fallback-quota"`) or when catalog network calls fail
 *      (`cacheStatus: "fallback-offline"`), returns a clearly labeled fallback playlist using only
 *      real search URLs (`buildExternalMusicSearchUrl`) and never fabricates track IDs or store links.
 */

import type {
  SceneSpec,
  SpatialTypology,
  SoundtrackProvenanceLabel,
  SoundtrackMomentName,
  SoundtrackTrackItem,
  SoundtrackMomentPlaylist,
  SoundtrackPlaylist,
  ResolvedTrack,
  MusicProfile,
} from "./types";
import {
  deriveMusicProfile,
  computeSceneMusicHash,
  validateMusicProfile,
  type QlooMusicEntityInput,
} from "./music-profile";
import {
  type MusicProvider,
  CompositeMusicProvider,
  buildExternalMusicSearchUrl,
} from "./soundtrack-providers";

export interface TrackCandidate {
  artist: string;
  title: string;
  preferredMoment: SoundtrackMomentName;
  estimatedEnergy: number;
  bpmEstimate: number;
  provenance: SoundtrackProvenanceLabel;
  provenanceSourceDetail: string;
  featureHook?: string;
}

// ============================================================================
// 1. CURATED REAL-CATALOG ARTIST REPERTOIRE FOR QLOO ENTITY EXPANSION
// ============================================================================

interface KnownArtistTrack {
  title: string;
  moment: SoundtrackMomentName;
  energy: number;
  bpm: number;
}

const KNOWN_ARTIST_CATALOG: Readonly<Record<string, ReadonlyArray<KnownArtistTrack>>> = {
  "ryuichi sakamoto": [
    { title: "Merry Christmas Mr. Lawrence", moment: "arrival", energy: 0.34, bpm: 78 },
    { title: "andata", moment: "wind-down", energy: 0.24, bpm: 64 },
    { title: "opus", moment: "dining", energy: 0.38, bpm: 82 },
  ],
  "hiroshi yoshimura": [
    { title: "Blink", moment: "arrival", energy: 0.26, bpm: 72 },
    { title: "Dance PM", moment: "dining", energy: 0.36, bpm: 84 },
    { title: "Creek", moment: "wind-down", energy: 0.22, bpm: 66 },
  ],
  "haruomi hosono": [
    { title: "Sports Men", moment: "peak", energy: 0.64, bpm: 112 },
    { title: "Talking", moment: "arrival", energy: 0.35, bpm: 86 },
  ],
  "nils frahm": [
    { title: "Says", moment: "peak", energy: 0.68, bpm: 115 },
    { title: "Ambre", moment: "arrival", energy: 0.32, bpm: 76 },
    { title: "My Friend the Forest", moment: "wind-down", energy: 0.25, bpm: 68 },
  ],
  "olafur arnalds": [
    { title: "Near Light", moment: "arrival", energy: 0.38, bpm: 82 },
    { title: "Saman", moment: "wind-down", energy: 0.24, bpm: 66 },
  ],
  "max richter": [
    { title: "On the Nature of Daylight", moment: "dining", energy: 0.42, bpm: 74 },
    { title: "Spring 1", moment: "peak", energy: 0.65, bpm: 108 },
    { title: "Written on the Sky", moment: "wind-down", energy: 0.24, bpm: 64 },
  ],
  "arvo part": [
    { title: "Spiegel im Spiegel", moment: "arrival", energy: 0.22, bpm: 62 },
    { title: "Cantus in Memory of Benjamin Britten", moment: "peak", energy: 0.56, bpm: 84 },
  ],
  "floating points": [
    { title: "Promises", moment: "arrival", energy: 0.35, bpm: 78 },
    { title: "LesAlpx", moment: "peak", energy: 0.78, bpm: 124 },
  ],
  "four tet": [
    { title: "Two Thousand and Seventeen", moment: "dining", energy: 0.54, bpm: 102 },
    { title: "Baby", moment: "peak", energy: 0.76, bpm: 122 },
  ],
  "bicep": [
    { title: "Glue", moment: "peak", energy: 0.84, bpm: 130 },
    { title: "Apricots", moment: "dining", energy: 0.68, bpm: 123 },
  ],
  "jon hopkins": [
    { title: "Emerald Rush", moment: "peak", energy: 0.80, bpm: 120 },
    { title: "Immunity", moment: "wind-down", energy: 0.32, bpm: 76 },
  ],
  "anoushka shankar": [
    { title: "Lasya", moment: "arrival", energy: 0.46, bpm: 92 },
    { title: "Flight", moment: "dining", energy: 0.54, bpm: 98 },
  ],
  "zakir hussain": [
    { title: "Making Music", moment: "dining", energy: 0.56, bpm: 102 },
  ],
  "a r rahman": [
    { title: "Jashn-E-Bahaaraa", moment: "dining", energy: 0.58, bpm: 96 },
    { title: "Tere Bina", moment: "peak", energy: 0.74, bpm: 114 },
  ],
  "bill evans": [
    { title: "Peace Piece", moment: "wind-down", energy: 0.24, bpm: 66 },
    { title: "Waltz for Debby", moment: "dining", energy: 0.46, bpm: 94 },
  ],
  "miles davis": [
    { title: "So What", moment: "peak", energy: 0.62, bpm: 112 },
    { title: "Blue in Green", moment: "wind-down", energy: 0.26, bpm: 64 },
  ],
  "cheb khaled": [
    { title: "Aicha", moment: "dining", energy: 0.56, bpm: 98 },
  ],
  "khruangbin": [
    { title: "Time (You and I)", moment: "peak", energy: 0.72, bpm: 112 },
    { title: "White Gloves", moment: "wind-down", energy: 0.34, bpm: 82 },
  ],
  "air": [
    { title: "La femme d'argent", moment: "arrival", energy: 0.44, bpm: 92 },
    { title: "Alone in Kyoto", moment: "wind-down", energy: 0.30, bpm: 78 },
  ],
  "bonobo": [
    { title: "Kerala", moment: "peak", energy: 0.74, bpm: 118 },
    { title: "Cirrus", moment: "dining", energy: 0.58, bpm: 108 },
  ],
  "aphex twin": [
    { title: "Avril 14th", moment: "arrival", energy: 0.28, bpm: 79 },
    { title: "Xtal", moment: "peak", energy: 0.76, bpm: 126 },
  ],
  "gesaffelstein": [
    { title: "Pursuit", moment: "peak", energy: 0.88, bpm: 115 },
    { title: "Opr", moment: "dining", energy: 0.76, bpm: 112 },
  ],
  "nicolas jaar": [
    { title: "Space Is Only Noise If You Can See", moment: "dining", energy: 0.56, bpm: 106 },
    { title: "Mi Mujer", moment: "peak", energy: 0.74, bpm: 118 },
  ],
  "ludovico einaudi": [
    { title: "Nuvole Bianche", moment: "arrival", energy: 0.34, bpm: 74 },
    { title: "Experience", moment: "peak", energy: 0.66, bpm: 98 },
  ],
  "kamasi washington": [
    { title: "Clair de Lune", moment: "peak", energy: 0.68, bpm: 104 },
    { title: "Truth", moment: "dining", energy: 0.56, bpm: 94 },
  ],
  "nujabes": [
    { title: "Feather", moment: "dining", energy: 0.54, bpm: 92 },
    { title: "Aruarian Dance", moment: "wind-down", energy: 0.36, bpm: 84 },
  ],
  "brian eno": [
    { title: "An Ending (Ascent)", moment: "wind-down", energy: 0.22, bpm: 62 },
    { title: "1/1", moment: "arrival", energy: 0.26, bpm: 68 },
  ],
};

// ============================================================================
// 2. INFERRED SCENE-FEATURE CANDIDATES ("inferred" provenance)
// ============================================================================

const TYPOLOGY_INFERRED_CANDIDATES: Readonly<
  Record<string, ReadonlyArray<Omit<TrackCandidate, "provenance">>>
> = {
  listening_lounge: [
    {
      artist: "Ryuichi Sakamoto",
      title: "Merry Christmas Mr. Lawrence",
      preferredMoment: "arrival",
      estimatedEnergy: 0.34,
      bpmEstimate: 78,
      provenanceSourceDetail: "Inferred from listening_lounge warm timber absorption & dry studio RT60 target",
    },
    {
      artist: "Bill Evans",
      title: "Waltz for Debby",
      preferredMoment: "dining",
      estimatedEnergy: 0.45,
      bpmEstimate: 94,
      provenanceSourceDetail: "Inferred from intimate horn-speaker staging & acoustic wool wall treatment",
    },
    {
      artist: "Miles Davis",
      title: "So What",
      preferredMoment: "peak",
      estimatedEnergy: 0.62,
      bpmEstimate: 112,
      provenanceSourceDetail: "Inferred from audiophile vinyl console focal point & mid-band clarity",
    },
    {
      artist: "Hiroshi Yoshimura",
      title: "Blink",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.26,
      bpmEstimate: 72,
      provenanceSourceDetail: "Inferred from low-glare tungsten ambient lighting & late-hour cadence",
    },
  ],
  cathedral_banquet: [
    {
      artist: "Arvo Part",
      title: "Spiegel im Spiegel",
      preferredMoment: "arrival",
      estimatedEnergy: 0.24,
      bpmEstimate: 62,
      provenanceSourceDetail: "Inferred from high vaulted ceiling volume & long cathedral RT60 decay",
    },
    {
      artist: "Max Richter",
      title: "On the Nature of Daylight",
      preferredMoment: "dining",
      estimatedEnergy: 0.42,
      bpmEstimate: 74,
      provenanceSourceDetail: "Inferred from limestone colonnade reflections & candlelight banquet tables",
    },
    {
      artist: "Ludovico Einaudi",
      title: "Experience",
      preferredMoment: "peak",
      estimatedEnergy: 0.64,
      bpmEstimate: 96,
      provenanceSourceDetail: "Inferred from ceremonial altar dais & grand chandelier warmth",
    },
    {
      artist: "Olafur Arnalds",
      title: "Saman",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.24,
      bpmEstimate: 66,
      provenanceSourceDetail: "Inferred from gothic ribbed vault acoustic tail & nocturnal stillness",
    },
  ],
  zen_tea_pavilion: [
    {
      artist: "Hiroshi Yoshimura",
      title: "Creek",
      preferredMoment: "arrival",
      estimatedEnergy: 0.22,
      bpmEstimate: 64,
      provenanceSourceDetail: "Inferred from hinoki cypress rafters, tatami floor & tranquil arrival threshold",
    },
    {
      artist: "Ryuichi Sakamoto",
      title: "opus",
      preferredMoment: "dining",
      estimatedEnergy: 0.34,
      bpmEstimate: 76,
      provenanceSourceDetail: "Inferred from shoji screen diffusion & intimate chabudai seating",
    },
    {
      artist: "Haruomi Hosono",
      title: "Talking",
      preferredMoment: "peak",
      estimatedEnergy: 0.44,
      bpmEstimate: 86,
      provenanceSourceDetail: "Inferred from sunken ro hearth focal point & Kyoto organic minimalism",
    },
    {
      artist: "Brian Eno",
      title: "1/1",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.20,
      bpmEstimate: 62,
      provenanceSourceDetail: "Inferred from dry intimate room volume & contemplative lantern glow",
    },
  ],
  courtyard_dining: [
    {
      artist: "Air",
      title: "La femme d'argent",
      preferredMoment: "arrival",
      estimatedEnergy: 0.44,
      bpmEstimate: 92,
      provenanceSourceDetail: "Inferred from open-air pergola dispersion & golden-hour travertine warmth",
    },
    {
      artist: "Khruangbin",
      title: "White Gloves",
      preferredMoment: "dining",
      estimatedEnergy: 0.50,
      bpmEstimate: 94,
      provenanceSourceDetail: "Inferred from olive tree courtyard planters & Mediterranean al-fresco dining",
    },
    {
      artist: "Khruangbin",
      title: "Time (You and I)",
      preferredMoment: "peak",
      estimatedEnergy: 0.72,
      bpmEstimate: 112,
      provenanceSourceDetail: "Inferred from open-sky festive social circulation around central fountain",
    },
    {
      artist: "Nujabes",
      title: "Aruarian Dance",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.34,
      bpmEstimate: 84,
      provenanceSourceDetail: "Inferred from warm string-light canopy & breezy night courtyard decay",
    },
  ],
  sangeet_courtyard: [
    {
      artist: "Anoushka Shankar",
      title: "Lasya",
      preferredMoment: "arrival",
      estimatedEnergy: 0.46,
      bpmEstimate: 92,
      provenanceSourceDetail: "Inferred from scalloped mandap arch & marigold garland processional entry",
    },
    {
      artist: "A.R. Rahman",
      title: "Jashn-E-Bahaaraa",
      preferredMoment: "dining",
      estimatedEnergy: 0.58,
      bpmEstimate: 98,
      provenanceSourceDetail: "Inferred from diwan bolster lounges, brass accents &royal courtyard feast",
    },
    {
      artist: "A.R. Rahman",
      title: "Tere Bina",
      preferredMoment: "peak",
      estimatedEnergy: 0.78,
      bpmEstimate: 116,
      provenanceSourceDetail: "Inferred from celebratory sangeet dance floor & high guest capacity",
    },
    {
      artist: "Zakir Hussain",
      title: "Making Music",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.38,
      bpmEstimate: 84,
      provenanceSourceDetail: "Inferred from sandstone courtyard acoustic warmth & late-night jhula lounge",
    },
  ],
  brutalist_runway: [
    {
      artist: "Nicolas Jaar",
      title: "Space Is Only Noise If You Can See",
      preferredMoment: "arrival",
      estimatedEnergy: 0.54,
      bpmEstimate: 106,
      provenanceSourceDetail: "Inferred from board-formed concrete piers & stark 5200K linear light blades",
    },
    {
      artist: "Gesaffelstein",
      title: "Opr",
      preferredMoment: "dining",
      estimatedEnergy: 0.72,
      bpmEstimate: 112,
      provenanceSourceDetail: "Inferred from obsidian runway deck & high-contrast architectural tension",
    },
    {
      artist: "Gesaffelstein",
      title: "Pursuit",
      preferredMoment: 
        "peak",
      estimatedEnergy: 0.88,
      bpmEstimate: 115,
      provenanceSourceDetail: "Inferred from monolithic cantilever catwalk & kinetic strobe choreography",
    },
    {
      artist: "Jon Hopkins",
      title: "Immunity",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.34,
      bpmEstimate: 78,
      provenanceSourceDetail: "Inferred from raw concrete reverberant tail after runway finale",
    },
  ],
  grunge_loft_party: [
    {
      artist: "Four Tet",
      title: "Two Thousand and Seventeen",
      preferredMoment: "arrival",
      estimatedEnergy: 0.54,
      bpmEstimate: 104,
      provenanceSourceDetail: "Inferred from exposed industrial rig & tufted leather lounge arrival",
    },
    {
      artist: "Bonobo",
      title: "Cirrus",
      preferredMoment: "dining",
      estimatedEnergy: 0.66,
      bpmEstimate: 114,
      provenanceSourceDetail: "Inferred from chrome balloon installations & dense warehouse social energy",
    },
    {
      artist: "Bicep",
      title: "Glue",
      preferredMoment: "peak",
      estimatedEnergy: 0.86,
      bpmEstimate: 130,
      provenanceSourceDetail: "Inferred from DJ flash rig, techno sound stack & nocturnal loft peak",
    },
    {
      artist: "Aphex Twin",
      title: "Avril 14th",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.32,
      bpmEstimate: 79,
      provenanceSourceDetail: "Inferred from post-peak loft decompression & warm amber practicals",
    },
  ],
  keynote_pavilion: [
    {
      artist: "Nils Frahm",
      title: "Ambre",
      preferredMoment: "arrival",
      estimatedEnergy: 0.36,
      bpmEstimate: 80,
      provenanceSourceDetail: "Inferred from space-frame truss geometry & executive seating ingress",
    },
    {
      artist: "Floating Points",
      title: "Promises",
      preferredMoment: "dining",
      estimatedEnergy: 0.48,
      bpmEstimate: 94,
      provenanceSourceDetail: "Inferred from high STI speech-intelligibility acoustic paneling",
    },
    {
      artist: "Jon Hopkins",
      title: "Emerald Rush",
      preferredMoment: "peak",
      estimatedEnergy: 0.76,
      bpmEstimate: 120,
      provenanceSourceDetail: "Inferred from curved LED backdrop & flagship EV product plinth reveal",
    },
    {
      artist: "Brian Eno",
      title: "An Ending (Ascent)",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.28,
      bpmEstimate: 66,
      provenanceSourceDetail: "Inferred from post-keynote pavilion networking & glass curtain reflection",
    },
  ],
};

// ============================================================================
// 3. LOCAL DETERMINISTIC FALLBACK CATALOG PER TYPOLOGY ("fallback" provenance)
// ============================================================================

const TYPOLOGY_FALLBACK_CANDIDATES: Readonly<
  Record<string, ReadonlyArray<Omit<TrackCandidate, "provenance">>>
> = {
  listening_lounge: [
    {
      artist: "Dave Brubeck",
      title: "Take Five",
      preferredMoment: "arrival",
      estimatedEnergy: 0.42,
      bpmEstimate: 88,
      provenanceSourceDetail: "Local typology fallback rule for listening_lounge (arrival)",
    },
    {
      artist: "John Coltrane",
      title: "Naima",
      preferredMoment: "dining",
      estimatedEnergy: 0.38,
      bpmEstimate: 74,
      provenanceSourceDetail: "Local typology fallback rule for listening_lounge (dining)",
    },
    {
      artist: "Kamasi Washington",
      title: "Truth",
      preferredMoment: "peak",
      estimatedEnergy: 0.60,
      bpmEstimate: 98,
      provenanceSourceDetail: "Local typology fallback rule for listening_lounge (peak)",
    },
    {
      artist: "Bill Evans",
      title: "Peace Piece",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.24,
      bpmEstimate: 64,
      provenanceSourceDetail: "Local typology fallback rule for listening_lounge (wind-down)",
    },
  ],
  cathedral_banquet: [
    {
      artist: "Johann Sebastian Bach",
      title: "Cello Suite No. 1 in G Major",
      preferredMoment: "arrival",
      estimatedEnergy: 0.30,
      bpmEstimate: 68,
      provenanceSourceDetail: "Local typology fallback rule for cathedral_banquet (arrival)",
    },
    {
      artist: "Claude Debussy",
      title: "Clair de Lune",
      preferredMoment: "dining",
      estimatedEnergy: 0.36,
      bpmEstimate: 66,
      provenanceSourceDetail: "Local typology fallback rule for cathedral_banquet (dining)",
    },
    {
      artist: "Max Richter",
      title: "Spring 1",
      preferredMoment: "peak",
      estimatedEnergy: 0.62,
      bpmEstimate: 108,
      provenanceSourceDetail: "Local typology fallback rule for cathedral_banquet (peak)",
    },
    {
      artist: "Erik Satie",
      title: "Gymnopedie No. 1",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.22,
      bpmEstimate: 62,
      provenanceSourceDetail: "Local typology fallback rule for cathedral_banquet (wind-down)",
    },
  ],
  zen_tea_pavilion: [
    {
      artist: "Ryuichi Sakamoto",
      title: "andata",
      preferredMoment: "arrival",
      estimatedEnergy: 0.24,
      bpmEstimate: 64,
      provenanceSourceDetail: "Local typology fallback rule for zen_tea_pavilion (arrival)",
    },
    {
      artist: "Hiroshi Yoshimura",
      title: "Dance PM",
      preferredMoment: "dining",
      estimatedEnergy: 0.34,
      bpmEstimate: 78,
      provenanceSourceDetail: "Local typology fallback rule for zen_tea_pavilion (dining)",
    },
    {
      artist: "Air",
      title: "Alone in Kyoto",
      preferredMoment: "peak",
      estimatedEnergy: 0.42,
      bpmEstimate: 82,
      provenanceSourceDetail: "Local typology fallback rule for zen_tea_pavilion (peak)",
    },
    {
      artist: "Erik Satie",
      title: "Gnossienne No. 1",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.20,
      bpmEstimate: 62,
      provenanceSourceDetail: "Local typology fallback rule for zen_tea_pavilion (wind-down)",
    },
  ],
  courtyard_dining: [
    {
      artist: "Stan Getz",
      title: "The Girl from Ipanema",
      preferredMoment: "arrival",
      estimatedEnergy: 0.42,
      bpmEstimate: 94,
      provenanceSourceDetail: "Local typology fallback rule for courtyard_dining (arrival)",
    },
    {
      artist: "Zero 7",
      title: "In the Waiting Line",
      preferredMoment: "dining",
      estimatedEnergy: 0.48,
      bpmEstimate: 90,
      provenanceSourceDetail: "Local typology fallback rule for courtyard_dining (dining)",
    },
    {
      artist: "Bonobo",
      title: "Kerala",
      preferredMoment: "peak",
      estimatedEnergy: 0.70,
      bpmEstimate: 118,
      provenanceSourceDetail: "Local typology fallback rule for courtyard_dining (peak)",
    },
    {
      artist: "Norah Jones",
      title: "Sunrise",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.32,
      bpmEstimate: 78,
      provenanceSourceDetail: "Local typology fallback rule for courtyard_dining (wind-down)",
    },
  ],
  sangeet_courtyard: [
    {
      artist: "Ravi Shankar",
      title: "Raga Jog",
      preferredMoment: "arrival",
      estimatedEnergy: 0.44,
      bpmEstimate: 92,
      provenanceSourceDetail: "Local typology fallback rule for sangeet_courtyard (arrival)",
    },
    {
      artist: "Anoushka Shankar",
      title: "Flight",
      preferredMoment: "dining",
      estimatedEnergy: 0.56,
      bpmEstimate: 98,
      provenanceSourceDetail: "Local typology fallback rule for sangeet_courtyard (dining)",
    },
    {
      artist: "Panjabi MC",
      title: "Mundian To Bach Ke",
      preferredMoment: "peak",
      estimatedEnergy: 0.84,
      bpmEstimate: 100,
      provenanceSourceDetail: "Local typology fallback rule for sangeet_courtyard (peak)",
    },
    {
      artist: "Nitin Sawhney",
      title: "Sunset",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.34,
      bpmEstimate: 82,
      provenanceSourceDetail: "Local typology fallback rule for sangeet_courtyard (wind-down)",
    },
  ],
  brutalist_runway: [
    {
      artist: "Aphex Twin",
      title: "Xtal",
      preferredMoment: "arrival",
      estimatedEnergy: 0.58,
      bpmEstimate: 120,
      provenanceSourceDetail: "Local typology fallback rule for brutalist_runway (arrival)",
    },
    {
      artist: "Moderat",
      title: "A New Error",
      preferredMoment: "dining",
      estimatedEnergy: 0.68,
      bpmEstimate: 112,
      provenanceSourceDetail: "Local typology fallback rule for brutalist_runway (dining)",
    },
    {
      artist: "Justice",
      title: "Genesis",
      preferredMoment: "peak",
      estimatedEnergy: 0.86,
      bpmEstimate: 117,
      provenanceSourceDetail: "Local typology fallback rule for brutalist_runway (peak)",
    },
    {
      artist: "Nils Frahm",
      title: "My Friend the Forest",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.28,
      bpmEstimate: 68,
      provenanceSourceDetail: "Local typology fallback rule for brutalist_runway (wind-down)",
    },
  ],
  grunge_loft_party: [
    {
      artist: "Massive Attack",
      title: "Teardrop",
      preferredMoment: "arrival",
      estimatedEnergy: 0.48,
      bpmEstimate: 77,
      provenanceSourceDetail: "Local typology fallback rule for grunge_loft_party (arrival)",
    },
    {
      artist: "Jamie xx",
      title: "Gosh",
      preferredMoment: "dining",
      estimatedEnergy: 0.72,
      bpmEstimate: 122,
      provenanceSourceDetail: "Local typology fallback rule for grunge_loft_party (dining)",
    },
    {
      artist: "Four Tet",
      title: "Baby",
      preferredMoment: "peak",
      estimatedEnergy: 0.82,
      bpmEstimate: 124,
      provenanceSourceDetail: "Local typology fallback rule for grunge_loft_party (peak)",
    },
    {
      artist: "Portishead",
      title: "Glory Box",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.36,
      bpmEstimate: 62,
      provenanceSourceDetail: "Local typology fallback rule for grunge_loft_party (wind-down)",
    },
  ],
  keynote_pavilion: [
    {
      artist: "Olafur Arnalds",
      title: "Near Light",
      preferredMoment: "arrival",
      estimatedEnergy: 0.38,
      bpmEstimate: 82,
      provenanceSourceDetail: "Local typology fallback rule for keynote_pavilion (arrival)",
    },
    {
      artist: "Tycho",
      title: "Awake",
      preferredMoment: "dining",
      estimatedEnergy: 0.56,
      bpmEstimate: 116,
      provenanceSourceDetail: "Local typology fallback rule for keynote_pavilion (dining)",
    },
    {
      artist: "Nils Frahm",
      title: "Says",
      preferredMoment: "peak",
      estimatedEnergy: 0.72,
      bpmEstimate: 115,
      provenanceSourceDetail: "Local typology fallback rule for keynote_pavilion (peak)",
    },
    {
      artist: "Max Richter",
      title: "Written on the Sky",
      preferredMoment: "wind-down",
      estimatedEnergy: 0.24,
      bpmEstimate: 64,
      provenanceSourceDetail: "Local typology fallback rule for keynote_pavilion (wind-down)",
    },
  ],
};

// ============================================================================
// 4. CANDIDATE GENERATION (QLOO-EVIDENCE -> INFERRED -> FALLBACK)
// ============================================================================

function extractQlooEvidenceCandidates(
  scene: SceneSpec,
  qlooSignals?: ReadonlyArray<QlooMusicEntityInput>
): TrackCandidate[] {
  const candidates: TrackCandidate[] = [];
  const seenEntities = new Set<string>();

  const registerEntityName = (rawName: string, originNote: string): void => {
    const clean = rawName
      .replace(/^Qloo\s+affinity\s*:\s*/i, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
    const key = clean.toLowerCase();
    if (!key || seenEntities.has(key)) return;
    seenEntities.add(key);

    // Match against known real-catalog tracks for this artist entity
    for (const [artistKey, tracks] of Object.entries(KNOWN_ARTIST_CATALOG)) {
      if (key.includes(artistKey) || artistKey.includes(key)) {
        const displayArtist = clean
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        for (const t of tracks) {
          candidates.push({
            artist: displayArtist,
            title: t.title,
            preferredMoment: t.moment,
            estimatedEnergy: t.energy,
            bpmEstimate: t.bpm,
            provenance: "qloo-evidence",
            provenanceSourceDetail: originNote,
          });
        }
      }
    }
  };

  if (qlooSignals && qlooSignals.length > 0) {
    for (const sig of qlooSignals) {
      if (sig.name && sig.name.trim().length > 0) {
        registerEntityName(
          sig.name,
          `Live Qloo music/artist entity: "${sig.name.trim()}"`
        );
      }
    }
  }

  if (Array.isArray(scene.provenance)) {
    for (const claim of scene.provenance) {
      const legacyClaim = claim as unknown as { source?: string; signal?: string; aspect?: string };
      if (
        (claim.source === "qloo_evidence" || legacyClaim.source === "qloo") &&
        (claim.entityReference || legacyClaim.signal || claim.label)
      ) {
        const refName = claim.entityReference || legacyClaim.signal || claim.label;
        const domainLabel = claim.domain || legacyClaim.aspect || "culture";
        registerEntityName(
          refName,
          `Qloo provenance signal (${domainLabel}): "${refName}"`
        );
      }
    }
  }

  return candidates;
}

export function generateOrderedCandidates(
  scene: SceneSpec,
  qlooSignals?: ReadonlyArray<QlooMusicEntityInput>
): TrackCandidate[] {
  const qlooCandidates = extractQlooEvidenceCandidates(scene, qlooSignals);

  const typologyAliasMap: Readonly<Record<string, string>> = {
    listening_room: "listening_lounge",
    intimate_lounge: "listening_lounge",
    tea_room: "zen_tea_pavilion",
    coastal_retreat: "zen_tea_pavilion",
    mediterranean_courtyard: "courtyard_dining",
    pavilion_celebration: "sangeet_courtyard",
    garden_mandap: "sangeet_courtyard",
    grunge_loft: "grunge_loft_party",
    underground_club: "grunge_loft_party",
    industrial_warehouse: "grunge_loft_party",
    futuristic_launch: "keynote_pavilion",
    gallery_pavilion: "keynote_pavilion",
    custom_hybrid: "listening_lounge",
  };
  const mappedKey = typologyAliasMap[scene.typology] ?? scene.typology;
  const inferredRaw =
    TYPOLOGY_INFERRED_CANDIDATES[mappedKey] ??
    TYPOLOGY_INFERRED_CANDIDATES.listening_lounge;
  const inferredCandidates: TrackCandidate[] = inferredRaw.map((c) => ({
    ...c,
    provenance: "inferred",
  }));

  const fallbackRaw =
    TYPOLOGY_FALLBACK_CANDIDATES[mappedKey] ??
    TYPOLOGY_FALLBACK_CANDIDATES.listening_lounge;
  const fallbackCandidates: TrackCandidate[] = fallbackRaw.map((c) => ({
    ...c,
    provenance: "fallback",
  }));

  // Strictly ordered: 1. qloo-evidence -> 2. inferred -> 3. fallback
  return [...qlooCandidates, ...inferredCandidates, ...fallbackCandidates];
}

// ============================================================================
// 5. SCENE-FEATURE "WHY THIS FITS" ONE-LINER GENERATOR
// ============================================================================

export function buildWhyThisFitsExplanation(
  scene: SceneSpec,
  moment: SoundtrackMomentName,
  provenance: SoundtrackProvenanceLabel
): string {
  const wallMat = scene.materials?.wall?.name ?? "architectural wall surfaces";
  const floorMat = scene.materials?.floor?.name ?? "flooring";
  const heightM = (scene.roomDimensions?.height ?? 4.2).toFixed(1);
  const rt60 = (scene.acousticTarget?.targetRT60Seconds ?? 0.65).toFixed(2);
  const tempK = Math.round(scene.lighting?.temperatureK ?? 2900);
  const ceiling = (scene.ceilingStructure ?? "coffered_timber").replace(/_/g, " ");

  const provenancePrefix =
    provenance === "qloo-evidence"
      ? "Matched from Qloo cultural affinity data; "
      : "";

  switch (moment) {
    case "arrival":
      return `${provenancePrefix}${wallMat} and ${heightM}m ceiling height (RT60 ${rt60}s) favor unhurried arrival textures under ${tempK}K entry lighting.`;
    case "dining":
      return `${provenancePrefix}${floorMat} underfoot and ${ceiling} geometry preserve clear conversational STI while sustaining warm midrange harmonic depth.`;
    case "peak":
      return `${provenancePrefix}Calibrated to the ${scene.focalPoint?.name ?? "central focal point"} at peak gathering energy without overloading the ${rt60}s reverberation window.`;
    case "wind-down":
      return `${provenancePrefix}Soft acoustic tail across ${wallMat} and ${tempK}K nocturnal dimming guide the space into a restorative close.`;
  }
}

// ============================================================================
// 6. DEDICATED SOUNDTRACK CACHE & SLIDING-WINDOW REQUEST QUOTA
// ============================================================================

interface CacheEntry {
  playlist: SoundtrackPlaylist;
  expiresAtMs: number;
}

const SOUNDTRACK_CACHE = new Map<string, CacheEntry>();

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_QUOTA_WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const DEFAULT_QUOTA_MAX_REQUESTS = 30;

interface QuotaWindowState {
  timestamps: number[];
}

const QUOTA_BY_CLIENT = new Map<string, QuotaWindowState>();

function getCacheTtlMs(): number {
  const envVal =
    typeof process !== "undefined"
      ? Number.parseInt(process.env.SOUNDTRACK_CACHE_TTL_MS ?? "", 10)
      : Number.NaN;
  return Number.isFinite(envVal) && envVal > 5000 ? envVal : DEFAULT_CACHE_TTL_MS;
}

function getQuotaMaxRequests(): number {
  const envVal =
    typeof process !== "undefined"
      ? Number.parseInt(process.env.SOUNDTRACK_RATE_LIMIT_MAX ?? "", 10)
      : Number.NaN;
  return Number.isFinite(envVal) && envVal >= 1 ? envVal : DEFAULT_QUOTA_MAX_REQUESTS;
}

export function checkAndConsumeSoundtrackQuota(clientKey: string): {
  allowed: boolean;
  remainingRequests: number;
  maxRequestsPerWindow: number;
  resetAtIso: string;
} {
  const now = Date.now();
  const maxReqs = getQuotaMaxRequests();
  const cutoff = now - DEFAULT_QUOTA_WINDOW_MS;

  const current = QUOTA_BY_CLIENT.get(clientKey) ?? { timestamps: [] };
  const activeTimestamps = current.timestamps.filter((ts) => ts > cutoff);

  if (activeTimestamps.length >= maxReqs) {
    const oldest = activeTimestamps[0] ?? now;
    QUOTA_BY_CLIENT.set(clientKey, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remainingRequests: 0,
      maxRequestsPerWindow: maxReqs,
      resetAtIso: new Date(oldest + DEFAULT_QUOTA_WINDOW_MS).toISOString(),
    };
  }

  activeTimestamps.push(now);
  QUOTA_BY_CLIENT.set(clientKey, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remainingRequests: Math.max(0, maxReqs - activeTimestamps.length),
    maxRequestsPerWindow: maxReqs,
    resetAtIso: new Date(now + DEFAULT_QUOTA_WINDOW_MS).toISOString(),
  };
}

// ============================================================================
// 7. LABELED FALLBACK PLAYLIST BUILDER (OVER-QUOTA OR OFFLINE)
// ============================================================================

export function buildLabeledFallbackPlaylist(
  scene: SceneSpec,
  musicProfileOrReason?: MusicProfile | "fallback-quota" | "fallback-offline",
  sceneHashOrWarning?: string,
  reasonParam?: "fallback-quota" | "fallback-offline",
  quotaInfoParam?: SoundtrackPlaylist["quota"],
  warningMessageParam?: string
): SoundtrackPlaylist {
  const isShortCall =
    typeof musicProfileOrReason === "string" || musicProfileOrReason === undefined;
  const musicProfile: MusicProfile = isShortCall
    ? scene.musicProfile ?? deriveMusicProfile(scene)
    : musicProfileOrReason;
  const sceneHash: string = isShortCall
    ? computeSceneMusicHash(scene)
    : sceneHashOrWarning ?? computeSceneMusicHash(scene);
  const reason: "fallback-quota" | "fallback-offline" = isShortCall
    ? (musicProfileOrReason ?? "fallback-offline")
    : reasonParam ?? "fallback-offline";
  const quotaInfo: SoundtrackPlaylist["quota"] = quotaInfoParam ?? {
    remainingRequests: DEFAULT_QUOTA_MAX_REQUESTS,
    maxRequestsPerWindow: DEFAULT_QUOTA_MAX_REQUESTS,
    resetAtIso: new Date(Date.now() + DEFAULT_QUOTA_WINDOW_MS).toISOString(),
  };
  const warningMessage: string = isShortCall
    ? sceneHashOrWarning ?? "Local deterministic typology fallback active."
    : warningMessageParam ?? "Local deterministic typology fallback active.";

  const typologyAliasMap: Readonly<Record<string, string>> = {
    listening_room: "listening_lounge",
    intimate_lounge: "listening_lounge",
    tea_room: "zen_tea_pavilion",
    coastal_retreat: "zen_tea_pavilion",
    mediterranean_courtyard: "courtyard_dining",
    pavilion_celebration: "sangeet_courtyard",
    garden_mandap: "sangeet_courtyard",
    grunge_loft: "grunge_loft_party",
    underground_club: "grunge_loft_party",
    industrial_warehouse: "grunge_loft_party",
    futuristic_launch: "keynote_pavilion",
    gallery_pavilion: "keynote_pavilion",
    custom_hybrid: "listening_lounge",
  };
  const mappedKey = typologyAliasMap[scene.typology] ?? scene.typology;
  const fallbackRaw =
    TYPOLOGY_FALLBACK_CANDIDATES[mappedKey] ??
    TYPOLOGY_FALLBACK_CANDIDATES.listening_lounge;
  const inferredRaw =
    TYPOLOGY_INFERRED_CANDIDATES[mappedKey] ??
    TYPOLOGY_INFERRED_CANDIDATES.listening_lounge;

  const pool = [...fallbackRaw, ...inferredRaw];
  const allTracks: SoundtrackTrackItem[] = [];

  const momentPlaylists = musicProfile.moments.map((momentSpec, mIdx): SoundtrackMomentPlaylist => {
    const matching = pool.filter((item) => item.preferredMoment === momentSpec.name);
    const selected = matching.slice(0, Math.max(1, momentSpec.trackSlots));

    const momentTracks: SoundtrackTrackItem[] = selected.map((cand, cIdx) => {
      const trackItem: SoundtrackTrackItem = {
        id: `fallback-${sceneHash}-${mIdx}-${cIdx}`,
        title: cand.title,
        artist: cand.artist,
        previewUrl: null,
        externalSearchUrl: buildExternalMusicSearchUrl(cand.artist, cand.title),
        moment: momentSpec.name,
        targetEnergy: momentSpec.targetEnergy,
        estimatedEnergy: cand.estimatedEnergy,
        bpmEstimate: cand.bpmEstimate,
        provenance: "fallback",
        provenanceSourceDetail: `${cand.provenanceSourceDetail} (${reason})`,
        whyThisFits: buildWhyThisFitsExplanation(scene, momentSpec.name, "fallback"),
      };
      allTracks.push(trackItem);
      return trackItem;
    });

    return {
      name: momentSpec.name,
      description: momentSpec.description,
      targetEnergy: momentSpec.targetEnergy,
      trackSlots: momentSpec.trackSlots,
      tracks: momentTracks,
    };
  }) as [
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist
  ];

  return {
    sceneHash,
    generatedAtIso: new Date().toISOString(),
    cacheStatus: reason,
    providerUsed: "local-typology-fallback",
    musicProfile,
    moments: momentPlaylists,
    tracks: allTracks,
    verificationStats: {
      candidatesGenerated: pool.length,
      candidatesVerified: 0,
      candidatesDroppedUnresolved: 0,
      duplicatesRemoved: 0,
      qlooEvidenceCount: 0,
      inferredCount: 0,
      fallbackCount: allTracks.length,
    },
    quota: quotaInfo,
    warnings: [warningMessage],
  };
}

// ============================================================================
// 8. FULL VERIFICATION, DEDUPE, ARTIST CAP & MOMENT BALANCING PIPELINE
// ============================================================================

interface VerifiedCandidateRecord {
  candidate: TrackCandidate;
  resolved: ResolvedTrack;
}

export async function generateVerifiedSoundtrackPlaylist(options: {
  scene: SceneSpec;
  qlooSignals?: ReadonlyArray<QlooMusicEntityInput>;
  clientKey?: string;
  forceRefresh?: boolean;
  provider?: MusicProvider;
}): Promise<SoundtrackPlaylist> {
  const { scene, qlooSignals, clientKey = "global", forceRefresh = false } = options;

  // 1. Derive or validate MusicProfile
  const derivedProfile =
    scene.musicProfile && validateMusicProfile(scene.musicProfile).valid
      ? scene.musicProfile
      : deriveMusicProfile(scene, qlooSignals as any);

  const sceneHash = computeSceneMusicHash(scene);
  const now = Date.now();

  // 2. Check TTL Cache first (unless forceRefresh requested)
  if (!forceRefresh) {
    const cached = SOUNDTRACK_CACHE.get(sceneHash);
    if (cached && cached.expiresAtMs > now) {
      return {
        ...cached.playlist,
        cacheStatus: "hit",
      };
    }
  }

  // 3. Enforce Request Budget / Quota
  const quota = checkAndConsumeSoundtrackQuota(clientKey);
  if (!quota.allowed) {
    return buildLabeledFallbackPlaylist(
      scene,
      derivedProfile,
      sceneHash,
      "fallback-quota",
      quota,
      "Soundtrack catalog request budget exceeded for the current 5-minute window. Showing labeled local fallback recommendations."
    );
  }

  // 4. Generate ordered candidates (qloo-evidence -> inferred -> fallback)
  const rawCandidates = generateOrderedCandidates(scene, qlooSignals);

  // Deduplicate candidate inputs before firing network requests
  const uniqueCandidates: TrackCandidate[] = [];
  const seenCandidateKeys = new Set<string>();
  let duplicatesRemoved = 0;

  for (const cand of rawCandidates) {
    const normKey = `${cand.artist.trim().toLowerCase()}::${cand.title.trim().toLowerCase()}`;
    if (seenCandidateKeys.has(normKey)) {
      duplicatesRemoved++;
      continue;
    }
    seenCandidateKeys.add(normKey);
    uniqueCandidates.push(cand);
  }

  const compositeProvider =
    options.provider ?? new CompositeMusicProvider({ timeoutMs: 4200 });
  const providerSummary =
    compositeProvider instanceof CompositeMusicProvider
      ? compositeProvider.getProviderSummary()
      : compositeProvider.id;

  // 5. Verify every candidate against the real catalog search in bounded batches
  const verifiedRecords: VerifiedCandidateRecord[] = [];
  let candidatesDroppedUnresolved = 0;
  const BATCH_SIZE = 6;

  for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
    const slice = uniqueCandidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      slice.map(async (candidate) => {
        try {
          const resolved = await compositeProvider.search(
            candidate.artist,
            candidate.title
          );
          return { candidate, resolved };
        } catch {
          return { candidate, resolved: null };
        }
      })
    );

    for (const item of batchResults) {
      if (item.resolved) {
        verifiedRecords.push({
          candidate: item.candidate,
          resolved: item.resolved,
        });
      } else {
        candidatesDroppedUnresolved++;
      }
    }
  }

  // If zero candidates resolved (e.g., offline environment), return labeled offline fallback
  if (verifiedRecords.length === 0) {
    return buildLabeledFallbackPlaylist(
      scene,
      derivedProfile,
      sceneHash,
      "fallback-offline",
      quota,
      "Live catalog verification unreachable (offline or provider timeout). Showing labeled local fallback playlist."
    );
  }

  // 6. Deduplicate resolved tracks by canonical trackId + normalized artist::title
  const deduplicatedVerified: VerifiedCandidateRecord[] = [];
  const seenResolvedIds = new Set<string>();
  const seenResolvedTitles = new Set<string>();

  for (const rec of verifiedRecords) {
    const idKey = `${rec.resolved.providerId}:${rec.resolved.trackId}`;
    const titleKey = `${rec.resolved.artist.toLowerCase()}::${rec.resolved.title.toLowerCase()}`;
    if (seenResolvedIds.has(idKey) || seenResolvedTitles.has(titleKey)) {
      duplicatesRemoved++;
      continue;
    }
    seenResolvedIds.add(idKey);
    seenResolvedTitles.add(titleKey);
    deduplicatedVerified.push(rec);
  }

  // 7. Assign tracks to the 4 moments with artist repeat caps & targetEnergy balancing
  const usedRecordIndices = new Set<number>();
  const globalArtistCounts = new Map<string, number>();
  const MAX_ARTIST_GLOBAL = 2;

  const provenanceOrderWeight = (p: SoundtrackProvenanceLabel): number => {
    if (p === "qloo-evidence") return 0;
    if (p === "inferred") return 1;
    return 2;
  };

  const allSelectedTracks: SoundtrackTrackItem[] = [];

  const momentPlaylists = derivedProfile.moments.map(
    (momentSpec): SoundtrackMomentPlaylist => {
      const momentTracks: SoundtrackTrackItem[] = [];
      const momentArtists = new Set<string>();
      const slotsNeeded = Math.max(1, momentSpec.trackSlots);

      for (let slot = 0; slot < slotsNeeded; slot++) {
        let bestIdx = -1;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let idx = 0; idx < deduplicatedVerified.length; idx++) {
          if (usedRecordIndices.has(idx)) continue;
          const rec = deduplicatedVerified[idx];
          const artistNorm = rec.resolved.artist.toLowerCase();

          // Cap artist repeats: max 1 per moment, max 2 across entire playlist
          if (momentArtists.has(artistNorm)) continue;
          if ((globalArtistCounts.get(artistNorm) ?? 0) >= MAX_ARTIST_GLOBAL) {
            continue;
          }

          // Score by provenance priority + moment preference + energy proximity
          const provPenalty = provenanceOrderWeight(rec.candidate.provenance) * 0.28;
          const momentPenalty =
            rec.candidate.preferredMoment === momentSpec.name ? 0 : 0.22;
          const energyDiff = Math.abs(
            rec.candidate.estimatedEnergy - momentSpec.targetEnergy
          );
          const totalScore = provPenalty + momentPenalty + energyDiff;

          if (totalScore < bestScore) {
            bestScore = totalScore;
            bestIdx = idx;
          }
        }

        if (bestIdx !== -1) {
          usedRecordIndices.add(bestIdx);
          const chosen = deduplicatedVerified[bestIdx];
          const artistNorm = chosen.resolved.artist.toLowerCase();
          momentArtists.add(artistNorm);
          globalArtistCounts.set(
            artistNorm,
            (globalArtistCounts.get(artistNorm) ?? 0) + 1
          );

          const trackItem: SoundtrackTrackItem = {
            id: `${chosen.resolved.providerId}-${chosen.resolved.trackId}`,
            title: chosen.resolved.title,
            artist: chosen.resolved.artist,
            album: chosen.resolved.album,
            coverUrl: chosen.resolved.coverUrl,
            previewUrl: compositeProvider.previewUrl
              ? compositeProvider.previewUrl(chosen.resolved)
              : chosen.resolved.previewUrl,
            embedUrl: compositeProvider.embedUrl
              ? compositeProvider.embedUrl(chosen.resolved) || undefined
              : chosen.resolved.embedUrl,
            externalSearchUrl: chosen.resolved.externalSearchUrl,
            storeUrl: chosen.resolved.storeUrl,
            durationMs: chosen.resolved.durationMs,
            moment: momentSpec.name,
            targetEnergy: momentSpec.targetEnergy,
            estimatedEnergy: chosen.candidate.estimatedEnergy,
            bpmEstimate: chosen.candidate.bpmEstimate,
            provenance: chosen.candidate.provenance,
            provenanceSourceDetail: chosen.candidate.provenanceSourceDetail,
            whyThisFits: buildWhyThisFitsExplanation(
              scene,
              momentSpec.name,
              chosen.candidate.provenance
            ),
          };

          momentTracks.push(trackItem);
          allSelectedTracks.push(trackItem);
        }
      }

      return {
        name: momentSpec.name,
        description: momentSpec.description,
        targetEnergy: momentSpec.targetEnergy,
        trackSlots: momentSpec.trackSlots,
        tracks: momentTracks,
      };
    }
  ) as [
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist,
    SoundtrackMomentPlaylist
  ];

  const qlooEvidenceCount = allSelectedTracks.filter(
    (t) => t.provenance === "qloo-evidence"
  ).length;
  const inferredCount = allSelectedTracks.filter(
    (t) => t.provenance === "inferred"
  ).length;
  const fallbackCount = allSelectedTracks.filter(
    (t) => t.provenance === "fallback"
  ).length;

  const warnings: string[] = [];
  if (candidatesDroppedUnresolved > 0) {
    warnings.push(
      `Dropped ${candidatesDroppedUnresolved} candidate(s) that did not resolve in the live music catalog.`
    );
  }
  if (qlooEvidenceCount === 0) {
    warnings.push(
      "No live Qloo music/artist entities were present in this scene payload; tracks are labeled 'inferred' or 'fallback'."
    );
  }

  const playlist: SoundtrackPlaylist = {
    sceneHash,
    generatedAtIso: new Date().toISOString(),
    cacheStatus: "miss",
    providerUsed: providerSummary,
    musicProfile: derivedProfile,
    moments: momentPlaylists,
    tracks: allSelectedTracks,
    verificationStats: {
      candidatesGenerated: rawCandidates.length,
      candidatesVerified: verifiedRecords.length,
      candidatesDroppedUnresolved,
      duplicatesRemoved,
      qlooEvidenceCount,
      inferredCount,
      fallbackCount,
    },
    quota,
    warnings,
  };

  SOUNDTRACK_CACHE.set(sceneHash, {
    playlist,
    expiresAtMs: now + getCacheTtlMs(),
  });

  return playlist;
}
