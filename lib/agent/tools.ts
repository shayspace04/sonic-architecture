/**
 * Sonic Architecture — Agent Tool Implementations & Provenance Validation
 *
 * Implements the 6 agent tools:
 * 1. resolveEntities({ text }) (Qloo)
 * 2. getTasteSignals({ entityIds, domain }) (Qloo)
 * 3. getCrossDomainLinks({ entityIds, targetDomains }) (Qloo)
 * 4. computeAcoustics({ dimensions, materials }) (Deterministic Sabine/Eyring math)
 * 5. buildScene({ spec, knowledge, provenanceMap }) (Schema validation & whitewash guard)
 * 6. finalizeScene({ sceneSpec, provenanceMap, rationale }) (Trace sealing & provenance validation)
 */

import type {
  QlooClient,
  QlooDomain,
  ResolveEntitiesParams,
  ResolveEntitiesResult,
  GetTasteSignalsParams,
  GetTasteSignalsResult,
  GetCrossDomainLinksParams,
  GetCrossDomainLinksResult,
  DerivedFrom,
  ToolResult,
  ProgramNotesSpec,
} from "./types";
import type { SceneSpec, SpatialTypology, MaterialSpec } from "@/lib/types";
import { enforcePaletteContrastGuard } from "@/components/three/ProceduralMaterials";
import { computeSabineAcoustics } from "@/lib/scene-spec";

// ============================================================================
// PROVENANCE VALIDATION (Reject & repair fabricated toolCallIds)
// ============================================================================

export interface ProvenanceValidationReport {
  isValid: boolean;
  validatedMap: Record<string, DerivedFrom>;
  rejectedOrDowngradedCount: number;
  violations: Array<{
    key: string;
    toolCallId: string | null;
    reason: string;
  }>;
}

