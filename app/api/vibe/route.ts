import { NextResponse } from "next/server";
import type {
  ArtistRec,
  CulturalEvidence,
  ResolvedEntity,
  Track,
  VibePayload,
} from "@/lib/types";
import { parseTasteTerms, MAX_INPUT_LENGTH } from "@/lib/terms";
import { mapFromEvidence, neutralSpatialMapping } from "@/lib/spatial-rules";

const REQUEST_TIMEOUT_MS = 12000;
const MAX_INSIGHT_CALLS = 3;
const INSIGHTS_TAKE = 8;

const INSIGHTS_SUPPORTED_TYPES = new Set([
  "urn:entity:artist",
  "urn:entity:book",
  "urn:entity:brand",
  "urn:entity:destination",
  "urn:entity:locality",
  "urn:entity:movie",
  "urn:entity:person",
  "urn:entity:place",
  "urn:entity:podcast",
  "urn:entity:tv_show",
  "urn:entity:videogame",
]);

const SEARCH_TYPES_PARAM = [...INSIGHTS_SUPPORTED_TYPES].join(",");

interface SearchHit {
  id: string;
  name: string;
  type: string;
}

interface TagEvidence {
  genres: string[];
  styles: string[];
  themes: string[];
}

function extractTagEvidence(tagsRaw: unknown): TagEvidence {
  const genres = new Set<string>();
  const styles = new Set<string>();
  const themes = new Set<string>();
  for (const raw of Array.isArray(tagsRaw) ? tagsRaw : []) {
    const t = (raw ?? {}) as Record<string, unknown>;
    if (typeof t.name !== "string") continue;
    const name = t.name.toLowerCase();
    const type = typeof t.type === "string" ? t.type.toLowerCase() : "";
    if (type.includes("genre")) genres.add(name);
    else if (type.includes("style")) styles.add(name);
    else if (type.includes("theme")) themes.add(name);
  }
  return { genres: [...genres], styles: [...styles], themes: [...themes] };
}

function parseSearchResults(
  data: Record<string, unknown>,
  fallbackTerm: string
): { hits: SearchHit[]; evidence: TagEvidence } {
  const results = Array.isArray(data?.results) ? data.results : [];
  const hits: SearchHit[] = [];
  const genres = new Set<string>();
  const styles = new Set<string>();
  const themes = new Set<string>();
  for (const raw of results) {
    const f = (raw ?? {}) as Record<string, unknown>;
    const typesArr = Array.isArray(f.types)
      ? f.types.filter((t): t is string => typeof t === "string")
      : typeof f.type === "string"
        ? [f.type]
        : [];
    const supported = typesArr.find((t) => INSIGHTS_SUPPORTED_TYPES.has(t));
    if (!supported) continue;
    const tags = extractTagEvidence(f.tags);
    for (const g of tags.genres) genres.add(g);
    for (const s of tags.styles) styles.add(s);
    for (const th of tags.themes) themes.add(th);
    const id =
      typeof f.entity_id === "string" ? f.entity_id :
      typeof f.id === "string" ? f.id : null;
    if (!id) continue;
    const name =
      typeof f.name === "string" ? f.name :
      typeof f.title === "string" ? f.title : fallbackTerm;
    hits.push({ id, name, type: supported });
  }
  return { hits, evidence: { genres: [...genres], styles: [...styles], themes: [...themes] } };
}

function extractArtists(data: Record<string, unknown>): ArtistRec[] {
  const r = (typeof data.results === "object" && data.results !== null ? data.results : {}) as Record<string, unknown>;
  const list = Array.isArray(r.entities) ? r.entities : Array.isArray(data.entities) ? data.entities : [];
  const out: ArtistRec[] = [];
  for (const raw of list) {
    const e = (raw ?? {}) as Record<string, unknown>;
    const subtype = typeof e.subtype === "string" ? e.subtype : "";
    const type = typeof e.type === "string" ? e.type : "";
    if (subtype !== "urn:entity:artist" && type !== "urn:entity:artist") continue;
    const name = typeof e.name === "string" ? e.name : typeof e.title === "string" ? e.title : "";
    if (!name) continue;
    const id = typeof e.entity_id === "string" ? e.entity_id : typeof e.id === "string" ? e.id : "";
    out.push({ id, name, sourceEntity: "" });
  }
  return out;
}

