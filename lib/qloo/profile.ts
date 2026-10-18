/**
 * Qloo evidence collection for one profile: per-term search + grouped
 * insights, with response caching, request budgeting, and content-free
 * logging. Extracted from the route handler so it can be unit-tested without
 * `next/server`.
 *
 * Request shape is unchanged from the documented/live-verified contract:
 *   GET /search?query=<term>&types=<supported URNs>&take=5
 *   GET /v2/insights?filter.type=<urn>&signal.interests.entities=<id,id,...>&take=8
 * Bounds: one search per parsed term (input parse cap = 5 terms),
 * <= MAX_INSIGHT_CALLS insights, take values
 * match what the interface actually renders. No batch endpoints exist or are
 * invented. `signal.interests.entities` ids are sorted+deduplicated so the
 * cache key and the request are both deterministic.
 */

import type { ArtistRec, CulturalEvidence, QuotaInfo, ResolvedEntity } from "../types";
import { TtlCache } from "./cache";
import { qlooGet, type QlooGetOptions } from "./http";
import type { AttemptKind, UsageTracker } from "./usage";

export const MAX_INSIGHT_CALLS = 3;
export const INSIGHTS_TAKE = 8;
export const SEARCH_TAKE = 5;
export const SEARCH_CACHE_KIND = "search";
export const INSIGHTS_CACHE_KIND = "insights";

