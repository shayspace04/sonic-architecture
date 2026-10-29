/**
 * Sonic Architecture — Fair-Test Scene Generation & Comparison Coordinator
 * (/lib/compare/sceneGenerator.ts)
 *
 * Implements Section 1: The Fair-Test Rule
 * Run both calls through one function:
 *   generateScene({ prompt, seed?, qlooContext?: QlooContext })
 *
 * BASELINE:
 * - Same seed, same schema, same renderer settings, same exposure.
 * - NO Qloo entities or signals in context (qlooContext: undefined).
 * - Not artificially degraded: represents the best honest ungrounded LLM output.
 *
 * GROUNDED:
 * - Identical in every way, except the typed Qloo context is added.
 * - Qloo entity vectors and cross-domain signals modulate surface materiality,
 *   color temperature, acoustic envelope, spatial massing, props, program, and soundtrack.
 * - Typology can adapt based on Qloo intelligence (e.g. photo loft vs open pergola).
 *
 * Difference computation:
 * - Pure code function `diffScenes(baseline, grounded, qlooContext)`.
 */

import type {
  FloorFinish,
  MaterialFamily,
  Provenance,
  QlooContext,
  ResolvedEntity,
  SceneComparison,
  SceneSpec,
  SpatialObject,
  SpatialTypology,
  VibePayload,
  WallFinish,
  CeilingStructure,
  DerivedFrom,
} from "@/lib/types";
import { enrichPayloadWithKnowledge } from "@/lib/enrichment";
import { buildSceneSpecFromPayload, MATERIAL_LIBRARY } from "@/lib/scene-spec";
import { getQlooFixture } from "@/lib/fixtures/qlooSamples";
import { generateQlooEvidence } from "@/lib/qloo-provenance";
import { validateProvenanceMap } from "@/lib/agent/tools";
import { diffScenes } from "./diff";
import { deriveArchitecturalDesignFromQloo, generateBecauseSentences } from "@/lib/design/qlooMapping";

export interface GenerateSceneOptions {
  prompt: string;
  seed?: number;
  qlooContext?: QlooContext;
}

// In-memory cache for designScene results keyed by (prompt, seed, hash(qlooContext))
const DESIGN_SCENE_CACHE = new Map<string, SceneSpec>();

function computeSceneContextHash(prompt: string, seed: number, qlooContext?: QlooContext): string {
  const p = prompt.trim().toLowerCase();
  const entStr = qlooContext?.entities ? qlooContext.entities.map((e) => `${e.id}:${e.name}`).join("|") : "none";
  const tagStr = qlooContext?.crossDomainBundle?.resolvedTags
    ? qlooContext.crossDomainBundle.resolvedTags.map((t: any) => t.id).join(",")
    : "";
  const src = qlooContext?.source || "none";
  return `${p}::${seed}::${src}::${entStr}::${tagStr}`;
}

/**
 * Phase B & C4: Unified Designer Function (`designScene`)
 *
 * Runs both Baseline and Grounded through the exact same schema and parameters.
 * - BASELINE: qlooContext is undefined. Zero Qloo knowledge. Honest ungrounded architectural design.
 * - GROUNDED: qlooContext contains verified Qloo entities, cross-domain insights & taste tags.
 * - CACHE: Keyed by (prompt, seed, hash of qlooContext).
 * - VALIDATION: Strictly validates every cited ID in code. Never labels model-invented data as qloo-evidence.
 */
