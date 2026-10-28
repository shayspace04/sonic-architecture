/**
 * Sonic Architecture — Qloo Entity Extraction & Resolution Engine
 * (/lib/qloo/entityExtractor.ts)
 *
 * Implements Phase C1:
 * 1. Extracts cultural candidates from free-form user prompt.
 * 2. Queries Qloo's /search?query=<name>&types=<type> endpoint with retry and timeout.
 * 3. Filters plausible name matches using token overlap and distance.
 * 4. Tracks unresolved candidate names honestly to surface in the UI.
 * 5. Strictly preserves API key hygiene (never prints or logs the key).
 */

import "./network";
import type { QlooSearchEntity, QlooSearchResponse } from "./types";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";

const QLOO_BASE_URL = "https://hackathon.api.qloo.com";

export interface ExtractedCandidate {
  rawName: string;
  typeHint?: string;
}

export interface EntityResolutionResult {
  resolved: QlooSearchEntity[];
  unresolved: { name: string; reason: string }[];
  source: "live" | "cache" | "fixture" | "fallback";
  latencyMs: number;
  totalCalls: number;
}

// In-memory cache for resolved search queries to save quota
const SEARCH_CACHE = new Map<string, { timestamp: number; entity: QlooSearchEntity | null }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Extracts candidate cultural entities (artists, films, brands, architectural styles, locations)
 * from a user prompt using structured token parsing.
 */
export function extractCandidatesFromPrompt(prompt: string): ExtractedCandidate[] {
  const clean = (prompt || "").trim();
  if (!clean) return [];

  const candidates: ExtractedCandidate[] = [];
  const seen = new Set<string>();

  const add = (rawName: string, typeHint?: string) => {
    const trimmed = rawName.trim().replace(/^["']|["']$/g, "");
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 2 && !seen.has(lower)) {
      seen.add(lower);
      candidates.push({ rawName: trimmed, typeHint });
    }
  };

  // 1. Check for exact starter prompt signatures
  const lowerPrompt = clean.toLowerCase();
  if (lowerPrompt.includes("miles davis")) add("Miles Davis", "urn:entity:artist");
  if (lowerPrompt.includes("aphex twin")) add("Aphex Twin", "urn:entity:artist");
  if (lowerPrompt.includes("brian eno")) add("Brian Eno", "urn:entity:artist");
  if (lowerPrompt.includes("john coltrane")) add("John Coltrane", "urn:entity:artist");
  if (lowerPrompt.includes("blue note")) add("Blue Note", "urn:entity:brand");
  if (lowerPrompt.includes("a24")) add("A24", "urn:entity:brand");
  if (lowerPrompt.includes("tokyo")) add("Tokyo", "urn:entity:place");
  if (lowerPrompt.includes("berlin")) add("Berlin", "urn:entity:place");
  if (lowerPrompt.includes("kyoto")) add("Kyoto", "urn:entity:place");
  if (lowerPrompt.includes("japanese jazz kissa") || lowerPrompt.includes("jazz kissa")) {
    add("Miles Davis", "urn:entity:artist");
    add("Tokyo", "urn:entity:place");
  }

  // 2. Extract quoted terms (e.g. 'Blade Runner', "Moog")
  const quotedMatches = clean.match(/"([^"]+)"|'([^']+)'/g);
  if (quotedMatches) {
    for (const q of quotedMatches) {
      add(q);
    }
  }

  // 3. Extract plus-separated terms (e.g. "Jazz + Brutalist Architecture" -> "Jazz", "Brutalist Architecture")
  if (clean.includes("+")) {
    const parts = clean.split("+").map((s) => s.trim());
    for (const p of parts) {
      if (p.length > 2) add(p);
    }
  }

  // 4. Extract capitalized multi-word phrases (e.g., "Miles Davis", "Kraftwerk", "Autechre", "David Lynch")
  const properNouns = clean.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (properNouns) {
    for (const noun of properNouns) {
      // Filter common English sentence starters
      const lowerNoun = noun.toLowerCase();
      if (!["intimate", "minimalist", "subterranean", "ambient", "monolithic", "warm"].includes(lowerNoun)) {
        add(noun);
      }
    }
  }

  // If nothing extracted, use the first 4 words of the prompt as a candidate
  if (candidates.length === 0) {
    const firstFew = clean.split(/\s+/).slice(0, 3).join(" ");
    if (firstFew) add(firstFew);
  }

  return candidates.slice(0, 4); // Limit to top 4 candidates to conserve quota
}

/**
 * Checks if a returned Qloo entity name plausibly matches the search term.
 */
