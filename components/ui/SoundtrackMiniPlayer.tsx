"use client";

/**
 * Sonic Architecture — Step 4: Soundtrack Mini-Player, Spotify Embed & Keyboard Controls
 * (/components/ui/SoundtrackMiniPlayer.tsx)
 *
 * Implements:
 * - Mini-player bar & expandable Spotify URI embed drawer in the existing architectural design system
 * - Playback mode switcher:
 *   1. "preview-cors": 30s CORS catalog preview -> connected to Web Audio AnalyserNode (3D reacts)
 *   2. "spotify-embed": Official Spotify URI iframe (`https://open.spotify.com/embed/track/...`)
 *      with explicit honesty notice that cross-origin iframes cannot be analysed by Web Audio API
 *   3. "synth-fallback": Procedural Web Audio venue synth -> connected to Web Audio AnalyserNode (3D reacts)
 * - Live 16-bar AnalyserNode frequency spectrum HUD (respects `prefers-reduced-motion`)
 * - Keyboard controls (`Space` play/pause, `[` previous track, `]` next track, `M` mute/unmute,
 *   `ArrowLeft`/`ArrowRight` seek ±5s)
 *
 * Strict TypeScript, zero `any`.
 */

import React, { useEffect, useState } from "react";
import type {
  AudioReactiveBands,
  SoundtrackPlaybackMode,
  SoundtrackPlaybackState,
} from "@/lib/soundtrack-audio-engine";
import { resolveSpotifyEmbedUrlForTrack } from "@/lib/soundtrack-audio-engine";
import { SoundtrackProvenanceBadge } from "./SoundtrackPanel";
import { ArchitecturalIcon, useReducedMotionSafe } from "@/lib/motion";

export interface SoundtrackMiniPlayerProps {
  readonly playbackState: SoundtrackPlaybackState;
  readonly audioBandsRef: React.MutableRefObject<AudioReactiveBands>;
  readonly onTogglePlayPause: () => void;
  readonly onNextTrack: () => void;
  readonly onPreviousTrack: () => void;
  readonly onSeekSeconds: (seconds: number) => void;
  readonly onChangeVolume: (volume: number) => void;
  readonly onToggleMute: () => void;
  readonly onSwitchPlaybackMode: (mode: SoundtrackPlaybackMode) => void;
  readonly enableGlobalKeyboardShortcuts?: boolean;
}