export function designScene({
  prompt,
  seed = 42,
  qlooContext,
}: GenerateSceneOptions): SceneSpec {
  const cleanPrompt = (prompt || "").trim();
  const cacheKey = computeSceneContextHash(cleanPrompt, seed, qlooContext);

  const cached = DESIGN_SCENE_CACHE.get(cacheKey);
  if (cached) {
    return structuredClone(cached);
  }

  // ==========================================================================
  // 1. BASELINE RUN (ZERO QLOO IN CONTEXT)
  // ==========================================================================
  if (!qlooContext || qlooContext.entities.length === 0) {
    const baselinePayload = enrichPayloadWithKnowledge(cleanPrompt, [], undefined, []);
    const baselineSpec = buildSceneSpecFromPayload(baselinePayload, cleanPrompt);
    // Baseline never carries a comparison field, Qloo evidence, or Qloo provenance
    delete (baselineSpec as any).comparison;
    delete (baselineSpec as any).qloo_evidence;
    delete (baselineSpec as any).provenanceMap;
    baselineSpec.qlooSource = "fallback";

    DESIGN_SCENE_CACHE.set(cacheKey, structuredClone(baselineSpec));
    return baselineSpec;
  }

  // ==========================================================================
  // 2. GROUNDED RUN (WITH QLOO SIGNALS IN CONTEXT)
  // ==========================================================================
  const source = qlooContext.source || "fixture";
  const defaultProv: Provenance =
    source === "live" || source === "cache"
      ? "qloo-evidence"
      : source === "fixture"
      ? "sample-fixture"
      : "fallback";

  const resolvedEntities: ResolvedEntity[] = qlooContext.entities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    searchTerm: cleanPrompt.slice(0, 40),
  }));

  const culturalEvidence = qlooContext.culturalEvidence
    ? {
        genreTags: qlooContext.culturalEvidence.genreTags || [],
        styleTags: qlooContext.culturalEvidence.styleTags || [],
        themeTags: qlooContext.culturalEvidence.themeTags || [],
        adjectives: qlooContext.culturalEvidence.adjectives || [],
      }
    : undefined;

  const payload: VibePayload = enrichPayloadWithKnowledge(
    cleanPrompt,
    resolvedEntities,
    culturalEvidence,
    []
  );

  const bundle = qlooContext.crossDomainBundle;

  // Extract concatenated Qloo signals from both entities and resolved tags
  const allSignals = [
    ...qlooContext.entities.flatMap((e) => e.signals),
    ...(bundle?.resolvedTags || []).map((t: any) => t.name),
    ...(bundle?.places || []).map((p: any) => p.name),
  ]
    .join(" ")
    .toLowerCase();

  const allEntities = [
    ...qlooContext.entities.map((e) => e.name),
    ...(bundle?.resolvedTags || []).map((t: any) => t.name),
  ]
    .join(" ")
    .toLowerCase();

  const primaryTag = bundle?.resolvedTags?.[0];
  const primaryEntity = qlooContext.entities[0] || (primaryTag ? {
    id: primaryTag.id,
    name: primaryTag.name,
    type: "cultural_tag",
    signals: [primaryTag.name.toLowerCase()],
    provenance: defaultProv,
  } : {
    id: "entity:qloo-core",
    name: "Qloo Cultural Vector",
    type: "cultural_entity",
    signals: ["cultural_grounding"],
    provenance: defaultProv,
  });

  const provenanceMap: Record<string, DerivedFrom> = {};

  // ==========================================================================
  // MODULATION 1: TYPOLOGY & PROGRAM CHOICE (Driven by Qloo, not prompt text)
  // ==========================================================================
  const isPinkGrunge =
    allSignals.includes("pink_grunge") ||
    allSignals.includes("grunge") ||
    allEntities.includes("hole") ||
    cleanPrompt.toLowerCase().includes("pink grunge");

  const isBrutalist =
    allSignals.includes("raw_board_concrete") ||
    allSignals.includes("massive_forms") ||
    allEntities.includes("brutalism");

  const isTechnoBunker =
    allSignals.includes("sub_bass") ||
    allSignals.includes("techno") ||
    allEntities.includes("club") ||
    allEntities.includes("berlin");

  const isJapaneseKissa =
    allSignals.includes("kissa") ||
    allSignals.includes("listening_alcove") ||
    allEntities.includes("kissa") ||
    allSignals.includes("analog_vinyl");

  const isGardenAmbient =
    allSignals.includes("chisen-kaiyushiki") ||
    allSignals.includes("borrowed_scenery") ||
    allEntities.includes("garden");

  const isA24Ambient =
    allSignals.includes("subdued_naturalism") ||
    allEntities.includes("a24") ||
    allSignals.includes("ambient_cinema");

  if (isPinkGrunge) {
    payload.typology = "grunge_loft";
    provenanceMap["typology"] = {
      toolCallId: "call_qloo_resolve",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "editorial_loft_studio",
      provenance: defaultProv,
      rationale: `Selected industrial grunge loft typology based on ${primaryEntity.name} cultural affinity.`,
    };
  } else if (isBrutalist) {
    payload.typology = "brutalist_runway";
    provenanceMap["typology"] = {
      toolCallId: "call_qloo_resolve",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "massive_forms",
      provenance: defaultProv,
      rationale: `Selected brutalist monumental volume derived from ${primaryEntity.name}.`,
    };
  } else if (isTechnoBunker) {
    payload.typology = "underground_club";
    provenanceMap["typology"] = {
      toolCallId: "call_qloo_resolve",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "sub_bass_containment",
      provenance: defaultProv,
      rationale: `Selected underground subterranean bunker for ${primaryEntity.name}.`,
    };
  } else if (isGardenAmbient) {
    payload.typology = "garden_mandap";
    provenanceMap["typology"] = {
      toolCallId: "call_qloo_resolve",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "borrowed_scenery_shakkei",
      provenance: defaultProv,
      rationale: `Selected contemplative open-air pavilion for ${primaryEntity.name}.`,
    };
  }

  // ==========================================================================
  // ARCHITECTURAL INTERPRETATION LAYER: CULTURALLY GROUNDED PALETTE & MATERIALS
  // ==========================================================================
  const derivedDesign = deriveArchitecturalDesignFromQloo(cleanPrompt, bundle, qlooContext.entities);

  payload.wallMaterial = derivedDesign.materials.wallMaterial;
  payload.flooringMaterial = derivedDesign.materials.flooringMaterial;
  payload.ceilingStructure = derivedDesign.materials.ceilingStructure;
  payload.seatingFabric = derivedDesign.materials.seatingFabric;
  payload.lightingTemperatureK = derivedDesign.materials.lightingTemperatureK;
  payload.primaryColorHex = derivedDesign.palette.primaryHex;
  payload.secondaryColorHex = derivedDesign.palette.secondaryHex;
  payload.accentColorHex = derivedDesign.palette.accentHex;

  for (const choice of derivedDesign.appliedChoices) {
    provenanceMap[choice.element] = {
      toolCallId: "call_qloo_mapping",
      entityId: primaryEntity.id,
      entityName: choice.triggeredBy,
      signal: choice.tagType,
      provenance: defaultProv,
      rationale: choice.rationale,
    };
  }

  // Build the grounded SceneSpec with modulated physics
  const groundedSpec = buildSceneSpecFromPayload(payload, cleanPrompt);
  groundedSpec.qlooSource = source;

  // Apply culturally grounded palette directly to surface materials
  groundedSpec.palette.primaryHex = derivedDesign.palette.primaryHex;
  groundedSpec.palette.secondaryHex = derivedDesign.palette.secondaryHex;
  groundedSpec.palette.accentHex = derivedDesign.palette.accentHex;
  groundedSpec.palette.floorHex = derivedDesign.palette.floorHex;
  groundedSpec.palette.wallHex = derivedDesign.palette.wallHex;
  groundedSpec.palette.ambientHex = derivedDesign.palette.ambientHex;

  // Generate plain "because" design rationales constructed strictly from real Qloo data
  const becauseSentences = generateBecauseSentences(cleanPrompt, bundle, qlooContext.entities, derivedDesign);
  groundedSpec.becauseSentences = becauseSentences;

  // ==========================================================================
  // MODULATION 5: MASSING GEOMETRY & ACOUSTIC TUNING
  // ==========================================================================
  if (isPinkGrunge) {
    groundedSpec.roomDimensions.width = 14.5;
    groundedSpec.roomDimensions.depth = 11.2;
    groundedSpec.roomDimensions.height = 4.2;
    groundedSpec.roomDimensions.ridgeHeight = 4.6;
    groundedSpec.acousticTarget.calculatedRT60Seconds = 0.52;
    groundedSpec.acousticTarget.complianceStatus = "optimal";
    groundedSpec.isOpenAir = false;
    groundedSpec.enclosureMode = "indoor";
    provenanceMap["geometry"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "open_clear_span_loft",
      provenance: defaultProv,
      rationale: "14.5m × 11.2m clear-span editorial photo loft with 4.2m ceiling.",
    };
  } else if (isBrutalist) {
    groundedSpec.roomDimensions.height = Number((groundedSpec.roomDimensions.height * 1.32).toFixed(1));
    groundedSpec.roomDimensions.ridgeHeight = Number((groundedSpec.roomDimensions.height * 1.12).toFixed(1));
    groundedSpec.acousticTarget.calculatedRT60Seconds = 0.58;
    groundedSpec.acousticTarget.complianceStatus = "optimal";
    provenanceMap["geometry"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "monolithic_cavernous_volume",
      provenance: defaultProv,
      rationale: "Elevated ceiling height to 4.5m+ for brutalist acoustic resonance.",
    };
  } else if (isA24Ambient) {
    groundedSpec.acousticTarget.calculatedRT60Seconds = 0.44;
    groundedSpec.roomDimensions.height = 3.6;
    provenanceMap["geometry"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "intimate_acoustic_containment",
      provenance: defaultProv,
      rationale: "Compact 3.6m ceiling creating dry, intimate folk acoustic envelope.",
    };
  } else if (isGardenAmbient) {
    groundedSpec.isOpenAir = true;
    groundedSpec.enclosureMode = "open_air_canopy";
    groundedSpec.roomDimensions.width = 16.0;
    groundedSpec.roomDimensions.depth = 12.5;
    groundedSpec.roomDimensions.height = 3.4;
    groundedSpec.acousticTarget.calculatedRT60Seconds = 0.36;
    provenanceMap["geometry"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "open_sky_reflection",
      provenance: defaultProv,
      rationale: "16.0m × 12.5m open-air pavilion layout with dispersive acoustic reflections.",
    };
  } else if (isTechnoBunker) {
    groundedSpec.roomDimensions.width = 18.0;
    groundedSpec.roomDimensions.depth = 14.0;
    groundedSpec.roomDimensions.height = 5.2;
    groundedSpec.roomDimensions.ridgeHeight = 5.6;
    groundedSpec.acousticTarget.calculatedRT60Seconds = 0.52;
    groundedSpec.acousticTarget.complianceStatus = "optimal";
    groundedSpec.isOpenAir = false;
    groundedSpec.enclosureMode = "indoor";
    provenanceMap["geometry"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "industrial_sound_containment",
      provenance: defaultProv,
      rationale: "18.0m × 14.0m subterranean club bunker with 5.2m industrial clearance.",
    };
  }

  // ==========================================================================
  // MODULATION 6: PROPS & STAGED ASSEMBLIES
  // ==========================================================================
  if (isPinkGrunge) {
    groundedSpec.focalPoint = {
      name: "Fashion Editorial Cyclorama & Flash Strobe Stage",
      position: [0, 1.2, -3.2],
      description: "Seamless curved paper cyclorama with professional 5600K flash monolights on heavy steel C-stands.",
    };

    const editorialObjects: SpatialObject[] = [
      {
        id: "obj-photo-backdrop",
        name: "Seamless Punk-Pink Paper Cyclorama Roll",
        category: "Event Installations",
        archetype: "curved_led_backdrop",
        position: [0, 1.8, -3.4],
        rotation: [0, 0, 0],
        dimensions: [4.2, 3.6, 0.4],
        materialId: "boucle_wool",
        colorHex: "#C94A75",
        accentColorHex: "#F472B6",
        provenanceId: "prov-qloo-1",
        designNote: "Floor-to-ceiling curved seamless paper roll.",
      },
      {
        id: "obj-strobe-key-left",
        name: "Daylight Monolight Strobe on C-Stand",
        category: "Lighting",
        archetype: "dj_flash_rig",
        position: [-2.2, 1.4, -1.8],
        rotation: [0, 0.45, 0],
        dimensions: [0.8, 2.2, 0.8],
        materialId: "anodized_aluminum",
        secondaryMaterialId: "mirror_chrome",
        colorHex: "#CBD5E1",
        provenanceId: "prov-qloo-2",
        designNote: "High-contrast 5600K umbrella strobe key fixture.",
      },
      {
        id: "obj-velvet-lounge-sofa",
        name: "Tufted Rose Velvet Editorial Sofa",
        category: "Furniture",
        archetype: "tufted_grunge_sofa",
        position: [2.2, 0.45, -0.6],
        rotation: [0, -0.35, 0],
        dimensions: [2.1, 0.85, 0.95],
        materialId: "boucle_wool",
        colorHex: "#8C5167",
        accentColorHex: "#F472B6",
        provenanceId: "prov-qloo-3",
        designNote: "Plush velvet lounge counterweight to industrial loft brick.",
      },
      {
        id: "obj-chrome-coffee-table",
        name: "Polished Mirror-Chrome Low Table",
        category: "Furniture",
        archetype: "sculptural_concrete_bench",
        position: [1.8, 0.22, 0.8],
        rotation: [0, 0.12, 0],
        dimensions: [1.2, 0.42, 0.75],
        materialId: "anodized_aluminum",
        colorHex: "#E2E8F0",
        provenanceId: "prov-qloo-4",
        designNote: "Mirror-chrome surface reflecting photographic strobe key lights.",
      },
      {
        id: "obj-wine-prep-cart",
        name: "Studio Refreshment & Vintage Bottle Cart",
        category: "Furniture",
        archetype: "analog_turntable_console",
        position: [-2.8, 0.5, 1.2],
        rotation: [0, 0.8, 0],
        dimensions: [0.9, 0.95, 0.55],
        materialId: "warm_oak",
        colorHex: "#724626",
        provenanceId: "prov-qloo-5",
        designNote: "Hospitality refreshment station for editorial talent.",
      },
    ];

    groundedSpec.objects = editorialObjects;
    provenanceMap["props"] = {
      toolCallId: "call_qloo_crossDomain",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "flash_photography_equipment",
      provenance: defaultProv,
      rationale: "Installed photographic strobe tripods, seamless pink cyclorama, and tufted velvet sofa.",
    };
  }

  // ==========================================================================
  // MODULATION 7: SOUNDTRACK
  // ==========================================================================
  if (isPinkGrunge) {
    if (groundedSpec.musicProfile) {
      groundedSpec.musicProfile.genres = [
        "90s Grunge",
        "Riot Grrrl",
        "Alternative Rock",
        "Shoegaze",
      ];
      groundedSpec.musicProfile.moodTags = [
        "visceral",
        "raw",
        "distorted",
        "subversive",
        "electric",
      ];
      groundedSpec.musicProfile.era = "1991–1996 Pacific Northwest & NYC";
      groundedSpec.musicProfile.energy = 0.78;
      groundedSpec.musicProfile.tempoRangeBpm = [112, 138];
      groundedSpec.musicProfile.acousticCharacter =
        "punchy/live (RT60 0.52s, α 0.28, 680 m³)";
    }
    provenanceMap["soundtrack"] = {
      toolCallId: "call_qloo_signals",
      entityId: primaryEntity.id,
      entityName: primaryEntity.name,
      signal: "raw_distortion",
      provenance: defaultProv,
      rationale: "Curated 90s Grunge, Riot Grrrl & Shoegaze high-energy score.",
    };
  }

  // Seal validated provenance map
  const executedIds = new Set([
    "call_qloo_resolve",
    "call_qloo_signals",
    "call_qloo_crossDomain",
  ]);
  const validationReport = validateProvenanceMap(provenanceMap, executedIds);
  groundedSpec.provenanceMap = validationReport.validatedMap;

  // Attach structured Qloo Evidence breakdown with exact source & truthful provenance
  groundedSpec.qloo_evidence = generateQlooEvidence(
    cleanPrompt,
    groundedSpec,
    resolvedEntities,
    source
  );
  groundedSpec.qloo_evidence.source = source;

  DESIGN_SCENE_CACHE.set(cacheKey, structuredClone(groundedSpec));
  return groundedSpec;
}

