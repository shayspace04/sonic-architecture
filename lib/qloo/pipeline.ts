/**
 * Sonic Architecture — Qloo Cross-Domain Insights Pipeline & Private Server Cache
 * (/lib/qloo/pipeline.ts)
 *
 * Implements Judge Reliability & Latency Budget Requirements:
 * 1. Hard per-call timeout 6s (AbortSignal.timeout(6000)).
 * 2. Total cold request budget 10s. Missing domains labeled "timed out".
 * 3. Fall-through queries (single tag, name search) run in PARALLEL with the first attempt, not after it.
 * 4. Trace streaming callback so the UI/SSE stream displays progress live.
 * 5. Records venueSource ("insights" vs "name_search") and venueSearchTerm.
 * 6. Pluggable cache adapter (KV / InMemory / FileSystem) with zero key leakage.
 */

import fs from "node:fs";
import path from "node:path";
import "./network";
import type {
  QlooSearchEntity,
  QlooInsightEntity,
  QlooInsightsResponse,
  QlooTasteTag,
  QlooTasteTagsResponse,
  QlooDemographic,
  QlooDemographicsResponse,
  RealQlooEvidenceBundle,
  ResolvedTagEvidence,
  SurfaceExplainability,
  TraceStep,
} from "./types";
import {
  resolveEntitiesAndConceptsFromPrompt,
  type ComprehensiveResolutionResult,
} from "./entityExtractor";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";
import { getQlooCacheAdapter } from "./cache";

const QLOO_BASE_URL = "https://hackathon.api.qloo.com";
const HARD_PER_CALL_TIMEOUT_MS = 6_000;
const TOTAL_BUDGET_MS = 9_800;

/**
 * Executes a resilient GET call to /v2/insights with 1 retry and 6s hard timeout
 */
async function fetchInsightsEndpoint<T>(
  endpointPath: string,
  apiKey: string,
  domain = "insights",
  onTraceStep?: (step: TraceStep) => void
): Promise<{ ok: boolean; status: number; data: T | null; latencyMs: number; error?: string }> {
  const fullUrl = `${QLOO_BASE_URL}${endpointPath}`;
  const start = Date.now();
  let lastStatus = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(fullUrl, {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(HARD_PER_CALL_TIMEOUT_MS),
      });

      lastStatus = resp.status;
      const latencyMs = Date.now() - start;

      const sanitizedLogPath = endpointPath.split("&")[0] || endpointPath;
      console.log(
        `[Qloo Outbound] ${sanitizedLogPath} status=${resp.status} latency=${latencyMs}ms (attempt ${attempt})`
      );

      if (!resp.ok) {
        if (attempt === 1 && resp.status >= 500) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const step: TraceStep = {
          endpoint: sanitizedLogPath,
          status: resp.status,
          count: 0,
          latencyMs,
          domain,
          error: `HTTP ${resp.status}`,
        };
        onTraceStep?.(step);
        return { ok: false, status: resp.status, data: null, latencyMs, error: `HTTP ${resp.status}` };
      }

      const json = (await resp.json()) as T;
      const count =
        Array.isArray((json as any)?.results?.entities)
          ? (json as any).results.entities.length
          : Array.isArray((json as any)?.results?.tags)
          ? (json as any).results.tags.length
          : 1;

      const step: TraceStep = {
        endpoint: sanitizedLogPath,
        status: resp.status,
        count,
        latencyMs,
        domain,
      };
      onTraceStep?.(step);

      return { ok: true, status: resp.status, data: json, latencyMs };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  const sanitizedLogPath = endpointPath.split("&")[0] || endpointPath;
  const step: TraceStep = {
    endpoint: sanitizedLogPath,
    status: lastStatus,
    count: 0,
    latencyMs,
    domain,
    error: lastError,
  };
  onTraceStep?.(step);

  return { ok: false, status: lastStatus, data: null, latencyMs, error: lastError };
}

/**
 * Computes top contributing input (entity or tag) for an insight result
 */