export const INSIGHTS_SUPPORTED_TYPES = new Set([
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

export const SEARCH_TYPES_PARAM = [...INSIGHTS_SUPPORTED_TYPES].join(",");

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

export function parseSearchResults(
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

export function extractArtists(data: Record<string, unknown>): ArtistRec[] {
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

export function collectEvidence(data: Record<string, unknown>): CulturalEvidence {
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

export function hasAnyEvidence(ev: CulturalEvidence): boolean {
  return (
    ev.genreTags.length + ev.styleTags.length + ev.themeTags.length +
    ev.adjectives.length + ev.characteristics.length > 0
  );
}

export interface ProfileDeps {
  qlooApiUrl: string;
  qlooApiKey: string;
  cache: TtlCache<Record<string, unknown>>;
  usage: UsageTracker;
  /** TTLs in ms for search / insights cache entries. */
  ttl: { searchMs: number; insightsMs: number };
  /** Test seams passed through to `qlooGet`. */
  http?: Pick<QlooGetOptions, "fetchImpl" | "sleep" | "random" | "timeoutMs" | "maxAttempts">;
  log?: (line: string) => void;
}

export interface ProfileCollection {
  resolved: ResolvedEntity[];
  unresolvedTerms: string[];
  searchEvidence: CulturalEvidence;
  mergedEvidence: CulturalEvidence;
  artists: ArtistRec[];
  insightsOk: number;
  insightsFailed: number;
  insightsAttempted: number;
  /** Number of distinct entity types eligible for insights (route uses it for `partial`). */
  typeCount: number;
  errors: string[];
  /** Quota headers from the most recent upstream response seen this request (null on fully-cached runs). */
  quota: QuotaInfo | null;
  /** Actual upstream requests issued (cache misses + retries), i.e. quota-consuming calls. */
  upstreamCalls: number;
  budgetExhausted: boolean;
}

/** Cache keys embed every parameter that affects results (full normalized request URL). */
export function searchCacheKey(url: string): string {
  return `${SEARCH_CACHE_KIND}|${url}`;
}

export function insightsCacheKey(url: string): string {
  return `${INSIGHTS_CACHE_KIND}|${url}`;
}

export async function collectProfile(terms: string[], deps: ProfileDeps): Promise<ProfileCollection> {
  const { cache, usage } = deps;
  const log = deps.log ?? ((line: string) => console.info(line));
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

  let quota: QuotaInfo | null = null;
  let upstreamCalls = 0;
  let budgetExhausted = false;

  const trackQuota = (q: QuotaInfo | null): QuotaInfo | null => {
    if (q) {
      quota = q;
      usage.observeQuota(q);
    }
    return quota;
  };

    const request = async (kind: AttemptKind, url: string, ttlMs: number): Promise<
    { ok: true; data: Record<string, unknown>; source: "upstream" | "cache" | "coalesced" } | { ok: false; error: string }
  > => {
    const key = kind === "search" ? searchCacheKey(url) : insightsCacheKey(url);
    const shouldStop = () => usage.exhausted;
    try {
      const loaded = await cache.getOrLoad(key, ttlMs, async () => {
        if (usage.exhausted) {
          budgetExhausted = true;
          throw new Error("application request budget exhausted");
        }
        const result = await qlooGet(url, {
          apiKey: deps.qlooApiKey,
          ...deps.http,
          onAttempt: (info) => {
            upstreamCalls += 1;
            usage.recordAttempt(kind, info.status, info.isRetry);
          },
          shouldStop,
        });
        trackQuota(result.quota);
        if (!result.ok || !result.data) {
          throw new Error(result.error ?? "no response");
        }
        return result.data;
      });
      log(
        `[qloo] kind=${kind} cache=${loaded.source} url=/` + (kind === "search" ? "search" : "v2/insights")
      );
      return { ok: true, data: loaded.value, source: loaded.source };
    } catch (err) {
      const message = err instanceof Error ? err.message : "request failed";
      if (message === "application request budget exhausted") budgetExhausted = true;
      return { ok: false, error: message };
    }
  };

  for (const term of terms) {
    if (budgetExhausted || usage.exhausted) {
      budgetExhausted = true;
      unresolvedTerms.push(term);
      errors.push(`Search for "${term}" skipped: application request budget exhausted.`);
      continue;
    }
    const searchUrl =
      `${deps.qlooApiUrl}/search?query=${encodeURIComponent(term)}` +
      `&types=${encodeURIComponent(SEARCH_TYPES_PARAM)}&take=${SEARCH_TAKE}`;
    const result = await request("search", searchUrl, deps.ttl.searchMs);
    if (!result.ok) {
      unresolvedTerms.push(term);
      errors.push(`Search for "${term}" failed (${result.error}).`);
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

  const byType = new Map<string, ResolvedEntity[]>();
  for (const entity of resolved) {
    if (!INSIGHTS_SUPPORTED_TYPES.has(entity.type)) continue;
    const list = byType.get(entity.type) ?? [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  let insightsOk = 0;
  let insightsFailed = 0;
  let insightsAttempted = 0;
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
    if (budgetExhausted || usage.exhausted) {
      budgetExhausted = true;
      insightsFailed += 1;
      errors.push(`Insights for ${type} skipped: application request budget exhausted.`);
      continue;
    }
    // Sorted + deduped: `signal.interests.entities` is a set; ordering must not
    // create duplicate cache entries or duplicate upstream requests.
    const ids = [...new Set(entities.map((e) => e.id))].sort().join(",");
    const insightsUrl =
      `${deps.qlooApiUrl}/v2/insights` +
      `?filter.type=${encodeURIComponent(type)}` +
      `&signal.interests.entities=${encodeURIComponent(ids)}` +
      `&take=${INSIGHTS_TAKE}`;
    insightsAttempted += 1;
    const result = await request("insights", insightsUrl, deps.ttl.insightsMs);
    if (!result.ok) {
      insightsFailed += 1;
      errors.push(`Insights for ${type} failed (${result.error}).`);
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

  if (usage.exhausted) budgetExhausted = true;

  return {
    resolved,
    unresolvedTerms,
    searchEvidence,
    mergedEvidence,
    artists: [...mergedArtists.values()].slice(0, 8),
    insightsOk,
    insightsFailed,
    insightsAttempted,
    typeCount: byType.size,
    errors,
    quota,
    upstreamCalls,
    budgetExhausted,
  };
}
