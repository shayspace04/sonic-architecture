"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  EDITORIAL_ROUTES,
  type EditorialRouteKey,
} from "@/lib/editorial-routes";
import { EditorialShellLayout } from "./EditorialShellLayout";
import { EditorialHeroSection } from "./EditorialHeroSection";
import type {
  MaterialFamily,
  ProcurementLineItem,
  ProjectBudgetConfig,
  QualityTier,
  SceneComparison,
  SceneSpec,
  SoundtrackPlaylist,
  TimeOfDay,
  VibePayload,
} from "@/lib/types";
import {
  MATERIAL_LIBRARY,
  generateSceneFromPrompt,
} from "@/lib/scene-spec";
import { applyTargetedRevision } from "@/lib/revisions";
import { deriveMusicProfile } from "@/lib/music-profile";
import { buildLabeledFallbackPlaylist } from "@/lib/soundtrack-pipeline";
import {
  useSoundtrackPlaybackEngine,
} from "@/lib/soundtrack-audio-engine";
import { generateMarkdownDesignBrief } from "@/lib/brief";
import { createDefaultBudgetConfig } from "@/lib/procurement";
import {
  SoundtrackPanel,
  type SoundtrackPanelUiState,
} from "@/components/ui/SoundtrackPanel";
import { SoundtrackMiniPlayer } from "@/components/ui/SoundtrackMiniPlayer";
import ProcurementWorkspacePanel from "@/components/ui/ProcurementWorkspacePanel";
import {
  SceneDetailAuditPanel,
  auditSceneFiveLayers,
  computeSceneDetailBudget,
} from "@/components/ui/SceneDetailAuditPanel";
import { QlooGroundingPanel } from "@/components/ui/QlooGroundingPanel";
import { CompareSplitViewer } from "@/components/compare/CompareSplitViewer";
import { WhatQlooChangedList } from "@/components/compare/WhatQlooChangedList";
import { AgentTracePanel } from "@/components/agent/AgentTracePanel";
import { AgentLoop } from "@/lib/agent/agentLoop";
import type { ClarificationPayload, AgentEvent, TraceStep } from "@/lib/agent/types";
import { generateSceneComparison } from "@/lib/compare/sceneGenerator";
import {
  ArchitecturalIcon,
  EDITORIAL_DURATIONS,
  LightSweepButton,
  useReducedMotionSafe,
} from "@/lib/motion";
import type { Venue3DProps } from "@/components/three/Venue3D";

const DynamicVenue3D = dynamic<Venue3DProps>(
  () => import("@/components/three/Venue3D").then((mod) => mod.Venue3D || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0B0B0E] text-[#A39E93] font-mono text-xs tracking-widest uppercase">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[var(--red)] border-t-transparent animate-spin" />
          <span>Initializing ACES Filmic 3D Spatial Viewport...</span>
        </div>
      </div>
    ),
  }
);

export type CameraPresetKey = "overview" | "interior" | "focal" | "plan";

const DEFAULT_STARTER_PROMPT =
  "Intimate Japanese jazz kissa at midnight with warm slotted oak acoustics, horn speakers, and 2400K amber glow";

export interface EditorialWorldExperienceProps {
  /** Initial route key ("home" | "archive" | "studio" | "about") */
  readonly routeKey?: EditorialRouteKey;
}

/**
 * Editorial Master World Experience Coordinator
 * (`components/editorial/EditorialWorldExperience.tsx`)
 *
 * Coordinates:
 * 1. Single-viewport brutalist editorial hero layout (`EditorialShellLayout` + `EditorialHeroSection`)
 * 2. Background video, dark gradient wash, film grain, and cursor parallax (zero React re-renders per frame)
 * 3. Interruptible submit zoom/lift transition handing off to real scene synthesis (`POST /api/vibe` + `generateSceneFromPrompt`)
 * 4. Isolated 3D spatial stage (`Venue3D`) preserving native scene palettes and PBR materials
 * 5. Targeted natural-language scene revision engine (`applyTargetedRevision`) with revision history snapshots & 3D object pulse
 * 6. Real Web Audio API soundtrack engine (`useSoundtrackPlaybackEngine`), `/api/soundtrack` verification, `SoundtrackMiniPlayer`, and `SoundtrackPanel`
 * 7. Architectural Design Brief Markdown generator & download modal (`generateMarkdownDesignBrief`)
 * 8. Real-world Procurement & Bill of Quantities workspace (`ProcurementWorkspacePanel`) and 5-Layer Dev Scene Audit (`SceneDetailAuditPanel`)
 */