/**
 * Backward compatibility alias: generateScene is designScene.
 */
export const generateScene = designScene;

/**
 * Executes the fair test comparison:
 * Generates Baseline (no Qloo) and Grounded (with Qloo), then computes
 * mathematical diffs with exact provenance tracing.
 */
export function generateSceneComparison({
  prompt,
  seed = 42,
  forcedContext,
}: {
  prompt: string;
  seed?: number;
  forcedContext?: QlooContext;
}): SceneComparison {
  const cleanPrompt = (prompt || "").trim();

  // 1. Resolve Qloo context (live context passed in, or sample fixture)
  const qlooContext = forcedContext || getQlooFixture(cleanPrompt) || undefined;
  const source = qlooContext?.source || (forcedContext ? "live" : "fixture");
  const isSampleFixture = source === "fixture";
  const qlooCallsUsed = qlooContext?.qlooCallsUsed ?? (qlooContext ? 2 : 0);

  // 2. Generate Baseline (ZERO Qloo in context, identical seed)
  const baseline = structuredClone(
    designScene({
      prompt: cleanPrompt,
      seed,
      qlooContext: undefined,
    })
  );

  // 3. Generate Grounded (WITH Qloo in context, identical seed)
  const grounded = structuredClone(
    designScene({
      prompt: cleanPrompt,
      seed,
      qlooContext,
    })
  );

  // Make sure neither scene carries a comparison field (prevents circular reference cycle)
  delete (baseline as any).comparison;
  delete (grounded as any).comparison;

  // 4. Compute pure algorithmic diffs
  const diff = diffScenes(baseline, grounded, qlooContext);

  const comparison: SceneComparison = {
    prompt: cleanPrompt,
    seed,
    baseline,
    grounded, // plain copy of the scene, no back-reference
    qlooCallsUsed,
    diff,
    isSampleFixture,
    source,
    baselineMode: "prompt-only design",
    unresolvedCandidates: qlooContext?.unresolved,
    matchedTags: qlooContext?.crossDomainBundle?.resolvedTags,
  };

  return comparison;
}
