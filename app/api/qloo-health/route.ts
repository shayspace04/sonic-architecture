export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { testQlooHealth } from "@/lib/qloo/client";

interface CachedHealth {
  data: Awaited<ReturnType<typeof testQlooHealth>> & { cached?: boolean; ageMs?: number };
  cachedAt: number;
}

const SERVER_HEALTH_CACHE_TTL_MS = 60_000; // 60 seconds server-side cache for UI polling
let serverHealthCache: CachedHealth | null = null;

/**
 * GET /api/qloo-health
 *
 * Implements Requirement 9:
 * - Caches health checks server-side for 60 seconds for periodic UI polling.
 * - If `?nocache=1` or `?uncached=true` or header `Cache-Control: no-cache` is provided,
 *   bypasses server cache and executes an uncached live check for verification.
 * - NEVER exposes QLOO_API_KEY.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bypassCache =
    url.searchParams.get("nocache") === "1" ||
    url.searchParams.get("uncached") === "true" ||
    req.headers.get("cache-control")?.includes("no-cache") ||
    req.headers.get("pragma")?.includes("no-cache");

  const now = Date.now();

  // Return server-side cached health if valid and not explicitly bypassed
  if (!bypassCache && serverHealthCache && now - serverHealthCache.cachedAt < SERVER_HEALTH_CACHE_TTL_MS) {
    return NextResponse.json({
      ...serverHealthCache.data,
      cached: true,
      ageMs: now - serverHealthCache.cachedAt,
    });
  }

  // Execute uncached check
  const result = await testQlooHealth();

  if (!bypassCache) {
    serverHealthCache = {
      data: result,
      cachedAt: now,
    };
  }

  return NextResponse.json({
    ...result,
    cached: false,
  });
}
