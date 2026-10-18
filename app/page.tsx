"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import CulturalInput from "@/components/CulturalInput";
import SignalAnalysis from "@/components/SignalAnalysis";
import SpatialTranslation from "@/components/SpatialTranslation";
import DesignMoodboard from "@/components/DesignMoodboard";
import SoundtrackSection from "@/components/SoundtrackSection";
import FinalCta from "@/components/FinalCta";
import VenueScene from "@/components/VenueScene";
import ResonanceField from "@/components/ResonanceField";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import type { VibePayload } from "@/lib/types";
import { neutralSceneParams, sceneParamsFromPayload } from "@/lib/scene-params";
import { usePrefersReducedMotion, useWebGLSupport } from "@/components/three/shared";
import type { HeroPhase } from "@/components/three/SonicHero";

const SonicHero = dynamic(() => import("@/components/three/SonicHero"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0">
      <ResonanceField intensity={0.5} />
    </div>
  ),
});

const Venue3D = dynamic(() => import("@/components/three/Venue3D"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-sm border border-[#F4F0E8]/10 bg-[#0A0810] font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase md:aspect-[16/9]">
      Loading venue…
    </div>
  ),
});

const STAGES = [
  "READING YOUR CULTURAL SIGNALS...",
  "RESOLVING ENTITIES IN QLOO...",
  "TRANSLATING AFFINITY INTO SPACE...",
];

const CHAIN = ["Cultural input", "Affinity signals", "Spatial translation", "Venue experience"];

const FORMING_MS = 2600;