function computeTopContributor(
  entity: QlooInsightEntity,
  inputEntities: QlooSearchEntity[],
  inputTags: ResolvedTagEvidence[]
): SurfaceExplainability | null {
  const entityMap = new Map(inputEntities.map((e) => [e.entity_id, e.name]));
  const tagMap = new Map(inputTags.map((t) => [t.id, t.name]));

  let bestId = "";
  let bestName = "";
  let bestType: "entity" | "tag" = "entity";
  let bestScore = -1;

  // Check entity explainability
  const entItems = entity.query?.explainability?.["signal.interests.entities"];
  if (Array.isArray(entItems)) {
    for (const item of entItems) {
      if (typeof item.score === "number" && item.score > bestScore) {
        bestScore = item.score;
        bestId = item.entity_id;
        bestName = entityMap.get(item.entity_id) || "Cultural Entity";
        bestType = "entity";
      }
    }
  }

  // Check tag explainability
  const tagItems = (entity.query?.explainability as any)?.["signal.interests.tags"];
  if (Array.isArray(tagItems)) {
    for (const item of tagItems) {
      if (typeof item.score === "number" && item.score > bestScore) {
        bestScore = item.score;
        bestId = item.tag_id || item.id;
        bestName = tagMap.get(bestId) || "Cultural Tag";
        bestType = "tag";
      }
    }
  }

  // Fallback to top input if affinity exists
  if (bestScore <= 0) {
    if (inputEntities.length > 0) {
      bestId = inputEntities[0].entity_id;
      bestName = inputEntities[0].name;
      bestType = "entity";
      bestScore = typeof entity.query?.affinity === "number" ? entity.query.affinity : 0.85;
    } else if (inputTags.length > 0) {
      bestId = inputTags[0].id;
      bestName = inputTags[0].name;
      bestType = "tag";
      bestScore = typeof entity.query?.affinity === "number" ? entity.query.affinity : 0.82;
    }
  }

  if (!bestId) return null;

  return {
    contributorId: bestId,
    contributorName: bestName,
    contributorType: bestType,
    score: Number(bestScore.toFixed(2)),
  };
}

/**
 * Builds and executes cross-domain insights queries combining entity IDs and tag IDs
 * within the strict 10s total latency budget and 6s per-call timeout.
 */
