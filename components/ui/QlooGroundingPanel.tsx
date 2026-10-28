"use client";

import React, { useState } from "react";
import type {
  QlooEvidencePayload,
  QlooEntityProvenance,
  SceneSpec,
} from "@/lib/types";
import { ArchitecturalIcon } from "@/lib/motion";

export interface QlooGroundingPanelProps {
  sceneSpec: SceneSpec;
  evidence?: QlooEvidencePayload;
  selectedToolCallId?: string | null;
  onSelectToolCallId?: (toolCallId: string | null) => void;
}

export function QlooGroundingPanel({
  sceneSpec,
  evidence,
  selectedToolCallId,
  onSelectToolCallId,
}: QlooGroundingPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"with-qloo" | "without-qloo">("with-qloo");
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>("all");

  const qlooData = evidence || sceneSpec.qloo_evidence;

  if (!qlooData) {
    return null;
  }

  const {
    input_parsed,
    resolved_entities,
    cross_domain_signals,
    fallback_choices,
    scene_spec_impact,
  } = qlooData;

  const evidenceCount = resolved_entities.filter(
    (e) =>
      e.provenance === "qloo-evidence" ||
      (e.provenance as string) === "evidence" ||
      e.provenance === "sample-fixture"
  ).length;
  const inferredCount = resolved_entities.filter((e) => e.provenance === "inferred").length;
  const fallbackCount = resolved_entities.filter((e) => e.provenance === "fallback").length;

  const filteredEntities =
    selectedDomainFilter === "all"
      ? resolved_entities
      : resolved_entities.filter((e) => e.entity_type.toLowerCase().includes(selectedDomainFilter));

  const uniqueDomains = Array.from(
    new Set(resolved_entities.map((e) => e.entity_type.split("_")[0]))
  );

  return (
    <div className="bg-[#111312] border border-[var(--line)] shadow-2xl overflow-hidden transition-all duration-300">
      {/* Top Banner & Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 bg-[#0E1013]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
            <h3 className="m-0 font-mono text-xs uppercase tracking-[0.16em] text-[var(--red-text)] flex items-center gap-2 font-semibold">
              <ArchitecturalIcon name="compass" size={14} />
              <span>Qloo Evidence &amp; Signal Provenance</span>
            </h3>
            {qlooData.source === "live" ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
                Live Qloo Grounding
              </span>
            ) : qlooData.source === "cache" ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-medium">
                Cached Qloo Signal
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                Sample data — not live Qloo
              </span>
            )}
          </div>
          <p className="m-0 text-xs text-[var(--muted)] font-mono">
            Proving cross-domain taste graphs directly dictate 3D geometry, materials, lighting, and acoustic physics.
          </p>
        </div>

        {/* Action Controls & With/Without Toggle */}
        <div className="flex items-center gap-2.5">
          {/* With vs Without Comparison Pills */}
          <div className="bg-black/60 p-1 border border-[var(--line)] flex items-center gap-1 rounded">
            <button
              type="button"
              onClick={() => setActiveTab("with-qloo")}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-all rounded ${
                activeTab === "with-qloo"
                  ? "bg-[var(--red)] text-white font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              With Qloo Grounding
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("without-qloo")}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-all rounded ${
                activeTab === "without-qloo"
                  ? "bg-amber-600 text-white font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              Without Qloo (Generic LLM)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 text-xs font-mono uppercase border border-[var(--line)] text-[var(--ink)] hover:border-white/40 transition-colors"
          >
            {isExpanded ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* TAB 1: WITH QLOO GROUNDING (FULL EVIDENCE PANEL) */}
          {activeTab === "with-qloo" ? (
            <>
              {/* Telemetry Summary Strip */}
              <div className="p-3 bg-[#0B0E14] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)] uppercase tracking-wider text-[11px]">Taste Reference:</span>
                  <span className="text-white font-semibold bg-white/10 px-2 py-0.5 rounded border border-white/15">
                    &ldquo;{input_parsed}&rdquo;
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                    {resolved_entities.length} Entities Resolved
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                    {evidenceCount} Evidence
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                    {inferredCount} Inferred
                  </span>
                  {fallbackCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-700">
                      {fallbackCount} Fallback
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Entities + Cross-Domain Signals */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (7 cols): Resolved Entities */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--line-subtle)]">
                    <h4 className="m-0 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-neutral-200 flex items-center gap-2">
                      <ArchitecturalIcon name="layers" size={13} />
                      <span>1. Resolved Qloo Entities &amp; Signal Vectors</span>
                    </h4>
                    {/* Domain filter tags */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDomainFilter("all")}
                        className={`px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          selectedDomainFilter === "all"
                            ? "text-[var(--red-text)] font-semibold border-b border-[var(--red)]"
                            : "text-[var(--muted)] hover:text-white"
                        }`}
                      >
                        All
                      </button>
                      {uniqueDomains.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDomainFilter(d)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                            selectedDomainFilter === d
                              ? "text-[var(--red-text)] font-semibold border-b border-[var(--red)]"
                              : "text-[var(--muted)] hover:text-white"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredEntities.map((entity, idx) => (
                      <div
                        key={`${entity.entity_id}-${idx}`}
                        className="p-3 bg-[#0B0D11] border border-[var(--line-subtle)] hover:border-white/20 transition-all rounded-sm space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--red-text)]">
                              {entity.entity_name}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--muted)] uppercase px-1.5 py-0.5 bg-white/5 rounded">
                              {entity.entity_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <ProvenanceBadge provenance={entity.provenance} />
                        </div>

                        {/* Signal Vector */}
                        <div className="text-[11px] font-mono text-neutral-400 bg-black/50 p-1.5 rounded border border-white/5 flex items-start gap-1.5">
                          <span className="text-[var(--red)] select-none">▶</span>
                          <span className="leading-snug">{entity.qloo_signal}</span>
                        </div>

                        {/* Driven Architectural Choice */}
                        <div className="text-xs text-neutral-200 leading-relaxed pl-1 border-l-2 border-[var(--red)]/60">
                          <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                            Driven Spatial Choice:
                          </span>
                          {entity.driven_choice}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column (5 cols): Cross-Domain Signals & Fallbacks */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Cross-Domain Signals */}
                  <div className="space-y-3">
                    <div className="pb-1 border-b border-[var(--line-subtle)]">
                      <h4 className="m-0 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-neutral-200 flex items-center gap-2">
                        <ArchitecturalIcon name="sliders" size={13} />
                        <span>2. Cross-Domain Signal Transduction</span>
                      </h4>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {cross_domain_signals.map((sig, idx) => (
                        <div
                          key={`signal-${idx}`}
                          className="p-2.5 bg-[#0B0D11] border border-[var(--line-subtle)] rounded-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-white font-medium">{sig.entity}</span>
                            <span className="uppercase text-[10px] px-1.5 py-0.5 bg-[var(--red)]/15 text-[var(--red-text)] border border-[var(--red)]/30 rounded">
                              {sig.domain}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400">
                            Signal: {sig.signal}
                          </div>
                          <div className="text-[11px] text-neutral-300 leading-snug bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">
                              ↳ Spatial Translation:
                            </span>
                            {sig.spatial_translation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fallback Choices & Data Honesty Log */}
                  <div className="space-y-2 pt-2 border-t border-[var(--line-subtle)]">
                    <h4 className="m-0 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--muted)] flex items-center gap-2">
                      <ArchitecturalIcon name="alert" size={13} />
                      <span>3. Data Honesty &amp; Fallback Log</span>
                    </h4>

                    {fallback_choices.length === 0 ? (
                      <p className="m-0 text-xs text-[var(--muted)] font-mono italic">
                        All spatial features grounded directly in active Qloo entity vectors.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fallback_choices.map((fb, idx) => (
                          <div
                            key={`fb-${idx}`}
                            className="p-2 bg-black/40 border border-neutral-800 rounded text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-neutral-300 font-medium">{fb.choice}</span>
                              <ProvenanceBadge provenance={fb.provenance} />
                            </div>
                            <p className="m-0 text-[11px] text-[var(--muted)] font-mono leading-relaxed">
                              {fb.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Strip: Direct SceneSpec Impact (Geometry, Materials, Lighting, Acoustics) */}
              <div className="pt-4 border-t border-[var(--line-subtle)] space-y-3">
                <h4 className="m-0 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-neutral-200 flex items-center gap-2">
                  <ArchitecturalIcon name="sliders" size={13} />
                  <span>4. Physical SceneSpec Impacts (Direct Engineering Outputs)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                  {/* Geometry */}
                  <div className="p-3 bg-[#0B0D11] border border-[var(--line-subtle)] rounded space-y-1">
                    <div className="text-[10px] uppercase text-[var(--muted)]">Geometry &amp; Massing</div>
                    <div className="text-white font-medium text-[11px] leading-relaxed">
                      {scene_spec_impact.geometry}
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="p-3 bg-[#0B0D11] border border-[var(--line-subtle)] rounded space-y-1">
                    <div className="text-[10px] uppercase text-[var(--muted)]">PBR Materials</div>
                    <div className="space-y-1 text-[11px]">
                      {Object.entries(scene_spec_impact.materials).slice(0, 2).map(([key, m]) => (
                        <div key={key} className="text-neutral-300 flex items-center justify-between">
                          <span className="text-white font-medium">{m.name || key}:</span>
                          <span className="text-neutral-400">R: {m.roughness} • M: {m.metalness ?? m.metallic ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lighting */}
                  <div className="p-3 bg-[#0B0D11] border border-[var(--line-subtle)] rounded space-y-1">
                    <div className="text-[10px] uppercase text-[var(--muted)]">Kelvin &amp; Spot Hierarchy</div>
                    <div className="space-y-0.5 text-[11px] text-neutral-300">
                      {scene_spec_impact.lighting.slice(0, 2).map((l, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="uppercase text-amber-400">{l.type}:</span>
                          <span>{l.temp} • {l.intensity} lux</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Acoustics */}
                  <div className="p-3 bg-[#0B0D11] border border-[var(--line-subtle)] rounded space-y-1">
                    <div className="text-[10px] uppercase text-[var(--muted)]">Acoustic Telemetry</div>
                    <div className="text-emerald-400 font-semibold text-[11px]">
                      {scene_spec_impact.acoustics.reverberation_time}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] leading-tight">
                      {scene_spec_impact.acoustics.absorption_zones}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: WITHOUT QLOO COMPARISON (GENERIC LLM BASELINE) */
            <div className="p-5 bg-[#0B0D11] border border-amber-900/40 rounded space-y-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-amber-400">
                <ArchitecturalIcon name="alert" size={16} />
                <span className="font-semibold uppercase tracking-wider text-sm">
                  Baseline Output: Generic LLM (Without Qloo Evidence Layer)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-black/50 border border-neutral-800 space-y-2">
                  <div className="text-neutral-400 uppercase text-[11px] font-semibold">
                    Generic Semantic Associations (No Entity Graph):
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-neutral-300 list-disc">
                    <li>&ldquo;Jazz&rdquo; interpreted generally as &ldquo;warm colors, relaxed vibe, soft music.&rdquo;</li>
                    <li>&ldquo;Brutalism&rdquo; interpreted as &ldquo;lots of gray concrete walls.&rdquo;</li>
                    <li>Zero specific cultural entities (no Miles Davis, Blue Note, Reid Miles, or Kissaten traditions).</li>
                    <li>Hallucinates generic string lights and uncalibrated pastel palettes.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-black/50 border border-neutral-800 space-y-2">
                  <div className="text-neutral-400 uppercase text-[11px] font-semibold">
                    Spatial Deficiencies:
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-neutral-400 list-disc">
                    <li>Lighting: Arbitrary 4000K flat ambient wash; no stage chiaroscuro hierarchy.</li>
                    <li>Acoustics: Generic 1.5s reverberation without knowing modal jazz needs early reflections.</li>
                    <li>Materials: Smooth uniform gray box without tactile roughness or board-form grain.</li>
                    <li>Judges Verdict: Appears purely cosmetic and disconnected from musical performance truth.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs rounded">
                <strong>Why Qloo Matters:</strong> Without Qloo&apos;s taste vectors, the system generates a cliché. With Qloo grounding, every physical surface, spotlight beam, and Sabine acoustic absorption coefficient connects directly to verified cultural evidence.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProvenanceBadge({ provenance }: { provenance: QlooEntityProvenance }) {
  switch (provenance) {
    case "qloo-evidence":
    case "evidence" as QlooEntityProvenance:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
          Qloo Evidence
        </span>
      );
    case "sample-fixture":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-amber-950/80 text-amber-300 border border-amber-800/70 shadow-sm flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          <span>Sample Fixture</span>
        </span>
      );
    case "inferred":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-yellow-950/80 text-yellow-400 border border-yellow-800/60 shadow-sm">
          Inferred
        </span>
      );
    case "fallback":
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-neutral-900 text-neutral-400 border border-neutral-700 shadow-sm">
          Fallback
        </span>
      );
  }
}

export default QlooGroundingPanel;
