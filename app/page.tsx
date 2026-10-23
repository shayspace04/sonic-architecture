"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import CulturalInput from "@/components/CulturalInput";
import SignalAnalysis from "@/components/SignalAnalysis";
import SpatialTranslation from "@/components/SpatialTranslation";
import DesignMoodboard from "@/components/DesignMoodboard";
import SoundtrackSection from "@/components/SoundtrackSection";
import FinalCta from "@/components/FinalCta";
import VenueScene from "@/components/VenueScene";
import SkyFallback from "@/components/SkyFallback";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import type { VibePayload } from "@/lib/types";
import { neutralSceneParams, sceneParamsFromPayload } from "@/lib/scene-params";
import { generateSceneSpec } from "@/lib/scene-spec";
import { usePrefersReducedMotion, useWebGLSupport } from "@/components/three/shared";
import { devMockVibe, isDevMockRequested } from "@/lib/dev-mock";

/**
 * Landing page — "Sonic Architecture".
 *
 * Modes:
 *   landing    — full-viewport architectural background, editorial prompt composer.
 *   travelling — one /api/vibe request in flight; transition wash.
 *   venue      — the 3D venue fills the screen, with editorial design sections below.
 *
 * Qloo-safety invariant: `generate()` is the *only* place that issues a
 * request, it is reachable only from an explicit submit, and it is guarded so
 * that a duplicate submit while in flight is ignored. Nothing on mount, on
 * keystroke, on hover or during animation ever calls the API.
 */

const SylvaLivingWorldScene = dynamic(
  () => import("@/components/three/SylvaLivingWorldScene").then((m) => m.SylvaLivingWorldScene),
  {
    ssr: false,
    loading: () => <SkyFallback />,
  }
);

const Venue3D = dynamic(() => import("@/components/three/Venue3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0A0E1A] font-mono text-[10px] tracking-[0.24em] text-[var(--lintel-paper)]/70 uppercase">
      Synthesizing spatial geometry…
    </div>
  ),
});

type Mode = "landing" | "travelling" | "venue";

const EASE = [0.22, 1, 0.36, 1] as const;

const subscribeNoop = () => () => {};

