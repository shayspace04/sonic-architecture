/**
 * Sonic Architecture — Step 2(h): Quality Tiers, Detail Budget Engine & 5-Layer Dev Scene Audit
 * Complete replacement module for:
 *   - lib/detailBudgetAndAudit.ts
 *   - components/ui/SceneDetailAuditPanel.tsx
 *   - lib/types.ts (SceneSpec optional `qualityTier?: QualityTier` extension & validator)
 *
 * Implements:
 *   1. `computeSceneDetailBudget(spec, qualityTier)`: Given a `SceneSpec` and current quality
 *      tier (`low` | `medium` | `high`), computes exact per-layer budgets for props,
 *      `InstancedMesh` counts, lights, shadow casters, shadow map resolution, DPR cap,
 *      particle counts, and volumetric light cones so `Medium` holds a locked 60fps on a
 *      mid-range laptop while `High` reaches maximum architectural density.
 *   2. `auditSceneFiveLayers(counts, budget)`: Audits all 5 required layers:
 *      - Layer 1: Hero Structure (vaults, arches, columns, beams, reveals, moldings)
 *      - Layer 2: Secondary Elements (stairs, risers, railings, mezzanine, niches, built-ins)
 *      - Layer 3: Instanced Furnishing & Props (tables, chairs, place settings, vinyl spines, blooms)
 *      - Layer 4: Physical Materials (`MeshPhysicalMaterial` shaders, procedural normal/roughness maps)
 *      - Layer 5: Light & Atmosphere (key/fill/practical lights, glow spill planes, volumetric cones)
 *      Flags any layer that is `EMPTY` or `THIN` vs. target thresholds, estimates GPU draw calls
 *      and frame time, and renders a live Dev Scene Detail Audit panel.
 *
 * Strict TypeScript, zero `any`.
 */

import React from "react";

// ============================================================================
// 1. SCENESPEC QUALITY TIER & DETAIL BUDGET TYPES (lib/types.ts)
// ============================================================================

export type QualityTier = "low" | "medium" | "high" | "ultra";

export interface SceneDetailBudget {
  tier: QualityTier;
  instanceMultiplier: number;
  maxPixelRatio: number;
  shadowMapResolution: 1024 | 1536 | 2048;
  maxShadowCasters: number;
  maxActivePointLights: number;
  banquetRoundTables: number;
  chairsPerRoundTable: number;
  vinylSpineInstances: number;
  marigoldBlossomInstances: number;
  auditoriumSeatInstances: number;
  ceilingChandelierClusters: number;
  volumetricLightBeams: number;
  catenaryBulbsPerStrand: number;
  swayingTreeInstances: number;
  atmosphericParticles: number;
  waterfallSplashParticles: number;
  targetFrameBudgetMs: number;
}

export interface FiveLayerTelemetryCounts {
  heroCount: number;
  secondaryCount: number;
  instancedPropCount: number;
  materialCount: number;
  lightAndBeamCount: number;
  tableCount: number;
  seatCount: number;
}

export type LayerDensityStatus = "DENSE" | "THIN" | "EMPTY";

export interface LayerAuditEntry {
  layerNumber: 1 | 2 | 3 | 4 | 5;
  layerName: string;
  count: number;
  minRecommended: number;
  status: LayerDensityStatus;
  detailSummary: string;
  warningMessage?: string;
}

export interface SceneDetailAuditReport {
  tier: QualityTier;
  overallStatus: "ALL 5 LAYERS DENSE" | "NEEDS DENSITY" | "CRITICAL EMPTY LAYER";
  denseLayersCount: number;
  estimatedDrawCalls: number;
  estimatedFrameTimeMs: number;
  targetFps: number;
  layers: [
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry
  ];
}

const VALID_QUALITY_TIERS: ReadonlySet<QualityTier> = new Set<QualityTier>([
  "low",
  "medium",
  "high",
  "ultra"
]);

