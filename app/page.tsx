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
import { usePrefersReducedMotion, useWebGLSupport } from "@/components/three/shared";
import type { WorldPhase } from "@/components/three/CloudWorld";
import { devMockVibe, isDevMockRequested } from "@/lib/dev-mock";

/**
 * Landing page — "enter the cloud world".
 *
 * Modes:
 *   landing    — full-viewport sky, centred prompt.
 *   travelling — one /api/vibe request in flight; world reacts, camera pushes.
 *   venue      — the venue fills the screen, then the editorial sections below.
 *
 * Qloo-safety invariant: `generate()` is the *only* place that issues a
 * request, it is reachable only from an explicit submit, and it is guarded so
 * that a duplicate submit while in flight is ignored. Nothing on mount, on
 * keystroke, on hover or during animation ever calls the API.
 */

const CloudWorld = dynamic(() => import("@/components/three/CloudWorld"), {
  ssr: false,
  loading: () => <SkyFallback />,
});

const Venue3D = dynamic(() => import("@/components/three/Venue3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0A0810] font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
      Forming venue…
    </div>
  ),
});

type Mode = "landing" | "travelling" | "venue";

const EASE = [0.22, 1, 0.36, 1] as const;

const subscribeNoop = () => () => {};

export default function Page() {
  const [mode, setMode] = useState<Mode>("landing");
  const [vibe, setVibe] = useState<VibePayload | null>(null);
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
  const energyScore = vibe
    ? Math.min(100, Math.max(0, Math.round(((vibe.lightingTemperatureK - 2500) / 4000) * 100)))
    : 50;
  useAmbientAudio(energyScore, isAudioEnabled, analyserRef);

  // Client-only: was ?mock=1 requested? (never true in production builds).
  // useSyncExternalStore renders the server snapshot ("") first, then the real
  // location, so there is no hydration mismatch and no setState-in-effect.
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

  const worldPhase: WorldPhase = isLoading
    ? "charging"
    : mode === "travelling"
      ? "travelling"
      : "idle";

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
      reducedMotion ? 900 : 2000
    );
  };

  const generate = async (input: string) => {
    if (isLoading) return; // one request per intentional submit
    abortRef.current?.abort();
    const seq = ++seqRef.current;
    setIsLoading(true);
    setError(null);

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
    setError(null);
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const inVenue = mode === "venue";
  const showWorld = !inVenue;

  return (
    <main className={`min-h-screen ${inVenue ? "bg-[#0B0A0D] text-[#F4F0E8]" : "sa-ink"}`}>
      {/* --- Immersive sky: fixed, full-viewport, behind everything ---------- */}
      {showWorld && (
        <div className="fixed inset-0 z-0" aria-hidden>
          {webgl && !reducedMotion ? (
            <CloudWorld phase={worldPhase} reducedMotion={reducedMotion} />
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

      {/* --- Minimal overlay nav -------------------------------------------- */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          inVenue ? "border-b border-[#F4F0E8]/10 bg-[#0B0A0D]/70 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <a
            href="#top"
            className={`font-mono text-[11px] tracking-[0.3em] uppercase transition-colors ${
              inVenue ? "text-[#F4F0E8]" : "sa-ink"
            }`}
          >
            Sonic Architecture
          </a>
          <nav aria-label="Sections" className="flex items-center gap-3 sm:gap-6">
            <a
              href={inVenue ? "#signals" : "#enter"}
              className={`hidden font-mono text-[10px] tracking-[0.22em] uppercase transition-colors sm:inline ${
                inVenue ? "text-[#A6A0AA] hover:text-[#F4F0E8]" : "sa-ink-soft hover:text-[#26364a]"
              }`}
            >
              The Experience
            </a>
            {inVenue && (
              <a
                href="#soundtrack"
                className="hidden font-mono text-[10px] tracking-[0.22em] text-[#A6A0AA] uppercase transition-colors hover:text-[#F4F0E8] md:inline"
              >
                Soundtrack
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsAudioEnabled((v) => !v)}
              aria-pressed={isAudioEnabled}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                inVenue
                  ? "border-[#F4F0E8]/15 text-[#A6A0AA] hover:border-[#AAA9EF]/60 hover:text-[#F4F0E8]"
                  : "border-white/70 bg-white/30 text-[#26364a] backdrop-blur-sm hover:bg-white/55"
              }`}
            >
              Sound {isAudioEnabled ? "on" : "off"}
            </button>
            {vibe && (
              <button
                type="button"
                onClick={reset}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  inVenue
                    ? "border-[#D5FF3F]/50 text-[#D5FF3F] hover:bg-[#D5FF3F]/10"
                    : "border-[#26364a]/40 text-[#26364a] hover:bg-[#26364a]/10"
                }`}
              >
                New world
              </button>
            )}
            <a
              href="/studio"
              className={`hidden font-mono text-[10px] tracking-[0.22em] uppercase transition-colors lg:inline ${
                inVenue ? "text-[#A6A0AA] hover:text-[#F4F0E8]" : "sa-ink-soft hover:text-[#26364a]"
              }`}
            >
              Studio
            </a>
          </nav>
        </div>
      </header>

      {/* --- State A: landing ------------------------------------------------- */}
      <AnimatePresence>
        {showWorld && (
          <motion.section
            key="landing"
            id="top"
            initial={{ opacity: 0 }}
            animate={{ opacity: mode === "travelling" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : 0.9, ease: EASE }}
            className="relative z-10 flex min-h-[100svh] flex-col justify-center"
          >
            <div className="mx-auto w-full max-w-3xl px-6 pb-24 pt-28 text-center">
              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: EASE }}
              >
                <div className="sa-veil pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70%]" />
                <p className="sa-ink-soft mb-7 font-mono text-[10px] tracking-[0.34em] uppercase">
                  A new way to experience culture
                </p>
                <h1 className="sa-ink text-[15vw] leading-[0.92] font-light tracking-[-0.02em] md:text-[7.5rem]">
                  SONIC
                  <br />
                  ARCHITECTURE
                </h1>
                <p className="sa-ink mt-8 text-lg font-light md:text-2xl">
                  Your taste has a world of its own.
                </p>
                <p className="sa-ink-soft mx-auto mt-3 max-w-xl text-sm leading-relaxed md:text-base">
                  Tell us what moves you. Discover the space it creates.
                </p>

                <div id="enter" className="mt-12 flex flex-col items-center scroll-mt-28">
                  <CulturalInput onSubmit={generate} isLoading={isLoading} />
                </div>

                <div className="mt-8 min-h-[1.5rem]" role="status" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {isLoading && (
                      <motion.p
                        key="finding"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="sa-ink font-mono text-[11px] tracking-[0.3em] uppercase"
                      >
                        Finding your cultural frequency…
                      </motion.p>
                    )}
                    {!isLoading && error && (
                      <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="text-sm text-[#b4485f]">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --- Cloud wipe: the world accelerates forward, then whites out -------- */}
      <AnimatePresence>
        {mode === "travelling" && (
          <motion.div
            key="wash"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.35 : 1.2, ease: EASE }}
            style={{
              background:
                "radial-gradient(70% 60% at 50% 46%, rgba(255,255,255,0.98) 0%, rgba(242,248,251,0.94) 42%, rgba(226,237,245,0.86) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* --- State C: the venue fills the screen, sections follow ------------- */}
      {inVenue && vibe && (
        <motion.div
          id="top"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.3 : 1, ease: EASE }}
        >
          <section id="venue" className="relative h-[100svh] w-full overflow-hidden">
            {webgl === false ? (
              <VenueScene vibe={vibe} />
            ) : webgl ? (
              <Venue3D vibe={vibe} params={sceneParams} fill />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#0A0810] font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
                Preparing venue…
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-6">
              <div className="max-w-2xl text-center">
                <p className="sa-label mb-2 text-[#D5FF3F]">
                  {devMock ? "Development preview — not Qloo data" : "Your cultural world"}
                </p>
                <h2 className="text-2xl font-light tracking-tight text-[#F4F0E8] md:text-3xl">
                  {vibe.concept.title}
                </h2>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center">
              <a
                href="#signals"
                className="pointer-events-auto rounded-full border border-[#F4F0E8]/20 bg-[#0B0A0D]/40 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-[#F4F0E8] uppercase backdrop-blur-sm transition-colors hover:border-[#AAA9EF]/60"
              >
                Explore the concept ↓
              </a>
            </div>
          </section>

          <div className="relative z-10">
            <SignalAnalysis vibe={vibe} />
            <SpatialTranslation vibe={vibe} />
            <DesignMoodboard vibe={vibe} />
            <SoundtrackSection
              vibe={vibe}
              isAudioEnabled={isAudioEnabled}
              onToggleAudio={() => setIsAudioEnabled((v) => !v)}
            />
            <FinalCta vibe={vibe} onReset={reset} />
          </div>

          <footer className="border-t border-[#F4F0E8]/8 py-10">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
              <p className="font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
                Cultural evidence by Qloo · Spatial translation by Sonic Architecture
              </p>
              <a
                href="/studio"
                className="font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase underline-offset-4 hover:text-[#F4F0E8] hover:underline"
              >
                Studio view
              </a>
            </div>
          </footer>
        </motion.div>
      )}
    </main>
  );
}
