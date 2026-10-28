"use client";

import React, { useEffect, useRef } from "react";
import { useAnimationFrame, useMotionValue } from "framer-motion";
import {
  isCoarsePointerDevice,
  PARALLAX_CONFIG,
  useReducedMotionSafe,
} from "@/lib/motion";
import EditorialNav, {
  type EditorialAudioAnalyserSnapshot,
  type EditorialRouteTheme,
} from "./EditorialNav";
import EditorialFooter from "./EditorialFooter";
import EditorialBackgroundMedia from "./EditorialBackgroundMedia";
import EditorialRouteTransition from "./EditorialRouteTransition";

export interface EditorialShellLayoutProps {
  /** Active route theme ("home" | "archive" | "studio" | "about") */
  readonly routeTheme: EditorialRouteTheme;
  /** Left footer mono label (e.g. "01—04 / THE EXPERIENCE") */
  readonly footerLeft?: string;
  /** Alias for footerLeft for backwards compatibility */
  readonly footerLeftLabel?: string;
  /** Right footer mono label (e.g. "Move through the world") */
  readonly footerRight?: string;
  /** Alias for footerRight for backwards compatibility */
  readonly footerRightLabel?: string;
  /** Whether the submit zoom/lift transition is currently active */
  readonly isEntering?: boolean;
  /** Callback to interrupt/cancel the submit transition (e.g. via Escape or Cancel button) */
  readonly onCancelEntering?: () => void;
  /** Whether real audio is actively playing in the app's audio engine */
  readonly isSoundPlaying: boolean;
  /** Whether the sound engine is wired */
  readonly isSoundWired?: boolean;
  /** Alias for isSoundWired */
  readonly isSoundAvailable?: boolean;
  /** Handler to toggle real theme-song / soundtrack playback */
  readonly onToggleSound?: () => void;
  /** Active track title for accessible tooltip */
  readonly activeTrackLabel?: string | null;
  /** Alias for activeTrackLabel */
  readonly activeSoundLabel?: string | null;
  /** Active playback mode ("preview-cors" | "synth-fallback" | "spotify-embed") */
  readonly playbackMode?: "preview-cors" | "synth-fallback" | "spotify-embed";
  /** Web Audio AnalyserNode bands ref for the nav sound toggle equalizer */
  readonly audioBandsRef?: React.MutableRefObject<EditorialAudioAnalyserSnapshot>;
  /** Whether Web Audio AnalyserNode is actively connected */
  readonly isAnalyserConnected?: boolean;
  /** Optional explicit reduced-motion override (combines with OS prefers-reduced-motion) */
  readonly prefersReducedMotionOverride?: boolean;
  /** Live status toast message announced via aria-live="polite" */
  readonly toastMessage?: string | null;
  /** Alias for toastMessage */
  readonly statusToastMessage?: string | null;
  /** Hero & route foreground content */
  readonly children: React.ReactNode;
}

/**
 * Shared Brutalist-Editorial Single-Viewport Shell (`components/editorial/EditorialShellLayout.tsx`)
 *
 * Step 2 + Step 4 + Step 5 Architecture:
 * - Full-bleed background media, left-heavy gradient wash, cursor radial glow, and SVG film grain
 * - Eased cursor parallax (~4.5% per frame via `useMotionValue` + `useAnimationFrame`) written
 *   directly to CSS variables (`--shift-x`, `--shift-y`, `--glow-x`, `--glow-y`) with ZERO React
 *   re-renders per frame; automatically disabled on touch (`pointer: coarse`) and `prefers-reduced-motion`
 * - Interruptible submit-transition control pill when `isEntering` is true
 * - Route cross-fade transition (`EditorialRouteTransition`) between `/`, `/archive`, `/studio`, `/about`
 * - Top `EditorialNav` (with real Web Audio analyser indicator) and bottom `EditorialFooter`
 * - Accessible `role="status" aria-live="polite"` toast notification
 */
