/**
 * Sonic Architecture — Step 2: Dedicated `/api/soundtrack` App Router Endpoint
 *
 * Completely independent of `/api/vibe` and existing Qloo quota/caching modules.
 * Accepts a `SceneSpec` (plus optional `qlooSignals` and `forceRefresh`) via `POST`,
 * validates or derives `musicProfile`, verifies candidates against real music catalogs
 * (`ITunesPreviewProvider` + optional `SpotifyEmbedProvider`), caches by
 * `computeSceneMusicHash(scene)` with TTL, and enforces a sliding-window request budget.
 */

import { NextRequest, NextResponse } from "next/server";
import type { SceneSpec, SpatialTypology } from "@/lib/types";
import type { QlooMusicEntityInput } from "@/lib/music-profile";
import { validateMusicProfile } from "@/lib/music-profile";
import { generateVerifiedSoundtrackPlaylist } from "@/lib/soundtrack-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TYPOLOGIES: ReadonlySet<string> = new Set<string>([
  "listening_room",
  "futuristic_launch",
  "cathedral_banquet",
  "mediterranean_courtyard",
  "pavilion_celebration",
  "brutalist_runway",
  "tea_room",
  "grunge_loft",
  "gallery_pavilion",
  "intimate_lounge",
  "garden_mandap",
  "underground_club",
  "industrial_warehouse",
  "coastal_retreat",
  "custom_hybrid",
  // Legacy alias support
  "listening_lounge",
  "zen_tea_pavilion",
  "courtyard_dining",
  "sangeet_courtyard",
  "grunge_loft_party",
  "keynote_pavilion",
]);

interface SoundtrackRequestBody {
  sceneSpec?: Partial<SceneSpec>;
  qlooSignals?: ReadonlyArray<QlooMusicEntityInput>;
  forceRefresh?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSceneSpecInput(raw: unknown): {
  valid: boolean;
  scene?: SceneSpec;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { valid: false, errors: ["Request body must include a `sceneSpec` object."] };
  }

  const typologyRaw = raw.typology;
  if (
    typeof typologyRaw !== "string" ||
    !VALID_TYPOLOGIES.has(typologyRaw)
  ) {
    errors.push(
      `sceneSpec.typology must be one of: ${Array.from(VALID_TYPOLOGIES).join(", ")}.`
    );
  }

  if (!isRecord(raw.roomDimensions)) {
    errors.push("sceneSpec.roomDimensions object is required.");
  }

  if (!isRecord(raw.acousticTarget)) {
    errors.push("sceneSpec.acousticTarget object is required.");
  }

  if (raw.musicProfile !== undefined) {
    const mpValidation = validateMusicProfile(raw.musicProfile);
    if (!mpValidation.valid) {
      errors.push(...mpValidation.errors);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    scene: raw as unknown as SceneSpec,
    errors: [],
  };
}

function resolveClientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.headers.get("x-real-ip") ?? "anonymous-client";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SoundtrackRequestBody;
    const rawScene = body.sceneSpec ?? (body as unknown);

    const validation = validateSceneSpecInput(rawScene);
    if (!validation.valid || !validation.scene) {
      return NextResponse.json(
        {
          error: "Invalid SceneSpec payload for /api/soundtrack",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const clientKey = resolveClientKey(req);

    // Phase C5: Auto-extract Qloo music/artist entities if not provided explicitly in body
    let activeQlooSignals = Array.isArray(body.qlooSignals) ? body.qlooSignals : undefined;
    if (!activeQlooSignals && validation.scene.qloo_evidence?.resolved_entities) {
      activeQlooSignals = validation.scene.qloo_evidence.resolved_entities
        .filter(
          (e) =>
            e.entity_type.includes("artist") ||
            e.entity_type.includes("musician") ||
            e.entity_type.includes("music")
        )
        .map((e) => ({
          name: e.entity_name,
          type: e.entity_type,
          tags: [e.qloo_signal],
        }));
    }

    const playlist = await generateVerifiedSoundtrackPlaylist({
      scene: validation.scene,
      qlooSignals: activeQlooSignals && activeQlooSignals.length > 0 ? activeQlooSignals : undefined,
      clientKey,
      forceRefresh: Boolean(body.forceRefresh),
    });

    return NextResponse.json(playlist, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
        "X-Soundtrack-Cache": playlist.cacheStatus,
        "X-Soundtrack-Provider": playlist.providerUsed,
        "X-Soundtrack-Quota-Remaining": String(playlist.quota.remainingRequests),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected soundtrack pipeline error";
    return NextResponse.json(
      {
        error: "Failed to generate soundtrack playlist",
        details: [message],
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/soundtrack",
    status: "ready",
    methods: ["POST"],
    providers: [
      "ITunesPreviewProvider (free zero-key catalog search + 30s CORS AAC audio previews)",
      "SpotifyEmbedProvider (embed by URI without user login; optional Client Credentials search with limit=5)",
    ],
    provenanceLabels: ["qloo-evidence", "inferred", "fallback"],
  });
}