function collectEvidence(data: Record<string, unknown>): CulturalEvidence {
  const results = (typeof data.results === "object" && data.results !== null ? data.results : {}) as Record<string, unknown>;
  const entities = Array.isArray(results.entities) ? results.entities : Array.isArray(data.entities) ? data.entities : [];
  const genreSet = new Set<string>();
  const styleSet = new Set<string>();
  const themeSet = new Set<string>();
  const adjSet = new Set<string>();
  const charSet = new Set<string>();
  for (const raw of entities) {
    const e = (raw ?? {}) as Record<string, unknown>;
    const tags = extractTagEvidence(e.tags);
    for (const g of tags.genres) genreSet.add(g);
    for (const s of tags.styles) styleSet.add(s);
    for (const t of tags.themes) themeSet.add(t);
    const props = (e.properties ?? {}) as Record<string, unknown>;
    const adjs = Array.isArray(props.adjectives_for_music) ? props.adjectives_for_music : [];
    for (const a of adjs) if (typeof a === "string") adjSet.add(a.toLowerCase());
    const chars = Array.isArray(props.characteristics) ? props.characteristics : [];
    for (const c of chars) if (typeof c === "string") charSet.add(c.toLowerCase());
  }
  return {
    genreTags: [...genreSet],
    styleTags: [...styleSet],
    themeTags: [...themeSet],
    adjectives: [...adjSet],
    characteristics: [...charSet],
  };
}

function hasAnyEvidence(ev: CulturalEvidence): boolean {
  return ev.genreTags.length + ev.styleTags.length + ev.themeTags.length + ev.adjectives.length + ev.characteristics.length > 0;
}

function localFallbackPayload(
  submittedTerms: string[],
  errors: string[]
): VibePayload {
  const mapping = neutralSpatialMapping(submittedTerms);
  return {
    primaryColorHex: mapping.primaryColorHex,
    accentColorHex: mapping.accentColorHex,
    lightingTemperatureK: mapping.lightingTemperatureK,
    flooringMaterial: mapping.flooringMaterial,
    seatingFabric: mapping.seatingFabric,
    tracks: [],
    menu: "Local fallback (live cultural intelligence unavailable).",
    fallback: true,
    reasoning: {
      source: "local-fallback",
      evidence: [],
      rules: {
        primaryColorHex: "Qloo unavailable; neutral default color.",
        accentColorHex: "Qloo unavailable; neutral default accent.",
        lightingTemperatureK: "Qloo unavailable; 4500K default.",
        flooringMaterial: "Qloo unavailable; neutral default flooring.",
        seatingFabric: "Qloo unavailable; neutral default seating.",
      },
    },
    partial: false,
    submittedTerms,
    entities: [],
    unresolvedTerms: submittedTerms,
    evidence: { genreTags: [], styleTags: [], themeTags: [], adjectives: [], characteristics: [] },
    artists: [],
    concept: mapping.concept,
    limitations: [
      "Live Qloo cultural intelligence was unavailable; this concept is a labeled local fallback.",
    ],
    errors,
  };
}

async function qlooGet(url: string, apiKey: string): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "request failed";
    return { ok: false, status: 0, data: null, error: message };
  }
}

