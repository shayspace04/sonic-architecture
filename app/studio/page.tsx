"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { VibePayload } from "@/lib/types";
import { sceneParamsFromPayload } from "@/lib/scene-params";
import type { SceneSpec, SpatialObject, SpatialTypology } from "@/lib/scene-spec";
import { generateSceneSpec } from "@/lib/scene-spec";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { downloadBrief, downloadSceneSpec } from "@/lib/brief";
import { localFallbackPayload } from "@/lib/fallback";

const Venue3D = dynamic(() => import("@/components/three/Venue3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0A0E1A] font-mono text-xs tracking-[0.24em] text-[var(--lintel-paper)]/70 uppercase">
      Initializing 3D Spatial Canvas…
    </div>
  ),
});

const STUDIO_PRESETS = [
  {
    label: "Japanese Jazz Lounge",
    prompt: "A Japanese jazz listening room with dark timber, warm paper lanterns, and intimate seating.",
    typology: "listening_room" as SpatialTypology,
  },
  {
    label: "Pink Grunge Party",
    prompt: "A pink grungy birthday party with chrome furniture, dramatic lighting, and playful details.",
    typology: "party_venue" as SpatialTypology,
  },
  {
    label: "Scandinavian Living",
    prompt: "A minimalist Scandinavian living room with morning sunlight and natural oak.",
    typology: "scandinavian_living" as SpatialTypology,
  },
  {
    label: "Futuristic Launch",
    prompt: "An immersive futuristic product launch venue with reflective surfaces and cinematic lighting.",
    typology: "futuristic_launch" as SpatialTypology,
  },
];

type StudioTab = "spec" | "rationale" | "inventory";

