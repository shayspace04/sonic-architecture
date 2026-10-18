"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SpatialCanvas from "@/components/SpatialCanvas";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";

interface Track {
  title: string;
  artist: string;
}

interface DesignReasoning {
  source: "qloo" | "qloo-partial" | "local-fallback";
  evidence: string[];
  rules: Record<string, string>;
}

interface CurrentVibe {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
  tracks: Track[];
  menu: string;
  fallback?: boolean;
  reasoning?: DesignReasoning;
}

const DEFAULT_VIBE: CurrentVibe = {
  primaryColorHex: "#262626",
  accentColorHex: "#A3A3A3",
  lightingTemperatureK: 3500,
  flooringMaterial: "Micro-cement Screed",
  seatingFabric: "Brushed Matte Canvas",
  tracks: [
    { title: "Intro", artist: "The xx" },
    { title: "Teardrop", artist: "Massive Attack" },
  ],
  menu: "Artisan single-origin pour overs & local charcuterie pairings",
  reasoning: {
    source: "local-fallback",
    evidence: [],
    rules: {
      primaryColorHex: "Local default.",
      accentColorHex: "Local default.",
      lightingTemperatureK: "Local default.",
      flooringMaterial: "Local default.",
      seatingFabric: "Local default.",
    },
  },
};

export default function Page() {
  const [userInput, setUserInput] = useState("");
  const [sliderVal, setSliderVal] = useState(50);
  const [activeHour, setActiveHour] = useState("08:00 PM - Peak Session");
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const [currentVibe, setCurrentVibe] = useState<CurrentVibe>(DEFAULT_VIBE);

  useAmbientAudio(sliderVal, isAudioEnabled);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const payload = { userInput, sliderVal };
      console.log("Sending to /api/vibe:", payload);
      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsedData = (await res.json()) as CurrentVibe;
      console.log("⚡ Injecting Vibe Payload directly into layout:", parsedData);
      setCurrentVibe(parsedData);
      setIsFallback(Boolean(parsedData.fallback));
      setNetworkStatus(parsedData.fallback ? "TIMEOUT" : null);
    } catch (error) {
      console.error("Failed to generate vibe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[#0A0A0A] text-neutral-200 font-mono"
    >
      <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-900">
        <h1 className="text-sm tracking-[0.3em] uppercase text-neutral-400">
          SONIC ARCHITECTURE // v1.0.0
        </h1>
        <button
          onClick={() => setIsAudioEnabled((v) => !v)}
          className="px-4 py-1.5 text-xs border border-neutral-800 rounded-full hover:border-neutral-600 transition-colors"
        >
          AUDIO {isAudioEnabled ? "ON" : "OFF"}
        </button>
      </header>

      <div className="grid grid-cols-3 gap-6 p-6">
        <section className="flex flex-col gap-6 border border-neutral-900 rounded-xl p-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-neutral-500 uppercase tracking-widest">
              Vibe Query
            </label>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe the atmosphere..."
              className="bg-[#0A0A0A] border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="self-start px-4 py-1.5 text-xs border border-neutral-800 rounded-md hover:bg-neutral-900 transition-colors disabled:opacity-50"
            >
              {isLoading ? "COMPILING VIBE..." : "Compile Aesthetics"}
            </button>
            {isFallback && (
              <div className="text-[10px] font-mono text-amber-400 border border-amber-900/60 bg-amber-950/30 rounded px-2 py-1">
                ⚠️ Live Qloo data unavailable: Using Local Fallback Engine.
              </div>
            )}
          </div>

          {networkStatus === "TIMEOUT" && (
            <div className="text-[10px] font-mono text-amber-400 border border-amber-900/60 bg-amber-950/30 rounded px-2 py-1">
              ⚠️ Subnet Latency Detected: Displaying High-Fidelity Local Environment Blueprint.
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-neutral-500 uppercase tracking-widest">
              Taste Stratification
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-neutral-400"
            />
            <div className="flex justify-between text-[10px] text-neutral-600">
              <span>MAINSTREAM</span>
              <span>UNDERGROUND</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="aspect-[4/3] border border-neutral-900 rounded-xl overflow-hidden">
            <SpatialCanvas
              primaryColorHex={currentVibe.primaryColorHex}
              accentColorHex={currentVibe.accentColorHex}
              lightingTemperatureK={currentVibe.lightingTemperatureK}
              flooringMaterial={currentVibe.flooringMaterial}
              seatingFabric={currentVibe.seatingFabric}
            />
          </div>
          <div className="flex items-center justify-center gap-3 mt-4 w-full">
            {["09:00 AM - Morning Glow", "04:00 PM - Golden Hour", "08:00 PM - Peak Session"].map(
              (h) => (
                <button
                  key={h}
                  onClick={() => setActiveHour(h)}
                  className={`px-3 py-1.5 text-[10px] border rounded-full transition-colors ${
                    activeHour === h
                      ? "border-neutral-400 text-neutral-200"
                      : "border-neutral-800 text-neutral-500 hover:border-neutral-600"
                  }`}
                >
                  {h}
                </button>
              )
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6 border border-neutral-900 rounded-xl p-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-xs text-neutral-500 uppercase tracking-widest">
              Playbook Specs
            </h2>
            <ul className="flex flex-col gap-2">
              {currentVibe.tracks.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-[#141414] border border-neutral-900 mb-2 text-xs"
                >
                  <span>{t.title}</span>
                  <span className="text-neutral-600">{t.artist}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xs text-neutral-500 uppercase tracking-widest">
              Culinary
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">{currentVibe.menu}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xs text-neutral-500 uppercase tracking-widest">
              Design Basis
            </h2>
            <p className="text-[10px] text-neutral-500">
              Source: {currentVibe.reasoning?.source ?? "unknown"}
            </p>
            {currentVibe.reasoning?.evidence && currentVibe.reasoning.evidence.length > 0 && (
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Evidence: {currentVibe.reasoning.evidence.join(", ")}
              </p>
            )}
            {currentVibe.reasoning?.rules && (
              <ul className="flex flex-col gap-1 text-[10px] text-neutral-600">
                {Object.entries(currentVibe.reasoning.rules).map(([key, value]) => (
                  <li key={key}>
                    <span className="text-neutral-500">{key}:</span> {value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </motion.main>
  );
}
