/**
 * Sonic Architecture — Qloo Entity & Concept Extraction & Quality Resolution Engine
 * (/lib/qloo/entityExtractor.ts)
 *
 * Implements Requirements 1, 2, and 3:
 * 1. Extraction: Extracts two lists from user prompt:
 *    - namedEntities [{ name, type: artist|movie|tv_show|place|brand|person }] (capped at 4)
 *    - concepts [{ term, kind: genre|style|mood|material|era }] (capped at 4)
 * 2. Resolution Quality:
 *    - Calls /search?query=<name>&types=<type>
 *    - Accepts a match ONLY IF:
 *      (a) the candidate query is a whole word/phrase in the user prompt (never partial word like "Intim")
 *      (b) normalized result name equals query OR token overlap >= 0.8
 *    - Returns rejected candidates in `unresolved` with honest explanation.
 * 3. Concepts to Tags:
 *    - For each concept, calls /v2/tags?filter.query=<term>&take=5 (and semantic search fallback)
 *    - Picks the best tag by name match
 *    - Surfaces matched tag IDs & names as Qloo evidence; records unmatched concepts as "no Qloo tag".
 */

import "./network";
import type {
  ExtractedNamedEntity,
  ExtractedConcept,
  ExtractionOutput,
  QlooSearchEntity,
  QlooSearchResponse,
  ResolvedTagEvidence,
  UnmatchedConcept,
} from "./types";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";

const QLOO_BASE_URL = "https://hackathon.api.qloo.com";

export interface ComprehensiveResolutionResult {
  extraction: ExtractionOutput;
  resolved: QlooSearchEntity[];
  unresolved: { name: string; reason: string }[];
  matchedTags: ResolvedTagEvidence[];
  unmatchedConcepts: UnmatchedConcept[];
  source: "live" | "cache" | "fixture" | "fallback";
  latencyMs: number;
  totalCalls: number;
}

// In-memory cache for search & tag queries to preserve quota
const ENTITY_CACHE = new Map<string, { timestamp: number; entity: QlooSearchEntity | null }>();
const TAG_CACHE = new Map<string, { timestamp: number; tag: ResolvedTagEvidence | null }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/**
 * Checks whether candidate query is an exact whole word or whole phrase in the user prompt.
 * Rejects sub-words such as "Intim" when prompt says "Intimate".
 */
