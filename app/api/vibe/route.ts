import { NextResponse } from "next/server";
import type { VibePayload } from "@/lib/types";
import { parseTasteTerms, MAX_INPUT_LENGTH } from "@/lib/terms";
import { mapFromEvidence, neutralSpatialMapping } from "@/lib/spatial-rules";
import { localFallbackPayload } from "@/lib/fallback";
import { TtlCache } from "@/lib/qloo/cache";
import { UsageTracker } from "@/lib/qloo/usage";
import { collectProfile, hasAnyEvidence } from "@/lib/qloo/profile";

/**
 * Qloo quota protection (server-side):
 * - Bounded TTL response cache + single-flight dedupe (module scope = one
 *   instance per server process; see ARCHITECTURE.md for limitations).
 * - Application request ceiling (`QLOO_APP_MONTHLY_BUDGET`, default 9000,
 *   clamped below the upstream `x-month-ratelimit-limit: 10000`) enforced
 *   before every upstream attempt — never a client-side counter.
 * - When the budget is exhausted or Qloo fails, the existing honest
 *   `local-fallback` payload is returned, provenance unchanged.
 * - Upstream quota metadata (`x-month-ratelimit-*`) is attached to the
 *   payload only when this request actually received it.
 * - Logs are content-free: cache kind, counts, statuses — no keys, no URLs
 *   with user terms, no authorization headers.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SEARCH_TTL_MS = intEnv("QLOO_CACHE_TTL_SEARCH_S", 86400) * 1000; // 24 h
const INSIGHTS_TTL_MS = intEnv("QLOO_CACHE_TTL_INSIGHTS_S", 43200) * 1000; // 12 h
const CACHE_MAX_ENTRIES = intEnv("QLOO_CACHE_MAX_ENTRIES", 500);

const cache = new TtlCache<Record<string, unknown>>({ maxEntries: CACHE_MAX_ENTRIES });
const usage = new UsageTracker();

export async function POST(request: Request) {
  let body: { userInput?: unknown; sliderVal?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawInput = typeof body.userInput === "string" ? body.userInput.slice(0, MAX_INPUT_LENGTH) : "";
  const submittedTerms = parseTasteTerms(rawInput);

  if (submittedTerms.length === 0) {
    return NextResponse.json(
      { error: "Enter at least one cultural reference — an artist, film, place, genre, or mood." },
      { status: 400 }
    );
  }

  const qlooApiUrl = process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";
  const qlooApiKey = process.env.QLOO_API_KEY;

  if (!qlooApiKey) {
    return NextResponse.json(localFallbackPayload(submittedTerms, ["QLOO_API_KEY is not configured on the server."]));
  }

  if (usage.exhausted) {
    // Application ceiling hit: no upstream request is made at all.
    usage.logSummary("budget-exhausted");
    return NextResponse.json(
      localFallbackPayload(
        submittedTerms,
        ["Application request budget exhausted; upstream Qloo was not called."],
        [
          "The server's configured request budget (set below the upstream monthly quota) is exhausted for this process; showing a labeled local fallback.",
        ]
      )
    );
  }

  const collection = await collectProfile(submittedTerms, {
    qlooApiUrl,
    qlooApiKey,
    cache,
    usage,
    ttl: { searchMs: SEARCH_TTL_MS, insightsMs: INSIGHTS_TTL_MS },
  });

  const errors = [...collection.errors];

  if (collection.resolved.length === 0) {
    if (collection.budgetExhausted) {
      usage.logSummary("budget-exhausted-mid-profile");
      return NextResponse.json(
        localFallbackPayload(
          submittedTerms,
          [...errors, "No cultural references could be resolved before the application request budget was exhausted."],
          [
            "The server's configured request budget (set below the upstream monthly quota) is exhausted for this process; showing a labeled local fallback.",
          ]
        )
      );
    }
    return NextResponse.json(
      localFallbackPayload(submittedTerms, [...errors, "No cultural references could be resolved in Qloo."])
    );
  }

  const { resolved, unresolvedTerms, mergedEvidence, artists, insightsOk, insightsFailed, typeCount } = collection;

  const anchorNames = resolved.map((e) => e.name);
  const mapping = hasAnyEvidence(mergedEvidence)
    ? mapFromEvidence(mergedEvidence, anchorNames)
    : neutralSpatialMapping(anchorNames);

  let source: "qloo" | "qloo-partial" | "local-fallback" = mapping.source;
  if (insightsOk === 0) source = "qloo-partial";
  const partial = unresolvedTerms.length > 0 || insightsFailed > 0 || insightsOk < typeCount;

  const limitations: string[] = [];
  if (artists.length > 0) {
    limitations.push("Qloo insights returned artist entities, not individual tracks. No track titles or playback are claimed.");
  } else {
    limitations.push("Qloo returned no music entities for this profile; the soundtrack section will be empty by design.");
  }
  if (unresolvedTerms.length > 0) {
    limitations.push(`Some references could not be resolved: ${unresolvedTerms.join(", ")}.`);
  }
  if (!hasAnyEvidence(mergedEvidence)) {
    limitations.push("No structured affinity tags were returned; the design uses neutral defaults (qloo-partial).");
  }

  const tracks = artists.map((a) => ({ title: a.name, artist: "" }));

  const payload: VibePayload = {
    primaryColorHex: mapping.primaryColorHex,
    accentColorHex: mapping.accentColorHex,
    lightingTemperatureK: mapping.lightingTemperatureK,
    flooringMaterial: mapping.flooringMaterial,
    seatingFabric: mapping.seatingFabric,
    tracks,
    menu:
      artists.length > 0
        ? `Qloo insights returned ${artists.length} artist(s) across ${resolved.length} resolved reference(s).`
        : `Qloo insights returned no music entities for ${resolved.length} resolved reference(s).`,
    fallback: false,
    reasoning: {
      source,
      evidence: mapping.evidence,
      rules: mapping.rules,
    },
    partial,
    submittedTerms,
    entities: resolved,
    unresolvedTerms,
    evidence: mergedEvidence,
    artists,
    concept: mapping.concept,
    limitations,
    errors,
    // Additive, optional: only present when this request actually received
    // quota headers from Qloo (absent on fully-cached runs).
    ...(collection.quota
      ? { quota: { ...collection.quota, observedAt: new Date().toISOString() } }
      : {}),
  };

  usage.logSummary(`profile upstream=${collection.upstreamCalls} resolved=${resolved.length}`);
  return NextResponse.json(payload);
}
