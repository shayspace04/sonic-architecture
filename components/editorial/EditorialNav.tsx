"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EditorialRouteKey } from "@/lib/editorial-routes";

export type EditorialRouteTheme = EditorialRouteKey;

/**
 * Compatible Web Audio AnalyserNode band snapshot supporting both
 * `lib/soundtrack-audio-engine.ts` (`bass`, `mid`, `treble`, `overall`, `analyserActive`, `mode`)
 * and custom analyser hooks.
 */
export interface EditorialAudioAnalyserSnapshot {
  readonly bass?: number;
  readonly mid?: number;
  readonly treble?: number;
  readonly overall?: number;
  readonly analyserActive?: boolean;
  readonly mode?: "preview-cors" | "spotify-embed" | "synth-fallback";
  readonly bassEnergy?: number;
  readonly midEnergy?: number;
  readonly highEnergy?: number;
  readonly overallEnergy?: number;
  readonly isAnalyserActive?: boolean;
}

export interface EditorialNavProps {
  /** Active route theme ("home" | "archive" | "studio" | "about") */
  readonly currentRoute?: EditorialRouteTheme;
  /** Whether real audio (Web Audio synth or 30s CORS preview) is actively playing */
  readonly isSoundPlaying?: boolean;
  /** Backwards-compatible alias for isSoundPlaying */
  readonly isAudioPlaying?: boolean;
  /** Whether a real audio player/analyser is wired in the current view */
  readonly isSoundWired?: boolean;
  /** Backwards-compatible alias for isSoundWired */
  readonly isAudioAvailable?: boolean;
  /** If true and `!isSoundWired`, hides the sound toggle completely instead of showing "Sound — coming soon" */
  readonly hideIfUnwired?: boolean;
  /** Callback to toggle real theme-song / soundtrack playback */
  readonly onToggleSound?: () => void;
  /** Optional active track label for screen-reader & tooltip clarity */
  readonly activeTrackLabel?: string;
  /** Optional playback mode ("preview-cors" | "synth-fallback" | "spotify-embed") */
  readonly playbackMode?: "preview-cors" | "synth-fallback" | "spotify-embed";
  /** Optional Web Audio AnalyserNode bands ref for zero-rerender 4-bar equalizer feedback */
  readonly audioBandsRef?: React.MutableRefObject<EditorialAudioAnalyserSnapshot>;
  /** Optional direct 4-band array fallback */
  readonly audioBands?: readonly [number, number, number, number];
  /** Whether Web Audio AnalyserNode is actively connected to the audio source */
  readonly isAnalyserConnected?: boolean;
  /** Whether reduced motion is active (disables RAF equalizer animation) */
  readonly prefersReducedMotion?: boolean;
}

interface NavLinkItem {
  readonly href: "/" | "/archive" | "/studio";
  readonly label: string;
  readonly hideOnMobile?: boolean;
}

const NAV_LINKS: readonly NavLinkItem[] = [
  { href: "/", label: "The Experience", hideOnMobile: true },
  { href: "/archive", label: "Archive", hideOnMobile: false },
  { href: "/studio", label: "Studio", hideOnMobile: false },
] as const;

/**
 * Brutalist-Editorial Top Navigation (`components/editorial/EditorialNav.tsx`)
 *
 * - Top-left two-line mono logo: "SONIC / ARCHITECTURE" (`next/link`)
 * - Top-right mono links: The Experience (hidden `<800px` via `.sa-hide-mobile`), Archive, Sound Toggle, Studio
 * - Uses `next/link` with `aria-current="page"` and visible `:focus-visible` accent rings
 * - Honest Sound Toggle (`#sound-toggle`):
 *   - Wired to the app's real soundtrack player (`useSoundtrackPlaybackEngine`) and Web Audio `AnalyserNode` (`audioBandsRef`).
 *   - NEVER shows `"Soundscape enabled"` without real audio playing.
 *   - Shows `"Sound on"` (`aria-pressed="true"`) ONLY when `isSoundPlaying === true`.
 *   - Shows `"Sound off"` (`aria-pressed="false"`) when wired and paused.
 *   - Shows `"Sound — coming soon"` (`disabled`) or hides if no audio engine is wired.
 *   - Renders a 4-bar GPU-composited (`transform: scaleY(...)`) Web Audio analyser visualizer
 *     updated via `requestAnimationFrame` with zero React re-renders per frame (static under `prefers-reduced-motion`).
 */