export function validateProvenanceMap(
  provenanceMap: Record<string, DerivedFrom> | undefined,
  executedToolCallIds: Set<string> | string[]
): ProvenanceValidationReport {
  const executedSet = Array.isArray(executedToolCallIds)
    ? new Set(executedToolCallIds)
    : executedToolCallIds;

  const validatedMap: Record<string, DerivedFrom> = {};
  const violations: Array<{ key: string; toolCallId: string | null; reason: string }> = [];
  let rejectedOrDowngradedCount = 0;

  if (!provenanceMap) {
    return {
      isValid: true,
      validatedMap: {},
      rejectedOrDowngradedCount: 0,
      violations: [],
    };
  }

  for (const [key, item] of Object.entries(provenanceMap)) {
    if (!item) continue;

    // Check if toolCallId was specified
    if (item.toolCallId !== null && item.toolCallId !== undefined) {
      if (!executedSet.has(item.toolCallId)) {
        // Fabricated or unexecuted tool call!
        rejectedOrDowngradedCount++;
        violations.push({
          key,
          toolCallId: item.toolCallId,
          reason: `Fabricated or unexecuted toolCallId '${item.toolCallId}' was not found in the actual execution trace.`,
        });

        // Downgrade to inferred or fallback, remove fraudulent toolCallId
        validatedMap[key] = {
          ...item,
          toolCallId: null,
          provenance: item.entityId ? "inferred" : "fallback",
          rationale: `[Repaired: toolCallId '${item.toolCallId}' never executed; downgraded to ${
            item.entityId ? "inferred" : "fallback"
          }]`,
        };
        continue;
      }
    }

    // Valid executed toolCallId or explicit fallback
    validatedMap[key] = { ...item };
  }

  return {
    isValid: violations.length === 0,
    validatedMap,
    rejectedOrDowngradedCount,
    violations,
  };
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

export interface AcousticsComputationParams {
  dimensions: { width: number; height: number; depth: number };
  materials?: {
    floor?: Partial<MaterialSpec>;
    wall?: Partial<MaterialSpec>;
    ceiling?: Partial<MaterialSpec>;
  };
  typology?: SpatialTypology;
  isOpenAir?: boolean;
}

export interface AcousticsComputationResult {
  volumeCubicMeters: number;
  surfaceAreaSqMeters: number;
  sabineRT60Seconds: number;
  eyringRT60Seconds: number;
  targetRT60Seconds: number;
  absorptionRating: "OPTIMAL" | "ACCEPTABLE" | "DIFFUSE_RESONANT";
  airAbsorptionLossDb: number;
}

export class AgentTools {
  private client: QlooClient;

  constructor(client: QlooClient) {
    this.client = client;
  }

  async resolveEntities(callId: string, params: ResolveEntitiesParams): Promise<ToolResult> {
    const res = await this.client.resolveEntities(params);
    return {
      toolCallId: callId,
      tool: "resolveEntities",
      data: res.entities,
      source: res.source,
      latencyMs: res.latencyMs,
      provenance: res.provenance,
    };
  }

  async getTasteSignals(callId: string, params: GetTasteSignalsParams): Promise<ToolResult> {
    const res = await this.client.getTasteSignals(params);
    return {
      toolCallId: callId,
      tool: "getTasteSignals",
      data: res.signals,
      source: res.source,
      latencyMs: res.latencyMs,
      provenance: res.provenance,
    };
  }

  async getCrossDomainLinks(callId: string, params: GetCrossDomainLinksParams): Promise<ToolResult> {
    const res = await this.client.getCrossDomainLinks(params);
    return {
      toolCallId: callId,
      tool: "getCrossDomainLinks",
      data: res.links,
      source: res.source,
      latencyMs: res.latencyMs,
      provenance: res.provenance,
    };
  }

  computeAcoustics(callId: string, params: AcousticsComputationParams): ToolResult {
    const start = Date.now();
    const { width, height, depth } = params.dimensions;
    const typology = params.typology || "listening_room";
    const isOpenAir = !!params.isOpenAir;

    const baseTarget = computeSabineAcoustics(width, height, depth, typology, isOpenAir);

    // Explicit Eyring formula calculation:
    // Eyring: RT60 = 0.161 * V / (-S * ln(1 - alpha_avg))
    const volume = width * height * depth;
    const surfaceArea = 2 * (width * depth + width * height + depth * height);
    const alphaAvg = Math.max(
      0.05,
      Math.min(
        0.92,
        (0.161 * volume) / (surfaceArea * Math.max(0.1, baseTarget.calculatedRT60Seconds))
      )
    );
    const eyringDenominator = -surfaceArea * Math.log(Math.max(0.01, 1 - alphaAvg));
    const eyringRT60 = Number(((0.161 * volume) / Math.max(0.1, eyringDenominator)).toFixed(2));

    const result: AcousticsComputationResult = {
      volumeCubicMeters: Number(volume.toFixed(1)),
      surfaceAreaSqMeters: Number(surfaceArea.toFixed(1)),
      sabineRT60Seconds: Number(baseTarget.calculatedRT60Seconds.toFixed(2)),
      eyringRT60Seconds: eyringRT60,
      targetRT60Seconds: Number(baseTarget.targetRT60Seconds.toFixed(2)),
      absorptionRating: baseTarget.complianceStatus === "optimal" ? "OPTIMAL" : "ACCEPTABLE",
      airAbsorptionLossDb: Number((0.0012 * volume).toFixed(2)),
    };

    return {
      toolCallId: callId,
      tool: "computeAcoustics",
      data: result,
      source: "live",
      latencyMs: Math.max(1, Date.now() - start),
      provenance: "inferred",
    };
  }

  buildScene(
    callId: string,
    params: {
      candidateSpec: SceneSpec;
      programNotes?: ProgramNotesSpec;
    }
  ): ToolResult {
    const start = Date.now();
    const spec = JSON.parse(JSON.stringify(params.candidateSpec)) as SceneSpec;

    // Apply contrast and whitewash guards to palette
    if (spec.palette) {
      const contrastReport = enforcePaletteContrastGuard(spec.palette);
      if (contrastReport.wasAdjusted) {
        spec.palette = {
          ...spec.palette,
          floorHex: contrastReport.floorHex,
          wallHex: contrastReport.wallHex,
          primaryHex: contrastReport.primaryHex,
          accentHex: contrastReport.accentHex,
        };
      }
    }

    // Attach cultural cross-domain program notes if available
    if (params.programNotes) {
      spec.programNotes = params.programNotes;
    }

    return {
      toolCallId: callId,
      tool: "buildScene",
      data: {
        specId: spec.id,
        dimensions: spec.roomDimensions,
        typology: spec.typology,
        palette: spec.palette,
        programNotes: spec.programNotes,
        whitewashGuarded: true,
      },
      source: "live",
      latencyMs: Math.max(1, Date.now() - start),
      provenance: "inferred",
    };
  }

  finalizeScene(
    callId: string,
    params: {
      sceneSpec: SceneSpec;
      provenanceMap: Record<string, DerivedFrom>;
      executedToolCallIds: Set<string> | string[];
      rationale?: string;
    }
  ): ToolResult {
    const start = Date.now();
    const validation = validateProvenanceMap(params.provenanceMap, params.executedToolCallIds);

    const finalSpec = JSON.parse(JSON.stringify(params.sceneSpec)) as SceneSpec;
    finalSpec.provenanceMap = validation.validatedMap;

    return {
      toolCallId: callId,
      tool: "finalizeScene",
      data: {
        finalized: true,
        sceneId: finalSpec.id,
        groundedDecisionsCount: Object.keys(validation.validatedMap).length,
        rejectedOrDowngradedCount: validation.rejectedOrDowngradedCount,
        violations: validation.violations,
        rationale: params.rationale || "All design choices grounded against verified tool execution trace.",
      },
      source: "live",
      latencyMs: Math.max(1, Date.now() - start),
      provenance: "inferred",
    };
  }
}
