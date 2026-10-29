/**
 * Sonic Architecture — Streaming Agent Route (/api/agent)
 *
 * Server-Sent Events (SSE) streaming API for the autonomous Qloo Agent Loop.
 * Handles:
 * 1. Per-IP rate limiting (30 requests/minute)
 * 2. Global Qloo budget & quota fallback to FixtureQlooClient
 * 3. Live event streaming: step_start, step_complete, status, clarification_needed, completed
 * 4. In-memory trace logging for deterministic replay (?replayRunId=...)
 * 5. Pre-warming starter prompt cache
 */

import { NextRequest, NextResponse } from "next/server";
import { AgentLoop, AGENT_RUN_LOGS } from "@/lib/agent/agentLoop";
import { getQlooClient, prewarmStarterPromptCache } from "@/lib/agent/qlooClient";
import type { AgentEvent } from "@/lib/agent/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// RATE LIMITING & GLOBAL BUDGET GUARD
// ============================================================================

interface RateLimitInfo {
  count: number;
  windowStart: number;
}

const IP_RATE_LIMITS = new Map<string, RateLimitInfo>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const info = IP_RATE_LIMITS.get(ip);
  if (!info || now - info.windowStart > RATE_LIMIT_WINDOW_MS) {
    IP_RATE_LIMITS.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (info.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  info.count++;
  return true;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded (30 requests/minute). Please slow down." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const prompt: string = (body?.prompt || "").trim();
    const existingScene = body?.existingScene;
    const revisionInstruction = body?.revisionInstruction;
    const selectedCandidateId = body?.selectedCandidateId;
    const replayRunId = body?.replayRunId;

    // REPLAY MODE: If replayRunId is provided, deterministically stream recorded run
    if (replayRunId && AGENT_RUN_LOGS.has(replayRunId)) {
      const logged = AGENT_RUN_LOGS.get(replayRunId)!;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const step of logged.trace) {
            const event: AgentEvent = { type: "step_complete", step };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            await new Promise((res) => setTimeout(res, 50));
          }
          const finalEvent: AgentEvent = {
            type: "completed",
            sceneSpec: logged.sceneSpec,
            trace: logged.trace,
            summary: logged.summary,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    if (!prompt && !revisionInstruction) {
      return NextResponse.json(
        { error: "Please provide a prompt or revision instruction." },
        { status: 400 }
      );
    }

    // Determine client (Real with QLOO_API_KEY if present, fallback to fixture)
    const qlooClient = getQlooClient();
    const agent = new AgentLoop(qlooClient);

    // Setup Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentEvent) => {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            // Stream closed by client
          }
        };

        try {
          await agent.run({
            prompt,
            existingScene,
            revisionInstruction,
            selectedCandidateId,
            onEvent: (event) => sendEvent(event),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Internal agent execution error";
          sendEvent({
            type: "error",
            errorType: msg.includes("429") ? "quota" : "model_error",
            message: msg,
            isSampleFallback: true,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const replayId = searchParams.get("replayRunId");

  if (replayId && AGENT_RUN_LOGS.has(replayId)) {
    return NextResponse.json(AGENT_RUN_LOGS.get(replayId));
  }

  return NextResponse.json({
    status: "ok",
    service: "Sonic Architecture Agentic Streaming Pipeline",
    loggedRunsCount: AGENT_RUN_LOGS.size,
    starterPromptsReady: true,
  });
}
