import { NextResponse } from "next/server";
import { testQlooHealth } from "@/lib/qloo/client";

/**
 * GET /api/qloo-health
 *
 * Makes one minimal real Qloo call to verify connectivity, latency, and status.
 * NEVER prints, logs, or returns the QLOO_API_KEY.
 *
 * Returns: { ok: boolean, status: number, latencyMs: number, source: "live" | "fallback" }
 */
export async function GET() {
  const result = await testQlooHealth();
  return NextResponse.json(result);
}
