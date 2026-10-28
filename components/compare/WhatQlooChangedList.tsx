"use client";

import React, { useState } from "react";
import type { DiffCategory, DiffItem, SceneComparison } from "@/lib/types";
import { ArchitecturalIcon, type ArchitecturalIconName } from "@/lib/motion";

export interface WhatQlooChangedListProps {
  comparison: SceneComparison;
  onHighlightCategory?: (category: DiffCategory) => void;
  activeCategory?: DiffCategory | null;
}

const CATEGORY_ICONS: Record<DiffCategory, ArchitecturalIconName> = {
  palette: "layers",
  materials: "building",
  lighting: "sun",
  geometry: "compass",
  acoustics: "radio",
  soundtrack: "music",
  program: "sliders",
  furniture: "grid",
};

export function WhatQlooChangedList({
  comparison,
  onHighlightCategory,
  activeCategory,
}: WhatQlooChangedListProps) {
  const [showAll, setShowAll] = useState<boolean>(false);

  const { baseline, grounded, diff, qlooCallsUsed, isSampleFixture } = comparison;

  // Factual metrics only — no invented quality scores
  const totalDecisions = diff.length;
  const tracedDecisions = diff.filter((d) => d.changedBy !== undefined).length;
  const qlooEntitiesCount = grounded.qloo_evidence?.resolved_entities.length ?? 0;

  const displayedDiffs = showAll ? diff : diff.slice(0, 6);

  return (
    <div className="bg-[#111312] border border-[var(--line)] shadow-2xl overflow-hidden font-mono text-xs">
      {/* 1. FACTUAL SUMMARY STRIP */}
      <div className="p-4 sm:p-5 border-b border-[var(--line)] bg-[#0E1013] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
            <h3 className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--red-text)] font-semibold flex items-center gap-2">
              <ArchitecturalIcon name="sliders" size={14} />
              <span>What Qloo Changed (Fair-Test Diff)</span>
            </h3>
          </div>

          {/* Source Status Badge */}
          {comparison.source === "live" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Qloo API Grounding</span>
            </div>
          ) : comparison.source === "cache" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 text-[10px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Cached Qloo Signal</span>
            </div>
          ) : comparison.source === "fallback" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 text-neutral-300 border border-neutral-700 text-[10px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span>Procedural Fallback — no Qloo data</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Live Qloo unavailable — sample data</span>
            </div>
          )}
        </div>

        {/* Factual Counters Strip (Section 3 requirement: "Facts, not vibes") */}
        <div className="p-3 bg-black/60 border border-[var(--line-subtle)] rounded flex flex-wrap items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] uppercase">Qloo entities used:</span>
            <span className="text-white font-semibold">{qlooEntitiesCount}</span>
          </div>
          <div className="h-3 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] uppercase">Design decisions traced:</span>
            <span className="text-emerald-400 font-semibold">
              {tracedDecisions} of {totalDecisions}
            </span>
          </div>
          <div className="h-3 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] uppercase">Qloo API calls:</span>
            <span className="text-neutral-300 font-semibold">{qlooCallsUsed}</span>
          </div>
          <div className="h-3 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] uppercase">Fixed Seed:</span>
            <span className="text-neutral-400">#{comparison.seed}</span>
          </div>
        </div>
      </div>

      {/* 2. WHAT QLOO CHANGED ROW-BY-ROW DIFF LIST */}
      <div className="p-4 sm:p-5 space-y-3">
        {diff.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 italic">
            Qloo did not change this design (both baseline and grounded yielded identical outputs).
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedDiffs.map((item, idx) => {
              const mag = item.magnitude ?? 0;
              const isSelected = activeCategory === item.category;

              return (
                <div
                  key={`${item.category}-${idx}`}
                  onMouseEnter={() => onHighlightCategory?.(item.category)}
                  onClick={() => onHighlightCategory?.(item.category)}
                  className={`p-3 rounded-sm border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/10 border-[var(--red)] shadow-lg"
                      : "bg-[#0B0D11] border-[var(--line-subtle)] hover:border-white/20"
                  }`}
                >
                  {/* Row Header: Category + Magnitude Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--red-text)]">
                        <ArchitecturalIcon
                          name={CATEGORY_ICONS[item.category] || "building"}
                          size={13}
                        />
                      </span>
                      <span className="uppercase text-[11px] font-semibold text-white tracking-wider">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--muted)] uppercase">
                        Magnitude:
                      </span>
                      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full ${
                            mag >= 0.7
                              ? "bg-emerald-400"
                              : mag >= 0.35
                              ? "bg-amber-400"
                              : "bg-neutral-400"
                          }`}
                          style={{ width: `${Math.round(mag * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-300 w-8 text-right">
                        {(mag * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Value Shift: Without -> With */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px] leading-relaxed">
                    <div className="p-2 bg-black/40 rounded border border-white/5">
                      <span className="text-[10px] uppercase text-[var(--muted)] block font-semibold">
                        Without Qloo (Baseline):
                      </span>
                      <span className="text-neutral-400 font-sans">{item.baselineValue}</span>
                    </div>

                    <div className="p-2 bg-black/60 rounded border border-[var(--red)]/30">
                      <span className="text-[10px] uppercase text-emerald-400 block font-semibold">
                        With Qloo Grounding:
                      </span>
                      <span className="text-white font-sans font-medium">
                        {item.groundedValue}
                      </span>
                    </div>
                  </div>

                  {/* Attribution Chip / Provenance Badge */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    {item.changedBy ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-neutral-300">
                        <span className="text-[var(--muted)]">Source:</span>
                        <span className="text-[var(--red-text)] font-semibold">
                          {item.changedBy.entityName}
                        </span>
                        <span className="text-[var(--muted)]">({item.changedBy.entityType})</span>
                        <span className="text-neutral-400">· &ldquo;{item.changedBy.signal}&rdquo;</span>
                      </div>
                    ) : (
                      <div className="text-[var(--muted)] italic">
                        no direct Qloo source (algorithmic layout constraint)
                      </div>
                    )}

                    {item.changedBy && (
                      <span
                        className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[9px] border ${
                          item.changedBy.provenance === "qloo-evidence"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : item.changedBy.provenance === "sample-fixture"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : item.changedBy.provenance === "inferred"
                            ? "bg-yellow-950 text-yellow-400 border-yellow-800"
                            : "bg-neutral-900 text-neutral-400 border-neutral-700"
                        }`}
                      >
                        {item.changedBy.provenance}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toggle Top 6 vs Show All */}
        {diff.length > 6 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-[var(--ink)] border border-[var(--line)] hover:border-white/40 transition-colors bg-white/5"
            >
              {showAll ? "Show Top 6 Only ▲" : `Show All ${diff.length} Differences ▼`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatQlooChangedList;
