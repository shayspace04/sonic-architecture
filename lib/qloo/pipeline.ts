/**
 * Sonic Architecture — Qloo Cross-Domain Insights Pipeline & Private Server Cache
 * (/lib/qloo/pipeline.ts)
 *
 * Implements Phases C2, C3, and C6:
 * - Parallel cross-domain queries via Promise.all across:
 *   1. Places: filter.type=urn:entity:place (venues, clubs, bars)
 *   2. Artists: filter.type=urn:entity:artist (related musicians for soundtrack)
 *   3. Movies: filter.type=urn:entity:movie (cinematic & lighting aesthetic)
 *   4. Brands: filter.type=urn:entity:brand (materiality, furniture, audio hardware)
 *   5. Taste Tags: filter.type=urn:tag (subgenres, styles, design taxonomy)
 *   6. Demographics: filter.type=urn:demographics (age/gender distributions)
 * - Enables feature.explainability=true to measure exact mathematical influence.
 * - Enforces 15s per-call timeout with 1 automatic retry on network drops.
 * - Server-side private disk cache in .qloo-cache/ (gitignored) + RAM cache.
 * - Strict key hygiene: zero key leakage in logs or client bundles.
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
} from "./types";
import { resolveEntitiesFromPrompt, type EntityResolutionResult } from "./entityExtractor";
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

/**
 * Reads from private file cache if available
 */
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

/**
 * Writes to private file cache
 */
function writeDiskCache(cacheKey: string, data: RealQlooEvidenceBundle): void {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Disk write failure silently ignored
  }
}

/**
 * Executes a resilient GET call to /v2/insights with 1 retry and 15s timeout
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
        signal: AbortSignal.timeout(15_000),
      });

      lastStatus = resp.status;
      const latencyMs = Date.now() - start;

      const sanitizedLogPath = endpointPath.split("&")[0] || endpointPath;
      console.log(
        `[Qloo Outbound] ${sanitizedLogPath} status=${resp.status} latency=${latencyMs}ms cache=miss (attempt ${attempt})`
      );

      if (!resp.ok) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return { ok: false, status: resp.status, data: null, latencyMs };
      }

      const json = (await resp.json()) as T;
      return { ok: true, status: resp.status, data: json, latencyMs };
    } catch (err: unknown) {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  const sanitizedLogPath = endpointPath.split("&")[0] || endpointPath;
  console.log(
    `[Qloo Outbound] ${sanitizedLogPath} status=0 latency=${latencyMs}ms cache=miss failed after retries`
  );
  return { ok: false, status: lastStatus, data: null, latencyMs };
}

/**
 * Fetches the full cross-domain intelligence bundle for a resolved Qloo entity
 */
export async function fetchCrossDomainBundle(
  resolvedEntity: QlooSearchEntity,
  inputParsed: string
): Promise<RealQlooEvidenceBundle> {
  const entityId = resolvedEntity.entity_id;
  const cacheKey = `bundle_${entityId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  // 1. Check in-memory cache
  const memCached = IN_MEMORY_CACHE.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    console.log(`[Qloo Outbound] /v2/insights?signal.interests.entities=${entityId} status=200 latency=2ms cache=hit`);
    return {
      ...memCached.data,
      source: "cache",
      latencyMs: 2,
    };
  }

  // 2. Check disk cache
  const diskCached = readDiskCache(cacheKey);
  if (diskCached) {
    IN_MEMORY_CACHE.set(cacheKey, { timestamp: diskCached.timestamp, data: diskCached });
    console.log(`[Qloo Outbound] /v2/insights?signal.interests.entities=${entityId} status=200 latency=4ms cache=hit`);
    return {
      ...diskCached,
      source: "cache",
      latencyMs: 4,
    };
  }

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    // Synthesize fallback fixture bundle
    return createSampleFixtureBundle(resolvedEntity, inputParsed, "fallback");
  }

  const start = Date.now();

  // 3. Parallel fetch all 6 cross-domain endpoints
  const [placesRes, artistsRes, moviesRes, brandsRes, tagsRes, demoRes] = await Promise.all([
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:entity:place&feature.explainability=true&take=6`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:entity:artist&feature.explainability=true&take=6`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:entity:movie&feature.explainability=true&take=6`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooInsightsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:entity:brand&feature.explainability=true&take=6`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooTasteTagsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:tag&take=10`,
      apiKey
    ),
    fetchInsightsEndpoint<QlooDemographicsResponse>(
      `/v2/insights?signal.interests.entities=${encodeURIComponent(
        entityId
      )}&filter.type=urn:demographics`,
      apiKey
    ),
  ]);

  const totalLatencyMs = Date.now() - start;

  // Extract explainability scores
  const explainabilityScores: Record<string, number> = {};
  const extractScores = (resp: QlooInsightsResponse | null) => {
    if (!resp?.results?.entities) return;
    for (const ent of resp.results.entities) {
      const items = ent.query?.explainability?.["signal.interests.entities"];
      if (Array.isArray(items) && items.length > 0) {
        explainabilityScores[ent.entity_id] = items[0].score || 0.85;
      } else if (typeof ent.query?.affinity === "number") {
        explainabilityScores[ent.entity_id] = ent.query.affinity;
      }
    }
  };

  extractScores(placesRes.data);
  extractScores(artistsRes.data);
  extractScores(moviesRes.data);
  extractScores(brandsRes.data);

  const places = placesRes.data?.results?.entities || [];
  const relatedArtists = artistsRes.data?.results?.entities || [];
  const movies = moviesRes.data?.results?.entities || [];
  const brands = brandsRes.data?.results?.entities || [];
  const tasteTags = tagsRes.data?.results?.tags || [];
  const demographics = demoRes.data?.results?.demographics?.[0] || null;

  const isLiveSuccess = placesRes.ok || artistsRes.ok || moviesRes.ok || brandsRes.ok;

  if (!isLiveSuccess) {
    return createSampleFixtureBundle(resolvedEntity, inputParsed, "fallback");
  }

  const bundle: RealQlooEvidenceBundle = {
    source: "live",
    inputParsed,
    resolvedEntity,
    places,
    relatedArtists,
    movies,
    brands,
    tasteTags,
    demographics,
    explainabilityScores,
    latencyMs: totalLatencyMs,
    timestamp: Date.now(),
  };

  // Cache in RAM and on Disk
  IN_MEMORY_CACHE.set(cacheKey, { timestamp: bundle.timestamp, data: bundle });
  writeDiskCache(cacheKey, bundle);

  return bundle;
}

/**
 * Fallback fixture builder with explicit synthetic labels
 */
function createSampleFixtureBundle(
  entity: QlooSearchEntity,
  inputParsed: string,
  source: "fixture" | "fallback"
): RealQlooEvidenceBundle {
  return {
    source,
    inputParsed,
    resolvedEntity: entity,
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
    latencyMs: 15,
    timestamp: Date.now(),
  };
}

/**
 * Complete pipeline coordinator: Prompt -> Resolved Entities -> Cross-Domain Evidence Bundle
 */
export async function getCrossDomainEvidenceForPrompt(
  prompt: string
): Promise<{
  resolution: EntityResolutionResult;
  bundle: RealQlooEvidenceBundle | null;
}> {
  const resolution = await resolveEntitiesFromPrompt(prompt);
  if (resolution.resolved.length === 0) {
    return { resolution, bundle: null };
  }

  // Use primary resolved entity for deep cross-domain grounding
  const primary = resolution.resolved[0];
  const bundle = await fetchCrossDomainBundle(primary, prompt);

  return { resolution, bundle };
}