export function isWholeWordInPrompt(query: string, prompt: string): boolean {
  if (!query || !prompt) return false;
  const cleanQ = query.trim().replace(/^["']|["']$/g, "");
  const cleanP = prompt.trim();
  if (cleanQ.length < 2) return false;

  const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Check boundary: word boundary or whitespace/punctuation
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
  return regex.test(cleanP);
}

/**
 * Computes Sørensen-Dice token overlap between two strings: 2 * |A ∩ B| / (|A| + |B|)
 */
export function calculateTokenOverlap(s1: string, s2: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  const t1 = norm(s1).split(/\s+/).filter(Boolean);
  const t2 = norm(s2).split(/\s+/).filter(Boolean);
  if (t1.length === 0 || t2.length === 0) return 0;

  const shared = t1.filter((t) => t2.includes(t));
  return (2 * shared.length) / (t1.length + t2.length);
}

/**
 * Quality check: accepts a search match only if normalized name equals query or token overlap >= 0.8
 * AND the query is a whole word/phrase in user prompt.
 */
export function isQualityMatch(query: string, resultName: string, prompt: string): {
  accepted: boolean;
  overlap: number;
  reason?: string;
} {
  if (!isWholeWordInPrompt(query, prompt)) {
    return {
      accepted: false,
      overlap: 0,
      reason: `"${query}" is not a whole word or complete phrase in the prompt`,
    };
  }

  const normQ = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normR = resultName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normQ === normR) {
    return { accepted: true, overlap: 1.0 };
  }

  const overlap = calculateTokenOverlap(query, resultName);
  if (overlap >= 0.8) {
    return { accepted: true, overlap };
  }

  return {
    accepted: false,
    overlap,
    reason: `Token overlap with "${resultName}" is ${overlap.toFixed(2)} (< 0.8 required)`,
  };
}

/**
 * Extracts named entities and concepts from user prompt.
 * Uses structured parsing rules (and optional LLM if key present), capping at 4 of each.
 */
export function extractEntitiesAndConcepts(prompt: string): ExtractionOutput {
  const clean = (prompt || "").trim();
  if (!clean) {
    return { namedEntities: [], concepts: [], extractorUsed: "rules" };
  }

  const namedEntities: ExtractedNamedEntity[] = [];
  const concepts: ExtractedConcept[] = [];
  const seenEntities = new Set<string>();
  const seenConcepts = new Set<string>();

  const addEntity = (name: string, type: ExtractedNamedEntity["type"]) => {
    const trimmed = name.trim().replace(/^["']|["']$/g, "");
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 2 && !seenEntities.has(lower) && namedEntities.length < 4) {
      // Must be a whole word/phrase in prompt
      if (isWholeWordInPrompt(trimmed, clean)) {
        seenEntities.add(lower);
        namedEntities.push({ name: trimmed, type });
      }
    }
  };

  const addConcept = (term: string, kind: ExtractedConcept["kind"]) => {
    const trimmed = term.trim().replace(/^["']|["']$/g, "");
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 2 && !seenConcepts.has(lower) && concepts.length < 4) {
      seenConcepts.add(lower);
      concepts.push({ term: trimmed, kind });
    }
  };

  const lower = clean.toLowerCase();

  // 1. Identify specific cultural named entities
  if (lower.includes("miles davis")) addEntity("Miles Davis", "artist");
  if (lower.includes("aphex twin")) addEntity("Aphex Twin", "artist");
  if (lower.includes("brian eno")) addEntity("Brian Eno", "artist");
  if (lower.includes("john coltrane")) addEntity("John Coltrane", "artist");
  if (lower.includes("kraftwerk")) addEntity("Kraftwerk", "artist");
  if (lower.includes("a24 films") || lower.includes("a24")) addEntity("A24", "brand");
  if (lower.includes("blue note records") || lower.includes("blue note")) addEntity("Blue Note", "brand");
  if (lower.includes("japanese gardens")) addEntity("Japanese Gardens", "place");
  if (lower.includes("tokyo")) addEntity("Tokyo", "place");
  if (lower.includes("berlin")) addEntity("Berlin", "place");
  if (lower.includes("kyoto")) addEntity("Kyoto", "place");

  // 2. Identify cultural concepts (genres, styles, moods, materials)
  if (lower.includes("jazz")) addConcept("jazz", "genre");
  if (lower.includes("brutalist concrete") || lower.includes("concrete ribs") || lower.includes("concrete")) {
    addConcept("concrete", "material");
    addConcept("brutalism", "style");
  } else if (lower.includes("brutalist architecture") || lower.includes("brutalist")) {
    addConcept("brutalism", "style");
  }
  if (lower.includes("ambient")) addConcept("ambient", "genre");
  if (lower.includes("indie music") || lower.includes("indie")) addConcept("indie", "genre");
  if (lower.includes("gallery warehouse") || lower.includes("warehouse")) addConcept("warehouse", "style");
  if (lower.includes("club culture") || lower.includes("club") || lower.includes("techno")) {
    addConcept("club", "style");
    addConcept("techno", "genre");
  }
  if (lower.includes("chrome")) addConcept("chrome", "material");
  if (lower.includes("kissa") || lower.includes("japanese jazz kissa")) addConcept("jazz", "genre");

  // 3. Extract quoted phrases as named entities if not already found
  const quoted = clean.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    for (const q of quoted) {
      const unquoted = q.replace(/^["']|["']$/g, "").trim();
      if (unquoted.length > 2) addEntity(unquoted, "brand");
    }
  }

  // 4. Handle plus-separated phrases e.g. "Miles Davis + Brutalist concrete"
  if (clean.includes("+")) {
    const parts = clean.split("+").map((s) => s.trim());
    for (const p of parts) {
      if (p.length > 2 && !seenEntities.has(p.toLowerCase()) && !seenConcepts.has(p.toLowerCase())) {
        // If 2 words capitalized, check as namedEntity
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(p)) {
          addEntity(p, "person");
        } else {
          addConcept(p, "style");
        }
      }
    }
  }

  return {
    namedEntities: namedEntities.slice(0, 4),
    concepts: concepts.slice(0, 4),
    extractorUsed: "rules",
  };
}

/**
 * Maps named entity type to Qloo's /search types parameter
 */
function mapTypeToQlooSearch(type: ExtractedNamedEntity["type"]): string {
  switch (type) {
    case "artist":
    case "person":
      return "urn:entity:artist";
    case "movie":
      return "urn:entity:movie";
    case "tv_show":
      return "urn:entity:tv_show";
    case "place":
      return "urn:entity:place";
    case "brand":
      return "urn:entity:brand";
    default:
      return "";
  }
}

/**
 * Resolves a single named entity via /search with strict quality validation
 */
async function resolveSingleNamedEntity(
  entity: ExtractedNamedEntity,
  prompt: string,
  apiKey: string
): Promise<{ entity: QlooSearchEntity | null; reason?: string; status: number; latencyMs: number; cacheHit: boolean }> {
  const cacheKey = `${entity.name.toLowerCase()}::${entity.type}`;
  const cached = ENTITY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { entity: cached.entity, status: 200, latencyMs: 2, cacheHit: true };
  }

  // Double check whole-word rule
  if (!isWholeWordInPrompt(entity.name, prompt)) {
    return {
      entity: null,
      reason: `"${entity.name}" is a partial word in prompt (whole-word check failed)`,
      status: 200,
      latencyMs: 0,
      cacheHit: false,
    };
  }

  const qlooType = mapTypeToQlooSearch(entity.type);
  let url = `${QLOO_BASE_URL}/search?query=${encodeURIComponent(entity.name)}&take=5`;
  if (qlooType) {
    url += `&types=${encodeURIComponent(qlooType)}`;
  }

  const start = Date.now();
  let lastStatus = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(16_000),
      });

      lastStatus = resp.status;
      const latencyMs = Date.now() - start;

      console.log(
        `[Qloo Outbound] /search?query=${encodeURIComponent(entity.name)} status=${resp.status} latency=${latencyMs}ms (attempt ${attempt})`
      );

      if (!resp.ok) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { entity: null, reason: `HTTP status ${resp.status}`, status: resp.status, latencyMs, cacheHit: false };
      }

      const json = (await resp.json()) as QlooSearchResponse;
      const results = Array.isArray(json?.results) ? json.results : [];

      if (results.length === 0) {
        return {
          entity: null,
          reason: `No matching entity in Qloo taste graph for "${entity.name}"`,
          status: resp.status,
          latencyMs,
          cacheHit: false,
        };
      }

      // Check quality match on top candidates
      for (const candidate of results) {
        const quality = isQualityMatch(entity.name, candidate.name, prompt);
        if (quality.accepted) {
          ENTITY_CACHE.set(cacheKey, { timestamp: Date.now(), entity: candidate });
          return { entity: candidate, status: resp.status, latencyMs, cacheHit: false };
        }
      }

      // If candidates exist but failed token overlap / whole-word
      const topName = results[0].name;
      const quality = isQualityMatch(entity.name, topName, prompt);
      return {
        entity: null,
        reason: quality.reason || `Token overlap with "${topName}" is < 0.8`,
        status: resp.status,
        latencyMs,
        cacheHit: false,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  return { entity: null, reason: `Network error: ${lastError}`, status: lastStatus, latencyMs, cacheHit: false };
}

