/**
 * Sonic Architecture — Agent Trace UI Panel ("How the agent worked")
 *
 * Implements:
 * 1. Live streaming trace rows with step number, tool, human summary, latency, source & provenance badges
 * 2. Visual grouping for parallel tool calls
 * 3. Live status line with active pulse (no fake progress bars)
 * 4. Expandable sanitised payload viewer (no secrets/keys)
 * 5. Clarification candidate choice UI with 10s auto-fallback countdown
 * 6. Factual summary strip (steps, Qloo calls, domains, cache hits, total time)
 * 7. Bidirectional highlighting link between trace steps and 3D scene elements
 * 8. Full accessibility (aria-live, keyboard navigation, prefers-reduced-motion)
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  TraceStep,
  AgentTraceSummary,
  ClarificationPayload,
  AgentToolName,
} from "@/lib/agent/types";
import type { Provenance } from "@/lib/types";

export interface AgentTracePanelProps {
  trace: TraceStep[];
  summary?: AgentTraceSummary;
  isRunning?: boolean;
  statusLine?: string;
  error?: { errorType: string; message: string; isSampleFallback?: boolean } | null;
  clarification?: ClarificationPayload | null;
  onSelectCandidate?: (candidateId: string) => void;
  selectedToolCallId?: string | null;
  onSelectToolCallId?: (toolCallId: string | null) => void;
  isSampleFixture?: boolean;
  className?: string;
}

const TOOL_ICONS: Record<AgentToolName, string> = {
  resolveEntities: "🔍",
  getTasteSignals: "🎵",
  getCrossDomainLinks: "🔗",
  computeAcoustics: "📐",
  buildScene: "🏛️",
  finalizeScene: "✅",
};

export const AgentTracePanel: React.FC<AgentTracePanelProps> = ({
  trace,
  summary,
  isRunning = false,
  statusLine,
  error,
  clarification,
  onSelectCandidate,
  selectedToolCallId,
  onSelectToolCallId,
  isSampleFixture = false,
  className = "",
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [clarificationCountdown, setClarificationCountdown] = useState<number>(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeStepRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to selected tool step when selected externally (e.g. from 3D scene / evidence panel)
  useEffect(() => {
    if (selectedToolCallId) {
      const el = activeStepRefs.current.get(selectedToolCallId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedToolCallId]);

  // Clarification 10s auto-fallback countdown
  useEffect(() => {
    if (!clarification) return;
    setClarificationCountdown(10);
    const timer = setInterval(() => {
      setClarificationCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onSelectCandidate && clarification.defaultCandidateId) {
            onSelectCandidate(clarification.defaultCandidateId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [clarification, onSelectCandidate]);

  const toggleExpand = (stepId: string) => {
    setExpandedStepId((prev) => (prev === stepId ? null : stepId));
  };

  const sanitizeData = (data: any): any => {
    if (!data) return data;
    try {
      const str = JSON.stringify(data, (key, value) => {
        if (
          key.toLowerCase().includes("key") ||
          key.toLowerCase().includes("token") ||
          key.toLowerCase().includes("secret") ||
          key.toLowerCase().includes("auth")
        ) {
          return "[REDACTED]";
        }
        return value;
      }, 2);
      return JSON.parse(str);
    } catch {
      return data;
    }
  };

  const getSourceBadge = (source: "live" | "cache" | "fixture") => {
    switch (source) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            live
          </span>
        );
      case "cache":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            cache
          </span>
        );
      case "fixture":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            fixture
          </span>
        );
    }
  };

  const getProvenanceBadge = (prov: Provenance) => {
    switch (prov) {
      case "qloo-evidence":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-700/50">
            qloo-evidence
          </span>
        );
      case "sample-fixture":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/50">
            sample-fixture
          </span>
        );
      case "inferred":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
            inferred
          </span>
        );
      case "fallback":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
            fallback
          </span>
        );
    }
  };

  return (
    <section
      aria-label="How the agent worked"
      className={`rounded-sm border border-[#F4EFE6]/15 bg-[#0E1014] text-[#F4EFE6] shadow-xl overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#F4EFE6]/10 bg-[#16181D]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F4EFE6]">
            How the agent worked
          </h2>
          <span className="text-[11px] font-mono text-[#F4EFE6]/50">
            (Qloo Cultural Taste Graph Loop)
          </span>
        </div>

        {/* Live or Sample Badge */}
        <div className="flex items-center gap-2">
          {isSampleFixture && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="Qloo fixture data active while backend is not connected or in sandbox test mode"
            >
              ⚠️ Sample data — not live Qloo
            </span>
          )}
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              Running Agent Loop
            </span>
          )}
        </div>
      </div>

      {/* Live Status Line */}
      {isRunning && statusLine && (
        <div
          role="status"
          aria-live="polite"
          className="px-5 py-2.5 bg-purple-950/30 border-b border-purple-500/20 text-xs text-purple-200 font-mono flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>{statusLine}</span>
        </div>
      )}

      {/* Clarification Choice Alert */}
      {clarification && (
        <div
          role="alert"
          className="p-4 mx-4 my-3 rounded bg-amber-950/40 border border-amber-500/40 text-amber-100"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono text-amber-300">
              Cultural Disambiguation Required
            </span>
            <span className="text-xs font-mono text-amber-400">
              Auto-selecting in {clarificationCountdown}s
            </span>
          </div>
          <p className="text-xs text-amber-200 mb-3">{clarification.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clarification.candidates.map((cand) => (
              <button
                key={cand.id}
                onClick={() => onSelectCandidate && onSelectCandidate(cand.id)}
                className="text-left p-2.5 rounded bg-black/40 hover:bg-amber-900/30 border border-amber-500/30 hover:border-amber-400 transition-colors text-xs"
              >
                <div className="font-medium text-amber-200 flex items-center justify-between">
                  <span>{cand.name}</span>
                  <span className="text-[10px] font-mono text-amber-400">
                    {Math.round(cand.confidence * 100)}% match
                  </span>
                </div>
                {cand.description && (
                  <div className="text-[11px] text-amber-300/70 mt-1 line-clamp-2">
                    {cand.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-3 mx-4 my-2 rounded bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono"
        >
          <span className="font-bold uppercase tracking-wider mr-2">
            [{error.errorType}]:
          </span>
          {error.message}
          {error.isSampleFallback && (
            <div className="mt-1 text-[11px] text-rose-300/80">
              Gracefully degraded to deterministic fixture data.
            </div>
          )}
        </div>
      )}

      {/* Trace Steps Container */}
      <div
        ref={scrollContainerRef}
        aria-live="polite"
        className="divide-y divide-[#F4EFE6]/10 max-h-[440px] overflow-y-auto font-sans"
      >
        {trace.length === 0 && !isRunning && (
          <div className="p-8 text-center text-xs font-mono text-[#F4EFE6]/40">
            Agent trace is idle. Enter a prompt or select a starter above to inspect live tool execution.
          </div>
        )}

        {trace.map((step, idx) => {
          const isSelected = selectedToolCallId === step.toolCallId;
          const isExpanded = expandedStepId === step.toolCallId;
          const icon = TOOL_ICONS[step.tool] || "⚙️";
          const isParallel = !!step.parallelGroupId;

          return (
            <div
              key={step.toolCallId}
              ref={(el) => {
                if (el) activeStepRefs.current.set(step.toolCallId, el);
                else activeStepRefs.current.delete(step.toolCallId);
              }}
              className={`transition-colors ${
                isSelected
                  ? "bg-amber-950/20 border-l-4 border-l-amber-400 ring-1 ring-amber-400/30"
                  : "hover:bg-white/[0.02]"
              } ${isParallel ? "border-l-2 border-l-purple-500/40 pl-2" : ""}`}
            >
              {/* Step Row */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => {
                  toggleExpand(step.toolCallId);
                  if (onSelectToolCallId) onSelectToolCallId(step.toolCallId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpand(step.toolCallId);
                    if (onSelectToolCallId) onSelectToolCallId(step.toolCallId);
                  }
                }}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 cursor-pointer text-xs"
              >
                {/* Left info: Step #, Tool Name, Human Summary */}
                <div className="flex items-center gap-2.5 min-w-[240px] flex-1">
                  <span className="font-mono text-[11px] text-[#F4EFE6]/40 w-5">
                    #{step.stepNumber}
                  </span>
                  <span className="text-base" aria-hidden="true">
                    {icon}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-amber-200">
                        {step.tool}()
                      </span>
                      {isParallel && (
                        <span className="text-[9px] uppercase font-mono tracking-wider text-purple-300 bg-purple-950/60 px-1 py-0.5 rounded border border-purple-700/40">
                          parallel
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#F4EFE6]/80 mt-0.5 line-clamp-1">
                      {step.summary}
                    </span>
                  </div>
                </div>

                {/* Right badges: Source, Latency, Provenance */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#F4EFE6]/50">
                    {step.latencyMs}ms
                  </span>
                  {getSourceBadge(step.source)}
                  {getProvenanceBadge(step.provenance)}
                  <span className="text-xs text-[#F4EFE6]/40 font-mono ml-1">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Expanded Arguments & Result View (Sanitised) */}
              {isExpanded && (
                <div className="px-5 py-3 bg-black/40 border-t border-[#F4EFE6]/5 font-mono text-[11px] space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#F4EFE6]/40 mb-1">
                      Arguments
                    </div>
                    <pre className="p-2.5 rounded bg-[#16181D] text-amber-200/90 overflow-x-auto text-[10px] leading-relaxed">
                      {JSON.stringify(sanitizeData(step.args), null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#F4EFE6]/40 mb-1">
                      Result (Sanitized payload)
                    </div>
                    <pre className="p-2.5 rounded bg-[#16181D] text-emerald-200/90 overflow-x-auto text-[10px] max-h-48 leading-relaxed">
                      {JSON.stringify(sanitizeData(step.result), null, 2)}
                    </pre>
                  </div>
                  <div className="text-[10px] text-[#F4EFE6]/40">
                    Tool Call ID: <span className="text-[#F4EFE6]/70">{step.toolCallId}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Factual Summary Strip */}
      {summary && (
        <div className="px-5 py-3 border-t border-[#F4EFE6]/10 bg-[#16181D] text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center sm:text-left">
            <div>
              <div className="text-[10px] uppercase text-[#F4EFE6]/40">Steps</div>
              <div className="text-sm font-semibold text-[#F4EFE6]">{summary.totalSteps}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#F4EFE6]/40">Qloo Calls</div>
              <div className="text-sm font-semibold text-purple-300">{summary.qlooCalls}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#F4EFE6]/40">Domains</div>
              <div className="text-xs font-semibold text-amber-300 truncate">
                {summary.domainsQueried.length > 0
                  ? summary.domainsQueried.join(", ")
                  : "Deterministic"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#F4EFE6]/40">Cache Hits</div>
              <div className="text-sm font-semibold text-cyan-300">{summary.cacheHits}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#F4EFE6]/40">Total Latency</div>
              <div className="text-sm font-semibold text-emerald-300">
                {summary.totalTimeMs}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
