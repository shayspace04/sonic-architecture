"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { QualityTier, SceneSpec } from "@/lib/types";
import type { AudioReactiveBands } from "@/lib/soundtrack-audio-engine";
import { Venue3D } from "@/components/three/Venue3D";

export interface CompareSplitViewerProps {
  baselineSpec: SceneSpec;
  groundedSpec: SceneSpec;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  showCeiling: boolean;
  showDimensions?: boolean;
  showDispersionCones?: boolean;
  showAcousticRays?: boolean;
  showEgressPaths?: boolean;
  cameraPreset: "overview" | "interior" | "focal" | "plan";
  qualityTier?: QualityTier;
  pulsingObjectIds?: readonly string[];
  audioBandsRef?: React.MutableRefObject<AudioReactiveBands>;
  prefersReducedMotion?: boolean;
  onCloseCompare?: () => void;
}

export function CompareSplitViewer({
  baselineSpec,
  groundedSpec,
  selectedObjectId,
  onSelectObject,
  showCeiling,
  showDimensions = false,
  showDispersionCones = false,
  showAcousticRays = false,
  showEgressPaths = false,
  cameraPreset = "overview",
  qualityTier = "medium",
  pulsingObjectIds = [],
  audioBandsRef,
  prefersReducedMotion = false,
  onCloseCompare,
}: CompareSplitViewerProps) {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation: Left/Right arrows move wipe, Escape exits, C toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseCompare?.();
        return;
      }
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onCloseCompare?.();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSliderPos((prev) => Math.max(0, prev - (prefersReducedMotion ? 10 : 5)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSliderPos((prev) => Math.min(100, prev + (prefersReducedMotion ? 10 : 5)));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCloseCompare, prefersReducedMotion]);

  // Pointer drag handling for wipe slider
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const relativeX = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      setSliderPos(Number(pct.toFixed(1)));
    },
    [isDragging]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  // Preset positioning for mobile / quick navigation
  const setExactSplit = (pct: number) => {
    setSliderPos(pct);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full h-full overflow-hidden select-none bg-[#0B0E14]"
      style={{ touchAction: "none" }}
      role="region"
      aria-label="With Qloo vs Without Qloo split viewer"
    >
      {/* =================================================================== */}
      {/* LAYER 1: BASELINE SCENE (WITHOUT QLOO - PLAIN LLM) */}
      {/* =================================================================== */}
      <div className="absolute inset-0 z-0">
        <Venue3D
          sceneSpec={baselineSpec}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          showCeiling={showCeiling}
          showDimensions={showDimensions}
          showDispersionCones={showDispersionCones}
          showAcousticRays={showAcousticRays}
          showEgressPaths={showEgressPaths}
          cameraPreset={cameraPreset}
          qualityTier={qualityTier === "high" ? "medium" : qualityTier}
          pulsingObjectIds={pulsingObjectIds}
          audioBandsRef={audioBandsRef}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* Corner Badge: Without Qloo */}
        <div className="absolute top-12 left-3 z-10 pointer-events-none">
          <div className="bg-black/85 border border-neutral-700 text-neutral-300 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded shadow-md backdrop-blur-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
            <span>Without Qloo (Baseline LLM)</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* LAYER 2: GROUNDED SCENE (WITH QLOO GROUNDING) - CLIPPED VIA SLIDER */}
      {/* =================================================================== */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
          transition: isDragging ? "none" : prefersReducedMotion ? "none" : "clip-path 120ms ease-out",
        }}
      >
        <div className="w-full h-full pointer-events-auto">
          <Venue3D
            sceneSpec={groundedSpec}
            selectedObjectId={selectedObjectId}
            onSelectObject={onSelectObject}
            showCeiling={showCeiling}
            showDimensions={showDimensions}
            showDispersionCones={showDispersionCones}
            showAcousticRays={showAcousticRays}
            showEgressPaths={showEgressPaths}
            cameraPreset={cameraPreset}
            qualityTier={qualityTier === "high" ? "medium" : qualityTier}
            pulsingObjectIds={pulsingObjectIds}
            audioBandsRef={audioBandsRef}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Corner Badge: With Qloo */}
        <div className="absolute top-12 right-3 z-10 pointer-events-none">
          <div className="bg-[var(--red)]/90 border border-red-400 text-white font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded shadow-lg backdrop-blur-sm font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>With Qloo Grounding</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DRAGGABLE WIPE SLIDER LINE & HANDLE */}
      {/* =================================================================== */}
      <div
        style={{
          left: `${sliderPos}%`,
          transition: isDragging ? "none" : prefersReducedMotion ? "none" : "left 120ms ease-out",
        }}
        className="absolute top-0 bottom-0 w-0 z-30 pointer-events-none"
      >
        {/* Vertical divider line */}
        <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />

        {/* Center tactile drag handle */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          aria-label="Drag to compare without Qloo vs with Qloo"
          className="pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-12 bg-black/90 border border-white text-white rounded-md flex items-center justify-center shadow-2xl cursor-ew-resize hover:bg-[var(--red)] transition-colors active:scale-95"
        >
          <div className="flex items-center gap-0.5 text-[10px] font-mono select-none">
            <span>◀</span>
            <span className="w-0.5 h-4 bg-white/70 mx-0.5" />
            <span>▶</span>
          </div>
        </button>
      </div>

      {/* Bottom Floating Quick-Switch Strip */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 bg-black/85 border border-[var(--line)] px-2 py-1 rounded backdrop-blur-md flex items-center gap-1 text-[10px] font-mono">
        <button
          type="button"
          onClick={() => setExactSplit(100)}
          className={`px-2 py-0.5 rounded transition-colors ${
            sliderPos >= 98 ? "bg-white/20 text-white font-semibold" : "text-neutral-400 hover:text-white"
          }`}
        >
          100% Baseline
        </button>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={() => setExactSplit(50)}
          className={`px-2 py-0.5 rounded transition-colors ${
            sliderPos > 25 && sliderPos < 75
              ? "bg-[var(--red)] text-white font-semibold"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          50/50 Split
        </button>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={() => setExactSplit(0)}
          className={`px-2 py-0.5 rounded transition-colors ${
            sliderPos <= 2 ? "bg-white/20 text-white font-semibold" : "text-neutral-400 hover:text-white"
          }`}
        >
          100% Grounded
        </button>

        {onCloseCompare && (
          <>
            <span className="text-white/20 ml-1">|</span>
            <button
              type="button"
              onClick={onCloseCompare}
              className="px-2 py-0.5 text-neutral-300 hover:text-[var(--red)] uppercase transition-colors"
              title="Exit comparison mode (Esc or C)"
            >
              Exit ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CompareSplitViewer;