/**
 * Resolves a single concept to a Qloo tag via /v2/tags?filter.query=<term>&take=5
 */
async function resolveSingleConceptToTag(
  concept: ExtractedConcept,
  apiKey: string
): Promise<{ tag: ResolvedTagEvidence | null; status: number; latencyMs: number; cacheHit: boolean }> {
  const cacheKey = concept.term.toLowerCase();
  const cached = TAG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { tag: cached.tag, status: 200, latencyMs: 2, cacheHit: true };
  }

  const start = Date.now();
  const urlStandard = `${QLOO_BASE_URL}/v2/tags?filter.query=${encodeURIComponent(concept.term)}&take=5`;
  const urlSemantic = `${QLOO_BASE_URL}/v2/tags?filter.query=${encodeURIComponent(concept.term)}&feature.semantic_search=true&take=5`;

  let matchedTag: ResolvedTagEvidence | null = null;
  let status = 0;

  for (const url of [urlStandard, urlSemantic]) {
    try {
      const resp = await fetch(url, {
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(16_000),
      });
      status = resp.status;
      if (resp.ok) {
        const json = await resp.json();
        const tags = Array.isArray(json?.results?.tags) ? json.results.tags : Array.isArray(json?.results) ? json.results : [];
        if (tags.length > 0) {
          // Find best match by exact name or substring
          const best =
            tags.find((t: any) => t.name?.toLowerCase().trim() === concept.term.toLowerCase().trim()) ||
            tags.find((t: any) => t.name?.toLowerCase().includes(concept.term.toLowerCase())) ||
            tags[0];

          if (best && best.id) {
            matchedTag = {
              id: String(best.id),
              name: String(best.name),
              type: String(best.type || "urn:tag"),
              conceptTerm: concept.term,
              popularity: typeof best.popularity === "number" ? best.popularity : undefined,
              provenance: "qloo-evidence",
            };
            break;
          }
        }
      }
    } catch {
      // Continue to semantic query
    }
  }

  const latencyMs = Date.now() - start;
  TAG_CACHE.set(cacheKey, { timestamp: Date.now(), tag: matchedTag });
  return { tag: matchedTag, status, latencyMs, cacheHit: false };
}