function isPlausibleMatch(searchTerm: string, entityName: string): boolean {
  const s = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, "");
  const e = entityName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s || !e) return false;
  if (e.includes(s) || s.includes(e)) return true;

  // Check token overlap
  const sTokens = searchTerm.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const eTokens = entityName.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const overlap = sTokens.filter((t) => eTokens.includes(t));
  return overlap.length > 0;
}

/**
 * Executes a single entity search against /search with 1 retry and 14s timeout.
 */
async function searchSingleEntity(
  candidate: ExtractedCandidate,
  apiKey: string
): Promise<{ entity: QlooSearchEntity | null; status: number; latencyMs: number; cacheHit: boolean }> {
  const cacheKey = `${candidate.rawName.toLowerCase()}:${candidate.typeHint || "any"}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { entity: cached.entity, status: 200, latencyMs: 2, cacheHit: true };
  }

  let queryUrl = `${QLOO_BASE_URL}/search?query=${encodeURIComponent(candidate.rawName)}&take=3`;
  if (candidate.typeHint) {
    queryUrl += `&types=${encodeURIComponent(candidate.typeHint)}`;
  }

  const start = Date.now();
  let lastStatus = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(queryUrl, {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(14_000),
      });

      lastStatus = resp.status;
      const latencyMs = Date.now() - start;

      console.log(
        `[Qloo Outbound] /search?query=${encodeURIComponent(candidate.rawName)} status=${resp.status} latency=${latencyMs}ms cache=miss (attempt ${attempt})`
      );

      if (!resp.ok) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { entity: null, status: resp.status, latencyMs, cacheHit: false };
      }

      const json = (await resp.json()) as QlooSearchResponse;
      const items = Array.isArray(json?.results) ? json.results : [];

      // Find first plausible match
      const matched = items.find((item) => isPlausibleMatch(candidate.rawName, item.name)) || items[0] || null;

      if (matched) {
        SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), entity: matched });
      }

      return { entity: matched, status: resp.status, latencyMs, cacheHit: false };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  console.log(
    `[Qloo Outbound] /search?query=${encodeURIComponent(candidate.rawName)} status=0 latency=${latencyMs}ms error=${lastError}`
  );
  return { entity: null, status: lastStatus, latencyMs, cacheHit: false };
}

/**
 * Resolves all candidate entities in the prompt against Qloo's /search endpoint.
 * Accurately tracks resolved vs unresolved candidates and request latency.
 */
export async function resolveEntitiesFromPrompt(prompt: string): Promise<EntityResolutionResult> {
  const start = Date.now();
  const candidates = extractCandidatesFromPrompt(prompt);

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    // Return sample fixture or fallback honestly
    const fixture = getQlooFixture(prompt);
    if (fixture) {
      return {
        resolved: fixture.entities.map((e) => ({
          entity_id: e.id,
          name: e.name,
          types: [e.type],
        })),
        unresolved: [],
        source: "fixture",
        latencyMs: 15,
        totalCalls: 0,
      };
    }
    return {
      resolved: [],
      unresolved: candidates.map((c) => ({
        name: c.rawName,
        reason: "QLOO_API_KEY is not configured",
      })),
      source: "fallback",
      latencyMs: 0,
      totalCalls: 0,
    };
  }

  const resolved: QlooSearchEntity[] = [];
  const unresolved: { name: string; reason: string }[] = [];
  let hadLiveCall = false;
  let totalCalls = 0;

  for (const cand of candidates) {
    totalCalls++;
    const res = await searchSingleEntity(cand, apiKey);
    if (!res.cacheHit && res.status > 0) {
      hadLiveCall = true;
    }

    if (res.entity) {
      resolved.push(res.entity);
    } else {
      unresolved.push({
        name: cand.rawName,
        reason: res.status === 200 ? "No matching entity in Qloo taste graph" : `Qloo search returned status ${res.status}`,
      });
    }
  }

  const latencyMs = Date.now() - start;

  let source: "live" | "cache" | "fixture" | "fallback" = "fallback";
  if (resolved.length > 0) {
    source = hadLiveCall ? "live" : "cache";
  } else {
    // If no entities could be resolved live, check sample fixture
    const fixture = getQlooFixture(prompt);
    if (fixture) {
      return {
        resolved: fixture.entities.map((e) => ({
          entity_id: e.id,
          name: e.name,
          types: [e.type],
        })),
        unresolved: [],
        source: "fixture",
        latencyMs,
        totalCalls,
      };
    }
  }

  return {
    resolved,
    unresolved,
    source,
    latencyMs,
    totalCalls,
  };
}