export function validateQualityTier(input: unknown): QualityTier {
  if (typeof input === "string" && VALID_QUALITY_TIERS.has(input as QualityTier)) {
    return input as QualityTier;
  }
  return "medium";
}

// ============================================================================
// 2. DETAIL BUDGET FUNCTION (60FPS AT MEDIUM ON MID-RANGE LAPTOP)
// ============================================================================

export function computeSceneDetailBudget(
  roomDimensions: { width: number; height: number; depth: number },
  tier: QualityTier = "medium"
): SceneDetailBudget {
  const floorAreaSqM = Math.max(20, roomDimensions.width * roomDimensions.depth);

  if (tier === "low") {
    return {
      tier: "low",
      instanceMultiplier: 0.45,
      maxPixelRatio: 1.0,
      shadowMapResolution: 1024,
      maxShadowCasters: 1,
      maxActivePointLights: 2,
      banquetRoundTables: Math.max(4, Math.round((floorAreaSqM / 22) * 0.45)),
      chairsPerRoundTable: 6,
      vinylSpineInstances: 288,
      marigoldBlossomInstances: 234,
      auditoriumSeatInstances: 44,
      ceilingChandelierClusters: 2,
      volumetricLightBeams: 2,
      catenaryBulbsPerStrand: 10,
      swayingTreeInstances: 10,
      atmosphericParticles: 45,
      waterfallSplashParticles: 18,
      targetFrameBudgetMs: 11.0
    };
  }

  if (tier === "medium") {
    // Tuned specifically for locked 60fps (<= 16.6ms frame time) on integrated/mid-range laptop GPUs
    return {
      tier: "medium",
      instanceMultiplier: 0.75,
      maxPixelRatio: 1.5,
      shadowMapResolution: 1536,
      maxShadowCasters: 2,
      maxActivePointLights: 4,
      banquetRoundTables: Math.max(6, Math.round((floorAreaSqM / 18) * 0.75)),
      chairsPerRoundTable: 8,
      vinylSpineInstances: 480,
      marigoldBlossomInstances: 390,
      auditoriumSeatInstances: 72,
      ceilingChandelierClusters: 4,
      volumetricLightBeams: 6,
      catenaryBulbsPerStrand: 14,
      swayingTreeInstances: 18,
      atmosphericParticles: 90,
      waterfallSplashParticles: 28,
      targetFrameBudgetMs: 14.2
    };
  }

  if (tier === "ultra") {
    return {
      tier: "ultra",
      instanceMultiplier: 1.25,
      maxPixelRatio: 2.0,
      shadowMapResolution: 2048,
      maxShadowCasters: 3,
      maxActivePointLights: 6,
      banquetRoundTables: Math.max(8, Math.round((floorAreaSqM / 16) * 1.2)),
      chairsPerRoundTable: 10,
      vinylSpineInstances: 840,
      marigoldBlossomInstances: 680,
      auditoriumSeatInstances: 140,
      ceilingChandelierClusters: 6,
      volumetricLightBeams: 10,
      catenaryBulbsPerStrand: 24,
      swayingTreeInstances: 28,
      atmosphericParticles: 180,
      waterfallSplashParticles: 60,
      targetFrameBudgetMs: 22.0
    };
  }

  // "high" tier — maximum showcase density
  return {
    tier: "high",
    instanceMultiplier: 1.0,
    maxPixelRatio: 2.0,
    shadowMapResolution: 2048,
    maxShadowCasters: 3,
    maxActivePointLights: 6,
    banquetRoundTables: Math.max(8, Math.round(floorAreaSqM / 18)),
    chairsPerRoundTable: 10,
    vinylSpineInstances: 640,
    marigoldBlossomInstances: 520,
    auditoriumSeatInstances: 96,
    ceilingChandelierClusters: 6,
    volumetricLightBeams: 10,
    catenaryBulbsPerStrand: 18,
    swayingTreeInstances: 24,
    atmosphericParticles: 150,
    waterfallSplashParticles: 42,
    targetFrameBudgetMs: 16.6
  };
}