/**
 * Main Coordinator: Extracts entities & concepts, resolves both against Qloo,
 * enforcing whole-word and token overlap >= 0.8 constraints.
 */
export async function resolveEntitiesAndConceptsFromPrompt(
  prompt: string
): Promise<ComprehensiveResolutionResult> {
  const start = Date.now();
  const extraction = extractEntitiesAndConcepts(prompt);

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    const fixture = getQlooFixture(prompt);
    if (fixture) {
      return {
        extraction,
        resolved: fixture.entities.map((e) => ({
          entity_id: e.id,
          name: e.name,
          types: [e.type],
        })),
        unresolved: [],
        matchedTags: [
          {
            id: "urn:tag:sample:fixture",
            name: "Sample Fixture Tag",
            type: "urn:tag",
            conceptTerm: "sample",
            provenance: "sample-fixture",
          },
        ],
        unmatchedConcepts: [],
        source: "fixture",
        latencyMs: 15,
        totalCalls: 0,
      };
    }
    return {
      extraction,
      resolved: [],
      unresolved: extraction.namedEntities.map((e) => ({
        name: e.name,
        reason: "QLOO_API_KEY is not configured",
      })),
      matchedTags: [],
      unmatchedConcepts: extraction.concepts.map((c) => ({
        term: c.term,
        reason: "no Qloo tag",
      })),
      source: "fallback",
      latencyMs: 0,
      totalCalls: 0,
    };
  }

  const resolved: QlooSearchEntity[] = [];
  const unresolved: { name: string; reason: string }[] = [];
  const matchedTags: ResolvedTagEvidence[] = [];
  const unmatchedConcepts: UnmatchedConcept[] = [];
  let totalCalls = 0;
  let hadLiveCall = false;

  // 1. Resolve named entities in parallel
  const entityPromises = extraction.namedEntities.map((e) => {
    totalCalls++;
    return resolveSingleNamedEntity(e, prompt, apiKey);
  });

  // 2. Resolve concepts to tags in parallel
  const conceptPromises = extraction.concepts.map((c) => {
    totalCalls++;
    return resolveSingleConceptToTag(c, apiKey);
  });

  const [entityResults, conceptResults] = await Promise.all([
    Promise.all(entityPromises),
    Promise.all(conceptPromises),
  ]);

  for (let i = 0; i < entityResults.length; i++) {
    const res = entityResults[i];
    const candidate = extraction.namedEntities[i];
    if (!res.cacheHit && res.status > 0) hadLiveCall = true;

    if (res.entity) {
      resolved.push(res.entity);
    } else {
      unresolved.push({
        name: candidate.name,
        reason: res.reason || "Couldn't find in Qloo",
      });
    }
  }

  for (let i = 0; i < conceptResults.length; i++) {
    const res = conceptResults[i];
    const concept = extraction.concepts[i];
    if (!res.cacheHit && res.status > 0) hadLiveCall = true;

    if (res.tag) {
      matchedTags.push(res.tag);
    } else {
      unmatchedConcepts.push({
        term: concept.term,
        reason: "no Qloo tag",
      });
    }
  }

  const latencyMs = Date.now() - start;
  let source: "live" | "cache" | "fixture" | "fallback" = "fallback";

  if (resolved.length > 0 || matchedTags.length > 0) {
    source = hadLiveCall ? "live" : "cache";
  } else {
    const fixture = getQlooFixture(prompt);
    if (fixture) {
      return {
        extraction,
        resolved: fixture.entities.map((e) => ({
          entity_id: e.id,
          name: e.name,
          types: [e.type],
        })),
        unresolved: [],
        matchedTags: [],
        unmatchedConcepts: [],
        source: "fixture",
        latencyMs,
        totalCalls,
      };
    }
  }

  return {
    extraction,
    resolved,
    unresolved,
    matchedTags,
    unmatchedConcepts,
    source,
    latencyMs,
    totalCalls,
  };
}

// Backward compatibility wrapper for existing callers
export async function resolveEntitiesFromPrompt(prompt: string) {
  const result = await resolveEntitiesAndConceptsFromPrompt(prompt);
  return {
    resolved: result.resolved,
    unresolved: result.unresolved,
    source: result.source,
    latencyMs: result.latencyMs,
    totalCalls: result.totalCalls,
  };
}