export default function StudioPage() {
  const [userInput, setUserInput] = useState(
    "A Japanese jazz listening room with dark timber, warm paper lanterns, and intimate seating."
  );
  const [sliderVal, setSliderVal] = useState(45);
  const [activeTab, setActiveTab] = useState<StudioTab>("spec");
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTypology, setSelectedTypology] = useState<SpatialTypology | "auto">("auto");
  const [selectedObject, setSelectedObject] = useState<SpatialObject | null>(null);

  const [vibe, setVibe] = useState<VibePayload>(() =>
    localFallbackPayload(
      ["Japanese jazz", "dark timber", "paper lanterns"],
      ["Initial default spatial concept."]
    )
  );

  const baseSceneParams = useMemo(() => sceneParamsFromPayload(vibe), [vibe]);

  // Taste stratification slider modulates lighting temperature and openness
  const sceneParams = useMemo(() => {
    const kelvinMod = Math.round(2500 + (sliderVal / 100) * 4000);
    const opennessMod = 0.3 + (sliderVal / 100) * 0.6;
    return {
      ...baseSceneParams,
      keyLightKelvin: kelvinMod,
      openness: opennessMod,
    };
  }, [baseSceneParams, sliderVal]);

  const baseSpec = useMemo(() => generateSceneSpec(userInput, vibe), [userInput, vibe]);

  const sceneSpec: SceneSpec = useMemo(() => {
    if (selectedTypology === "auto") return baseSpec;
    // User manual override of typology
    const custom = generateSceneSpec(selectedTypology.replace("_", " "), vibe);
    return {
      ...custom,
      typology: selectedTypology,
    };
  }, [baseSpec, selectedTypology, vibe]);

  useAmbientAudio(sliderVal, isAudioEnabled);

  const handleGenerate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput }),
      });
      const data = (await res.json()) as VibePayload & { error?: string };
      if (res.ok && data && typeof data.primaryColorHex === "string") {
        setVibe(data);
      }
    } catch (err) {
      console.warn("Studio vibe generation fallback:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--lintel-night)] text-[var(--lintel-paper)] font-sans antialiased">
      {/* --- Top Studio Header Bar --- */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)] px-5">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--lintel-paper)]/70 transition-colors hover:text-[var(--lintel-paper)]"
          >
            ← <span>Overview</span>
          </Link>
          <div className="h-4 w-px bg-[var(--lintel-paper)]/20" />
          <h1 className="font-mono text-xs font-semibold tracking-[0.24em] uppercase text-[var(--lintel-paper)]">
            SONIC ARCHITECTURE <span className="text-[var(--lintel-terracotta)]">{"// SPATIAL STUDIO"}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAudioEnabled((v) => !v)}
            className="border border-[var(--lintel-paper)]/20 px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--lintel-paper)] transition-colors hover:border-[var(--lintel-paper)]/50"
          >
            AUDIO {isAudioEnabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => downloadBrief(vibe)}
            className="border border-[var(--lintel-paper)]/20 px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--lintel-paper)] transition-colors hover:border-[var(--lintel-terracotta)] hover:text-[var(--lintel-terracotta)]"
          >
            Export Brief (.md)
          </button>
          <button
            type="button"
            onClick={() => downloadSceneSpec(sceneSpec, sceneSpec.typologyLabel)}
            className="border border-[var(--lintel-paper)]/20 px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--lintel-paper)] transition-colors hover:border-[var(--lintel-moss)] hover:text-[var(--lintel-paper)]"
          >
            Export Spec (.json)
          </button>
        </div>
      </header>

      {/* --- Main 3-Column Studio Workspace --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* === Left Control Column: Brief & Synthesis === */}
        <aside className="w-80 shrink-0 border-r border-[var(--lintel-paper)]/15 bg-[#0e1320]/80 p-5 overflow-y-auto">
          <div className="space-y-6">
            {/* Prompt Composer */}
            <div>
              <label className="font-mono text-[10px] tracking-[0.2em] text-[var(--lintel-terracotta)] uppercase block mb-2">
                Spatial Design Brief
              </label>
              <textarea
                rows={3}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe atmosphere, materials, lighting, or spatial requirements..."
                className="w-full resize-none border border-[var(--lintel-paper)]/20 bg-[var(--lintel-night)]/80 p-3 text-xs leading-relaxed text-[var(--lintel-paper)] placeholder:text-[var(--lintel-muted)] focus:outline-none focus:border-[var(--lintel-terracotta)]"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="mt-2.5 w-full border border-[var(--lintel-terracotta)] bg-[var(--lintel-terracotta)] px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--lintel-paper)] uppercase transition-all hover:bg-[var(--lintel-moss)] hover:border-[var(--lintel-moss)] disabled:opacity-50"
              >
                {isLoading ? "Synthesizing Space…" : "Compile Spatial Geometry ↗"}
              </button>
            </div>

            {/* Quick Design Presets */}
            <div>
              <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-muted)] uppercase block mb-2">
                Curated Typologies
              </span>
              <div className="grid grid-cols-1 gap-1.5 font-mono text-[10px]">
                {STUDIO_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setUserInput(p.prompt);
                      setSelectedTypology(p.typology);
                    }}
                    className="border border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)]/50 px-3 py-2 text-left text-[var(--lintel-paper)]/85 transition-colors hover:border-[var(--lintel-terracotta)]/70 hover:bg-[var(--lintel-night)]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Taste Stratification Slider */}
            <div className="border-t border-[var(--lintel-paper)]/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-muted)] uppercase">
                  Taste Stratification
                </span>
                <span className="font-mono text-[10px] text-[var(--lintel-paper)]">
                  {sliderVal}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="w-full accent-[var(--lintel-terracotta)] cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[9px] text-[var(--lintel-muted)] mt-1">
                <span>INTIMATE / WARM</span>
                <span>EXPANSIVE / ELECTRIC</span>
              </div>
            </div>

            {/* Manual Typology Override */}
            <div className="border-t border-[var(--lintel-paper)]/10 pt-4">
              <label className="font-mono text-[10px] tracking-[0.18em] text-[var(--lintel-muted)] uppercase block mb-2">
                Typology Override
              </label>
              <select
                value={selectedTypology}
                onChange={(e) => setSelectedTypology(e.target.value as SpatialTypology | "auto")}
                className="w-full border border-[var(--lintel-paper)]/20 bg-[var(--lintel-night)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--lintel-paper)] focus:outline-none"
              >
                <option value="auto">Auto (from brief & signals)</option>
                <option value="listening_room">Japanese Jazz Listening Lounge</option>
                <option value="party_venue">Underground Grunge Hall</option>
                <option value="scandinavian_living">Minimalist Nordic Living</option>
                <option value="futuristic_launch">Kinetic Launch Pavilion</option>
                <option value="gallery_pavilion">Contemplative Spatial Gallery</option>
              </select>
            </div>

            {/* Qloo Provenance Status */}
            <div className="border border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)]/70 p-3 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--lintel-muted)] uppercase">Intelligence:</span>
                <span
                  className={
                    vibe.reasoning.source === "qloo"
                      ? "text-[var(--lintel-moss)] font-semibold uppercase"
                      : "text-amber-400 font-semibold uppercase"
                  }
                >
                  {vibe.reasoning.source}
                </span>
              </div>
              <div className="mt-1 text-[9px] text-[var(--lintel-paper)]/70">
                {vibe.reasoning.source === "qloo"
                  ? "Real cultural affinity evidence active."
                  : "Deterministic local fallback active."}
              </div>
            </div>
          </div>
        </aside>

        {/* === Center Main 3D Viewport === */}
        <main className="relative flex-1 bg-[#0A0E1A] overflow-hidden">
          <Venue3D
            vibe={vibe}
            params={sceneParams}
            spec={sceneSpec}
            promptText={userInput}
            fill
          />
        </main>

        {/* === Right Sidebar: Spatial Intelligence & Inspector === */}
        <aside className="w-88 shrink-0 border-l border-[var(--lintel-paper)]/15 bg-[#0e1320]/80 flex flex-col overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)] text-[10px] font-mono">
            {(
              [
                ["spec", "Specification"],
                ["rationale", "Rationale"],
                ["inventory", "Objects"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-center tracking-[0.14em] uppercase transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--lintel-terracotta)] text-[var(--lintel-paper)] font-semibold bg-[var(--lintel-night)]/50"
                    : "text-[var(--lintel-muted)] hover:text-[var(--lintel-paper)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
            {activeTab === "spec" && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] tracking-[0.18em] text-[var(--lintel-terracotta)] uppercase block">
                    Typology
                  </span>
                  <p className="mt-1 font-sans text-base font-medium text-[var(--lintel-paper)]">
                    {sceneSpec.typologyLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--lintel-paper)]/75 leading-relaxed">
                    {sceneSpec.atmosphereNote}
                  </p>
                </div>

                <div className="border-t border-[var(--lintel-paper)]/10 pt-3 space-y-2 text-[11px]">
                  <div>
                    <span className="text-[var(--lintel-muted)]">Room Envelope:</span>{" "}
                    <span className="text-[var(--lintel-paper)] font-semibold">
                      {sceneSpec.roomDimensions.width}m × {sceneSpec.roomDimensions.depth}m × {sceneSpec.roomDimensions.height}m
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--lintel-muted)]">Wall Finish:</span>{" "}
                    <span className="text-[var(--lintel-paper)]">
                      {sceneSpec.wallFinish.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--lintel-muted)]">Flooring:</span>{" "}
                    <span className="text-[var(--lintel-paper)]">
                      {vibe.flooringMaterial || sceneSpec.floorFinish.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--lintel-muted)]">Seating Fabric:</span>{" "}
                    <span className="text-[var(--lintel-paper)]">
                      {vibe.seatingFabric || "Curated Architectural Seating"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--lintel-muted)]">Light Temperature:</span>{" "}
                    <span className="text-[var(--lintel-paper)]">
                      {sceneParams.keyLightKelvin}K
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--lintel-muted)]">Window Aperture:</span>{" "}
                    <span className="text-[var(--lintel-paper)]">
                      {sceneSpec.hasWindowAperture ? "Natural Daylight Slot Active" : "Enclosed Cocoon"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--lintel-paper)]/10 pt-3">
                  <span className="text-[10px] tracking-[0.18em] text-[var(--lintel-muted)] uppercase block mb-1">
                    Design Intent
                  </span>
                  <p className="text-[11px] text-[var(--lintel-paper)]/85 leading-relaxed">
                    {sceneSpec.designIntent}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "rationale" && (
              <div className="space-y-4">
                <span className="text-[10px] tracking-[0.18em] text-[var(--lintel-terracotta)] uppercase block">
                  Design Traceability
                </span>
                <p className="text-[10px] text-[var(--lintel-paper)]/70 leading-relaxed">
                  Every parameter is deterministically mapped from cultural evidence and architectural principles.
                </p>

                <div className="space-y-3 pt-2">
                  {Object.entries(vibe.reasoning.rules).map(([field, rule]) => (
                    <div
                      key={field}
                      className="border-l border-[var(--lintel-terracotta)]/70 bg-[var(--lintel-night)]/60 p-2.5 pl-3"
                    >
                      <span className="text-[10px] tracking-[0.16em] text-[var(--lintel-terracotta)] uppercase block">
                        {field}
                      </span>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--lintel-paper)]/85">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>

                {vibe.evidence.genreTags.length > 0 && (
                  <div className="border-t border-[var(--lintel-paper)]/10 pt-3">
                    <span className="text-[10px] tracking-[0.18em] text-[var(--lintel-muted)] uppercase block mb-1">
                      Matched Qloo Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ...vibe.evidence.genreTags,
                        ...vibe.evidence.styleTags,
                        ...vibe.evidence.adjectives,
                      ].map((t) => (
                        <span
                          key={t}
                          className="border border-[var(--lintel-paper)]/20 px-2 py-0.5 text-[9px] text-[var(--lintel-paper)]/80"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-3">
                <span className="text-[10px] tracking-[0.18em] text-[var(--lintel-terracotta)] uppercase block mb-2">
                  Placed 3D Objects ({sceneSpec.objects.length})
                </span>
                <div className="space-y-2">
                  {sceneSpec.objects.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => setSelectedObject(obj)}
                      className={`cursor-pointer border p-3 transition-colors ${
                        selectedObject?.id === obj.id
                          ? "border-[var(--lintel-terracotta)] bg-[var(--lintel-terracotta)]/15 text-[var(--lintel-paper)]"
                          : "border-[var(--lintel-paper)]/15 bg-[var(--lintel-night)]/60 text-[var(--lintel-paper)]/80 hover:border-[var(--lintel-paper)]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--lintel-paper)]">
                          {obj.label}
                        </span>
                        <span className="text-[9px] text-[var(--lintel-muted)] uppercase">
                          {obj.kind}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--lintel-paper)]/70">
                        {obj.material} · {obj.dimensions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