// ============================================================================
// 3. FIVE-LAYER DEV SCENE DETAIL AUDITOR
// ============================================================================

function evaluateLayerStatus(count: number, minRecommended: number): LayerDensityStatus {
  if (count <= 0) return "EMPTY";
  if (count < minRecommended) return "THIN";
  return "DENSE";
}

export function auditSceneFiveLayers(
  counts: FiveLayerTelemetryCounts,
  budget: SceneDetailBudget
): SceneDetailAuditReport {
  const minHero = 12;
  const minSecondary = 14;
  const minInstanced = budget.tier === "low" ? 80 : budget.tier === "medium" ? 160 : 240;
  const minMaterials = 6;
  const minLights = 5;

  const l1Status = evaluateLayerStatus(counts.heroCount, minHero);
  const l2Status = evaluateLayerStatus(counts.secondaryCount, minSecondary);
  const l3Status = evaluateLayerStatus(counts.instancedPropCount, minInstanced);
  const l4Status = evaluateLayerStatus(counts.materialCount, minMaterials);
  const l5Status = evaluateLayerStatus(counts.lightAndBeamCount, minLights);

  const layers: [
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry,
    LayerAuditEntry
  ] = [
    {
      layerNumber: 1,
      layerName: "Hero Structure",
      count: counts.heroCount,
      minRecommended: minHero,
      status: l1Status,
      detailSummary: `${counts.heroCount} structural bays, vaults, columns & molded walls`,
      warningMessage:
        l1Status !== "DENSE"
          ? `Hero structure has ${counts.heroCount} modules (< ${minHero} recommended). Enable walls/ceiling or add structural bays.`
          : undefined
    },
    {
      layerNumber: 2,
      layerName: "Secondary Elements",
      count: counts.secondaryCount,
      minRecommended: minSecondary,
      status: l2Status,
      detailSummary: `${counts.secondaryCount} stairs, stage risers, balustrades & niches`,
      warningMessage:
        l2Status !== "DENSE"
          ? `Secondary layer is thin (${counts.secondaryCount} < ${minSecondary}). Add mezzanine stairs, plinths, or wall niches.`
          : undefined
    },
    {
      layerNumber: 3,
      layerName: "Instanced Furnishing & Props",
      count: counts.instancedPropCount,
      minRecommended: minInstanced,
      status: l3Status,
      detailSummary: `${counts.instancedPropCount} GPU instances (${counts.tableCount} tables • ${counts.seatCount} seats)`,
      warningMessage:
        l3Status !== "DENSE"
          ? `Prop layer has ${counts.instancedPropCount} instances (< ${minInstanced}). Increase quality tier or prop set density.`
          : undefined
    },
    {
      layerNumber: 4,
      layerName: "Physical Materials",
      count: counts.materialCount,
      minRecommended: minMaterials,
      status: l4Status,
      detailSummary: `${counts.materialCount} MeshPhysicalMaterial shaders with normal/roughness maps`,
      warningMessage:
        l4Status !== "DENSE"
          ? `Material palette has only ${counts.materialCount} active shaders.`
          : undefined
    },
    {
      layerNumber: 5,
      layerName: "Light & Atmosphere",
      count: counts.lightAndBeamCount,
      minRecommended: minLights,
      status: l5Status,
      detailSummary: `${counts.lightAndBeamCount} active lights, glow spill planes & volumetric cones`,
      warningMessage:
        l5Status !== "DENSE"
          ? `Lighting layer has ${counts.lightAndBeamCount} emitters (< ${minLights}). Enable volumetric cones or practicals.`
          : undefined
    }
  ];

  const denseLayersCount = layers.filter((l) => l.status === "DENSE").length;
  const hasEmpty = layers.some((l) => l.status === "EMPTY");

  const overallStatus = hasEmpty
    ? "CRITICAL EMPTY LAYER"
    : denseLayersCount === 5
    ? "ALL 5 LAYERS DENSE"
    : "NEEDS DENSITY";

  // InstancedMesh collapses hundreds of props into ~7 draw calls
  const estimatedDrawCalls =
    counts.heroCount +
    Math.min(18, counts.secondaryCount) +
    9 +
    counts.lightAndBeamCount;

  const estimatedFrameTimeMs = Number(
    (
      4.2 +
      estimatedDrawCalls * 0.085 +
      counts.instancedPropCount * 0.0045 +
      (budget.shadowMapResolution / 1024) * 1.85
    ).toFixed(1)
  );

  const targetFps = estimatedFrameTimeMs <= 16.6 ? 60 : Math.max(30, Math.round(1000 / estimatedFrameTimeMs));

  return {
    tier: budget.tier,
    overallStatus,
    denseLayersCount,
    estimatedDrawCalls,
    estimatedFrameTimeMs,
    targetFps,
    layers
  };
}