export async function POST(request: Request) {
  let body: { userInput?: unknown; sliderVal?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawInput = typeof body.userInput === "string" ? body.userInput.slice(0, MAX_INPUT_LENGTH) : "";
  const submittedTerms = parseTasteTerms(rawInput);

  if (submittedTerms.length === 0) {
    return NextResponse.json(
      { error: "Enter at least one cultural reference — an artist, film, place, genre, or mood." },
      { status: 400 }
    );
  }

  const qlooApiUrl = process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";
  const qlooApiKey = process.env.QLOO_API_KEY;

  if (!qlooApiKey) {
    return NextResponse.json(localFallbackPayload(submittedTerms, ["QLOO_API_KEY is not configured on the server."]));
  }

  const errors: string[] = [];
  const resolved: ResolvedEntity[] = [];
  const unresolvedTerms: string[] = [];
  const searchEvidence: CulturalEvidence = {
    genreTags: [],
    styleTags: [],
    themeTags: [],
    adjectives: [],
    characteristics: [],
  };
  const searchEvidenceSeen = {
    genre: new Set<string>(),
    style: new Set<string>(),
    theme: new Set<string>(),
  };

  for (const term of submittedTerms) {
    const searchUrl =
      `${qlooApiUrl}/search?query=${encodeURIComponent(term)}` +
      `&types=${encodeURIComponent(SEARCH_TYPES_PARAM)}&take=5`;
    const result = await qlooGet(searchUrl, qlooApiKey);
    if (!result.ok || !result.data) {
      unresolvedTerms.push(term);
      errors.push(`Search for "${term}" failed (${result.error ?? "no response"}).`);
      continue;
    }
    const { hits, evidence } = parseSearchResults(result.data, term);
    if (hits.length === 0) {
      unresolvedTerms.push(term);
      continue;
    }
    for (const g of evidence.genres) if (!searchEvidenceSeen.genre.has(g)) { searchEvidenceSeen.genre.add(g); searchEvidence.genreTags.push(g); }
    for (const s of evidence.styles) if (!searchEvidenceSeen.style.has(s)) { searchEvidenceSeen.style.add(s); searchEvidence.styleTags.push(s); }
    for (const t of evidence.themes) if (!searchEvidenceSeen.theme.has(t)) { searchEvidenceSeen.theme.add(t); searchEvidence.themeTags.push(t); }
    const hit = hits[0];
    resolved.push({ id: hit.id, name: hit.name, type: hit.type, searchTerm: term });
  }

  if (resolved.length === 0) {
    return NextResponse.json(
      localFallbackPayload(submittedTerms, [...errors, "No cultural references could be resolved in Qloo."])
    );
  }

  const byType = new Map<string, ResolvedEntity[]>();
  for (const entity of resolved) {
    if (!INSIGHTS_SUPPORTED_TYPES.has(entity.type)) continue;
    const list = byType.get(entity.type) ?? [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  let insightsOk = 0;
  let insightsFailed = 0;
  const mergedArtists = new Map<string, ArtistRec>();
  const mergedEvidence: CulturalEvidence = { genreTags: [], styleTags: [], themeTags: [], adjectives: [], characteristics: [] };
  const evidenceSeen = {
    genre: new Set<string>(),
    style: new Set<string>(),
    theme: new Set<string>(),
    adj: new Set<string>(),
    char: new Set<string>(),
  };

  let typeCall = 0;
  for (const [type, entities] of byType) {
    if (typeCall >= MAX_INSIGHT_CALLS) break;
    typeCall += 1;
    const ids = entities.map((e) => e.id).join(",");
    const insightsUrl =
      `${qlooApiUrl}/v2/insights` +
      `?filter.type=${encodeURIComponent(type)}` +
      `&signal.interests.entities=${encodeURIComponent(ids)}` +
      `&take=${INSIGHTS_TAKE}`;
    const result = await qlooGet(insightsUrl, qlooApiKey);
    if (!result.ok || !result.data) {
      insightsFailed += 1;
      errors.push(`Insights for ${type} failed (${result.error ?? "no response"}).`);
      continue;
    }
    insightsOk += 1;
    const anchorName = entities[0]?.name ?? "";
    for (const artist of extractArtists(result.data)) {
      if (!artist.name) continue;
      const key = artist.id || artist.name.toLowerCase();
      if (!mergedArtists.has(key)) {
        mergedArtists.set(key, { ...artist, sourceEntity: anchorName });
      }
    }
    const ev = collectEvidence(result.data);
    for (const g of ev.genreTags) if (!evidenceSeen.genre.has(g)) { evidenceSeen.genre.add(g); mergedEvidence.genreTags.push(g); }
    for (const s of ev.styleTags) if (!evidenceSeen.style.has(s)) { evidenceSeen.style.add(s); mergedEvidence.styleTags.push(s); }
    for (const t of ev.themeTags) if (!evidenceSeen.theme.has(t)) { evidenceSeen.theme.add(t); mergedEvidence.themeTags.push(t); }
    for (const a of ev.adjectives) if (!evidenceSeen.adj.has(a)) { evidenceSeen.adj.add(a); mergedEvidence.adjectives.push(a); }
    for (const c of ev.characteristics) if (!evidenceSeen.char.has(c)) { evidenceSeen.char.add(c); mergedEvidence.characteristics.push(c); }
  }

  for (const g of searchEvidence.genreTags) if (!evidenceSeen.genre.has(g)) { evidenceSeen.genre.add(g); mergedEvidence.genreTags.push(g); }
  for (const s of searchEvidence.styleTags) if (!evidenceSeen.style.has(s)) { evidenceSeen.style.add(s); mergedEvidence.styleTags.push(s); }
  for (const t of searchEvidence.themeTags) if (!evidenceSeen.theme.has(t)) { evidenceSeen.theme.add(t); mergedEvidence.themeTags.push(t); }

  const artists = [...mergedArtists.values()].slice(0, 8);
  const tracks: Track[] = artists.map((a) => ({ title: a.name, artist: "" }));

  const anchorNames = resolved.map((e) => e.name);
  const mapping = hasAnyEvidence(mergedEvidence)
    ? mapFromEvidence(mergedEvidence, anchorNames)
    : neutralSpatialMapping(anchorNames);

  let source: "qloo" | "qloo-partial" | "local-fallback" = mapping.source;
  if (insightsOk === 0) source = "qloo-partial";
  const partial = unresolvedTerms.length > 0 || insightsFailed > 0 || insightsOk < byType.size;

  const limitations: string[] = [];
  if (artists.length > 0) {
    limitations.push("Qloo insights returned artist entities, not individual tracks. No track titles or playback are claimed.");
  } else {
    limitations.push("Qloo returned no music entities for this profile; the soundtrack section will be empty by design.");
  }
  if (unresolvedTerms.length > 0) {
    limitations.push(`Some references could not be resolved: ${unresolvedTerms.join(", ")}.`);
  }
  if (!hasAnyEvidence(mergedEvidence)) {
    limitations.push("No structured affinity tags were returned; the design uses neutral defaults (qloo-partial).");
  }

  const payload: VibePayload = {
    primaryColorHex: mapping.primaryColorHex,
    accentColorHex: mapping.accentColorHex,
    lightingTemperatureK: mapping.lightingTemperatureK,
    flooringMaterial: mapping.flooringMaterial,
    seatingFabric: mapping.seatingFabric,
    tracks,
    menu:
      artists.length > 0
        ? `Qloo insights returned ${artists.length} artist(s) across ${resolved.length} resolved reference(s).`
        : `Qloo insights returned no music entities for ${resolved.length} resolved reference(s).`,
    fallback: false,
    reasoning: {
      source,
      evidence: mapping.evidence,
      rules: mapping.rules,
    },
    partial,
    submittedTerms,
    entities: resolved,
    unresolvedTerms,
    evidence: mergedEvidence,
    artists,
    concept: mapping.concept,
    limitations,
    errors,
  };

  return NextResponse.json(payload);
}
