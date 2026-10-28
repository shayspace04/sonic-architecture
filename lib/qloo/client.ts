/**
 * Sonic Architecture — Centralized Safe Qloo Client & Outbound Logger
 * (/lib/qloo/client.ts)
 *
 * Implements:
 * 1. Strict key hygiene: NEVER logs, prints, or exposes QLOO_API_KEY in client or server output.
 * 2. Mandatory server-side telemetry: logs [Qloo Outbound] <path> status=<status> latency=<ms> cache=<hit|miss>.
 * 3. Exact Source Tracking: outputs source: "live" | "cache" | "fixture" | "fallback".
 * 4. Automatic TTL Cache (15 min) to protect API quotas.
 */

import type { QlooContext, ResolvedEntity, CulturalEvidence } from "@/lib/types";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";

export type QlooDataSource = "live" | "cache" | "fixture" | "fallback";

export interface QlooEntityResult {
  id: string;
  name: string;
  type: string;
  searchTerm?: string;
  signals?: string[];
  confidence?: number;
}

export interface QlooFetchResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  source: QlooDataSource;
  entities: QlooEntityResult[];
  quota?: {
    limit?: number;
    remaining?: number;
    reset?: number;
  };
  error?: string;
}

interface CacheEntry {
  timestamp: number;
  data: QlooFetchResult;
}

const OUTBOUND_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

export function clearQlooCache(): void {
  OUTBOUND_CACHE.clear();
}

const QLOO_BASE_URL = "https://hackathon.api.qloo.com";

/**
 * Executes a safe outbound search request to Qloo with latency & cache logging.
 * NEVER prints or logs the API key anywhere.
 */
export async function executeQlooSearch(
  query: string,
  take = 5
): Promise<QlooFetchResult> {
  const cleanQuery = (query || "").trim();
  const cacheKey = `search:${cleanQuery.toLowerCase().slice(0, 80)}:${take}`;

  // 1. Check in-memory cache
  const cached = OUTBOUND_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const latencyMs = 2;
    console.log(
      `[Qloo Outbound] /search status=200 latency=${latencyMs}ms cache=hit`
    );
    return {
      ...cached.data,
      source: "cache",
      latencyMs,
    };
  }

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    console.log(
      `[Qloo Outbound] /search status=0 latency=0ms cache=miss (API key missing; using fixture/fallback)`
    );
    // Return sample fixture if prompt matches a known fixture, else fallback
    const fixture = getQlooFixture(cleanQuery);
    if (fixture) {
      return {
        ok: true,
        status: 200,
        latencyMs: 15,
        source: "fixture",
        entities: fixture.entities.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          signals: e.signals,
          confidence: 0.95,
        })),
      };
    }
    return {
      ok: false,
      status: 0,
      latencyMs: 0,
      source: "fallback",
      entities: [],
      error: "QLOO_API_KEY is not configured",
    };
  }

  const start = Date.now();
  const sanitizedQuery = cleanQuery.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
  const endpointPath = `/search?query=${encodeURIComponent(
    sanitizedQuery.slice(0, 80)
  )}&take=${take}`;
  const fullUrl = `${QLOO_BASE_URL}${endpointPath}`;

  try {
    const resp = await fetch(fullUrl, {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(14000),
    });

    const latencyMs = Date.now() - start;
    console.log(
      `[Qloo Outbound] /search status=${resp.status} latency=${latencyMs}ms cache=miss`
    );

    const limitH = resp.headers.get("x-ratelimit-limit");
    const remainingH = resp.headers.get("x-ratelimit-remaining");
    const resetH = resp.headers.get("x-ratelimit-reset");
    const quota =
      limitH || remainingH
        ? {
            limit: limitH ? parseInt(limitH, 10) : undefined,
            remaining: remainingH ? parseInt(remainingH, 10) : undefined,
            reset: resetH ? parseInt(resetH, 10) : undefined,
          }
        : undefined;

    if (!resp.ok) {
      // If 429 quota exhausted or auth error, fall back to fixture
      const fixture = getQlooFixture(cleanQuery);
      return {
        ok: false,
        status: resp.status,
        latencyMs,
        source: fixture ? "fixture" : "fallback",
        entities: fixture
          ? fixture.entities.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              signals: e.signals,
            }))
          : [],
        quota,
        error: `Qloo API HTTP ${resp.status}`,
      };
    }

    const json = await resp.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    const entities: QlooEntityResult[] = [];
    for (const item of results.slice(0, take)) {
      if (item?.entity_id && item?.name) {
        entities.push({
          id: String(item.entity_id),
          name: String(item.name),
          type: String(item.types?.[0] || item.type || "cultural_entity"),
          confidence: typeof item.confidence === "number" ? item.confidence : 0.95,
        });
      }
    }

    const result: QlooFetchResult = {
      ok: true,
      status: resp.status,
      latencyMs,
      source: entities.length > 0 ? "live" : "fallback",
      entities,
      quota,
    };

    if (entities.length > 0) {
      OUTBOUND_CACHE.set(cacheKey, {
        timestamp: Date.now(),
        data: result,
      });
    }

    return result;
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const cause = err instanceof Error && err.cause ? ` (${(err.cause as any)?.code || (err.cause as any)?.message || err.cause})` : "";
    const msg = (err instanceof Error ? err.message : "timeout") + cause;
    console.log(
      `[Qloo Outbound] /search status=0 latency=${latencyMs}ms cache=miss error=${msg}`
    );

    const fixture = getQlooFixture(cleanQuery);
    return {
      ok: false,
      status: 0,
      latencyMs,
      source: fixture ? "fixture" : "fallback",
      entities: fixture
        ? fixture.entities.map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            signals: e.signals,
          }))
        : [],
      error: `Qloo request failed: ${msg}`,
    };
  }
}

/**
 * Health check endpoint runner: minimal single request
 */
export async function testQlooHealth(): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  source: QlooDataSource;
  message?: string;
}> {
  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      latencyMs: 0,
      source: "fallback",
      message: "QLOO_API_KEY is not configured",
    };
  }

  const start = Date.now();
  try {
    const resp = await fetch(`${QLOO_BASE_URL}/search?query=health&take=1`, {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(14000),
    });
    const latencyMs = Date.now() - start;
    console.log(
      `[Qloo Outbound] /search?query=health status=${resp.status} latency=${latencyMs}ms cache=miss`
    );

    return {
      ok: resp.ok,
      status: resp.status,
      latencyMs,
      source: resp.ok ? "live" : "fallback",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const cause = err instanceof Error && err.cause ? ` (${(err.cause as any)?.code || (err.cause as any)?.message || err.cause})` : "";
    const msg = (err instanceof Error ? err.message : "timeout") + cause;
    console.log(
      `[Qloo Outbound] /search?query=health status=0 latency=${latencyMs}ms cache=miss error=${msg}`
    );
    return {
      ok: false,
      status: 0,
      latencyMs,
      source: "fallback",
      message: msg,
    };
  }
}
