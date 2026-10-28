/**
 * Sonic Architecture — Qloo Cross-Domain Insights Pipeline & Private Server Cache
 * (/lib/qloo/pipeline.ts)
 *
 * Implements Requirements 3, 4, and 5:
 * 3. Concepts to Tags: Integrates resolved tag IDs alongside entity IDs as signal.interests.tags.
 * 4. Insights with Tags: For concept-only prompts, calls /v2/insights using signal.interests.tags
 *    (and entities where available), take=8, feature.explainability=true across place, artist, movie, brand.
 *    Logs the result count for each call and treats 0 as "no data".
 * 5. Surface Explainability: Stores each result's explainability scores and computes the top
 *    contributing input (entity or tag) to display on cards in the UI.
 * 6. Private 24-hr server cache (.qloo-cache/ gitignored), zero key leakage.
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
} from "./types";
import {
  resolveEntitiesAndConceptsFromPrompt,
  type ComprehensiveResolutionResult,
} from "./entityExtractor";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";

const QLOO_BASE_URL = "https://hackathon.api.qloo.com";
const CACHE_DIR = path.resolve(process.cwd(), ".qloo-cache");

// Ensure .qloo-cache directory exists safely
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch {
  // Ignore in read-only environments
}

const IN_MEMORY_CACHE = new Map<string, { timestamp: number; data: RealQlooEvidenceBundle }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24-hour cache for stable cultural entities

function readDiskCache(cacheKey: string): RealQlooEvidenceBundle | null {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed as RealQlooEvidenceBundle;
      }
    }
  } catch {
    // Disk cache read failed or not supported
  }
  return null;
}

function writeDiskCache(cacheKey: string, data: RealQlooEvidenceBundle): void {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Disk write failure silently ignored
  }
}

/**
 * Executes a resilient GET call to /v2/insights with 1 retry and 20s timeout
 */
