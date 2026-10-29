import { NextResponse } from "next/server";
import { enrichPayloadWithKnowledge } from "@/lib/enrichment";
import { buildSceneSpecFromPayload } from "@/lib/scene-spec";
import { applyTargetedRevision } from "@/lib/revisions";
import { generateSceneComparison } from "@/lib/compare/sceneGenerator";
import { getCrossDomainEvidenceForPrompt } from "@/lib/qloo/pipeline";
import { triggerServerPrewarm } from "@/lib/qloo/prewarmer";
import type { ResolvedEntity, SceneSpec, QuotaInfo, QlooContext, QlooContextEntity } from "@/lib/types";

export const dynamic = "force-dynamic";

// Initialize background pre-warm on module load
triggerServerPrewarm();

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

    // Execute full Phase C cross-domain extraction and parallel insights pipeline
    const { resolution, bundle } = await getCrossDomainEvidenceForPrompt(prompt);

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

    // Augment with top places & brands from cross-domain bundle if available
    if (bundle) {
      if (bundle.places.length > 0) {
        const topPlace = bundle.places[0];
        liveEntities.push({
          id: topPlace.entity_id,
          name: topPlace.name,
          type: "venue",
          signals: [topPlace.properties?.description?.slice(0, 60) || "spatial_venue_reference"],
          provenance: bundle.source === "live" || bundle.source === "cache" ? "qloo-evidence" : "sample-fixture",
        });
      }
      if (bundle.brands.length > 0) {
        const topBrand = bundle.brands[0];
        liveEntities.push({
          id: topBrand.entity_id,
          name: topBrand.name,
          type: "brand",
          signals: ["material_and_equipment_standard"],
          provenance: bundle.source === "live" || bundle.source === "cache" ? "qloo-evidence" : "sample-fixture",
        });
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

    // The grounded scene is the modulated output reflecting Qloo signals
    const sceneSpec = comparison.grounded;
    sceneSpec.qlooSource = resolution.source;
    if (sceneSpec.qloo_evidence) {
      sceneSpec.qloo_evidence.source = resolution.source;
    }

    // Make sure neither scene carries a comparison field (prevents cycle)
    delete (sceneSpec as any).comparison;
    delete (comparison.baseline as any).comparison;
    delete (comparison.grounded as any).comparison;

    return NextResponse.json({
      ...payload,
      source: resolution.source,
      scene: sceneSpec,
      sceneSpec,
      qloo_evidence: sceneSpec.qloo_evidence,
      comparison,
      unresolved: resolution.unresolved,
      matchedTags: resolution.matchedTags,
      unmatchedConcepts: resolution.unmatchedConcepts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
