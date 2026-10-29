export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { testQlooHealth } from "@/lib/qloo/client";

/**
 * GET /api/qloo-health/uncached
 *
 * Dedicated strictly uncached route for deployment verification and health monitoring.
 * Always executes a direct outbound call to Qloo API.
 * NEVER prints, logs, or returns the QLOO_API_KEY.
 */
export async function GET() {
  const result = await testQlooHealth();
  return NextResponse.json({
    ...result,
    cached: false,
    verifiedAt: Date.now(),
  });
}