function formatClockSec(sec: number): string {
  const safe = Math.max(0, Math.round(sec || 0));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export const SoundtrackMiniPlayer: React.FC<SoundtrackMiniPlayerProps> = ({
  playbackState,
  audioBandsRef,
  onTogglePlayPause,
  onNextTrack,
  onPreviousTrack,
  onSeekSeconds,
  onChangeVolume,
  onToggleMute,
  onSwitchPlaybackMode,
  enableGlobalKeyboardShortcuts = true,
}) => {
  const { prefersReducedMotion } = useReducedMotionSafe();
  const {
    activeTrack,
    isPlaying,
    playbackMode,
    volume,
    isMuted,
    currentTimeSec,
    durationSec,
    analyserConnected,
    statusNotice,
  } = playbackState;

  const [hudBands, setHudBands] = useState<{
    bass: number;
    mid: number;
    treble: number;
    bars: readonly number[];
  }>({
    bass: 0,
    mid: 0,
    treble: 0,
    bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });

  // Throttled 20fps HUD spectrum readout from audioBandsRef
  useEffect(() => {
    if (!isPlaying || playbackMode === "spotify-embed") {
      setHudBands({
        bass: 0,
        mid: 0,
        treble: 0,
        bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      });
      return;
    }

    const interval = window.setInterval(() => {
      const current = audioBandsRef.current;
      setHudBands({
        bass: current.bass,
        mid: current.mid,
        treble: current.treble,
        bars: current.spectrumBars,
      });
    }, 60);

    return () => window.clearInterval(interval);
  }, [audioBandsRef, isPlaying, playbackMode]);

  // Global keyboard shortcuts (Space, [, ], M) when not typing in an input/textarea/select
  useEffect(() => {
    if (!enableGlobalKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() ?? "";
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        tag === "button" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onTogglePlayPause();
      } else if (e.key === "[") {
        e.preventDefault();
        onPreviousTrack();
      } else if (e.key === "]") {
        e.preventDefault();
        onNextTrack();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enableGlobalKeyboardShortcuts,
    onNextTrack,
    onPreviousTrack,
    onToggleMute,
    onTogglePlayPause,
  ]);

  if (!activeTrack) {
    return null;
  }

  const spotifyEmbedUrl = resolveSpotifyEmbedUrlForTrack(activeTrack);

  return (
    <div
      role="region"
      aria-label="Venue Soundtrack Mini Player and 3D Audio Analyser Controls"
      className="rounded-xl border border-[#D48C56]/45 bg-[#0E1015]/95 p-4 shadow-2xl space-y-3"
    >
      {/* Top Row: Track Info + Transport Controls + Playback Mode Selector + Volume */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Cover Art / Vinyl + Track Metadata + Provenance Badge */}
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#17191F] border border-[#F4EFE6]/15 shrink-0 flex items-center justify-center">
            {activeTrack.coverUrl ? (
              <img
                src={activeTrack.coverUrl}
                alt={`${activeTrack.title} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <ArchitecturalIcon
                name="music"
                size={18}
                className="text-[#D48C56]"
              />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-tech text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D48C56]/20 text-[#E5B887] border border-[#D48C56]/40">
                {activeTrack.moment.toUpperCase()}
              </span>
              <SoundtrackProvenanceBadge
                provenance={activeTrack.provenance}
                sourceDetail={activeTrack.provenanceSourceDetail}
                compact
              />
              <span
                className={`font-tech text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                  playbackMode === "spotify-embed"
                    ? "bg-[#6E6A63]/20 text-[#A39E93] border-[#F4EFE6]/15"
                    : analyserConnected && isPlaying
                    ? "bg-[#3D6B58]/25 text-[#86C5AC] border-[#3D6B58]/60"
                    : "bg-white/5 text-[#A39E93] border-white/10"
                }`}
              >
                {playbackMode === "spotify-embed"
                  ? "CROSS-ORIGIN IFRAME • ANALYSER BYPASSED"
                  : analyserConnected && isPlaying
                  ? "● 3D WEB AUDIO ANALYSER LIVE"
                  : "ANALYSER STANDBY"}
              </span>
            </div>

            <div className="text-sm font-semibold text-[#F4EFE6] truncate">
              {activeTrack.title}{" "}
              <span className="text-[#E5B887] font-normal">
                — {activeTrack.artist}
              </span>
            </div>

            <div className="font-tech text-[10px] text-[#A39E93] truncate">
              {activeTrack.whyThisFits}
            </div>
          </div>
        </div>

        {/* Center: Transport Controls + Keyboard Hints */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviousTrack}
              className="px-2.5 py-1.5 rounded-lg bg-[#17191F] hover:bg-white/10 border border-[#F4EFE6]/15 font-tech text-xs text-[#F4EFE6] transition"
              title="Previous Track (Shortcut: [)"
              aria-label="Previous track"
            >
              ⏮ <span className="text-[9px] text-[#A39E93]">[</span>
            </button>

            <button
              type="button"
              onClick={onTogglePlayPause}
              className="px-4 py-1.5 rounded-lg bg-[#D48C56] hover:bg-[#E5B887] text-[#0B0B0E] font-tech text-xs uppercase tracking-wider font-semibold transition"
              title="Play or Pause Track (Shortcut: Space)"
              aria-label={isPlaying ? "Pause soundtrack" : "Play soundtrack"}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

            <button
              type="button"
              onClick={onNextTrack}
              className="px-2.5 py-1.5 rounded-lg bg-[#17191F] hover:bg-white/10 border border-[#F4EFE6]/15 font-tech text-xs text-[#F4EFE6] transition"
              title="Next Track (Shortcut: ])"
              aria-label="Next track"
            >
              <span className="text-[9px] text-[#A39E93]">]</span> ⏭
            </button>
          </div>

          {/* Seek Bar (active for 30s preview & synth modes) */}
          {playbackMode !== "spotify-embed" && (
            <div className="flex items-center gap-2 font-tech text-[10px] text-[#A39E93] w-56 sm:w-64">
              <span>{formatClockSec(currentTimeSec)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, durationSec)}
                step={0.5}
                value={Math.min(durationSec, currentTimeSec)}
                onChange={(e) => onSeekSeconds(parseFloat(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    onSeekSeconds(currentTimeSec + 5);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    onSeekSeconds(currentTimeSec - 5);
                  }
                }}
                aria-label="Seek within 30 second audio preview"
                className="flex-1 accent-[#D48C56] cursor-pointer"
              />
              <span>{formatClockSec(durationSec)}</span>
            </div>
          )}
        </div>

        {/* Right: Playback Source Mode Switcher + Volume & Mute + Live 16-Bar FFT Spectrum */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 3-Mode Source Selector */}
          <div
            className="inline-flex rounded-lg bg-[#0B0B0E] p-0.5 border border-[#F4EFE6]/12 font-tech text-[10px]"
            role="group"
            aria-label="Playback audio source mode"
          >
            <button
              type="button"
              onClick={() => onSwitchPlaybackMode("preview-cors")}
              className={`px-2 py-1 rounded uppercase transition ${
                playbackMode === "preview-cors"
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
              title="Play 30s CORS catalog preview connected to Web Audio AnalyserNode"
            >
              30s Preview
            </button>
            <button
              type="button"
              onClick={() => onSwitchPlaybackMode("synth-fallback")}
              className={`px-2 py-1 rounded uppercase transition ${
                playbackMode === "synth-fallback"
                  ? "bg-[#D48C56] text-[#0B0B0E] font-semibold"
                  : "text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
              title="Play Web Audio polyphonic synth connected to 3D AnalyserNode"
            >
              Venue Synth
            </button>
            <button
              type="button"
              onClick={() => onSwitchPlaybackMode("spotify-embed")}
              className={`px-2 py-1 rounded uppercase transition ${
                playbackMode === "spotify-embed"
                  ? "bg-[#3D6B58] text-[#F4EFE6] font-semibold"
                  : "text-[#A39E93] hover:text-[#F4EFE6]"
              }`}
              title="Open Spotify URI Embed Player (cross-origin iframe; Web Audio Analyser bypassed)"
            >
              Spotify Embed
            </button>
          </div>

          {/* Volume & Mute Controls */}
          <div className="flex items-center gap-1.5 font-tech text-[10px]">
            <button
              type="button"
              onClick={onToggleMute}
              className="px-2 py-1 rounded bg-[#17191F] hover:bg-white/10 border border-[#F4EFE6]/15 text-[#F4EFE6]"
              title="Mute or Unmute (Shortcut: M)"
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted || volume === 0 ? "🔇" : "🔊"}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : Math.round(volume * 100)}
              onChange={(e) =>
                onChangeVolume(parseInt(e.target.value, 10) / 100)
              }
              aria-label="Soundtrack volume"
              className="w-16 accent-[#D48C56] cursor-pointer"
            />
          </div>

          {/* Live 16-Bar Web Audio Analyser Spectrum (only when CORS audio or Synth is active) */}
          <div
            className="flex items-end gap-0.5 h-7 px-2 py-1 rounded bg-[#0B0B0E] border border-[#F4EFE6]/10"
            title={
              playbackMode === "spotify-embed"
                ? "Cross-origin iframe cannot be analysed by Web Audio API"
                : `Bass ${Math.round(hudBands.bass * 100)}% • Mid ${Math.round(
                    hudBands.mid * 100
                  )}% • Treble ${Math.round(hudBands.treble * 100)}%`
            }
            aria-hidden="true"
          >
            {hudBands.bars.map((val, i) => {
              const scaleY = prefersReducedMotion
                ? isPlaying && playbackMode !== "spotify-embed"
                  ? 0.45
                  : 0.18
                : Math.max(0.15, Math.min(1, val));
              return (
                <span
                  key={i}
                  className="w-1 h-5 rounded-sm bg-gradient-to-t from-[#3D6B58] via-[#D48C56] to-[#E5B887]"
                  style={{
                    transform: `scaleY(${scaleY.toFixed(2)})`,
                    transformOrigin: "bottom center",
                    transition: prefersReducedMotion
                      ? "none"
                      : "transform 75ms linear",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Spotify URI Iframe Embed Drawer (When "spotify-embed" mode is selected) */}
      {playbackMode === "spotify-embed" && (
        <div className="rounded-xl border border-[#3D6B58]/50 bg-[#0B0B0E] p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 font-tech text-[10px]">
            <span className="text-[#86C5AC] uppercase tracking-wider font-semibold">
              SPOTIFY URI EMBED PLAYER (NO USER LOGIN REQUIRED)
            </span>
            <span className="text-[#E5B887]">
              HONESTY NOTE: Cross-origin iframes cannot be connected to Web Audio{" "}
              <code>AnalyserNode</code>; 3D audio reactivity is disabled in embed
              mode.
            </span>
          </div>

          {spotifyEmbedUrl ? (
            <iframe
              title={`Spotify embed player for ${activeTrack.title} by ${activeTrack.artist}`}
              src={spotifyEmbedUrl}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg border border-[#F4EFE6]/10"
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#14161D] border border-[#F4EFE6]/10 font-tech text-xs">
              <div className="text-[#A39E93]">
                Track resolved via catalog search without a direct 22-char Spotify
                URI. Switch to{" "}
                <strong className="text-[#F4EFE6]">30s Preview</strong> or{" "}
                <strong className="text-[#F4EFE6]">Venue Synth</strong> for live
                3D Web Audio reactivity, or open directly in Spotify search:
              </div>
              <a
                href={activeTrack.externalSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-[#3D6B58] text-[#F4EFE6] uppercase text-[10px] font-semibold hover:opacity-90"
              >
                Open in Spotify Search ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Bottom Status & Keyboard Shortcut Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F4EFE6]/8 font-tech text-[10px] text-[#A39E93]">
        <span>
          {statusNotice ??
            "Select any track in the 4-moment timeline or press Space to start audio-reactive playback."}
        </span>
        <span className="text-[#6E6A63]">
          SHORTCUTS: <kbd className="text-[#F4EFE6]">Space</kbd> Play/Pause •{" "}
          <kbd className="text-[#F4EFE6]">[</kbd> Prev •{" "}
          <kbd className="text-[#F4EFE6]">]</kbd> Next •{" "}
          <kbd className="text-[#F4EFE6]">M</kbd> Mute
        </span>
      </div>
    </div>
  );
};

export default SoundtrackMiniPlayer;