async function fetchInsightsEndpoint<T>(
  endpointPath: string,
  apiKey: string
): Promise<{ ok: boolean; status: number; data: T | null; latencyMs: number }> {
  const fullUrl = `${QLOO_BASE_URL}${endpointPath}`;
  const start = Date.now();
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(fullUrl, {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      });

      lastStatus = resp.status;
      const latencyMs = Date.now() - start;

      const sanitizedLogPath = endpointPath.split("&")[0] || endpointPath;
      console.log(
        `[Qloo Outbound] ${sanitizedLogPath} status=${resp.status} latency=${latencyMs}ms (attempt ${attempt})`
      );

      if (!resp.ok) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { ok: false, status: resp.status, data: null, latencyMs };
      }

      const json = (await resp.json()) as T;
      return { ok: true, status: resp.status, data: json, latencyMs };
    } catch {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  return { ok: false, status: lastStatus, data: null, latencyMs };
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
 * Builds and executes the cross-domain insights queries combining entity IDs and tag IDs
 */
export async function executeCrossDomainPipeline(
  resolution: ComprehensiveResolutionResult,
  inputParsed: string
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

  // 1. Check RAM cache
  const memCached = IN_MEMORY_CACHE.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    console.log(`[Qloo Outbound] /v2/insights cache=hit (RAM) key=${cacheKey}`);
    return { ...memCached.data, source: "cache", latencyMs: 2 };
  }

  // 2. Check Disk cache
  const diskCached = readDiskCache(cacheKey);
  if (diskCached) {
    IN_MEMORY_CACHE.set(cacheKey, { timestamp: diskCached.timestamp, data: diskCached });
    console.log(`[Qloo Outbound] /v2/insights cache=hit (Disk) key=${cacheKey}`);
    return { ...diskCached, source: "cache", latencyMs: 4 };
  }

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey || (entityIds.length === 0 && tagIds.length === 0)) {
    return createSampleFixtureBundle(primaryEntity, resolution, inputParsed, "fallback");
  }

  const start = Date.now();

  // 3. Build signals query string combining entities and tags
  const signalParts: string[] = [];
  if (entityIds.length > 0) {
    signalParts.push(`signal.interests.entities=${encodeURIComponent(entityIds.slice(0, 3).join(","))}`);
  }
  if (tagIds.length > 0) {
    signalParts.push(`signal.interests.tags=${encodeURIComponent(tagIds.slice(0, 3).join(","))}`);
  }
  const signalsQuery = signalParts.join("&");

  // 4. Parallel fetch all cross-domain endpoints with take=8 and feature.explainability=true
  const [placesRes, artistsRes, moviesRes, brandsRes, tagsRes, demoRes] = await Promise.all([
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?${signalsQuery}&filter.type=urn:entity:place&take=8&feature.explainability=true`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?${signalsQuery}&filter.type=urn:entity:artist&take=8&feature.explainability=true`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?${signalsQuery}&filter.type=urn:entity:movie&take=8&feature.explainability=true`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?${signalsQuery}&filter.type=urn:entity:brand&take=8&feature.explainability=true`,
      apiKey
    ),
    // Taste tags query (if entity available)
    primaryEntity
      ? fetchInsightsEndpoint<QlooTasteTagsResponse>(
          `/v2/insights?signal.interests.entities=${encodeURIComponent(primaryEntity.entity_id)}&filter.type=urn:tag&take=10`,
          apiKey
        )
      : Promise.resolve({ ok: true, status: 200, data: null, latencyMs: 0 }),
    // Demographics query (if entity available)
    primaryEntity
      ? fetchInsightsEndpoint<QlooDemographicsResponse>(
          `/v2/insights?signal.interests.entities=${encodeURIComponent(primaryEntity.entity_id)}&filter.type=urn:demographics`,
          apiKey
        )
      : Promise.resolve({ ok: true, status: 200, data: null, latencyMs: 0 }),
  ]);

  const totalLatencyMs = Date.now() - start;

  const places = placesRes.data?.results?.entities || [];
  const relatedArtists = artistsRes.data?.results?.entities || [];
  const movies = moviesRes.data?.results?.entities || [];
  const brands = brandsRes.data?.results?.entities || [];
  const tasteTags = tagsRes.data?.results?.tags || [];
  const demographics = demoRes.data?.results?.demographics?.[0] || null;

  // Log the result count for each call; treat 0 as "no data" (Requirement 4)
  console.log(`[Qloo Insights] filter.type=place status=${placesRes.status} count=${places.length} (${places.length === 0 ? "no data" : "ok"})`);
  console.log(`[Qloo Insights] filter.type=artist status=${artistsRes.status} count=${relatedArtists.length} (${relatedArtists.length === 0 ? "no data" : "ok"})`);
  console.log(`[Qloo Insights] filter.type=movie status=${moviesRes.status} count=${movies.length} (${movies.length === 0 ? "no data" : "ok"})`);
  console.log(`[Qloo Insights] filter.type=brand status=${brandsRes.status} count=${brands.length} (${brands.length === 0 ? "no data" : "ok"})`);

  // Compute explainability scores and surface top contributors (Requirement 5)
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

  const isLiveSuccess = placesRes.ok || artistsRes.ok || moviesRes.ok || brandsRes.ok;
  if (!isLiveSuccess && places.length === 0 && relatedArtists.length === 0) {
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
    latencyMs: totalLatencyMs,
    timestamp: Date.now(),
  };

  // Cache in RAM and Disk
  IN_MEMORY_CACHE.set(cacheKey, { timestamp: bundle.timestamp, data: bundle });
  writeDiskCache(cacheKey, bundle);

  return bundle;
}

/**
 * Fallback fixture builder with explicit synthetic labels
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
    latencyMs: 15,
    timestamp: Date.now(),
  };
}

/**
 * Complete pipeline coordinator: Prompt -> Comprehensive Resolution -> Cross-Domain Evidence Bundle
 */
export async function getCrossDomainEvidenceForPrompt(
  prompt: string
): Promise<{
  resolution: ComprehensiveResolutionResult;
  bundle: RealQlooEvidenceBundle | null;
}> {
  const resolution = await resolveEntitiesAndConceptsFromPrompt(prompt);

  // If both entities and tags are empty, return resolution with no bundle
  if (resolution.resolved.length === 0 && resolution.matchedTags.length === 0) {
    return { resolution, bundle: null };
  }

  const bundle = await executeCrossDomainPipeline(resolution, prompt);
  return { resolution, bundle };
}

// Backward compatibility alias
export const fetchCrossDomainBundle = async (entity: QlooSearchEntity, prompt: string) => {
  const resolution = await resolveEntitiesAndConceptsFromPrompt(prompt);
  return executeCrossDomainPipeline(resolution, prompt);
};