export default function Page() {
  const [mode, setMode] = useState<Mode>("landing");
  const [vibe, setVibe] = useState<VibePayload | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const webgl = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const sceneParams = useMemo(() => (vibe ? sceneParamsFromPayload(vibe) : neutralSceneParams()), [vibe]);
  const sceneSpec = useMemo(
    () => (vibe ? generateSceneSpec(submittedPrompt, vibe) : null),
    [vibe, submittedPrompt]
  );

  const energyScore = vibe
    ? Math.min(100, Math.max(0, Math.round(((vibe.lightingTemperatureK - 2500) / 4000) * 100)))
    : 50;
  useAmbientAudio(energyScore, isAudioEnabled, analyserRef);

  // Client-only: was ?mock=1 requested? (never true in production builds).
  const search = useSyncExternalStore(
    subscribeNoop,
    () => window.location.search,
    () => ""
  );
  const devMock = isDevMockRequested(search);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const revealVenue = (seq: number) => {
    setMode("travelling");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => {
        if (seq !== seqRef.current) return;
        setMode("venue");
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: "auto" });
      },
      reducedMotion ? 600 : 1600
    );
  };

  const generate = async (input: string) => {
    if (isLoading) return; // one request per intentional submit
    abortRef.current?.abort();
    const seq = ++seqRef.current;
    setIsLoading(true);
    setError(null);
    setSubmittedPrompt(input);

    if (devMock) {
      setVibe(devMockVibe());
      revealVenue(seq);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: input }),
        signal: controller.signal,
      });
      const data = (await res.json()) as VibePayload & { error?: string };
      if (seq !== seqRef.current) return;
      if (!res.ok || data.error || typeof data.primaryColorHex !== "string") {
        setError(data.error ?? "The translation failed. Try again in a moment.");
        setIsLoading(false);
        return;
      }
      setVibe(data);
      revealVenue(seq);
    } catch (err) {
      if (controller.signal.aborted || seq !== seqRef.current) return;
      setError(
        err instanceof Error && err.message.includes("abort")
          ? "Request cancelled."
          : "Could not reach the translation service. Check your connection and retry."
      );
      setIsLoading(false);
    }
  };

  const reset = () => {
    seqRef.current += 1;
    abortRef.current?.abort();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setMode("landing");
    setVibe(null);
    setSubmittedPrompt("");
    setError(null);
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const inVenue = mode === "venue";
  const showWorld = !inVenue;

  return (
    <main className={`min-h-screen ${inVenue ? "bg-[#0A0E1A] text-[var(--lintel-paper)]" : "sa-ink"}`}>
      {/* --- Immersive background preview: fixed, full-viewport ---------- */}
      {showWorld && (
        <div className="fixed inset-0 z-0" aria-hidden>
          {webgl && !reducedMotion ? (
            <SylvaLivingWorldScene variant="living-green" />
          ) : (
            <SkyFallback
              note={
                reducedMotion
                  ? "Reduced motion — static atmosphere"
                  : webgl === false
                    ? "WebGL unavailable — static atmosphere"
                    : undefined
              }
            />
          )}
        </div>
      )}

      {/* --- Architectural Brand Header --------------------------------- */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
          inVenue
            ? "border-b border-white/10 bg-black/70 backdrop-blur-xl py-3.5 opacity-100"
            : "py-5 opacity-100 bg-transparent"
        }`}
      >
        <div className="sa-gutter mx-auto flex w-full items-center justify-between py-3.5">
          <a
            href="#top"
            className="font-[family-name:var(--font-libre-caslon)] text-lg tracking-wider text-[var(--lintel-paper)] font-normal"
          >
            SONIC ARCHITECTURE
          </a>
          <nav aria-label="Sections" className="flex items-center gap-3 sm:gap-5">
            <a
              href={inVenue ? "#signals" : "#enter"}
              className="hidden font-mono text-[10px] tracking-[0.22em] text-[var(--lintel-paper)]/75 uppercase transition-colors hover:text-[var(--lintel-paper)] sm:inline"
            >
              Explore
            </a>
            {inVenue && (
              <a
                href="#soundtrack"
                className="hidden font-mono text-[10px] tracking-[0.22em] text-[var(--lintel-paper)]/75 uppercase transition-colors hover:text-[var(--lintel-paper)] md:inline"
              >
                Soundtrack
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsAudioEnabled((v) => !v)}
              aria-pressed={isAudioEnabled}
              className="border border-[var(--lintel-paper)]/20 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-paper)]/85 uppercase transition-colors hover:border-[var(--lintel-terracotta)]/70 hover:text-[var(--lintel-paper)]"
            >
              Sound {isAudioEnabled ? "on" : "off"}
            </button>
            {vibe && (
              <button
                type="button"
                onClick={reset}
                className="border border-[var(--lintel-moss)]/70 bg-[var(--lintel-moss)]/20 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-paper)] uppercase transition-colors hover:bg-[var(--lintel-moss)]/40"
              >
                New Space
              </button>
            )}
            <a
              href="/studio"
              className="border border-[var(--lintel-paper)]/30 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-paper)] uppercase transition-colors hover:bg-[var(--lintel-paper)]/10"
            >
              Studio
            </a>
          </nav>
        </div>
      </header>

      {/* --- State A: Editorial Landing (Nest-style centered, immersive) ---- */}
      <AnimatePresence>
        {showWorld && (
          <motion.section
            key="landing"
            id="top"
            initial={{ opacity: 0 }}
            animate={{ opacity: mode === "travelling" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : 0.8, ease: EASE }}
            className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center text-center"
          >
            {/* Dark scrim so text is always readable over 3D scene */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/60" />

            <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pb-16 pt-24">
              {/* Eyebrow pill */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white/70 uppercase backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--lintel-moss)]" />
                  Spatial Design from Cultural Resonance
                </span>
              </motion.div>

              {/* Hero headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, ease: EASE, delay: 0.22 }}
                className="sa-display text-[clamp(3rem,8vw,6.5rem)] tracking-tight text-white drop-shadow-2xl"
              >
                A feeling,<br />given form.
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: EASE, delay: 0.38 }}
                className="max-w-lg text-base font-light leading-relaxed text-white/65 md:text-lg"
              >
                Transform any description into a walkable, interactive 3D space — shaped by culture, mood, and material.
              </motion.p>

              {/* Dark glass input card */}
              <motion.div
                id="enter"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: EASE, delay: 0.52 }}
                className="w-full scroll-mt-24"
              >
                <CulturalInput onSubmit={generate} isLoading={isLoading} />
              </motion.div>

              {/* Loading / error status */}
              <div className="min-h-[1.5rem]" role="status" aria-live="polite">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.p
                      key="finding"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-[11px] tracking-[0.24em] text-[var(--lintel-terracotta)] uppercase"
                    >
                      Synthesizing spatial geometry &amp; cultural signals…
                    </motion.p>
                  )}
                  {!isLoading && error && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      className="font-mono text-xs text-[var(--lintel-terracotta)]"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --- Cinematic Wash Transition ----------------------------------- */}
      <AnimatePresence>
        {mode === "travelling" && (
          <motion.div
            key="wash"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0.98] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.35 : 1.6, times: [0, 0.5, 1], ease: EASE }}
            style={{
              background:
                "radial-gradient(70% 60% at 50% 46%, rgba(10,14,26,0.98) 0%, rgba(20,24,35,0.95) 45%, rgba(10,14,26,0.98) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* --- State C: Full-Screen 3D Space & Architectural Sections ------- */}
      {inVenue && vibe && (
        <motion.div
          id="top"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.3 : 0.8, ease: EASE }}
        >
          {/* Main 3D Viewport */}
          <section id="venue" className="relative h-[100svh] w-full overflow-hidden">
            {webgl === false ? (
              <VenueScene vibe={vibe} />
            ) : webgl ? (
              <Venue3D
                vibe={vibe}
                params={sceneParams}
                spec={sceneSpec ?? undefined}
                promptText={submittedPrompt}
                fill
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#0A0E1A] font-mono text-[10px] tracking-[0.24em] text-[var(--lintel-paper)]/70 uppercase">
                Preparing spatial environment…
              </div>
            )}

            {/* Overlaid Title Banner — Nest-style frosted glass pill, centered at top */}
            <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-6">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-1.5 backdrop-blur-xl">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.24em] text-[var(--lintel-terracotta)] uppercase">
                    {devMock ? "Dev Preview" : "Spatial Specification"}
                  </span>
                  <span className="h-2.5 w-px bg-white/25" />
                  <span className="font-mono text-[9px] tracking-[0.16em] text-white/60 uppercase">
                    Generated by Sonic Architecture
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-libre-caslon)] text-2xl tracking-tight text-white drop-shadow-2xl md:text-4xl font-normal">
                  {sceneSpec?.typologyLabel ?? vibe.concept.title}
                </h2>
              </motion.div>
            </div>

            {/* Scroll Down Action — Nest-style centered pill */}
            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center">
              <motion.a
                href="#signals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-5 py-2.5 font-mono text-[10px] tracking-[0.2em] text-white/80 uppercase backdrop-blur-xl transition-all hover:border-white/30 hover:bg-black/60 hover:text-white"
              >
                <span>Explore Design Rationale</span>
                <span className="text-[var(--lintel-terracotta)]">↓</span>
              </motion.a>
            </div>
          </section>

          {/* Editorial Analysis Sections */}
          <div className="relative z-10">
            <SignalAnalysis vibe={vibe} />
            <SpatialTranslation vibe={vibe} promptText={submittedPrompt} />
            <DesignMoodboard vibe={vibe} />
            <SoundtrackSection
              vibe={vibe}
              isAudioEnabled={isAudioEnabled}
              onToggleAudio={() => setIsAudioEnabled((v) => !v)}
            />
            <FinalCta vibe={vibe} onReset={reset} />
          </div>

          {/* Architectural Footer */}
          <footer className="border-t border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)] py-10">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
              <p className="font-mono text-[10px] tracking-[0.24em] text-[var(--lintel-paper)]/60 uppercase">
                Cultural affinity intelligence by Qloo · Spatial architecture by Sonic Architecture
              </p>
              <a
                href="/studio"
                className="font-mono text-[10px] tracking-[0.24em] text-[var(--lintel-paper)]/75 uppercase underline-offset-4 hover:text-[var(--lintel-paper)] hover:underline"
              >
                Studio workspace →
              </a>
            </div>
          </footer>
        </motion.div>
      )}
    </main>
  );
}