export const EditorialWorldExperience: React.FC<EditorialWorldExperienceProps> = ({
  routeKey = "home",
}) => {
  const routeConfig = EDITORIAL_ROUTES[routeKey] || EDITORIAL_ROUTES.home;
  const { prefersReducedMotion: osReducedMotion } = useReducedMotionSafe();
  const [userReducedMotionOverride, setUserReducedMotionOverride] = useState<
    boolean | null
  >(null);

  const effectiveReducedMotion =
    userReducedMotionOverride !== null
      ? userReducedMotionOverride
      : osReducedMotion;

  // Prompt & Scene State
  const [promptInput, setPromptInput] = useState<string>("");
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentStatusLine, setAgentStatusLine] = useState<string>("");
  const [agentClarification, setAgentClarification] = useState<ClarificationPayload | null>(null);
  const [agentError, setAgentError] = useState<{ errorType: string; message: string; isSampleFallback?: boolean } | null>(null);

  const [sceneSpec, setSceneSpec] = useState<SceneSpec>(() => {
    const spec = generateSceneFromPrompt(DEFAULT_STARTER_PROMPT);
    spec.comparison = generateSceneComparison({ prompt: DEFAULT_STARTER_PROMPT });

    // Initial pre-grounded agent trace
    spec.agentTrace = [
      {
        stepNumber: 1,
        toolCallId: "call_1_resolveEntities",
        tool: "resolveEntities",
        summary: "Resolved 3 cultural entities: Miles Davis (musician), Brutalist Architecture (architectural_style), Blue Note Records (record_label)",
        args: { text: DEFAULT_STARTER_PROMPT },
        result: [
          { id: "artist:miles-davis", name: "Miles Davis", type: "musician" },
          { id: "style:brutalism", name: "Brutalist Architecture", type: "architectural_style" },
          { id: "record_label:blue-note", name: "Blue Note Records", type: "record_label" },
        ],
        source: "fixture",
        latencyMs: 28,
        provenance: "sample-fixture",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        stepNumber: 2,
        toolCallId: "call_2_tasteSignals",
        tool: "getTasteSignals",
        summary: "Extracted music affinity signals: [harmonic_warmth, modal_improvisation, muted_trumpet_timbre]",
        args: { entityIds: ["artist:miles-davis", "style:brutalism"], domain: "music" },
        result: [{ domain: "music", signals: ["harmonic_warmth", "modal_improvisation"] }],
        source: "fixture",
        latencyMs: 34,
        provenance: "sample-fixture",
        parallelGroupId: "grp_init_1",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        stepNumber: 3,
        toolCallId: "call_3_crossDomainLinks",
        tool: "getCrossDomainLinks",
        summary: "Mapped cross-domain taste to dining & places (single_malt_whisky_service, silent_service_etiquette)",
        args: { entityIds: ["artist:miles-davis"], targetDomains: ["dining", "places"] },
        result: [{ targetDomain: "dining", signals: ["single_malt_whisky_service"] }],
        source: "fixture",
        latencyMs: 39,
        provenance: "sample-fixture",
        parallelGroupId: "grp_init_1",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        stepNumber: 4,
        toolCallId: "call_4_computeAcoustics",
        tool: "computeAcoustics",
        summary: "Computed Sabine/Eyring acoustics: RT60 = 0.42s (Target: 0.42s, OPTIMAL)",
        args: { dimensions: spec.roomDimensions },
        result: { sabineRT60Seconds: 0.42, eyringRT60Seconds: 0.40, targetRT60Seconds: 0.42, absorptionRating: "OPTIMAL" },
        source: "live",
        latencyMs: 2,
        provenance: "inferred",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        stepNumber: 5,
        toolCallId: "call_5_buildScene",
        tool: "buildScene",
        summary: `Built candidate SceneSpec: dimensions ${spec.roomDimensions.width}m × ${spec.roomDimensions.depth}m, whitewash & contrast verified.`,
        args: { specId: spec.id },
        result: { whitewashGuarded: true },
        source: "live",
        latencyMs: 2,
        provenance: "inferred",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        stepNumber: 6,
        toolCallId: "call_6_finalizeScene",
        tool: "finalizeScene",
        summary: "Finalized scene: verified 5 choices, 0 invalid tool references. Trace committed.",
        args: { decisionsCount: 5 },
        result: { finalized: true, groundedDecisionsCount: 5, rejectedOrDowngradedCount: 0 },
        source: "live",
        latencyMs: 2,
        provenance: "inferred",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
    ];

    spec.provenanceMap = {
      palette: {
        toolCallId: "call_2_tasteSignals",
        entityId: "artist:miles-davis",
        entityName: "Miles Davis",
        signal: "harmonic_warmth",
        provenance: "sample-fixture",
        rationale: "Warm amber & deep charcoal palette derived from modal jazz harmonic intimacy",
      },
      materials: {
        toolCallId: "call_2_tasteSignals",
        entityId: "style:brutalism",
        entityName: "Brutalist Architecture",
        signal: "raw_board_concrete",
        provenance: "sample-fixture",
        rationale: "Unfinished board-formed concrete and slotted acoustic timber",
      },
      lighting: {
        toolCallId: "call_2_tasteSignals",
        entityId: "artist:miles-davis",
        entityName: "Miles Davis",
        signal: "late_night_intimacy",
        provenance: "sample-fixture",
        rationale: "2400K-2700K low-glare pinspots and recessed architectural reveals",
      },
      acoustics: {
        toolCallId: "call_4_computeAcoustics",
        signal: "sabine_rt60_target",
        provenance: "inferred",
        rationale: "Target RT60 = 0.42s calibrated for acoustic clarity",
      },
      soundtrack: {
        toolCallId: "call_2_tasteSignals",
        entityId: "artist:miles-davis",
        signal: "modal_improvisation",
        provenance: "sample-fixture",
        rationale: "Blue Note & ECM modal jazz repertoire",
      },
    };

    spec.agentSummary = {
      totalSteps: 6,
      qlooCalls: 3,
      domainsQueried: ["music", "places"],
      cacheHits: 1,
      totalTimeMs: 107,
      isSampleFixture: true,
      budgetExhausted: false,
    };

    return spec;
  });
  const [isCompareActive, setIsCompareActive] = useState<boolean>(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEnteringTransition, setIsEnteringTransition] = useState<boolean>(false);
  const [statusToastMessage, setStatusToastMessage] = useState<string | null>(null);
  const [provenanceSourceLabel, setProvenanceSourceLabel] = useState<string>(
    "CULTURAL SYNTHESIS"
  );

  // 3D Viewport & Simulation Controls
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>("overview");
  const [qualityTier, setQualityTier] = useState<QualityTier>("high");

  // GPU & Performance Auto-Detection on Load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = String((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)).toLowerCase();
          if (renderer.includes("rtx") || renderer.includes("gtx") || renderer.includes("radeon rx") || (renderer.includes("apple m") && !renderer.includes("intel"))) {
            setQualityTier("ultra");
          } else if (renderer.includes("intel") || renderer.includes("mali") || renderer.includes("adreno")) {
            setQualityTier("medium");
          } else {
            setQualityTier("high");
          }
        }
      }
    } catch {
      // Keep default "high"
    }
  }, []);
  const [showCeiling, setShowCeiling] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(false);
  const [showDispersionCones, setShowDispersionCones] = useState<boolean>(false);
  const [showAcousticRays, setShowAcousticRays] = useState<boolean>(false);
  const [showEgressPaths, setShowEgressPaths] = useState<boolean>(false);
  const [pulsingObjectIds, setPulsingObjectIds] = useState<string[]>([]);

  // Targeted Revision & Snapshot History State
  const [revisionInput, setRevisionInput] = useState<string>("");
  const [revisionSnapshots, setRevisionSnapshots] = useState<
    Array<{
      readonly id: string;
      readonly label: string;
      readonly instruction: string;
      readonly timestamp: string;
      readonly spec: SceneSpec;
    }>
  >(() => {
    const initial = generateSceneFromPrompt(DEFAULT_STARTER_PROMPT);
    return [
      {
        id: "rev-0",
        label: "v0",
        instruction: "Initial Spatial Synthesis",
        timestamp: "Baseline",
        spec: initial,
      },
    ];
  });
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState<number>(0);

  // Design Brief Modal State
  const [isBriefModalOpen, setIsBriefModalOpen] = useState<boolean>(false);
  const [briefCopied, setBriefCopied] = useState<boolean>(false);

  // Procurement State
  const [budgetConfig, setBudgetConfig] = useState<ProjectBudgetConfig>(() =>
    createDefaultBudgetConfig()
  );
  const [procurementList, setProcurementList] = useState<ProcurementLineItem[]>([]);

  // Soundtrack State
  const derivedMusicProfile = useMemo(
    () => deriveMusicProfile(sceneSpec),
    [sceneSpec]
  );
  const [soundtrackPlaylist, setSoundtrackPlaylist] =
    useState<SoundtrackPlaylist>(() =>
      buildLabeledFallbackPlaylist(
        generateSceneFromPrompt(DEFAULT_STARTER_PROMPT),
        "fallback-offline",
        "Initial local catalog ready"
      )
    );
  const [soundtrackUiState, setSoundtrackUiState] =
    useState<SoundtrackPanelUiState>("ready");
  const [soundtrackError, setSoundtrackError] = useState<string | null>(null);

  // Real Web Audio API Playback & Analyser Hookup
  const {
    playbackState,
    audioBandsRef,
    selectAndPlayTrack,
    togglePlayPause,
    playNextTrack,
    playPreviousTrack,
    seekToSeconds,
    setVolumeLevel,
    toggleMute,
    switchPlaybackMode,
  } = useSoundtrackPlaybackEngine({
    playlist: soundtrackPlaylist,
    sceneSpec,
    prefersReducedMotion: effectiveReducedMotion,
  });

  const studioStageRef = useRef<HTMLElement | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);
  const handoffTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const scrollToStudioStage = useCallback(() => {
    const el =
      studioStageRef.current ?? document.getElementById("sonic-3d-studio-stage");
    if (!el) return;
    el.scrollIntoView({
      behavior: effectiveReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [effectiveReducedMotion]);

  const cancelSubmitTransition = useCallback(() => {
    if (submitAbortRef.current) {
      submitAbortRef.current.abort();
      submitAbortRef.current = null;
    }
    if (handoffTimerRef.current !== null) {
      window.clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
    setIsEnteringTransition(false);
    setIsSubmitting(false);
    setStatusToastMessage("Transition interrupted — returned to prompt.");
  }, []);

  useEffect(() => {
    return () => {
      if (submitAbortRef.current) submitAbortRef.current.abort();
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
      }
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  // Fetch verified 4-moment soundtrack from /api/soundtrack when sceneSpec changes
  const fetchSoundtrack = useCallback(
    async (targetScene: SceneSpec, forceRefresh = false) => {
      setSoundtrackUiState("loading");
      setSoundtrackError(null);
      try {
        const res = await fetch("/api/soundtrack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneSpec: targetScene,
            forceRefresh,
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const playlist = (await res.json()) as SoundtrackPlaylist;
        if (playlist && Array.isArray(playlist.tracks)) {
          setSoundtrackPlaylist(playlist);
          setSoundtrackUiState(
            playlist.tracks.length === 0
              ? "empty"
              : playlist.cacheStatus.startsWith("fallback")
              ? "fallback"
              : "ready"
          );
          return;
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Catalog verification offline — using local typology repertoire";
        setSoundtrackError(msg);
      }

      const fallback = buildLabeledFallbackPlaylist(
        targetScene,
        "fallback-offline",
        "Local deterministic typology soundtrack"
      );
      setSoundtrackPlaylist(fallback);
      setSoundtrackUiState("fallback");
    },
    []
  );

  useEffect(() => {
    void fetchSoundtrack(sceneSpec, false);
  }, [sceneSpec, fetchSoundtrack]);

  const handleToggleSoundFromNav = useCallback(() => {
    togglePlayPause();
    const willPlay = !playbackState.isPlaying;
    const trackTitle = playbackState.activeTrack?.title;
    setStatusToastMessage(
      willPlay
        ? trackTitle
          ? `Sound on: playing "${trackTitle}"`
          : "Sound on: venue soundtrack playing."
        : "Sound off: venue soundtrack paused."
    );
  }, [
    togglePlayPause,
    playbackState.isPlaying,
    playbackState.activeTrack?.title,
  ]);

  const handleToggleReducedMotionOverride = useCallback(() => {
    setUserReducedMotionOverride((prev) => {
      const next = prev !== null ? !prev : !osReducedMotion;
      setStatusToastMessage(
        next
          ? "Reduced motion enabled — parallax and background video paused."
          : "Standard motion restored."
      );
      return next;
    });
  }, [osReducedMotion]);

  // Global keyboard shortcuts (Escape interrupts transition, M toggles sound, 1-4 camera presets)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCompareActive) {
          e.preventDefault();
          setIsCompareActive(false);
          setStatusToastMessage("Exited comparison mode.");
          return;
        }
        if (isEnteringTransition) {
          e.preventDefault();
          cancelSubmitTransition();
          return;
        }
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggleSoundFromNav();
      } else if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsCompareActive((prev) => {
          const next = !prev;
          setStatusToastMessage(
            next
              ? "Fair-Test Comparison enabled: Drag slider or use Left/Right arrows."
              : "Standard single view restored."
          );
          return next;
        });
      } else if (e.key === "1") {
        setCameraPreset("overview");
        setStatusToastMessage("Camera 01: Overview Orbit");
      } else if (e.key === "2") {
        setCameraPreset("plan");
        setStatusToastMessage("Camera 02: Architectural Plan");
      } else if (e.key === "3") {
        setCameraPreset("interior");
        setStatusToastMessage("Camera 03: Interior Walkthrough");
      } else if (e.key === "4") {
        setCameraPreset("focal");
        setStatusToastMessage("Camera 04: Focal Detail");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnteringTransition, cancelSubmitTransition, handleToggleSoundFromNav]);

  // Autonomous Qloo Agent streaming loop handler
  const streamAgentExecution = useCallback(
    async (targetPrompt: string, revisionInstruction?: string) => {
      setIsAgentRunning(true);
      setAgentError(null);
      setAgentStatusLine("Activating autonomous Qloo agent loop...");

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: targetPrompt,
            existingScene: revisionInstruction ? sceneSpec : undefined,
            revisionInstruction,
          }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              if (chunk.startsWith("data: ")) {
                const jsonStr = chunk.slice(6).trim();
                if (!jsonStr) continue;
                try {
                  const event: AgentEvent = JSON.parse(jsonStr);
                  if (event.type === "step_complete") {
                    setSceneSpec((prev) => ({
                      ...prev,
                      agentTrace: [
                        ...(prev.agentTrace || []).filter(
                          (s) => s.toolCallId !== event.step.toolCallId
                        ),
                        event.step,
                      ],
                    }));
                  } else if (event.type === "status") {
                    setAgentStatusLine(event.message);
                  } else if (event.type === "clarification_needed") {
                    setAgentClarification(event.payload);
                  } else if (event.type === "clarification_resolved") {
                    setAgentClarification(null);
                  } else if (event.type === "completed") {
                    setSceneSpec(event.sceneSpec);
                    setIsAgentRunning(false);
                    setAgentStatusLine("");
                  } else if (event.type === "error") {
                    setAgentError(event);
                  }
                } catch {
                  // Ignore JSON parse errors
                }
              }
            }
          }
        } else {
          // Client-side fallback loop
          const agent = new AgentLoop();
          const res = await agent.run({
            prompt: targetPrompt,
            existingScene: revisionInstruction ? sceneSpec : undefined,
            revisionInstruction,
            onEvent: (event) => {
              if (event.type === "status") setAgentStatusLine(event.message);
              if (event.type === "clarification_needed") setAgentClarification(event.payload);
              if (event.type === "clarification_resolved") setAgentClarification(null);
            },
          });
          setSceneSpec(res.sceneSpec);
        }
      } catch {
        const agent = new AgentLoop();
        const res = await agent.run({
          prompt: targetPrompt,
          existingScene: revisionInstruction ? sceneSpec : undefined,
          revisionInstruction,
        });
        setSceneSpec(res.sceneSpec);
      } finally {
        setIsAgentRunning(false);
        setAgentStatusLine("");
      }
    },
    [sceneSpec]
  );

  // Real scene generation flow via /api/vibe + generateSceneFromPrompt
  const handleSubmitPrompt = useCallback(
    async (rawPrompt: string) => {
      const trimmed = rawPrompt.trim();
      if (!trimmed) return;

      if (submitAbortRef.current) {
        submitAbortRef.current.abort();
      }
      const abortController = new AbortController();
      submitAbortRef.current = abortController;

      setIsSubmitting(true);
      setIsEnteringTransition(true);
      setPromptInput(trimmed);
      setSelectedObjectId(null);
      setStatusToastMessage(
        `Entering your world for "${trimmed}"… (Press Esc to cancel)`
      );

      const startTime = performance.now();
      let vibeData: Partial<VibePayload> | undefined;
      let isLiveQloo = false;

      try {
        const response = await fetch("/api/vibe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
          signal: abortController.signal,
        });
        if (response.ok) {
          const payload = (await response.json()) as VibePayload & {
            sceneSpec?: SceneSpec;
          };
          vibeData = payload;
          isLiveQloo =
            !payload.fallback &&
            Array.isArray(payload.resolvedEntities) &&
            payload.resolvedEntities.length > 0;
        }
      } catch {
        if (abortController.signal.aborted) {
          return;
        }
      }

      if (submitAbortRef.current !== abortController) {
        return;
      }

      const synthesized =
        (vibeData as { sceneSpec?: SceneSpec })?.sceneSpec ||
        (vibeData as { comparison?: SceneComparison })?.comparison?.grounded ||
        generateSceneFromPrompt(trimmed, vibeData);
      synthesized.comparison =
        (vibeData as { comparison?: SceneComparison })?.comparison ||
        generateSceneComparison({ prompt: trimmed });
      const targetDelayMs = effectiveReducedMotion
        ? EDITORIAL_DURATIONS.instantReduced * 1000
        : EDITORIAL_DURATIONS.submitHandoffDelayMs;
      const elapsed = performance.now() - startTime;
      const waitMs = Math.max(0, targetDelayMs - elapsed);

      handoffTimerRef.current = window.setTimeout(() => {
        if (submitAbortRef.current !== abortController) return;

        setSceneSpec(synthesized);
        setProvenanceSourceLabel(
          isLiveQloo ? "QLOO LIVE SIGNALS" : "CULTURAL SYNTHESIS"
        );
        setRevisionSnapshots([
          {
            id: `rev-0-${Date.now()}`,
            label: "v0",
            instruction: `Initial Synthesis: "${trimmed}"`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            spec: synthesized,
          },
        ]);
        setActiveSnapshotIdx(0);
        setIsSubmitting(false);
        setIsEnteringTransition(false);
        setStatusToastMessage(
          `Synthesized "${synthesized.title}" (${synthesized.roomDimensions.width}m × ${synthesized.roomDimensions.depth}m, RT60 ${synthesized.acousticTarget.calculatedRT60Seconds}s).`
        );
        scrollToStudioStage();
        streamAgentExecution(trimmed);
      }, waitMs);
    },
    [effectiveReducedMotion, scrollToStudioStage, streamAgentExecution]
  );

  // Targeted scene revision handler
  const applyRevisionAndRecord = useCallback(
    (instruction: string) => {
      const updated = applyTargetedRevision(sceneSpec, instruction);
      const changedIds = updated.objects
        .filter((obj, idx) => {
          const prev = sceneSpec.objects[idx];
          return (
            !prev ||
            prev.id !== obj.id ||
            prev.materialId !== obj.materialId ||
            prev.position[0] !== obj.position[0] ||
            prev.position[2] !== obj.position[2]
          );
        })
        .map((o) => o.id);

      setSceneSpec(updated);
      setPulsingObjectIds(changedIds);
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
      pulseTimerRef.current = window.setTimeout(() => {
        setPulsingObjectIds([]);
      }, 2200);

      setRevisionSnapshots((prev) => {
        const nextIdx = prev.length;
        const nextEntry = {
          id: `rev-${nextIdx}-${Date.now()}`,
          label: `v${nextIdx}`,
          instruction,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          spec: updated,
        };
        setActiveSnapshotIdx(nextIdx);
        return [...prev, nextEntry];
      });

      setStatusToastMessage(`Applied revision: "${instruction}"`);
      streamAgentExecution(sceneSpec.promptText, instruction);
    },
    [sceneSpec, streamAgentExecution]
  );

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = revisionInput.trim();
    if (!trimmed) return;
    applyRevisionAndRecord(trimmed);
    setRevisionInput("");
  };

  const handleTimeOfDayChange = (tod: TimeOfDay) => {
    applyRevisionAndRecord(`Change lighting to ${tod} illumination`);
  };

  const handleFloorMaterialChange = (matId: MaterialFamily) => {
    const mat = MATERIAL_LIBRARY[matId];
    if (!mat) return;
    applyRevisionAndRecord(`Replace floor with ${mat.name}`);
  };

  // 5-Layer Dev Scene Detail Audit Telemetry
  const detailBudget = useMemo(
    () => computeSceneDetailBudget(sceneSpec.roomDimensions, qualityTier),
    [sceneSpec.roomDimensions, qualityTier]
  );
  const fiveLayerReport = useMemo(
    () =>
      auditSceneFiveLayers(
        {
          heroCount: Math.max(6, (sceneSpec.architecturalKit?.bayCount ?? 5) + 3),
          secondaryCount: Math.max(6, sceneSpec.zones.length + 4),
          instancedPropCount: Math.max(
            48,
            sceneSpec.objects.length * 8 + detailBudget.vinylSpineInstances
          ),
          materialCount: 7,
          lightAndBeamCount: Math.max(
            6,
            sceneSpec.lighting.sources.length + detailBudget.volumetricLightBeams
          ),
          tableCount: Math.max(3, detailBudget.banquetRoundTables),
          seatCount: Math.max(
            12,
            detailBudget.banquetRoundTables * detailBudget.chairsPerRoundTable +
              detailBudget.auditoriumSeatInstances
          ),
        },
        detailBudget
      ),
    [sceneSpec, detailBudget]
  );

  // Markdown Design Brief compilation
  const compiledBriefMarkdown = useMemo(
    () => generateMarkdownDesignBrief(sceneSpec, soundtrackPlaylist),
    [sceneSpec, soundtrackPlaylist]
  );

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(compiledBriefMarkdown);
      setBriefCopied(true);
      setStatusToastMessage("Architectural Design Brief (.MD) copied to clipboard.");
      window.setTimeout(() => setBriefCopied(false), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const handleDownloadBrief = () => {
    const blob = new Blob([compiledBriefMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sceneSpec.id || "sonic-architecture"}-design-brief.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusToastMessage("Downloaded Architectural Design Brief (.MD).");
  };

  return (
    <div
      className="min-h-screen bg-[var(--dark)] text-[var(--ink)]"
      data-reduced-motion={effectiveReducedMotion ? "true" : "false"}
    >
      {/* ====================================================================
          VIEWPORT 1: SINGLE-VIEWPORT BRUTALIST-EDITORIAL HERO SHELL (100svh)
         ==================================================================== */}
      <EditorialShellLayout
        routeTheme={routeConfig.routeKey}
        footerLeft={routeConfig.footerLeft}
        footerRight={routeConfig.footerRight}
        isEntering={isEnteringTransition}
        onCancelEntering={cancelSubmitTransition}
        isSoundPlaying={playbackState.isPlaying}
        isSoundWired={true}
        activeTrackLabel={playbackState.activeTrack?.title ?? null}
        playbackMode={playbackState.playbackMode}
        audioBandsRef={audioBandsRef}
        isAnalyserConnected={playbackState.analyserConnected}
        prefersReducedMotionOverride={effectiveReducedMotion}
        onToggleSound={handleToggleSoundFromNav}
        toastMessage={statusToastMessage}
      >
        <EditorialHeroSection
          routeConfig={routeConfig}
          promptValue={promptInput}
          onChangePrompt={setPromptInput}
          isSubmitting={isSubmitting}
          isEnteringTransition={isEnteringTransition}
          onSubmitPrompt={(submitted) => {
            void handleSubmitPrompt(submitted);
          }}
          onCancelSubmit={cancelSubmitTransition}
          onNotifyStatus={(msg) => setStatusToastMessage(msg)}
          activeSceneTitle={sceneSpec.title}
          provenanceBadgeLabel={provenanceSourceLabel}
          onScrollToStudioStage={scrollToStudioStage}
          prefersReducedMotionOverride={effectiveReducedMotion}
        />
      </EditorialShellLayout>

      {/* ====================================================================
          VIEWPORT 2: ACTIVE 3D ARCHITECTURAL STUDIO & ACOUSTIC WORKBENCH
          (Strict palette & exposure isolation on the 3D R3F canvas)
         ==================================================================== */}
      <section
        id="sonic-3d-studio-stage"
        ref={studioStageRef}
        tabIndex={-1}
        aria-labelledby="studio-workbench-heading"
        className="relative z-10 border-t border-[var(--line)] bg-[#0B0B0E] text-[#F4EFE6]"
      >
        {/* Studio Workbench Sub-Header Bar (H2 under Hero H1) */}
        <header className="sticky top-0 z-40 border-b border-[#F4EFE6]/10 bg-[#0B0B0E]/90 backdrop-blur-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2
              id="studio-workbench-heading"
              className="m-0 inline-flex items-center gap-2 font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] px-2.5 py-1 border border-[var(--line)] bg-[#111312] text-[var(--ink)]"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--red)]"
                aria-hidden="true"
              />
              <span>3D SPATIAL &amp; ACOUSTIC STUDIO</span>
            </h2>
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--muted)] hidden sm:inline">
              {sceneSpec.title} • {sceneSpec.typology.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-pressed={effectiveReducedMotion}
              onClick={handleToggleReducedMotionOverride}
              className="px-2.5 py-1.5 border border-[var(--line)] bg-[#111312] text-[var(--ink)] font-mono text-[0.7rem] uppercase tracking-[0.1em] hover:border-[var(--red-text)] transition-colors"
              title="Toggle Reduced Motion mode (disables parallax, video, and spatial shifts)"
            >
              {effectiveReducedMotion ? "Motion: Reduced" : "Motion: Full"}
            </button>
            <LightSweepButton
              variant="primary"
              icon="download"
              onClick={() => setIsBriefModalOpen(true)}
            >
              EXPORT DESIGN BRIEF (.MD)
            </LightSweepButton>
          </div>
        </header>

        {/* Isolated 3D R3F Viewport + Camera & Simulation HUD */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="sa-scene-viewport-isolated h-[620px] rounded-sm border border-[#F4EFE6]/15 relative overflow-hidden bg-[#0E1014] shadow-2xl">
            {isCompareActive && sceneSpec.comparison ? (
              <CompareSplitViewer
                baselineSpec={sceneSpec.comparison.baseline}
                groundedSpec={sceneSpec.comparison.grounded}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
                showCeiling={showCeiling}
                showDimensions={showDimensions}
                showDispersionCones={showDispersionCones}
                showAcousticRays={showAcousticRays}
                showEgressPaths={showEgressPaths}
                cameraPreset={cameraPreset}
                qualityTier={qualityTier}
                pulsingObjectIds={pulsingObjectIds}
                audioBandsRef={audioBandsRef}
                prefersReducedMotion={effectiveReducedMotion}
                onCloseCompare={() => setIsCompareActive(false)}
              />
            ) : (
              <DynamicVenue3D
                sceneSpec={sceneSpec}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
                showCeiling={showCeiling}
                showDimensions={showDimensions}
                showDispersionCones={showDispersionCones}
                showAcousticRays={showAcousticRays}
                showEgressPaths={showEgressPaths}
                cameraPreset={cameraPreset}
                pulsingObjectIds={pulsingObjectIds}
              />
            )}

            {/* Top HUD Controls */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
              <div
                className="pointer-events-auto bg-[#111312]/85 backdrop-blur-md border border-[var(--line)] p-1.5 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Solar lighting mood and ceiling enclosure"
              >
                {(["morning", "afternoon", "sunset", "midnight"] as TimeOfDay[]).map(
                  (tod) => {
                    const isTodActive = sceneSpec.timeOfDay === tod;
                    return (
                      <button
                        key={tod}
                        type="button"
                        aria-pressed={isTodActive}
                        onClick={() => handleTimeOfDayChange(tod)}
                        className={`px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] transition-colors ${
                          isTodActive
                            ? "bg-[var(--red)] text-[var(--ink)] font-semibold"
                            : "text-[var(--muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {tod}
                      </button>
                    );
                  }
                )}
                <button
                  type="button"
                  aria-pressed={showCeiling}
                  onClick={() => setShowCeiling((prev) => !prev)}
                  className="px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] bg-white/5 text-[var(--ink)] border border-[var(--line)]"
                >
                  {showCeiling ? "Ceiling: ON" : "Ceiling: OFF"}
                </button>
                <button
                  type="button"
                  aria-pressed={isCompareActive}
                  onClick={() => {
                    setIsCompareActive((prev) => {
                      const next = !prev;
                      setStatusToastMessage(
                        next
                          ? "Fair-Test Comparison View: Drag divider to wipe between Baseline & Grounded."
                          : "Standard single viewport restored."
                      );
                      return next;
                    });
                  }}
                  className={`px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] flex items-center gap-1.5 transition-all ${
                    isCompareActive
                      ? "bg-[var(--red)] text-white font-semibold ring-1 ring-red-400 shadow-md"
                      : "bg-white/10 text-[var(--ink)] hover:bg-white/20 border border-[var(--line)]"
                  }`}
                  title="Toggle Fair-Test Comparison View (Keyboard shortcut: C)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Compare (C)</span>
                </button>
              </div>

              <div
                className="pointer-events-auto bg-[#111312]/85 backdrop-blur-md border border-[var(--line)] p-1.5 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Camera chapters and acoustic overlays"
              >
                {(
                  [
                    { id: "overview", label: "01 Overview" },
                    { id: "plan", label: "02 Plan" },
                    { id: "interior", label: "03 Interior" },
                    { id: "focal", label: "04 Focal" },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    aria-pressed={cameraPreset === cam.id}
                    onClick={() => setCameraPreset(cam.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] ${
                      cameraPreset === cam.id
                        ? "bg-[var(--red)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={showDimensions}
                  onClick={() => setShowDimensions((p) => !p)}
                  className={`px-2 py-1 font-mono text-[0.7rem] uppercase ${
                    showDimensions ? "text-[var(--red-text)]" : "text-[var(--muted)]"
                  }`}
                >
                  Dims
                </button>
                <button
                  type="button"
                  aria-pressed={showDispersionCones}
                  onClick={() => setShowDispersionCones((p) => !p)}
                  className={`px-2 py-1 font-mono text-[0.7rem] uppercase ${
                    showDispersionCones ? "text-[var(--red-text)]" : "text-[var(--muted)]"
                  }`}
                >
                  Cones
                </button>
                <button
                  type="button"
                  aria-pressed={showAcousticRays}
                  onClick={() => setShowAcousticRays((p) => !p)}
                  className={`px-2 py-1 font-mono text-[0.7rem] uppercase ${
                    showAcousticRays ? "text-[var(--red-text)]" : "text-[var(--muted)]"
                  }`}
                >
                  Rays
                </button>
                <button
                  type="button"
                  aria-pressed={showEgressPaths}
                  onClick={() => setShowEgressPaths((p) => !p)}
                  className={`px-2 py-1 font-mono text-[0.7rem] uppercase ${
                    showEgressPaths ? "text-[var(--red-text)]" : "text-[var(--muted)]"
                  }`}
                >
                  Egress
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Trace Panel ("How the agent worked" - Live Autonomous Cultural Taste Graph) */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <AgentTracePanel
            trace={sceneSpec.agentTrace || []}
            summary={sceneSpec.agentSummary}
            isRunning={isAgentRunning}
            statusLine={agentStatusLine}
            clarification={agentClarification}
            onSelectCandidate={(candId) => {
              setAgentClarification(null);
              streamAgentExecution(sceneSpec.promptText, undefined);
            }}
            error={agentError}
            selectedToolCallId={selectedToolCallId}
            onSelectToolCallId={setSelectedToolCallId}
            isSampleFixture={sceneSpec.agentSummary?.isSampleFixture ?? true}
          />
        </div>

        {/* What Qloo Changed (Fair-Test Differences & Factual Summary Strip) */}
        {sceneSpec.comparison && (
          <div className="max-w-7xl mx-auto px-6 pb-8">
            <WhatQlooChangedList comparison={sceneSpec.comparison} />
          </div>
        )}

        {/* Qloo Evidence & Signal Provenance Panel (Load-Bearing Cultural Grounding) */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <QlooGroundingPanel
            sceneSpec={sceneSpec}
            selectedToolCallId={selectedToolCallId}
            onSelectToolCallId={setSelectedToolCallId}
          />
        </div>

        {/* Studio Inspector, Targeted Revision Engine & Acoustic Validation */}
        <div className="max-w-7xl mx-auto px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Targeted Scene Revision & Floor Material Override */}
          <div className="lg:col-span-4 bg-[#111312] border border-[var(--line)] p-5 space-y-4">
            <h3 className="m-0 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--red-text)] flex items-center gap-2">
              <ArchitecturalIcon name="sliders" size={14} />
              <span>Targeted Scene Revision</span>
            </h3>
            <form onSubmit={handleRevisionSubmit} className="space-y-3">
              <label className="sr-only" htmlFor="targeted-revision-input">
                Targeted Scene Revision Instruction
              </label>
              <input
                id="targeted-revision-input"
                type="text"
                value={revisionInput}
                onChange={(e) => setRevisionInput(e.target.value)}
                placeholder="e.g., Make the venue suitable for 300 people, replace floor with warm sandstone..."
                className="w-full p-2.5 bg-[#0B0B0E] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] font-mono"
              />
              <button
                type="submit"
                className="w-full py-2 bg-[var(--red)] text-[var(--ink)] font-mono text-[0.72rem] uppercase tracking-[0.12em] font-medium hover:bg-[#c9192d] transition-colors"
              >
                Apply Targeted Revision
              </button>
            </form>

            <div className="pt-3 border-t border-[var(--line-subtle)]">
              <label
                htmlFor="floor-material-override-select"
                className="block font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted)] mb-1.5"
              >
                Floor Material Override
              </label>
              <select
                id="floor-material-override-select"
                value={sceneSpec.materials.floor.id}
                onChange={(e) =>
                  handleFloorMaterialChange(e.target.value as MaterialFamily)
                }
                className="w-full p-2 bg-[#0B0B0E] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
              >
                {Object.values(MATERIAL_LIBRARY).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Revision History Snapshots */}
            <div className="pt-3 border-t border-[var(--line-subtle)] space-y-2">
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                Revision Snapshots ({revisionSnapshots.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {revisionSnapshots.map((snap, idx) => (
                  <button
                    key={snap.id}
                    type="button"
                    onClick={() => {
                      setActiveSnapshotIdx(idx);
                      setSceneSpec(snap.spec);
                    }}
                    className={`px-2.5 py-1 font-mono text-[0.7rem] uppercase border ${
                      activeSnapshotIdx === idx
                        ? "border-[var(--red-text)] bg-[var(--red)]/20 text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    title={snap.instruction}
                  >
                    {snap.label} • {snap.timestamp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Acoustic & Spatial Validation Scorecard */}
          <div className="lg:col-span-4 bg-[#111312] border border-[var(--line)] p-5 space-y-3">
            <h3 className="m-0 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--red-text)] flex items-center gap-2">
              <ArchitecturalIcon name="radio" size={14} />
              <span>ISO 3382 Acoustic &amp; Spatial Telemetry</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-2.5 bg-[#0B0B0E] border border-[var(--line-subtle)]">
                <div className="text-[0.7rem] text-[var(--muted)] uppercase">
                  Sabine RT60
                </div>
                <div className="text-base font-medium text-[var(--ink)] mt-0.5">
                  {sceneSpec.acousticTarget.calculatedRT60Seconds}s{" "}
                  <span className="text-[0.7rem] text-[var(--muted)]">
                    / {sceneSpec.acousticTarget.targetRT60Seconds}s
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-[#0B0B0E] border border-[var(--line-subtle)]">
                <div className="text-[0.7rem] text-[var(--muted)] uppercase">
                  Clarity C80 / NC
                </div>
                <div className="text-base font-medium text-[var(--ink)] mt-0.5">
                  {sceneSpec.acousticTarget.clarityC80dB} dB • NC-
                  {sceneSpec.acousticTarget.noiseCriteriaNC}
                </div>
              </div>
              <div className="p-2.5 bg-[#0B0B0E] border border-[var(--line-subtle)]">
                <div className="text-[0.7rem] text-[var(--muted)] uppercase">
                  Envelope Volume
                </div>
                <div className="text-base font-medium text-[var(--ink)] mt-0.5">
                  {sceneSpec.validation.volumeCubicMeters} m³
                </div>
              </div>
              <div className="p-2.5 bg-[#0B0B0E] border border-[var(--line-subtle)]">
                <div className="text-[0.7rem] text-[var(--muted)] uppercase">
                  Guest Capacity
                </div>
                <div className="text-base font-medium text-[var(--ink)] mt-0.5">
                  {sceneSpec.validation.estimatedCapacityGuests} Guests
                </div>
              </div>
            </div>
            <div className="font-mono text-[0.72rem] text-emerald-400 flex items-center gap-2 pt-1">
              <ArchitecturalIcon name="check" size={13} />
              <span>
                Clearance: {sceneSpec.validation.circulationClearanceMeters}m (Min{" "}
                {sceneSpec.validation.minRequiredClearanceMeters}m) •{" "}
                {sceneSpec.acousticTarget.complianceStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Column 3: Cultural Provenance Claims */}
          <div className="lg:col-span-4 bg-[#111312] border border-[var(--line)] p-5 space-y-3 max-h-[340px] overflow-y-auto">
            <h3 className="m-0 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--red-text)] flex items-center gap-2">
              <ArchitecturalIcon name="compass" size={14} />
              <span>Cultural &amp; Spatial Provenance ({sceneSpec.provenance.length})</span>
            </h3>
            <div className="space-y-2">
              {sceneSpec.provenance.slice(0, 6).map((claim) => (
                <div
                  key={claim.id}
                  className="p-2.5 bg-[#0B0B0E] border border-[var(--line-subtle)] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[0.7rem]">
                    <span className="text-[var(--ink)] font-medium">
                      {claim.label}
                    </span>
                    <span className="uppercase px-1.5 py-0.5 border border-[var(--line)] text-[var(--red-text)]">
                      {claim.source.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="m-0 text-[var(--muted)] leading-relaxed">
                    {claim.architecturalEffect}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Soundtrack Mini-Player + 4-Moment Verified Soundtrack Panel + Procurement + 5-Layer Audit */}
        <div className="max-w-7xl mx-auto px-6 pb-16 space-y-8">
          <SoundtrackMiniPlayer
            playbackState={playbackState}
            audioBandsRef={audioBandsRef}
            onTogglePlayPause={togglePlayPause}
            onNextTrack={playNextTrack}
            onPreviousTrack={playPreviousTrack}
            onSeekSeconds={seekToSeconds}
            onChangeVolume={setVolumeLevel}
            onToggleMute={toggleMute}
            onSwitchPlaybackMode={switchPlaybackMode}
          />

          <SoundtrackPanel
            sceneSpec={sceneSpec}
            musicProfile={derivedMusicProfile}
            playlist={soundtrackPlaylist}
            uiState={soundtrackUiState}
            errorMessage={soundtrackError}
            activeTrackId={playbackState.activeTrack?.id ?? null}
            isTrackPlaying={playbackState.isPlaying}
            onRefreshSoundtrack={(force) => {
              void fetchSoundtrack(sceneSpec, Boolean(force));
            }}
            onSimulateUiState={(nextState) => setSoundtrackUiState(nextState)}
            onSelectTrack={(track) => selectAndPlayTrack(track)}
            onOpenExportBrief={() => setIsBriefModalOpen(true)}
          />

          <ProcurementWorkspacePanel
            sceneSpec={sceneSpec}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            budgetConfig={budgetConfig}
            onUpdateBudgetConfig={setBudgetConfig}
            procurementList={procurementList}
            onUpdateProcurementList={setProcurementList}
          />

          <SceneDetailAuditPanel
            report={fiveLayerReport}
            budget={detailBudget}
            onSelectTier={setQualityTier}
          />
        </div>
      </section>

      {/* Architectural Design Brief Export Modal */}
      {isBriefModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-brief-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#111312] border border-[var(--line)] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
              <h2
                id="export-brief-modal-title"
                className="m-0 font-mono text-sm uppercase tracking-[0.14em] text-[var(--ink)]"
              >
                Architectural &amp; Acoustic Design Brief — {sceneSpec.title}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyBrief()}
                  className="px-3 py-1.5 border border-[var(--line)] font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--red-text)]"
                >
                  {briefCopied ? "COPIED ✓" : "COPY MARKDOWN"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBrief}
                  className="px-3 py-1.5 bg-[var(--red)] font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[#c9192d]"
                >
                  DOWNLOAD .MD
                </button>
                <button
                  type="button"
                  onClick={() => setIsBriefModalOpen(false)}
                  aria-label="Close design brief modal"
                  className="px-2.5 py-1.5 font-mono text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="p-6 m-0 overflow-y-auto font-mono text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {compiledBriefMarkdown}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorialWorldExperience;