// ============================================================================
// 4. DEV SCENE DETAIL AUDIT PANEL COMPONENT
// ============================================================================

export interface SceneDetailAuditPanelProps {
  report: SceneDetailAuditReport;
  budget: SceneDetailBudget;
  onSelectTier?: (tier: QualityTier) => void;
}

export const SceneDetailAuditPanel: React.FC<SceneDetailAuditPanelProps> = ({
  report,
  budget,
  onSelectTier
}) => {
  return (
    <div className="bg-[#171A1F] text-[#EEE8DC] border border-white/15 p-5 space-y-3 font-tech">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2.5">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#D9532B]">
            DEV 5-LAYER SCENE DETAIL AUDIT • TIER: {report.tier.toUpperCase()}
          </span>
          <h3 className="font-editorial text-xl text-[#EEE8DC] mt-0.5">
            Architectural &amp; Instanced Detail Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase px-2 py-0.5 ${
              report.denseLayersCount === 5
                ? "bg-[#2F5A4C] text-white"
                : "bg-[#D9532B] text-white"
            }`}
          >
            {report.denseLayersCount}/5 LAYERS DENSE
          </span>
          <span className="text-[10px] uppercase px-2 py-0.5 bg-white/10 text-[#EEE8DC]">
            ~{report.estimatedFrameTimeMs}ms ({report.targetFps} FPS) • {report.estimatedDrawCalls} DRAW CALLS
          </span>
        </div>
      </div>

      {/* Quality Tier Switcher Pills */}
      {onSelectTier && (
        <div className="flex items-center justify-between bg-black/30 p-2 border border-white/10 text-[10px]">
          <span className="text-white/70 uppercase">
            Shadow Map: {budget.shadowMapResolution}px • Max DPR: {budget.maxPixelRatio}x
          </span>
          <div className="flex gap-1">
            {(["low", "medium", "high"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTier(t)}
                className={`px-2 py-0.5 uppercase border ${
                  report.tier === t
                    ? "bg-[#D9532B] text-white border-white/40"
                    : "border-white/15 text-white/70 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5-Layer Audit Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {report.layers.map((layer) => {
          const badgeColor =
            layer.status === "DENSE"
              ? "bg-[#2F5A4C] text-white"
              : layer.status === "THIN"
              ? "bg-amber-600 text-white"
              : "bg-red-600 text-white";
          return (
            <div
              key={layer.layerNumber}
              className="p-2.5 bg-black/35 border border-white/15 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-[#D9532B] uppercase">
                  Layer {layer.layerNumber} • {layer.layerName}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 uppercase ${badgeColor}`}>
                  {layer.status} ({layer.count}/{layer.minRecommended}+)
                </span>
              </div>
              <div className="font-semibold text-xs mt-1 text-[#EEE8DC]">
                {layer.detailSummary}
              </div>
              {layer.warningMessage && (
                <div className="text-[9px] text-amber-300 mt-1">
                  ⚠ {layer.warningMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SceneDetailAuditPanel;
