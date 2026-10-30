import { NextResponse } from "next/server";
import { enrichPayloadWithKnowledge } from "@/lib/enrichment";
import { buildSceneSpecFromPayload } from "@/lib/scene-spec";
import { applyTargetedRevision } from "@/lib/revisions";
import { generateSceneComparison } from "@/lib/compare/sceneGenerator";
import { getCrossDomainEvidenceForPrompt } from "@/lib/qloo/pipeline";
import { getQlooCacheAdapter } from "@/lib/qloo/cache";
import type {
  ResolvedEntity,
  SceneSpec,
  QuotaInfo,
  QlooContext,
  QlooContextEntity,
} from "@/lib/types";
import type { ComprehensiveResolutionResult } from "@/lib/qloo/entityExtractor";
import type { RealQlooEvidenceBundle, TraceStep } from "@/lib/qloo/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function assembleFinalResponse(
  prompt: string,
  resolution: ComprehensiveResolutionResult,
  bundle: RealQlooEvidenceBundle | null
) {
  const resolvedEntities: ResolvedEntity[] = resolution.resolved.map((item) => ({
    id: item.entity_id,
    name: item.name,
    type: item.types?.[0] || item.type || "cultural_entity",
    searchTerm: prompt.slice(0, 40),
  }));

  const qlooErrors: string[] = resolution.unresolved.map(
    (u) => `Candidate "${u.name}" unresolved: ${u.reason}`
  );

  const payload = enrichPayloadWithKnowledge(
    prompt,
    resolvedEntities,
    bundle
      ? {
          genreTags: bundle.tasteTags.map((t) => t.name),
          styleTags: bundle.brands.map((b) => b.name),
          themeTags: bundle.movies.map((m) => m.name),
          adjectives: bundle.tasteTags.slice(0, 4).map((t) => t.name.toLowerCase()),
        }
      : undefined,
    qlooErrors
  );

  // Grounded Qloo Context with truthful provenance and source
  const liveEntities: QlooContextEntity[] = resolution.resolved.map((e) => ({
    id: e.entity_id,
    name: e.name,
    type: e.types?.[0] || e.type || "cultural_entity",
    signals: ["verified_qloo_taste_graph"],
    provenance:
      resolution.source === "live" || resolution.source === "cache"
        ? "qloo-evidence"
        : "sample-fixture",
  }));

  if (bundle) {
    if (bundle.places.length > 0) {
      const topPlace = bundle.places[0];
      const isLivePlace = (topPlace.source === "live" || topPlace.source === "cache") && !topPlace.name?.includes("(Sample fixture)");
      if (isLivePlace) {
        liveEntities.push({
          id: topPlace.entity_id,
          name: topPlace.name,
          type: "venue",
          signals: [topPlace.properties?.description?.slice(0, 60) || "spatial_venue_reference"],
          provenance: "qloo-evidence",
        });
      }
    }
    if (bundle.brands.length > 0) {
      const topBrand = bundle.brands[0];
      const isLiveBrand = (topBrand.source === "live" || topBrand.source === "cache") && !topBrand.name?.includes("(Sample fixture)");
      if (isLiveBrand) {
        liveEntities.push({
          id: topBrand.entity_id,
          name: topBrand.name,
          type: "brand",
          signals: ["material_and_equipment_standard"],
          provenance: "qloo-evidence",
        });
      }
    }
  }

  const hasLiveSignal = liveEntities.length > 0 || (resolution.matchedTags && resolution.matchedTags.length > 0);
  const liveContext: QlooContext | undefined =
    hasLiveSignal
      ? {
          prompt,
          entities: liveEntities,
          culturalEvidence: bundle
            ? {
                genreTags: bundle.tasteTags.map((t) => t.name),
                styleTags: bundle.brands.map((b) => b.name),
                themeTags: bundle.movies.map((m) => m.name),
                adjectives: bundle.tasteTags.slice(0, 4).map((t) => t.name.toLowerCase()),
              }
            : undefined,
          source: resolution.source,
          qlooCallsUsed: resolution.totalCalls + (bundle?.source === "live" ? 6 : 0),
          unresolved: resolution.unresolved,
          crossDomainBundle: bundle,
        }
      : undefined;

  const comparison = generateSceneComparison({
    prompt,
    forcedContext: liveContext,
  });
  comparison.source = resolution.source;

  const sceneSpec = comparison.grounded;
  sceneSpec.qlooSource = resolution.source;
  if (sceneSpec.qloo_evidence) {
    sceneSpec.qloo_evidence.source = resolution.source;
  }

  delete (sceneSpec as any).comparison;
  delete (comparison.baseline as any).comparison;
  delete (comparison.grounded as any).comparison;

  return {
    ...payload,
    source: resolution.source,
    scene: sceneSpec,
    sceneSpec,
    qloo_evidence: sceneSpec.qloo_evidence,
    comparison,
    unresolved: resolution.unresolved,
    matchedTags: resolution.matchedTags,
    unmatchedConcepts: resolution.unmatchedConcepts,
    bundle,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt: string = (body?.prompt || "").trim();
    const existingScene: SceneSpec | undefined = body?.existingScene;
    const revisionInstruction: string | undefined = body?.revisionInstruction;

    if (existingScene && revisionInstruction) {
      const revisedScene = applyTargetedRevision(existingScene, revisionInstruction);
      return NextResponse.json({
        revised: true,
        sceneSpec: revisedScene,
      });
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Please provide a spatial design prompt." },
        { status: 400 }
      );
    }

    // Requirement 3: Check KV / server cache for pre-warmed starter prompt
    const starterSlug = `starter_${prompt.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").slice(0, 60)}`;
    const cacheAdapter = getQlooCacheAdapter();
    const prewarmed = (await cacheAdapter.get(starterSlug)) as any;
    if (prewarmed && prewarmed.scene) {
      console.log(`[Qloo KV] Starter prompt served directly from KV: "${prompt}" (<10ms)`);
      return NextResponse.json({
        ...prewarmed,
        source: "cache",
      });
    }

    const urlObj = new URL(req.url);
    const wantsStream = urlObj.searchParams.get("stream") === "true";

    // SSE Streaming Mode
    if (wantsStream) {
      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();

      const emitEvent = async (event: string, data: any) => {
        try {
          await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Reader disconnected
        }
      };

      (async () => {
        try {
          const { resolution, bundle } = await getCrossDomainEvidenceForPrompt(prompt, (step: TraceStep) => {
            emitEvent("trace", step);
          });
          const result = assembleFinalResponse(prompt, resolution, bundle);
          await emitEvent("complete", result);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unexpected generation error";
          await emitEvent("error", { error: message });
        } finally {
          await writer.close();
        }
      })();

      return new Response(responseStream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Standard JSON Mode
    const { resolution, bundle } = await getCrossDomainEvidenceForPrompt(prompt);
    const result = assembleFinalResponse(prompt, resolution, bundle);
    try {
      await cacheAdapter.set(starterSlug, result as any, 24 * 60 * 60 * 1000);
    } catch {}
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