export async function executeCrossDomainPipeline(
  resolution: ComprehensiveResolutionResult,
  inputParsed: string,
  onTraceStep?: (step: TraceStep) => void
): Promise<RealQlooEvidenceBundle> {
  const entityIds = resolution.resolved.map((e) => e.entity_id);
  const tagIds = resolution.matchedTags.map((t) => t.id);
  const primaryEntity = resolution.resolved[0] || null;

  // Deterministic cache key based on resolved entities and tags
  const cacheKeyParts = [
    entityIds.sort().join(","),
    tagIds.sort().join(","),
  ].filter(Boolean);
  const cacheKey = `bundle_${cacheKeyParts.join("__").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "empty"}`;

  // 1. Check pluggable cache adapter (InMemory, KV/Redis, or FileSystem)
  const cacheAdapter = getQlooCacheAdapter();
  const cachedBundle = await cacheAdapter.get(cacheKey);
  if (cachedBundle) {
    console.log(`[Qloo Outbound] /v2/insights cache=hit (${cacheAdapter.constructor.name}) key=${cacheKey}`);
    onTraceStep?.({
      endpoint: "/v2/insights (cache)",
      count: 4,
      latencyMs: 2,
      status: 200,
      domain: "all",
    });
    return { ...cachedBundle, source: "cache", latencyMs: 2 };
  }

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey || (entityIds.length === 0 && tagIds.length === 0)) {
    return createSampleFixtureBundle(primaryEntity, resolution, inputParsed, "fallback");
  }

  const start = Date.now();

  // 2. Build signals query string combining entities and tags
  const signalParts: string[] = [];
  if (entityIds.length > 0) {
    signalParts.push(`signal.interests.entities=${encodeURIComponent(entityIds[0])}`);
  } else if (tagIds.length > 0) {
    signalParts.push(`signal.interests.tags=${encodeURIComponent(tagIds.slice(0, 2).join(","))}`);
  }
  const signalsQuery = signalParts.join("&");

  // Track domain completion status
  const domainStatus: Record<string, "ok" | "empty" | "timed out"> = {
    places: "timed out",
    artists: "timed out",
    movies: "timed out",
    brands: "timed out",
    tags: "timed out",
    demographics: "timed out",
  };

  // 3. RUN ALL QUERIES IN PARALLEL:
  // - Main multi-signal insights calls
  // - Fall-through single-tag place queries (run in parallel with the first attempt!)
  // - Fall-through candidate place search queries (run in parallel with the first attempt!)

  const placesPromise = fetchInsightsEndpoint<QlooInsightsResponse>(
    `/v2/insights?${signalsQuery}&filter.type=urn:entity:place&take=4&feature.explainability=true`,
    apiKey,
    "place",
    onTraceStep
  );

  const artistsPromise = fetchInsightsEndpoint<QlooInsightsResponse>(
    `/v2/insights?${signalsQuery}&filter.type=urn:entity:artist&take=4&feature.explainability=true`,
    apiKey,
    "artist",
    onTraceStep
  );

  const moviesPromise = fetchInsightsEndpoint<QlooInsightsResponse>(
    `/v2/insights?${signalsQuery}&filter.type=urn:entity:movie&take=4&feature.explainability=true`,
    apiKey,
    "movie",
    onTraceStep
  );

  const brandsPromise = fetchInsightsEndpoint<QlooInsightsResponse>(
    `/v2/insights?${signalsQuery}&filter.type=urn:entity:brand&take=4&feature.explainability=true`,
    apiKey,
    "brand",
    onTraceStep
  );

  const tagsPromise = primaryEntity
    ? fetchInsightsEndpoint<QlooTasteTagsResponse>(
        `/v2/insights?signal.interests.entities=${encodeURIComponent(primaryEntity.entity_id)}&filter.type=urn:tag&take=8`,
        apiKey,
        "taste_tags",
        onTraceStep
      )
    : Promise.resolve({ ok: true, status: 200, data: null, latencyMs: 0 });

  const demoPromise = primaryEntity
    ? fetchInsightsEndpoint<QlooDemographicsResponse>(
        `/v2/insights?signal.interests.entities=${encodeURIComponent(primaryEntity.entity_id)}&filter.type=urn:demographics`,
        apiKey,
        "demographics",
        onTraceStep
      )
    : Promise.resolve({ ok: true, status: 200, data: null, latencyMs: 0 });

  // Speculative fall-through: single-tag queries in parallel
  const singleTagPromises = tagIds.slice(0, 2).map((tid) =>
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?signal.interests.tags=${encodeURIComponent(tid)}&filter.type=urn:entity:place&take=4&feature.explainability=true`,
      apiKey,
      "place_fallback_tag"
    )
  );

  // Speculative fall-through: place name search in parallel
  const candidateTerms = [
    ...resolution.matchedTags.map((t) => t.conceptTerm),
    ...inputParsed.split("+").map((s) => s.trim()),
  ]
    .filter(Boolean)
    .slice(0, 2);

  const placeSearchPromises = candidateTerms.map(async (searchTerm) => {
    try {
      const searchUrl = `${QLOO_BASE_URL}/search?query=${encodeURIComponent(searchTerm)}&types=urn:entity:place&take=4`;
      const res = await fetch(searchUrl, {
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(HARD_PER_CALL_TIMEOUT_MS),
      });
      if (res.ok) {
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        return {
          searchTerm,
          places: results.map((r: any) => ({
            entity_id: r.entity_id,
            name: r.name,
            type: "urn:entity:place",
            tags: r.tags || [],
          })),
        };
      }
    } catch {
      // Ignored in speculative fall-through
    }
    return { searchTerm, places: [] };
  });

  // 4. Enforce strict 10s cold budget via Promise.race
  let isBudgetExpired = false;
  const budgetDeadline = new Promise<{ timedOut: true }>((resolve) =>
    setTimeout(() => {
      isBudgetExpired = true;
      resolve({ timedOut: true });
    }, TOTAL_BUDGET_MS)
  );

  const allQueries = Promise.allSettled([
    placesPromise,
    artistsPromise,
    moviesPromise,
    brandsPromise,
    tagsPromise,
    demoPromise,
    Promise.allSettled(singleTagPromises),
    Promise.allSettled(placeSearchPromises),
  ]);

  await Promise.race([allQueries, budgetDeadline]);

  // Extract completed results safely
  let placesRes: any = null;
  let artistsRes: any = null;
  let moviesRes: any = null;
  let brandsRes: any = null;
  let tagsRes: any = null;
  let demoRes: any = null;
  let singleTagResList: any[] = [];
  let placeSearchResList: any[] = [];

  try {
    const settled = await Promise.race([
      allQueries,
      Promise.resolve(null),
    ]);

    if (Array.isArray(settled)) {
      if (settled[0].status === "fulfilled") placesRes = settled[0].value;
      if (settled[1].status === "fulfilled") artistsRes = settled[1].value;
      if (settled[2].status === "fulfilled") moviesRes = settled[2].value;
      if (settled[3].status === "fulfilled") brandsRes = settled[3].value;
      if (settled[4].status === "fulfilled") tagsRes = settled[4].value;
      if (settled[5].status === "fulfilled") demoRes = settled[5].value;
      if (settled[6].status === "fulfilled") singleTagResList = settled[6].value;
      if (settled[7].status === "fulfilled") placeSearchResList = settled[7].value;
    }
  } catch {
    // If extraction fails, continue with whatever exists
  }

  // Update domain status
  let places: QlooInsightEntity[] = placesRes?.data?.results?.entities || [];
  let venueSource: "insights" | "name_search" = "insights";
  let venueSearchTerm: string | undefined = undefined;

  if (places.length > 0) {
    domainStatus.places = "ok";
  } else {
    // Check parallel single-tag queries
    for (const stItem of singleTagResList) {
      if (stItem.status === "fulfilled" && stItem.value?.data?.results?.entities?.length > 0) {
        places = stItem.value.data.results.entities;
        domainStatus.places = "ok";
        venueSource = "insights";
        break;
      }
    }

    // If still empty, check parallel place search queries
    if (places.length === 0) {
      for (const psItem of placeSearchResList) {
        if (psItem.status === "fulfilled" && psItem.value?.places?.length > 0) {
          places = psItem.value.places;
          domainStatus.places = "ok";
          venueSource = "name_search";
          venueSearchTerm = psItem.value.searchTerm;
          break;
        }
      }
    }

    if (places.length === 0) {
      domainStatus.places = placesRes ? "empty" : "timed out";
    }
  }

  const relatedArtists: QlooInsightEntity[] = artistsRes?.data?.results?.entities || [];
  domainStatus.artists = relatedArtists.length > 0 ? "ok" : artistsRes ? "empty" : "timed out";

  const movies: QlooInsightEntity[] = moviesRes?.data?.results?.entities || [];
  domainStatus.movies = movies.length > 0 ? "ok" : moviesRes ? "empty" : "timed out";

  const brands: QlooInsightEntity[] = brandsRes?.data?.results?.entities || [];
  domainStatus.brands = brands.length > 0 ? "ok" : brandsRes ? "empty" : "timed out";

  const tasteTags: QlooTasteTag[] = tagsRes?.data?.results?.tags || [];
  domainStatus.tags = tasteTags.length > 0 ? "ok" : tagsRes ? "empty" : "timed out";

  const demographics: QlooDemographic | null = demoRes?.data?.results?.demographics?.[0] || null;
  domainStatus.demographics = demographics ? "ok" : demoRes ? "empty" : "timed out";

  const totalLatencyMs = Date.now() - start;

  console.log(`[Qloo Insights] Budget: ${totalLatencyMs}ms (expired=${isBudgetExpired})`);
  console.log(`[Qloo Insights] Domain status:`, JSON.stringify(domainStatus));

  // Build granular trace metrics for UI streaming
  const traceMetrics: Array<{ endpoint: string; count: number; latencyMs: number; status: number }> = [
    ...resolution.resolved.map((r) => ({
      endpoint: `/search?query=${encodeURIComponent(r.name)}`,
      count: 1,
      latencyMs: resolution.latencyMs,
      status: 200,
    })),
    ...resolution.matchedTags.map((t) => ({
      endpoint: `/v2/tags?filter.query=${encodeURIComponent(t.conceptTerm)}`,
      count: 1,
      latencyMs: resolution.latencyMs,
      status: 200,
    })),
    {
      endpoint: "/v2/insights (place)",
      count: places.length,
      latencyMs: placesRes?.latencyMs || totalLatencyMs,
      status: placesRes?.status || (domainStatus.places === "timed out" ? 504 : 200),
    },
    {
      endpoint: "/v2/insights (artist)",
      count: relatedArtists.length,
      latencyMs: artistsRes?.latencyMs || totalLatencyMs,
      status: artistsRes?.status || (domainStatus.artists === "timed out" ? 504 : 200),
    },
    {
      endpoint: "/v2/insights (movie)",
      count: movies.length,
      latencyMs: moviesRes?.latencyMs || totalLatencyMs,
      status: moviesRes?.status || (domainStatus.movies === "timed out" ? 504 : 200),
    },
    {
      endpoint: "/v2/insights (brand)",
      count: brands.length,
      latencyMs: brandsRes?.latencyMs || totalLatencyMs,
      status: brandsRes?.status || (domainStatus.brands === "timed out" ? 504 : 200),
    },
  ];

  // Compute explainability scores and surface top contributors
  const explainabilityScores: Record<string, number> = {};
  const surfaceExplainability: Record<string, SurfaceExplainability> = {};

  const processExplainability = (entities: QlooInsightEntity[]) => {
    for (const ent of entities) {
      const top = computeTopContributor(ent, resolution.resolved, resolution.matchedTags);
      if (top) {
        surfaceExplainability[ent.entity_id] = top;
        explainabilityScores[ent.entity_id] = top.score;
      }
    }
  };

  processExplainability(places);
  processExplainability(relatedArtists);
  processExplainability(movies);
  processExplainability(brands);

  const isLiveSuccess = places.length > 0 || relatedArtists.length > 0 || movies.length > 0 || brands.length > 0;
  if (!isLiveSuccess) {
    return createSampleFixtureBundle(primaryEntity, resolution, inputParsed, "fallback");
  }

  const bundle: RealQlooEvidenceBundle = {
    source: "live",
    inputParsed,
    resolvedEntity: primaryEntity,
    resolvedEntities: resolution.resolved,
    resolvedTags: resolution.matchedTags,
    unmatchedConcepts: resolution.unmatchedConcepts,
    unresolved: resolution.unresolved,
    places,
    relatedArtists,
    movies,
    brands,
    tasteTags,
    demographics,
    explainabilityScores,
    surfaceExplainability,
    venueSource,
    venueSearchTerm,
    domainStatus,
    latencyMs: totalLatencyMs,
    timestamp: Date.now(),
    traceMetrics,
  };

  // 5. Store in pluggable cache adapter
  await cacheAdapter.set(cacheKey, bundle, 24 * 60 * 60 * 1000);

  return bundle;
}

/**
 * Creates a truthfully labeled fallback sample bundle
 */
function createSampleFixtureBundle(
  primaryEntity: QlooSearchEntity | null,
  resolution: ComprehensiveResolutionResult,
  inputParsed: string,
  source: "fixture" | "fallback"
): RealQlooEvidenceBundle {
  return {
    source,
    inputParsed,
    resolvedEntity: primaryEntity,
    resolvedEntities: resolution.resolved,
    resolvedTags: resolution.matchedTags,
    unmatchedConcepts: resolution.unmatchedConcepts,
    unresolved: resolution.unresolved,
    places: [
      {
        entity_id: "venue:village-vanguard",
        name: "Village Vanguard (Sample fixture)",
        type: "urn:entity:place",
        properties: { description: "Historic subterranean Greenwich Village jazz cellar with triangular acoustic stage." },
      },
    ],
    relatedArtists: [
      { entity_id: "artist:coltrane", name: "John Coltrane (Sample fixture)", type: "urn:entity:artist" },
      { entity_id: "artist:thelonious-monk", name: "Thelonious Monk (Sample fixture)", type: "urn:entity:artist" },
    ],
    movies: [
      { entity_id: "movie:round-midnight", name: "Round Midnight (Sample fixture)", type: "urn:entity:movie" },
    ],
    brands: [
      { entity_id: "brand:blue-note", name: "Blue Note (Sample fixture)", type: "urn:entity:brand" },
    ],
    tasteTags: [
      { tag_id: "tag:modal-jazz", name: "Modal Jazz", tag_value: "sample-tag" },
      { tag_id: "tag:hard-bop", name: "Hard Bop", tag_value: "sample-tag" },
    ],
    demographics: null,
    explainabilityScores: {},
    surfaceExplainability: {},
    domainStatus: {
      places: "empty",
      artists: "empty",
      movies: "empty",
      brands: "empty",
      tags: "empty",
      demographics: "empty",
    },
    latencyMs: 15,
    timestamp: Date.now(),
  };
}

/**
 * Complete pipeline coordinator: Prompt -> Comprehensive Resolution -> Cross-Domain Evidence Bundle
 */
export async function getCrossDomainEvidenceForPrompt(
  prompt: string,
  onTraceStep?: (step: TraceStep) => void
): Promise<{
  resolution: ComprehensiveResolutionResult;
  bundle: RealQlooEvidenceBundle | null;
}> {
  const resolution = await resolveEntitiesAndConceptsFromPrompt(prompt, onTraceStep);

  // If both entities and tags are empty, return resolution with no bundle
  if (resolution.resolved.length === 0 && resolution.matchedTags.length === 0) {
    return { resolution, bundle: null };
  }

  const bundle = await executeCrossDomainPipeline(resolution, prompt, onTraceStep);
  return { resolution, bundle };
}

// Backward compatibility alias
export const fetchCrossDomainBundle = async (entity: QlooSearchEntity, prompt: string) => {
  const resolution = await resolveEntitiesAndConceptsFromPrompt(prompt);
  return executeCrossDomainPipeline(resolution, prompt);
};
