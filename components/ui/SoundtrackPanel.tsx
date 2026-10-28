"use client";

/**
 * Sonic Architecture — Step 3 & Step 5: Soundtrack Panel UI, Provenance Badges,
 * "Copy Track List", Multi-Platform "Open in Search" Links & Brief Export Trigger
 * (/components/ui/SoundtrackPanel.tsx)
 *
 * Strict TypeScript, zero `any`.
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import type {
  SceneSpec,
  MusicProfile,
  SoundtrackPlaylist,
  SoundtrackMomentPlaylist,
  SoundtrackTrackItem,
  SoundtrackProvenanceLabel,
  SoundtrackMomentName,
  AcousticCharacterClass,
} from "@/lib/types";
import {
  formatSoundtrackTrackListForClipboard,
  generateSoundtrackMarkdownSection,
  buildHonestTrackSearchLinks,
} from "@/lib/brief";
import {
  ArchitecturalIcon,
  MOTION_DURATIONS_MS,
  MOTION_EASINGS_CSS,
  useReducedMotionSafe,
} from "@/lib/motion";

// ============================================================================
// 1. UI STATE & PROPS INTERFACES
// ============================================================================

export type SoundtrackPanelUiState =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "fallback";

export type ProvenanceFilterOption = "all" | SoundtrackProvenanceLabel;

export interface SoundtrackPanelProps {
  readonly sceneSpec: SceneSpec;
  readonly musicProfile: MusicProfile;
  readonly playlist: SoundtrackPlaylist | null;
  readonly uiState: SoundtrackPanelUiState;
  readonly errorMessage?: string | null;
  readonly activeTrackId?: string | null;
  readonly isTrackPlaying?: boolean;
  readonly onRefreshSoundtrack: (forceRefresh?: boolean) => void;
  readonly onSimulateUiState?: (nextState: SoundtrackPanelUiState) => void;
  readonly onSelectTrack?: (track: SoundtrackTrackItem) => void;
  readonly onCopyTrackList?: () => void;
  readonly onOpenExportBrief?: () => void;
}

// ============================================================================
// 2. HONEST PROVENANCE BADGE METADATA & COMPONENT
// ============================================================================

interface ProvenanceBadgeStyleSpec {
  readonly label: string;
  readonly shortCode: string;
  readonly description: string;
  readonly badgeClassName: string;
  readonly dotColorHex: string;
}

export const PROVENANCE_BADGE_SPECS: Readonly<
  Record<SoundtrackProvenanceLabel, ProvenanceBadgeStyleSpec>
> = {
  "qloo-evidence": {
    label: "Qloo Evidence",
    shortCode: "QLOO-EVIDENCE",
    description:
      "Directly grounded in live Qloo cultural taste artist/music entity signals resolved for this venue.",
    badgeClassName:
      "bg-[#3D6B58]/25 text-[#86C5AC] border border-[#3D6B58]/60",
    dotColorHex: "#68B694",
  },
  inferred: {
    label: "Inferred (Scene)",
    shortCode: "INFERRED",
    description:
      "Inferred from SceneSpec architectural materials, Sabine RT60 acoustics, lighting Kelvin, and cultural motifs (not a live Qloo entity).",
    badgeClassName:
      "bg-[#D48C56]/20 text-[#E5B887] border border-[#D48C56]/55",
    dotColorHex: "#D48C56",
  },
  fallback: {
    label: "Local Fallback",
    shortCode: "FALLBACK",
    description:
      "Deterministic local typology rule used to fill remaining moment slots or when offline/over quota.",
    badgeClassName:
      "bg-[#6E6A63]/20 text-[#A39E93] border border-[#F4EFE6]/15",
    dotColorHex: "#A39E93",
  },
  "sample-fixture": {
    label: "Sample Data (Not Live)",
    shortCode: "SAMPLE-FIXTURE",
    description:
      "Placeholder sample taste fixture used while live Qloo API is not connected.",
    badgeClassName:
      "bg-amber-950/40 text-amber-300 border border-amber-700/60",
    dotColorHex: "#F59E0B",
  },
};

export interface SoundtrackProvenanceBadgeProps {
  readonly provenance: SoundtrackProvenanceLabel;
  readonly sourceDetail?: string;
  readonly compact?: boolean;
}

export const SoundtrackProvenanceBadge: React.FC<
  SoundtrackProvenanceBadgeProps
> = ({ provenance, sourceDetail, compact = false }) => {
  const spec = PROVENANCE_BADGE_SPECS[provenance];
  const tooltipText = sourceDetail
    ? `${spec.label}: ${sourceDetail}`
    : spec.description;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-tech uppercase tracking-wider select-none ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } ${spec.badgeClassName}`}
      title={tooltipText}
      aria-label={`Provenance: ${spec.label}. ${sourceDetail ?? spec.description}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: spec.dotColorHex }}
        aria-hidden="true"
      />
      <span>{spec.shortCode}</span>
    </span>
  );
};

// ============================================================================
// 3. ACOUSTIC CHARACTER & MOMENT DISPLAY HELPERS
// ============================================================================

const ACOUSTIC_CHARACTER_LABELS: Readonly<
  Record<
    AcousticCharacterClass,
    { readonly title: string; readonly subtitle: string }
  >
> = {
  "intimate/dry": {
    title: "Intimate & Dry",
    subtitle: "High absorption (RT60 ≤ 0.48s) • Close-mic & tactile analog detail",
  },
  "warm/absorptive": {
    title: "Warm & Absorptive",
    subtitle: "Balanced timber/fabric scatter (RT60 0.48–0.65s) • Chamber warmth",
  },
  "balanced/studio": {
    title: "Balanced Studio",
    subtitle: "Controlled specular clarity (RT60 0.65–0.92s) • Crisp transient definition",
  },
  "lively/resonant": {
    title: "Lively & Resonant",
    subtitle: "High-volume axial symmetry (RT60 0.92–1.35s) • Orchestral & choral scale",
  },
  "open-air/dispersive": {
    title: "Open-Air & Dispersive",
    subtitle: "Exterior peristyle free-field decay • Organic acoustic projection",
  },
  "reverberant/cavernous": {
    title: "Reverberant & Cavernous",
    subtitle: "Long stone/vault decay (RT60 ≥ 1.35s) • Sustained harmonic bloom",
  },
};

const MOMENT_METADATA: Readonly<
  Record<
    SoundtrackMomentName,
    {
      readonly indexLabel: string;
      readonly title: string;
      readonly timeWindowHint: string;
    }
  >
> = {
  arrival: {
    indexLabel: "01",
    title: "Arrival & Threshold",
    timeWindowHint: "00:00 – 00:45 • Decompression & spatial orientation",
  },
  dining: {
    indexLabel: "02",
    title: "Dining & Core Program",
    timeWindowHint: "00:45 – 02:00 • Conversational warmth & tactile flow",
  },
  peak: {
    indexLabel: "03",
    title: "Peak Architectural Energy",
    timeWindowHint: "02:00 – 03:15 • Focal climax & full room resonance",
  },
  "wind-down": {
    indexLabel: "04",
    title: "Wind-Down & Nocturne",
    timeWindowHint: "03:15 – 04:00 • Sparsity, reflection & lingering decay",
  },
};

const ORDERED_MOMENTS: readonly SoundtrackMomentName[] = [
  "arrival",
  "dining",
  "peak",
  "wind-down",
];

function formatDurationMs(durationMs?: number): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return "03:30";
  }
  const totalSec = Math.round(durationMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ============================================================================
// 4. TRACK CARD COMPONENT (WITH COVER ART, PROVENANCE & MULTI-PLATFORM SEARCH)
// ============================================================================

interface SoundtrackTrackCardProps {
  readonly track: SoundtrackTrackItem;
  readonly indexInMoment: number;
  readonly isSelectedForPlayback: boolean;
  readonly isPlaying: boolean;
  readonly prefersReducedMotion: boolean;
  readonly onSelectTrack?: (track: SoundtrackTrackItem) => void;
}

const SoundtrackTrackCard: React.FC<SoundtrackTrackCardProps> = ({
  track,
  indexInMoment,
  isSelectedForPlayback,
  isPlaying,
  prefersReducedMotion,
  onSelectTrack,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);
  const showCoverImage = Boolean(track.coverUrl && !imgError);

  const searchLinks = useMemo(
    () =>
      buildHonestTrackSearchLinks(
        track.artist,
        track.title,
        track.externalSearchUrl,
        track.storeUrl
      ),
    [track.artist, track.title, track.externalSearchUrl, track.storeUrl]
  );

  return (
    <article
      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition ${
        isSelectedForPlayback
          ? "bg-[#191C24] border-[#D48C56] shadow-lg"
          : "bg-[#0E1015]/90 border-[#F4EFE6]/10 hover:border-[#D48C56]/45"
      }`}
      style={{
        transition: prefersReducedMotion
          ? "none"
          : `transform ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo}, border-color ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo}`,
      }}
      aria-label={`${track.title} by ${track.artist}, provenance ${track.provenance}`}
    >
      {/* Top Row: Cover Art + Title/Artist + Provenance Badge */}
      <div className="flex items-start gap-3">
        {/* Cover Art or Architectural Vinyl Fallback */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#17191F] border border-[#F4EFE6]/12 shrink-0 flex items-center justify-center">
          {showCoverImage ? (
            <img
              src={track.coverUrl}
              alt={`${track.album ?? track.title} cover art`}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 48 48"
              className="w-9 h-9 text-[#D48C56]/75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="19" strokeOpacity="0.45" />
              <circle cx="24" cy="24" r="13" strokeOpacity="0.3" />
              <circle cx="24" cy="24" r="5" fill="currentColor" fillOpacity="0.25" />
              <circle cx="24" cy="24" r="1.8" fill="#F4EFE6" />
            </svg>
          )}
          <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-[#0B0B0E]/85 font-tech text-[9px] text-[#A39E93]">
            {String(indexInMoment + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Track Title, Artist, Album & Provenance */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="text-sm font-semibold text-[#F4EFE6] leading-snug truncate"
              title={track.title}
            >
              {track.title}
            </h4>
            <SoundtrackProvenanceBadge
              provenance={track.provenance}
              sourceDetail={track.provenanceSourceDetail}
              compact
            />
          </div>

          <p
            className="text-xs text-[#E5B887] font-medium truncate"
            title={track.artist}
          >
            {track.artist}
          </p>

          <div className="flex flex-wrap items-center gap-2 font-tech text-[10px] text-[#A39E93]">
            {track.album && (
              <span className="truncate max-w-[150px]" title={track.album}>
                {track.album}
              </span>
            )}
            <span>•</span>
            <span>{formatDurationMs(track.durationMs)}</span>
            {track.bpmEstimate && (
              <>
                <span>•</span>
                <span>~{track.bpmEstimate} BPM</span>
              </>
            )}
            <span>•</span>
            <span>Energy {Math.round(track.estimatedEnergy * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Middle Row: "Why This Fits" One-Liner Tied to Scene Feature */}
      <div className="rounded-lg bg-[#14161D] border border-[#F4EFE6]/8 px-3 py-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] font-semibold">
            WHY THIS FITS THIS SPACE
          </span>
          <span
            className="font-tech text-[9px] text-[#6E6A63] truncate max-w-[180px]"
            title={track.provenanceSourceDetail}
          >
            {track.provenanceSourceDetail}
          </span>
        </div>
        <p className="text-[11px] text-[#F4EFE6]/90 leading-relaxed">
          {track.whyThisFits}
        </p>
      </div>

      {/* Bottom Row: Playback / Preview Cue + Step 5 Honest "Open in Search" Links */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#F4EFE6]/8">
        <div className="flex items-center gap-1.5">
          {onSelectTrack && (
            <button
              type="button"
              onClick={() => onSelectTrack(track)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-tech text-[10px] uppercase tracking-wider transition ${
                isSelectedForPlayback && isPlaying
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "bg-[#17191F] hover:bg-[#D48C56]/20 text-[#F4EFE6] border border-[#D48C56]/40"
              }`}
              aria-pressed={isSelectedForPlayback && isPlaying}
            >
              <ArchitecturalIcon name="music" size={11} />
              <span>
                {isSelectedForPlayback && isPlaying
                  ? "Playing"
                  : track.previewUrl
                  ? "30s Preview"
                  : track.embedUrl
                  ? "Cue Embed"
                  : "Cue Synth"}
              </span>
            </button>
          )}

          {track.previewUrl && (
            <span
              className="font-tech text-[9px] px-1.5 py-0.5 rounded bg-[#3D6B58]/20 text-[#86C5AC] border border-[#3D6B58]/40"
              title="CORS-compatible 30s audio preview available for Web Audio AnalyserNode reactivity"
            >
              CORS AUDIO
            </span>
          )}
        </div>

        {/* Step 5 Honest "Open in search" & Verified Catalog Links */}
        <div
          className="flex flex-wrap items-center gap-1.5 font-tech text-[10px]"
          aria-label={`Search links for ${track.title} by ${track.artist}`}
        >
          {searchLinks.verifiedCatalogUrl && (
            <a
              href={searchLinks.verifiedCatalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1.5 py-0.5 rounded bg-[#3D6B58]/20 text-[#86C5AC] border border-[#3D6B58]/45 hover:bg-[#3D6B58]/35 transition inline-flex items-center gap-1"
              title="Open verified catalog record"
            >
              <span>Catalog</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
          <a
            href={searchLinks.primarySearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-1.5 py-0.5 rounded bg-white/5 text-[#F4EFE6] border border-white/10 hover:border-[#D48C56] transition inline-flex items-center gap-1"
            title={`Open "${track.artist} ${track.title}" in Spotify Search`}
          >
            <span>Open in search</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href={searchLinks.appleMusicSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-1.5 py-0.5 rounded bg-white/5 text-[#A39E93] hover:text-[#F4EFE6] border border-white/10 transition inline-flex items-center gap-0.5"
            title={`Search "${track.artist} ${track.title}" on Apple Music`}
          >
            <span>Apple</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href={searchLinks.youtubeMusicSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-1.5 py-0.5 rounded bg-white/5 text-[#A39E93] hover:text-[#F4EFE6] border border-white/10 transition inline-flex items-center gap-0.5"
            title={`Search "${track.artist} ${track.title}" on YouTube Music`}
          >
            <span>YT</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
};

// ============================================================================
// 5. MAIN SOUNDTRACK PANEL COMPONENT
// ============================================================================

export const SoundtrackPanel: React.FC<SoundtrackPanelProps> = ({
  sceneSpec,
  musicProfile,
  playlist,
  uiState,
  errorMessage,
  activeTrackId = null,
  isTrackPlaying = false,
  onRefreshSoundtrack,
  onSimulateUiState,
  onSelectTrack,
  onCopyTrackList,
  onOpenExportBrief,
}) => {
  const { prefersReducedMotion } = useReducedMotionSafe();
  const [selectedMoment, setSelectedMoment] =
    useState<SoundtrackMomentName>("arrival");
  const [layoutMode, setLayoutMode] = useState<"timeline-grid" | "moment-tabs">(
    "timeline-grid"
  );
  const [provenanceFilter, setProvenanceFilter] =
    useState<ProvenanceFilterOption>("all");

  // Step 5 Copy Feedback States
  const [copiedTrackListStatus, setCopiedTrackListStatus] = useState<
    "idle" | "copied-plain" | "copied-md" | SoundtrackMomentName
  >("idle");
  const copyResetTimerRef = useRef<number | null>(null);

  const tabRefs = useRef<Record<SoundtrackMomentName, HTMLButtonElement | null>>({
    arrival: null,
    dining: null,
    peak: null,
    "wind-down": null,
  });

  const acousticMeta =
    ACOUSTIC_CHARACTER_LABELS[
      musicProfile.acousticCharacter as AcousticCharacterClass
    ] ?? ACOUSTIC_CHARACTER_LABELS["warm/absorptive"];

  const triggerCopyConfirmation = useCallback(
    (status: "copied-plain" | "copied-md" | SoundtrackMomentName) => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      setCopiedTrackListStatus(status);
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedTrackListStatus("idle");
      }, 2400);
    },
    []
  );

  // Step 5: Copy Full Track List (Plain Text with Provenance & Why This Fits)
  const handleCopyFullTrackList = useCallback(async () => {
    const formatted = formatSoundtrackTrackListForClipboard(
      sceneSpec,
      playlist,
      "all"
    );
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // Fallback for restricted clipboard environments
    }
    triggerCopyConfirmation("copied-plain");
    onCopyTrackList?.();
  }, [sceneSpec, playlist, triggerCopyConfirmation, onCopyTrackList]);

  // Step 5: Copy Markdown Section for Design Brief
  const handleCopyMarkdownSection = useCallback(async () => {
    const mdSection = generateSoundtrackMarkdownSection(sceneSpec, playlist);
    try {
      await navigator.clipboard.writeText(mdSection);
    } catch {
      // Fallback for restricted clipboard environments
    }
    triggerCopyConfirmation("copied-md");
  }, [sceneSpec, playlist, triggerCopyConfirmation]);

  // Step 5: Copy Single Moment Track List
  const handleCopyMomentTrackList = useCallback(
    async (momentName: SoundtrackMomentName) => {
      const formatted = formatSoundtrackTrackListForClipboard(
        sceneSpec,
        playlist,
        momentName
      );
      try {
        await navigator.clipboard.writeText(formatted);
      } catch {
        // Fallback for restricted clipboard environments
      }
      triggerCopyConfirmation(momentName);
    },
    [sceneSpec, playlist, triggerCopyConfirmation]
  );

  // Keyboard navigation for ARIA tablist (ArrowLeft, ArrowRight, Home, End)
  const handleMomentTabKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLButtonElement>,
      currentMoment: SoundtrackMomentName
    ) => {
      const currentIndex = ORDERED_MOMENTS.indexOf(currentMoment);
      if (currentIndex === -1) return;

      let nextIndex = -1;
      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % ORDERED_MOMENTS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex =
          (currentIndex - 1 + ORDERED_MOMENTS.length) % ORDERED_MOMENTS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = ORDERED_MOMENTS.length - 1;
      }

      if (nextIndex !== -1) {
        e.preventDefault();
        const nextMoment = ORDERED_MOMENTS[nextIndex];
        setSelectedMoment(nextMoment);
        tabRefs.current[nextMoment]?.focus();
      }
    },
    []
  );

  // Filter tracks per moment by provenance filter if active
  const filteredMoments = useMemo<ReadonlyArray<SoundtrackMomentPlaylist>>(() => {
    if (!playlist) return [];
    if (provenanceFilter === "all") return playlist.moments;
    return playlist.moments.map((m) => ({
      ...m,
      tracks: m.tracks.filter((t) => t.provenance === provenanceFilter),
    }));
  }, [playlist, provenanceFilter]);

  const isFallbackBannerVisible =
    uiState === "fallback" ||
    playlist?.cacheStatus === "fallback-quota" ||
    playlist?.cacheStatus === "fallback-offline" ||
    (playlist !== null && playlist.verificationStats.qlooEvidenceCount === 0);

  return (
    <section
      id="section-soundtrack-panel"
      aria-labelledby="soundtrack-panel-heading"
      className="glass-panel p-6 rounded-2xl border border-[#F4EFE6]/12 bg-[#111216]/95 text-[#F4EFE6] shadow-2xl space-y-6"
    >
      {/* 1. Panel Top Header & Step 5 Action Controls ("Copy track list", "Copy .MD Section", "Export Design Brief") */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F4EFE6]/10 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 small-caps-label px-2.5 py-0.5 rounded bg-[#17191F] border border-[#D48C56]/45 text-[#D48C56]">
              <ArchitecturalIcon name="music" size={12} />
              <span>VENUE SOUNDTRACK &amp; 4-MOMENT CURATION</span>
            </span>
            <span className="font-tech text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#A39E93] border border-white/10">
              ISO 3382 RT60: {sceneSpec.acousticTarget.calculatedRT60Seconds}s
            </span>
            {playlist && (
              <span className="font-tech text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#A39E93] border border-white/10">
                PROVIDER: {playlist.providerUsed.toUpperCase()} • CACHE:{" "}
                {playlist.cacheStatus.toUpperCase()}
              </span>
            )}
          </div>
          <h2
            id="soundtrack-panel-heading"
            className="text-lg sm:text-xl font-semibold text-[#F4EFE6] tracking-tight"
          >
            Acoustic-Matched Program Playlist —{" "}
            <span className="font-serif-italic font-normal text-[#E5B887]">
              {sceneSpec.title}
            </span>
          </h2>
          <p className="text-xs text-[#A39E93] max-w-3xl">
            Derived from envelope volume ({sceneSpec.validation.volumeCubicMeters}{" "}
            m³), surface materials ({sceneSpec.materials.wall.name},{" "}
            {sceneSpec.materials.floor.name}), {sceneSpec.lighting.temperatureK}K
            lighting mood, and verified against live catalog search.
          </p>
        </div>

        {/* Right Controls: Copy Track List, Copy .MD Section, Export Brief, Refresh & Layout Mode */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleCopyFullTrackList();
            }}
            className={`px-3 py-1.5 rounded-lg border font-tech text-[10px] uppercase tracking-wider transition ${
              copiedTrackListStatus === "copied-plain"
                ? "bg-[#3D6B58] border-[#68A68E] text-[#F4EFE6] font-semibold"
                : "bg-[#17191F] hover:bg-white/10 border-[#F4EFE6]/15 text-[#F4EFE6]"
            }`}
          >
            {copiedTrackListStatus === "copied-plain"
              ? `✓ Copied Track List (${playlist?.tracks.length ?? 12})`
              : "Copy Track List"}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleCopyMarkdownSection();
            }}
            className={`px-3 py-1.5 rounded-lg border font-tech text-[10px] uppercase tracking-wider transition ${
              copiedTrackListStatus === "copied-md"
                ? "bg-[#3D6B58] border-[#68A68E] text-[#F4EFE6] font-semibold"
                : "bg-[#17191F] hover:bg-white/10 border-[#F4EFE6]/15 text-[#A39E93] hover:text-[#F4EFE6]"
            }`}
            title="Copy the Markdown Design Brief Section (## 8. Venue Soundtrack) to clipboard"
          >
            {copiedTrackListStatus === "copied-md"
              ? "✓ Copied .MD Section"
              : "Copy Brief Section (.MD)"}
          </button>

          {onOpenExportBrief && (
            <button
              type="button"
              onClick={onOpenExportBrief}
              className="px-3 py-1.5 rounded-lg bg-[#17191F] hover:bg-[#D48C56]/20 border border-[#D48C56]/45 font-tech text-[10px] uppercase tracking-wider text-[#E5B887] transition"
            >
              Export in Design Brief ↗
            </button>
          )}

          <button
            type="button"
            onClick={() => onRefreshSoundtrack(true)}
            disabled={uiState === "loading"}
            className="px-3 py-1.5 rounded-lg bg-[#D48C56] hover:bg-[#E5B887] disabled:opacity-50 text-[#0B0B0E] font-tech text-[10px] uppercase tracking-wider font-semibold transition"
          >
            {uiState === "loading" ? "Verifying Catalog…" : "Re-Verify Playlist ↻"}
          </button>

          <div
            className="inline-flex rounded-lg bg-[#0B0B0E] p-0.5 border border-[#F4EFE6]/12"
            role="group"
            aria-label="Soundtrack layout view mode"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("timeline-grid")}
              className={`px-2.5 py-1 rounded-md font-tech text-[10px] uppercase transition ${
                layoutMode === "timeline-grid"
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
            >
              4-Moment Timeline
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("moment-tabs")}
              className={`px-2.5 py-1 rounded-md font-tech text-[10px] uppercase transition ${
                layoutMode === "moment-tabs"
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
            >
              Focused Moment
            </button>
          </div>
        </div>
      </div>

      {/* 2. Derived MusicProfile Summary Strip */}
      <div className="rounded-xl bg-[#0B0B0E]/90 border border-[#F4EFE6]/10 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Acoustic Character */}
          <div className="p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/8">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] block">
              ACOUSTIC CHARACTER
            </span>
            <div className="font-tech text-xs font-semibold text-[#F4EFE6] mt-0.5">
              {acousticMeta.title}
            </div>
            <div className="font-tech text-[10px] text-[#A39E93] mt-0.5">
              {acousticMeta.subtitle}
            </div>
          </div>

          {/* Target Energy & Tempo Range */}
          <div className="p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/8">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] block">
              ENERGY &amp; TEMPO ENVELOPE
            </span>
            <div className="font-tech text-xs font-semibold text-[#F4EFE6] mt-0.5">
              Energy {Math.round(musicProfile.energy * 100)}% •{" "}
              {musicProfile.tempoRangeBpm[0]}–{musicProfile.tempoRangeBpm[1]} BPM
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3D6B58] via-[#D48C56] to-[#D9532B]"
                style={{ width: `${Math.round(musicProfile.energy * 100)}%` }}
              />
            </div>
          </div>

          {/* Era & Reference Horizon */}
          <div className="p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/8">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] block">
              ERA &amp; CHRONOLOGY
            </span>
            <div className="font-tech text-xs font-semibold text-[#F4EFE6] mt-0.5">
              {musicProfile.era}
            </div>
            <div className="font-tech text-[10px] text-[#A39E93] mt-0.5">
              Time of Day: {sceneSpec.timeOfDay.toUpperCase()} ({sceneSpec.lighting.temperatureK}K)
            </div>
          </div>

          {/* Primary Genres */}
          <div className="p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/8">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] block">
              GENRE TAXONOMY
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {musicProfile.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="font-tech text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#F4EFE6] border border-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Instrumentation */}
          <div className="p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/8">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#D48C56] block">
              INSTRUMENTATION PALETTE
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {musicProfile.instrumentation.slice(0, 4).map((inst) => (
                <span
                  key={inst}
                  className="font-tech text-[10px] px-1.5 py-0.5 rounded bg-[#D48C56]/15 text-[#E5B887] border border-[#D48C56]/30"
                >
                  {inst}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mood Tags + Provenance Filter & Honesty Counter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F4EFE6]/8">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#A39E93] mr-1">
              MOOD TAGS:
            </span>
            {musicProfile.moodTags.map((tag) => (
              <span
                key={tag}
                className="font-tech text-[10px] px-2 py-0.5 rounded-full bg-[#17191F] text-[#A39E93] border border-[#F4EFE6]/10"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Provenance Filter Pills */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter soundtrack tracks by provenance label"
          >
            <span className="font-tech text-[9px] uppercase tracking-wider text-[#A39E93]">
              PROVENANCE FILTER:
            </span>
            <button
              type="button"
              onClick={() => setProvenanceFilter("all")}
              className={`px-2 py-0.5 rounded font-tech text-[10px] uppercase transition ${
                provenanceFilter === "all"
                  ? "bg-[#F4EFE6] text-[#0B0B0E] font-semibold"
                  : "bg-white/5 text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
            >
              All ({playlist?.tracks.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setProvenanceFilter("qloo-evidence")}
              className={`px-2 py-0.5 rounded font-tech text-[10px] uppercase transition ${
                provenanceFilter === "qloo-evidence"
                  ? "bg-[#3D6B58] text-[#F4EFE6] font-semibold"
                  : "bg-[#3D6B58]/20 text-[#86C5AC] border border-[#3D6B58]/40"
              }`}
            >
              Qloo Evidence ({playlist?.verificationStats.qlooEvidenceCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setProvenanceFilter("inferred")}
              className={`px-2 py-0.5 rounded font-tech text-[10px] uppercase transition ${
                provenanceFilter === "inferred"
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "bg-[#D48C56]/20 text-[#E5B887] border border-[#D48C56]/40"
              }`}
            >
              Inferred ({playlist?.verificationStats.inferredCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setProvenanceFilter("fallback")}
              className={`px-2 py-0.5 rounded font-tech text-[10px] uppercase transition ${
                provenanceFilter === "fallback"
                  ? "bg-[#A39E93] text-[#0B0B0E] font-semibold"
                  : "bg-white/5 text-[#A39E93] border border-white/15"
              }`}
            >
              Fallback ({playlist?.verificationStats.fallbackCount ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* 3. UI State Simulator Strip (Allows verifying Loading / Empty / Error / Fallback states) */}
      {onSimulateUiState && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-[#0B0B0E]/75 border border-[#F4EFE6]/10 font-tech text-[10px]">
          <span className="text-[#A39E93] uppercase tracking-wider">
            SOUNDTRACK UI STATE INSPECTOR:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "ready", label: "Ready (Verified)" },
                { id: "loading", label: "Loading Skeleton" },
                { id: "fallback", label: "Fallback / Over-Quota" },
                { id: "empty", label: "Empty State" },
                { id: "error", label: "Error State" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onSimulateUiState(st.id)}
                className={`px-2 py-0.5 rounded uppercase transition ${
                  uiState === st.id
                    ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                    : "bg-white/5 text-[#A39E93] hover:text-[#F4EFE6]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Honest Fallback / Sparse Qloo / Quota Notice Banner */}
      {isFallbackBannerVisible && uiState !== "loading" && uiState !== "error" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[#D48C56]/55 bg-[#D48C56]/10 p-3.5 flex flex-wrap items-center justify-between gap-3 font-tech text-xs text-[#F4EFE6]"
        >
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 text-[#E5B887] font-semibold uppercase tracking-wider text-[10px]">
              <ArchitecturalIcon name="radio" size={13} />
              <span>
                {playlist?.cacheStatus === "fallback-quota"
                  ? "SOUNDTRACK REQUEST BUDGET EXCEEDED • LABELED FALLBACK PLAYLIST"
                  : playlist?.cacheStatus === "fallback-offline"
                  ? "CATALOG NETWORK OFFLINE • LABELED LOCAL FALLBACK PLAYLIST"
                  : "HONEST PROVENANCE NOTICE • ZERO FABRICATED QLOO CLAIMS"}
              </span>
            </div>
            <p className="text-[11px] text-[#F4EFE6]/90 leading-relaxed">
              {playlist?.warnings && playlist.warnings.length > 0
                ? playlist.warnings.join(" ")
                : "No live Qloo music/artist entities were returned for this scene; tracks are honestly labeled as 'INFERRED' (from SceneSpec acoustics/materials) or 'FALLBACK' (local typology repertoire)."}
            </p>
          </div>
          {playlist?.quota && (
            <div className="font-tech text-[10px] px-2.5 py-1 rounded bg-[#0B0B0E]/80 border border-[#D48C56]/40 text-[#E5B887]">
              Quota: {playlist.quota.remainingRequests}/
              {playlist.quota.maxRequestsPerWindow} reqs left
            </div>
          )}
        </div>
      )}

      {/* 5. STATE A: LOADING SKELETON */}
      {uiState === "loading" && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-4"
        >
          <div className="flex items-center justify-between font-tech text-xs text-[#E5B887]">
            <span>
              Resolving candidate tracks against live music catalog &amp; balancing
              4-moment energy curve…
            </span>
            <span className="text-[10px] text-[#A39E93]">
              DROP UNRESOLVED • CAP ARTIST REPEATS (MAX 2)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORDERED_MOMENTS.map((momentName) => (
              <div
                key={momentName}
                className="rounded-xl border border-[#F4EFE6]/10 bg-[#0B0B0E]/85 p-4 space-y-3"
              >
                <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-full rounded bg-white/5 animate-pulse" />
                <div className="h-24 w-full rounded-lg bg-white/5 animate-pulse" />
                <div className="h-24 w-full rounded-lg bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. STATE B: ERROR STATE */}
      {uiState === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-[#D9532B] bg-[#D9532B]/10 p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-tech text-xs uppercase tracking-wider text-[#D9532B] font-semibold">
              SOUNDTRACK PIPELINE VERIFICATION ERROR
            </span>
            <span className="font-tech text-[10px] px-2 py-0.5 rounded bg-[#0B0B0E] text-[#A39E93]">
              HTTP / CATALOG FAULT
            </span>
          </div>
          <p className="text-xs text-[#F4EFE6] leading-relaxed">
            {errorMessage ||
              "Unable to reach /api/soundtrack catalog verification endpoint. No unverified or fabricated tracks are shown."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRefreshSoundtrack(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#D48C56] text-[#0B0B0E] font-tech text-xs uppercase font-semibold"
            >
              Retry Catalog Verification
            </button>
            {onSimulateUiState && (
              <button
                type="button"
                onClick={() => onSimulateUiState("fallback")}
                className="px-3.5 py-1.5 rounded-lg bg-[#17191F] border border-[#F4EFE6]/20 text-[#F4EFE6] font-tech text-xs uppercase"
              >
                Load Labeled Local Fallback
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. STATE C: EMPTY STATE */}
      {uiState === "empty" && (
        <div
          role="status"
          className="rounded-xl border border-[#F4EFE6]/12 bg-[#0B0B0E]/80 p-8 text-center space-y-3"
        >
          <div className="font-tech text-xs uppercase tracking-wider text-[#D48C56]">
            NO SOUNDTRACK GENERATED FOR CURRENT SCENE
          </div>
          <p className="text-xs text-[#A39E93] max-w-lg mx-auto">
            Synthesize a 3D architectural venue or click below to derive a
            scene-specific MusicProfile and verify tracks across Arrival, Dining,
            Peak, and Wind-Down moments.
          </p>
          <button
            type="button"
            onClick={() => onRefreshSoundtrack(true)}
            className="px-4 py-2 rounded-lg bg-[#D48C56] text-[#0B0B0E] font-tech text-xs uppercase font-semibold"
          >
            Generate &amp; Verify Venue Soundtrack
          </button>
        </div>
      )}

      {/* 8. STATE D: READY OR FALLBACK — 4-MOMENT TIMELINE & TRACK CARDS */}
      {(uiState === "ready" || uiState === "fallback") && playlist && (
        <div className="space-y-5">
          {/* Interactive 4-Moment Timeline Stepper / ARIA Tablist */}
          <div
            role="tablist"
            aria-label="Soundtrack programmatic moments"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
          >
            {playlist.moments.map((moment) => {
              const meta = MOMENT_METADATA[moment.name];
              const isSelected = selectedMoment === moment.name;
              return (
                <button
                  key={moment.name}
                  ref={(el) => {
                    tabRefs.current[moment.name] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`soundtrack-tab-${moment.name}`}
                  aria-selected={isSelected}
                  aria-controls={`soundtrack-panel-${moment.name}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedMoment(moment.name)}
                  onKeyDown={(e) => handleMomentTabKeyDown(e, moment.name)}
                  className={`text-left p-3 rounded-xl border transition ${
                    isSelected
                      ? "bg-[#17191F] border-[#D48C56] shadow-md"
                      : "bg-[#0B0B0E]/80 border-[#F4EFE6]/10 hover:border-[#F4EFE6]/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-tech text-[10px]">
                    <span className="text-[#D48C56] font-semibold">
                      {meta.indexLabel} • {moment.name.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[#A39E93]">
                      Target {Math.round(moment.targetEnergy * 100)}%
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#F4EFE6] mt-1">
                    {meta.title}
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D48C56]"
                      style={{
                        width: `${Math.round(moment.targetEnergy * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="font-tech text-[10px] text-[#A39E93] mt-1.5 flex items-center justify-between">
                    <span>{moment.tracks.length} Verified Tracks</span>
                    <span>{meta.timeWindowHint.split("•")[0].trim()}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* View 1: All 4 Moments Side-by-Side Timeline Grid */}
          {layoutMode === "timeline-grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {filteredMoments.map((moment) => {
                const meta = MOMENT_METADATA[moment.name];
                return (
                  <div
                    key={moment.name}
                    id={`soundtrack-panel-${moment.name}`}
                    role="region"
                    aria-label={`${meta.title} moment tracks`}
                    className={`rounded-xl border p-4 space-y-3.5 ${
                      selectedMoment === moment.name
                        ? "bg-[#14161D]/95 border-[#D48C56]/55"
                        : "bg-[#0B0B0E]/85 border-[#F4EFE6]/10"
                    }`}
                  >
                    <div className="border-b border-[#F4EFE6]/10 pb-2.5 space-y-1">
                      <div className="flex items-center justify-between font-tech text-[10px]">
                        <span className="text-[#D48C56] font-semibold uppercase tracking-wider">
                          {meta.indexLabel} • {meta.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyMomentTrackList(moment.name);
                          }}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#A39E93] hover:text-[#F4EFE6] border border-white/10 transition"
                          title={`Copy ${meta.title} tracks to clipboard`}
                        >
                          {copiedTrackListStatus === moment.name
                            ? "✓ Copied"
                            : "Copy Moment"}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#A39E93] leading-snug">
                        {moment.description}
                      </p>
                    </div>

                    {moment.tracks.length === 0 ? (
                      <div className="p-4 rounded-lg bg-[#0E1015] border border-[#F4EFE6]/8 text-center font-tech text-[11px] text-[#A39E93]">
                        No tracks match filter{" "}
                        <strong className="text-[#F4EFE6]">
                          {provenanceFilter}
                        </strong>{" "}
                        in this moment.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {moment.tracks.map((track, idx) => (
                          <SoundtrackTrackCard
                            key={track.id}
                            track={track}
                            indexInMoment={idx}
                            isSelectedForPlayback={activeTrackId === track.id}
                            isPlaying={
                              activeTrackId === track.id && isTrackPlaying
                            }
                            prefersReducedMotion={prefersReducedMotion}
                            onSelectTrack={onSelectTrack}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* View 2: Focused Moment Tabpanel View */
            <div>
              {filteredMoments
                .filter((m) => m.name === selectedMoment)
                .map((moment) => {
                  const meta = MOMENT_METADATA[moment.name];
                  return (
                    <div
                      key={moment.name}
                      role="tabpanel"
                      id={`soundtrack-panel-${moment.name}`}
                      aria-labelledby={`soundtrack-tab-${moment.name}`}
                      className="rounded-xl border border-[#D48C56]/45 bg-[#14161D]/95 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4EFE6]/10 pb-3">
                        <div>
                          <span className="font-tech text-[10px] uppercase tracking-wider text-[#D48C56] font-semibold">
                            MOMENT {meta.indexLabel} • {meta.timeWindowHint}
                          </span>
                          <h3 className="text-base font-semibold text-[#F4EFE6]">
                            {meta.title} — {moment.description}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleCopyMomentTrackList(moment.name);
                            }}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 font-tech text-[10px] uppercase text-[#F4EFE6] border border-white/15"
                          >
                            {copiedTrackListStatus === moment.name
                              ? "✓ Copied Moment"
                              : "Copy Moment Tracks"}
                          </button>
                          <span className="font-tech text-xs px-2.5 py-1 rounded bg-[#0B0B0E] border border-[#D48C56]/40 text-[#E5B887]">
                            Target Energy: {Math.round(moment.targetEnergy * 100)}%
                          </span>
                        </div>
                      </div>

                      {moment.tracks.length === 0 ? (
                        <div className="p-6 rounded-lg bg-[#0E1015] border border-[#F4EFE6]/8 text-center font-tech text-xs text-[#A39E93]">
                          No tracks match provenance filter{" "}
                          <strong className="text-[#F4EFE6]">
                            {provenanceFilter}
                          </strong>{" "}
                          for {meta.title}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {moment.tracks.map((track, idx) => (
                            <SoundtrackTrackCard
                              key={track.id}
                              track={track}
                              indexInMoment={idx}
                              isSelectedForPlayback={activeTrackId === track.id}
                              isPlaying={
                                activeTrackId === track.id && isTrackPlaying
                              }
                              prefersReducedMotion={prefersReducedMotion}
                              onSelectTrack={onSelectTrack}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Footer Verification & Honesty Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F4EFE6]/10 font-tech text-[10px] text-[#A39E93]">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                CANDIDATES GENERATED:{" "}
                <strong className="text-[#F4EFE6]">
                  {playlist.verificationStats.candidatesGenerated}
                </strong>
              </span>
              <span>•</span>
              <span>
                VERIFIED IN CATALOG:{" "}
                <strong className="text-[#86C5AC]">
                  {playlist.verificationStats.candidatesVerified}
                </strong>
              </span>
              <span>•</span>
              <span>
                DROPPED UNRESOLVED:{" "}
                <strong className="text-[#E5B887]">
                  {playlist.verificationStats.candidatesDroppedUnresolved}
                </strong>
              </span>
              <span>•</span>
              <span>
                DEDUPED:{" "}
                <strong className="text-[#F4EFE6]">
                  {playlist.verificationStats.duplicatesRemoved}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>SCENE MUSIC HASH: {playlist.sceneHash}</span>
              <span>•</span>
              <span>
                QUOTA: {playlist.quota.remainingRequests}/
                {playlist.quota.maxRequestsPerWindow}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SoundtrackPanel;
