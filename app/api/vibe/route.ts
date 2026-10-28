import { NextResponse } from "next/server";
import { enrichPayloadWithKnowledge } from "@/lib/enrichment";
import { buildSceneSpecFromPayload } from "@/lib/scene-spec";
import { applyTargetedRevision } from "@/lib/revisions";
import { generateSceneComparison } from "@/lib/compare/sceneGenerator";
import { executeQlooSearch } from "@/lib/qloo/client";
import type { ResolvedEntity, SceneSpec, QuotaInfo, QlooContext } from "@/lib/types";

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

    // Execute safe, instrumented Qloo search with server-side latency & cache logging
    const searchResult = await executeQlooSearch(prompt, 4);

    const resolvedEntities: ResolvedEntity[] = searchResult.entities.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      searchTerm: prompt.slice(0, 40),
    }));

    const qlooErrors: string[] = searchResult.error ? [searchResult.error] : [];
    const quotaInfo: QuotaInfo | undefined = searchResult.quota;

    const payload = enrichPayloadWithKnowledge(
      prompt,
      resolvedEntities,
      undefined,
      qlooErrors
    );
    if (quotaInfo) {
      payload.quota = quotaInfo;
    }

    // Grounded Qloo Context with truthful provenance and source
    const liveContext: QlooContext | undefined =
      resolvedEntities.length > 0
        ? {
            prompt,
            entities: searchResult.entities.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              signals: e.signals && e.signals.length > 0 ? e.signals : ["live_qloo_verified"],
              provenance:
                searchResult.source === "live" || searchResult.source === "cache"
                  ? "qloo-evidence"
                  : "sample-fixture",
            })),
            source: searchResult.source,
            qlooCallsUsed: 1,
          }
        : undefined;

    const comparison = generateSceneComparison({
      prompt,
      forcedContext: liveContext,
    });
    comparison.source = searchResult.source;

    // The grounded scene is the modulated output reflecting Qloo signals
    const sceneSpec = comparison.grounded;
    sceneSpec.qlooSource = searchResult.source;
    if (sceneSpec.qloo_evidence) {
      sceneSpec.qloo_evidence.source = searchResult.source;
    }

    // Make sure neither scene carries a comparison field (prevents cycle)
    delete (sceneSpec as any).comparison;
    delete (comparison.baseline as any).comparison;
    delete (comparison.grounded as any).comparison;

    return NextResponse.json({
      ...payload,
      source: searchResult.source,
      scene: sceneSpec,
      sceneSpec,
      qloo_evidence: sceneSpec.qloo_evidence,
      comparison,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