export default function Page() {
  const [vibe, setVibe] = useState<VibePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [heroPhase, setHeroPhase] = useState<HeroPhase>("resonance");
  const webgl = useWebGLSupport();
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const sceneParams = useMemo(() => (vibe ? sceneParamsFromPayload(vibe) : neutralSceneParams()), [vibe]);

  const energyScore = vibe
    ? Math.min(100, Math.max(0, Math.round(((vibe.lightingTemperatureK - 2500) / 4000) * 100)))
    : 50;
  useAmbientAudio(energyScore, isAudioEnabled, analyserRef);

  useEffect(() => {
    if (!isLoading) return;
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(i + 1, STAGES.length - 1);
      setStage(i);
    }, 2400);
    return () => window.clearInterval(id);
  }, [isLoading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async (input: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setIsLoading(true);
    setError(null);
    setVibe(null);
    setStage(0);
    setHeroPhase("charging");

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
        setHeroPhase("resonance");
        return;
      }
      setVibe(data);
      setHeroPhase("forming");
      window.setTimeout(() => {
        if (seq !== seqRef.current) return;
        setHeroPhase("resonance");
        document.getElementById("signals")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, reducedMotion ? 400 : FORMING_MS);
    } catch (err) {
      if (controller.signal.aborted || seq !== seqRef.current) return;
      setHeroPhase("resonance");
      setError(
        err instanceof Error && err.message.includes("abort")
          ? "Request cancelled."
          : "Could not reach the translation service. Check your connection and retry."
      );
    } finally {
      if (seq === seqRef.current) setIsLoading(false);
    }
  };

  const reset = () => {
    seqRef.current += 1;
    abortRef.current?.abort();
    setVibe(null);
    setError(null);
    setIsLoading(false);
    setHeroPhase("resonance");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const hero = webgl === false ? (
    <div className="absolute inset-0">
      <ResonanceField intensity={heroPhase === "charging" ? 0.9 : 0.55} />
      <p className="absolute right-4 bottom-4 font-mono text-[9px] tracking-[0.2em] text-[#A6A0AA] uppercase">
        WebGL unavailable — 2D resonance field
      </p>
    </div>
  ) : webgl ? (
    <div className="absolute inset-0">
      <SonicHero params={sceneParams} phase={heroPhase} analyserRef={analyserRef} reducedMotion={reducedMotion} />
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-[#0B0A0D] text-[#F4F0E8]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#F4F0E8]/8 bg-[#0B0A0D]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#top" className="font-mono text-[11px] tracking-[0.3em] text-[#A6A0AA] uppercase transition-colors hover:text-[#F4F0E8]">
            Sonic Architecture
          </a>
          <nav aria-label="Sections" className="hidden gap-6 md:flex">
            {[["#signals", "Signals"], ["#translate", "Translate"], ["#venue", "Venue"], ["#moodboard", "Moodboard"], ["#soundtrack", "Soundtrack"]].map(([href, label]) => (
              <a key={href} href={href} className="font-mono text-[10px] tracking-[0.22em] text-[#A6A0AA] uppercase transition-colors hover:text-[#D5FF3F]">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAudioEnabled((v) => !v)}
              aria-pressed={isAudioEnabled}
              className="rounded-full border border-[#F4F0E8]/12 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-[#A6A0AA] uppercase transition-colors hover:border-[#D5FF3F]/60 hover:text-[#F4F0E8]"
            >
              Audio {isAudioEnabled ? "on" : "off"}
            </button>
            {vibe && (
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-[#D5FF3F]/50 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-[#D5FF3F] uppercase transition-colors hover:bg-[#D5FF3F]/10"
              >
                New concept
              </button>
            )}
          </div>
        </div>
      </header>

      <section id="top" className="relative flex min-h-[92vh] items-center overflow-hidden pt-20">
        {hero}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A0810]/85 via-[#0A0810]/40 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="sa-label mb-6 text-[#D5FF3F]">Culture, translated into space.</p>
            <h1 className="text-[13vw] leading-[0.92] font-light tracking-[-0.02em] text-[#F4F0E8] md:text-7xl lg:text-8xl">
              SONIC
              <br />
              ARCHITECTURE
            </h1>
            <p className="mt-6 font-mono text-xs tracking-[0.34em] text-[#8B5CF6] uppercase md:text-sm">
              Your taste has a frequency.
            </p>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#A6A0AA] md:text-base">
              A film. An artist. A place. A feeling. Discover the space your cultural world would create.
            </p>
            <div className="mt-12">
              <CulturalInput onSubmit={generate} isLoading={isLoading} />
            </div>
            <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-[0.18em] text-[#A6A0AA]/80 uppercase">
              {isAudioEnabled
                ? "Ambient tone on — a procedural oscillator; the field reacts to its real analyser signal."
                : "Sound off — the field runs on procedural waves. No autoplay, ever."}
            </p>
          </motion.div>
        </div>
      </section>

      <section id="how" className="scroll-mt-24 border-y border-[#F4F0E8]/8 py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 md:grid-cols-4">
          {CHAIN.map((step, i) => (
            <div key={step}>
              <p className="font-mono text-[10px] tracking-[0.28em] text-[#D5FF3F]">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-1.5 text-sm uppercase tracking-[0.12em]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div aria-live="polite" role="status" className="sr-only">
        {isLoading ? STAGES[stage] : error ? error : vibe ? "Concept ready." : ""}
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.section
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-32 text-center"
          >
            <div className="mb-8 flex gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1 w-10 bg-[#D5FF3F]"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
                />
              ))}
            </div>
            <p className="font-mono text-xs tracking-[0.3em] text-[#F4F0E8] uppercase">{STAGES[stage]}</p>
            <p className="mt-4 max-w-sm text-xs text-[#A6A0AA]">
              Real Qloo requests are running server-side. Nothing is fabricated while you wait.
            </p>
          </motion.section>
        )}

        {!isLoading && error && (
          <motion.section
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-6xl px-6 py-24"
          >
            <div className="max-w-lg rounded-sm border border-[#FF3366]/40 bg-[#151018] p-8">
              <p className="sa-label mb-3 text-[#FF3366]">Translation failed</p>
              <p className="text-sm leading-relaxed text-[#F4F0E8]">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-6 rounded-sm border border-[#F4F0E8]/20 px-5 py-2.5 text-xs tracking-[0.2em] uppercase transition-colors hover:border-[#D5FF3F]/60"
              >
                Dismiss
              </button>
            </div>
          </motion.section>
        )}

        {!isLoading && !error && vibe && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <SignalAnalysis vibe={vibe} />
            <SpatialTranslation vibe={vibe} />
            <section id="venue" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
              <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="sa-label mb-3">03 — Venue installation</p>
                  <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
                    {vibe.concept.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A6A0AA]">
                    {vibe.concept.atmosphere}
                  </p>
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-[#A6A0AA]">
                  Drag to look around. The controls change lighting, atmosphere and materials live —
                  every parameter comes from your cultural profile.
                </p>
              </header>
              {webgl === false ? (
                <VenueScene vibe={vibe} />
              ) : webgl ? (
                <Venue3D vibe={vibe} params={sceneParams} />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-sm border border-[#F4F0E8]/10 bg-[#0A0810] font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
                  Preparing venue…
                </div>
              )}
            </section>
            <DesignMoodboard vibe={vibe} />
            <SoundtrackSection
              vibe={vibe}
              isAudioEnabled={isAudioEnabled}
              onToggleAudio={() => setIsAudioEnabled((v) => !v)}
            />
            <FinalCta vibe={vibe} onReset={reset} />
          </motion.div>
        )}

        {!isLoading && !error && !vibe && (
          <motion.section
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto w-full max-w-6xl px-6 py-24 text-center"
          >
            <p className="text-sm text-[#A6A0AA]">
              Enter your cultural world above — the venue, moodboard, and soundtrack appear here.
            </p>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="border-t border-[#F4F0E8]/8 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
            Cultural evidence by Qloo · Spatial translation by Sonic Architecture
          </p>
          <a href="/studio" className="font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase underline-offset-4 hover:text-[#F4F0E8] hover:underline">
            Studio view
          </a>
        </div>
      </footer>
    </main>
  );
}