export const EditorialNav: React.FC<EditorialNavProps> = ({
  isSoundPlaying,
  isAudioPlaying,
  isSoundWired,
  isAudioAvailable,
  hideIfUnwired = false,
  onToggleSound,
  activeTrackLabel,
  playbackMode = "synth-fallback",
  audioBandsRef,
  audioBands,
  isAnalyserConnected = false,
  prefersReducedMotion = false,
}) => {
  const pathname = usePathname() || "/";
  const normalizedPath = pathname === "" ? "/" : pathname;

  const playing = Boolean(isSoundPlaying ?? isAudioPlaying ?? false);
  const wired = Boolean(isSoundWired ?? isAudioAvailable ?? true);

  const bar0Ref = useRef<HTMLSpanElement | null>(null);
  const bar1Ref = useRef<HTMLSpanElement | null>(null);
  const bar2Ref = useRef<HTMLSpanElement | null>(null);
  const bar3Ref = useRef<HTMLSpanElement | null>(null);

  // Zero-rerender Web Audio AnalyserNode RAF loop for the 4-bar equalizer inside #sound-toggle
  useEffect(() => {
    const bars = [
      bar0Ref.current,
      bar1Ref.current,
      bar2Ref.current,
      bar3Ref.current,
    ];

    const setStaticHeights = (scales: readonly [number, number, number, number]) => {
      bars.forEach((bar, index) => {
        if (bar) {
          bar.style.transform = `scaleY(${scales[index] ?? 0.25})`;
        }
      });
    };

    if (!playing) {
      setStaticHeights([0.22, 0.22, 0.22, 0.22]);
      return;
    }

    if (prefersReducedMotion || playbackMode === "spotify-embed") {
      setStaticHeights([0.45, 0.75, 0.6, 0.5]);
      return;
    }

    if (!audioBandsRef && audioBands) {
      setStaticHeights(audioBands);
      return;
    }

    let rafId = 0;

    const updateBarsFromAnalyser = () => {
      const snapshot = audioBandsRef?.current;
      const active =
        snapshot?.analyserActive ??
        snapshot?.isAnalyserActive ??
        isAnalyserConnected;

      if (snapshot && active) {
        const bass = snapshot.bass ?? snapshot.bassEnergy ?? 0;
        const mid = snapshot.mid ?? snapshot.midEnergy ?? 0;
        const treble = snapshot.treble ?? snapshot.highEnergy ?? 0;
        const overall = snapshot.overall ?? snapshot.overallEnergy ?? 0;

        const s0 = Math.max(0.22, Math.min(1, 0.22 + bass * 0.78));
        const s1 = Math.max(0.22, Math.min(1, 0.22 + mid * 0.78));
        const s2 = Math.max(0.22, Math.min(1, 0.22 + overall * 0.78));
        const s3 = Math.max(0.22, Math.min(1, 0.22 + treble * 0.78));

        if (bar0Ref.current) bar0Ref.current.style.transform = `scaleY(${s0.toFixed(3)})`;
        if (bar1Ref.current) bar1Ref.current.style.transform = `scaleY(${s1.toFixed(3)})`;
        if (bar2Ref.current) bar2Ref.current.style.transform = `scaleY(${s2.toFixed(3)})`;
        if (bar3Ref.current) bar3Ref.current.style.transform = `scaleY(${s3.toFixed(3)})`;
      } else {
        setStaticHeights([0.38, 0.62, 0.48, 0.35]);
      }

      rafId = window.requestAnimationFrame(updateBarsFromAnalyser);
    };

    rafId = window.requestAnimationFrame(updateBarsFromAnalyser);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    playing,
    prefersReducedMotion,
    playbackMode,
    audioBandsRef,
    audioBands,
    isAnalyserConnected,
  ]);

  const canToggleSound = Boolean(wired && onToggleSound);

  const accessibleSoundLabel = canToggleSound
    ? playing
      ? activeTrackLabel
        ? `Sound on: playing "${activeTrackLabel}". Activate to pause venue soundtrack.`
        : "Sound on: venue soundtrack playing. Activate to pause."
      : activeTrackLabel
      ? `Sound off: "${activeTrackLabel}" ready. Activate to play venue soundtrack.`
      : "Sound off. Activate to play venue soundtrack."
    : "Sound — coming soon. Audio engine not connected on this view.";

  return (
    <header className="sonic-nav-header">
      <nav className="sonic-nav" aria-label="Main navigation">
        <Link
          href="/"
          className="sonic-logo"
          aria-label="Sonic Architecture — Home"
        >
          SONIC
          <br />
          ARCHITECTURE
        </Link>

        <div className="sonic-navlinks">
          {NAV_LINKS.slice(0, 2).map((item) => {
            const isActive = normalizedPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`sonic-navlink ${
                  item.hideOnMobile ? "sa-hide-mobile" : ""
                } ${isActive ? "is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}

          {canToggleSound ? (
            <button
              id="sound-toggle"
              type="button"
              aria-pressed={playing}
              aria-label={accessibleSoundLabel}
              onClick={onToggleSound}
              className={`sonic-sound-toggle ${playing ? "is-on" : ""}`}
              title={
                activeTrackLabel
                  ? `${playing ? "Pause" : "Play"} "${activeTrackLabel}" (Shortcut: M)`
                  : playing
                  ? "Pause venue soundscape (Shortcut: M)"
                  : "Play venue soundscape (Shortcut: M)"
              }
            >
              <span>{playing ? "Sound on" : "Sound off"}</span>
              <span
                className={`sonic-sound-eq ${playing ? "is-playing" : ""}`}
                aria-hidden="true"
              >
                <span ref={bar0Ref} className="sonic-sound-eq-bar" />
                <span ref={bar1Ref} className="sonic-sound-eq-bar" />
                <span ref={bar2Ref} className="sonic-sound-eq-bar" />
                <span ref={bar3Ref} className="sonic-sound-eq-bar" />
              </span>
              <span className="sonic-sound-glyph" aria-hidden="true">
                {playing ? "◖" : "⌁"}
              </span>
            </button>
          ) : !hideIfUnwired ? (
            <button
              id="sound-toggle"
              type="button"
              aria-pressed={false}
              disabled
              className="sonic-sound-toggle is-disabled"
              title="Audio engine not connected on this view"
            >
              Sound — coming soon
            </button>
          ) : null}

          {NAV_LINKS.slice(2).map((item) => {
            const isActive = normalizedPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`sonic-navlink ${isActive ? "is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default EditorialNav;