export const EditorialShellLayout: React.FC<EditorialShellLayoutProps> = ({
  routeTheme,
  footerLeft,
  footerLeftLabel,
  footerRight,
  footerRightLabel,
  isEntering = false,
  onCancelEntering,
  isSoundPlaying,
  isSoundWired,
  isSoundAvailable,
  onToggleSound,
  activeTrackLabel,
  activeSoundLabel,
  playbackMode = "synth-fallback",
  audioBandsRef,
  isAnalyserConnected = false,
  prefersReducedMotionOverride,
  toastMessage,
  statusToastMessage,
  children,
}) => {
  const { prefersReducedMotion: osReducedMotion } = useReducedMotionSafe();
  const effectiveReducedMotion = Boolean(
    prefersReducedMotionOverride ?? osReducedMotion
  );

  const shellRef = useRef<HTMLDivElement | null>(null);
  const parallaxDisabledRef = useRef<boolean>(false);

  const resolvedFooterLeft =
    footerLeft ?? footerLeftLabel ?? "01—04 / THE EXPERIENCE";
  const resolvedFooterRight =
    footerRight ?? footerRightLabel ?? "Move through the world";
  const resolvedSoundWired = isSoundWired ?? isSoundAvailable ?? true;
  const resolvedTrackLabel =
    activeTrackLabel ?? activeSoundLabel ?? undefined;
  const resolvedToast = toastMessage ?? statusToastMessage ?? null;

  // Framer Motion values for target and current eased pointer offset (zero React re-renders)
  const targetX = useMotionValue<number>(0);
  const targetY = useMotionValue<number>(0);
  const currentX = useMotionValue<number>(0);
  const currentY = useMotionValue<number>(0);

  useEffect(() => {
    const disabled = effectiveReducedMotion || isCoarsePointerDevice();
    parallaxDisabledRef.current = disabled;

    if (disabled) {
      targetX.set(0);
      targetY.set(0);
      currentX.set(0);
      currentY.set(0);
      const node = shellRef.current;
      if (node) {
        node.style.setProperty("--shift-x", "0px");
        node.style.setProperty("--shift-y", "0px");
        node.style.setProperty("--move-x", "0px");
        node.style.setProperty("--move-y", "0px");
        node.style.setProperty("--glow-x", "50%");
        node.style.setProperty("--glow-y", "45%");
      }
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const nextX = (event.clientX / vw - 0.5) * PARALLAX_CONFIG.maxShiftX;
      const nextY = (event.clientY / vh - 0.5) * PARALLAX_CONFIG.maxShiftY;
      targetX.set(nextX);
      targetY.set(nextY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [effectiveReducedMotion, targetX, targetY, currentX, currentY]);

  // Eased 4.5% per-frame interpolation loop via Framer Motion's useAnimationFrame
  useAnimationFrame(() => {
    if (parallaxDisabledRef.current) return;
    const node = shellRef.current;
    if (!node) return;

    const tx = targetX.get();
    const ty = targetY.get();
    const cx = currentX.get();
    const cy = currentY.get();

    const dx = tx - cx;
    const dy = ty - cy;

    if (
      Math.abs(dx) < PARALLAX_CONFIG.epsilon &&
      Math.abs(dy) < PARALLAX_CONFIG.epsilon
    ) {
      return;
    }

    const nextCx = cx + dx * PARALLAX_CONFIG.lerpFactor;
    const nextCy = cy + dy * PARALLAX_CONFIG.lerpFactor;

    currentX.set(nextCx);
    currentY.set(nextCy);

    const shiftXStr = `${nextCx.toFixed(2)}px`;
    const shiftYStr = `${nextCy.toFixed(2)}px`;
    const glowXStr = `${(50 + nextCx * PARALLAX_CONFIG.glowShiftFactor).toFixed(2)}%`;
    const glowYStr = `${(45 + nextCy * PARALLAX_CONFIG.glowShiftFactor).toFixed(2)}%`;

    node.style.setProperty("--shift-x", shiftXStr);
    node.style.setProperty("--shift-y", shiftYStr);
    node.style.setProperty("--move-x", shiftXStr);
    node.style.setProperty("--move-y", shiftYStr);
    node.style.setProperty("--glow-x", glowXStr);
    node.style.setProperty("--glow-y", glowYStr);
  });

  return (
    <div
      ref={shellRef}
      id="top"
      data-reduced-motion={effectiveReducedMotion ? "true" : "false"}
      className={`sonic-page route-${routeTheme} ${
        isEntering ? "is-entering" : ""
      }`}
    >
      {/* Background Video + Next/Image Poster + Gradient Wash + SVG Film Grain */}
      <EditorialBackgroundMedia
        routeTheme={routeTheme}
        isEntering={isEntering}
        prefersReducedMotionOverride={effectiveReducedMotion}
      />

      {/* Top Editorial Navigation with Real Web Audio Analyser Wiring */}
      <EditorialNav
        isSoundPlaying={isSoundPlaying}
        isSoundWired={resolvedSoundWired}
        onToggleSound={onToggleSound}
        activeTrackLabel={resolvedTrackLabel}
        playbackMode={playbackMode}
        audioBandsRef={audioBandsRef}
        isAnalyserConnected={isAnalyserConnected}
        prefersReducedMotion={effectiveReducedMotion}
      />

      {/* Main Route / Hero Foreground Region with Route Cross-Fade */}
      <main id="main-content" tabIndex={-1} className="sonic-main-region">
        <EditorialRouteTransition routeKey={routeTheme}>
          {children}
        </EditorialRouteTransition>

        {/* Interruptible Submit-Transition Control Pill (Visible during submit zoom/lift) */}
        {isEntering && onCancelEntering && (
          <div
            className="sonic-submit-interrupt-bar"
            role="region"
            aria-label="Transition controls"
          >
            <button
              type="button"
              onClick={onCancelEntering}
              className="sonic-interrupt-btn"
            >
              <span>Entering your world… Cancel transition (Esc)</span>
              <span aria-hidden="true">↺</span>
            </button>
          </div>
        )}
      </main>

      {/* Bottom Editorial Footer */}
      <EditorialFooter
        leftLabel={resolvedFooterLeft}
        rightLabel={resolvedFooterRight}
      />

      {/* Accessible Status Toast (aria-live="polite") */}
      <div
        id="sonic-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`sonic-toast ${resolvedToast ? "is-visible" : ""}`}
      >
        {resolvedToast || ""}
      </div>
    </div>
  );
};

export default EditorialShellLayout;
