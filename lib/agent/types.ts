/**
 * Sonic Architecture — Agentic Cultural Intelligence Types
 * Single source of truth for QlooClient, Tool Calling, Live Trace,
 * Provenance Mapping, and Streaming Agent Events.
 */

import type { Provenance, SceneSpec } from "../types";

export type QlooDomain =
  | "music"
  | "film"
  | "dining"
  | "fashion"
  | "travel"
  | "places";

export interface ResolvedEntityCandidate {
  id: string;
  name: string;
  type: string;
  confidence: number;
  description?: string;
}

export interface ResolvedEntityItem {
  id: string;
  name: string;
  type: string;
  confidence: number;
  candidates?: ResolvedEntityCandidate[];
}

export interface ResolveEntitiesParams {
  text: string;
}

export interface ResolveEntitiesResult {
  entities: ResolvedEntityItem[];
  source: "live" | "cache" | "fixture";
  latencyMs: number;
  provenance: Provenance;
}

export interface TasteSignalItem {
  entityId: string;
  entityName: string;
  domain: QlooDomain;
  signals: string[];
  relatedEntities: Array<{ id: string; name: string; type?: string; affinity?: number }>;
}

export interface GetTasteSignalsParams {
  entityIds: string[];
  domain: QlooDomain;
}

export interface GetTasteSignalsResult {
  signals: TasteSignalItem[];
  source: "live" | "cache" | "fixture";
  latencyMs: number;
  provenance: Provenance;
}

export interface ProgramImplications {
  cateringLayout?: string;
  dressCode?: string;
  serviceFlow?: string;
  hospitality?: string;
}

export interface CrossDomainLinkItem {
  sourceEntityId: string;
  sourceEntityName: string;
  targetDomain: QlooDomain;
  signals: string[];
  spatialTranslations?: string[];
  programImplications?: ProgramImplications;
}

export interface GetCrossDomainLinksParams {
  entityIds: string[];
  targetDomains: QlooDomain[];
}

export interface GetCrossDomainLinksResult {
  links: CrossDomainLinkItem[];
  source: "live" | "cache" | "fixture";
  latencyMs: number;
  provenance: Provenance;
}

export interface QlooClient {
  resolveEntities(params: ResolveEntitiesParams): Promise<ResolveEntitiesResult>;
  getTasteSignals(params: GetTasteSignalsParams): Promise<GetTasteSignalsResult>;
  getCrossDomainLinks(params: GetCrossDomainLinksParams): Promise<GetCrossDomainLinksResult>;
}

export type AgentToolName =
  | "resolveEntities"
  | "getTasteSignals"
  | "getCrossDomainLinks"
  | "computeAcoustics"
  | "buildScene"
  | "finalizeScene";

export interface ToolCall {
  id: string;
  tool: AgentToolName;
  args: Record<string, any>;
  timestamp: string;
}

export interface ToolResult {
  toolCallId: string;
  tool: AgentToolName;
  data: any;
  source: "live" | "cache" | "fixture";
  latencyMs: number;
  provenance: Provenance;
  error?: string;
}

export interface DerivedFrom {
  toolCallId: string | null;
  entityId?: string;
  entityName?: string;
  signal?: string;
  provenance: Provenance;
  rationale?: string;
}

export interface ProgramNotesSpec {
  cateringLayout?: string;
  dressCode?: string;
  serviceFlow?: string;
  hospitality?: string;
}

export interface TraceStep {
  stepNumber: number;
  toolCallId: string;
  tool: AgentToolName;
  summary: string;
  args: Record<string, any>;
  result?: any;
  source: "live" | "cache" | "fixture";
  latencyMs: number;
  provenance: Provenance;
  parallelGroupId?: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  timestamp: string;
}

export interface AgentTraceSummary {
  totalSteps: number;
  qlooCalls: number;
  domainsQueried: QlooDomain[];
  cacheHits: number;
  totalTimeMs: number;
  isSampleFixture: boolean;
  budgetExhausted?: boolean;
}

export interface ClarificationPayload {
  question: string;
  candidates: ResolvedEntityCandidate[];
  defaultCandidateId: string;
  timeoutMs: number;
}

export type AgentEvent =
  | { type: "step_start"; step: TraceStep; statusLine: string }
  | { type: "step_complete"; step: TraceStep; statusLine?: string }
  | { type: "status"; message: string }
  | { type: "clarification_needed"; payload: ClarificationPayload }
  | { type: "clarification_resolved"; selectedId: string; reason: "user" | "timeout" }
  | { type: "budget_warning"; reason: string }
  | { type: "completed"; sceneSpec: SceneSpec; trace: TraceStep[]; summary: AgentTraceSummary }
  | {
      type: "error";
      errorType: "timeout" | "quota" | "unreachable" | "model_error" | "validation";
      message: string;
      isSampleFallback?: boolean;
    };
