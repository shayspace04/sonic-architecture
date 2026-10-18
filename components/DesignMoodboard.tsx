"use client";

import type { VibePayload } from "@/lib/types";
import ResonanceField from "./ResonanceField";

const SWATCHES = (vibe: VibePayload) => [
  { hex: vibe.primaryColorHex, label: "Primary" },
  { hex: vibe.accentColorHex, label: "Accent" },
  { hex: "#D5FF3F", label: "Signal lime" },
  { hex: "#8B5CF6", label: "Ultraviolet" },
  { hex: "#0B0A0D", label: "Charcoal" },
  { hex: "#F4F0E8", label: "Warm white" },
];

export default function DesignMoodboard({ vibe }: { vibe: VibePayload }) {
  const evidenceTags = [
    ...vibe.evidence.genreTags.slice(0, 4),
    ...vibe.evidence.themeTags.slice(0, 4),
    ...vibe.evidence.adjectives.slice(0, 4),
  ];

  return (
    <section id="moodboard" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
      <header className="mb-12">
        <p className="sa-label mb-3">04 — Design intelligence</p>
        <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
          The moodboard
        </h2>
      </header>

      <div className="relative overflow-hidden rounded-sm border border-[#F4F0E8]/8">
        <ResonanceField intensity={0.35} />
        <div className="relative z-10 grid gap-px bg-[#F4F0E8]/8 md:grid-cols-2">
          <div className="bg-[#0B0A0D]/85 p-8">
            <p className="sa-label mb-3 text-[#D5FF3F]">Concept</p>
            <h3 className="text-3xl font-light tracking-wide text-[#F4F0E8]">{vibe.concept.title}</h3>
            <p className="mt-5 text-sm leading-relaxed text-[#A6A0AA]">{vibe.concept.thesis}</p>
          </div>

          <div className="bg-[#0B0A0D]/85 p-8">
            <p className="sa-label mb-4">Palette</p>
            <div className="grid grid-cols-3 gap-3">
              {SWATCHES(vibe).map((s) => (
                <div key={s.label}>
                  <div
                    className="h-14 w-full rounded-sm border border-[#F4F0E8]/10"
                    style={{ backgroundColor: s.hex }}
                  />
                  <p className="mt-1.5 font-mono text-[9px] tracking-[0.16em] text-[#A6A0AA] uppercase">
                    {s.label}
                  </p>
                  <p className="font-mono text-[9px] text-[#A6A0AA]/60 uppercase">{s.hex}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0B0A0D]/85 p-8">
            <p className="sa-label mb-4">Materials & light</p>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[#A6A0AA]">Flooring</dt>
                <dd className="text-[#F4F0E8]">{vibe.flooringMaterial}</dd>
              </div>
              <div>
                <dt className="text-[#A6A0AA]">Seating</dt>
                <dd className="text-[#F4F0E8]">{vibe.seatingFabric}</dd>
              </div>
              <div>
                <dt className="text-[#A6A0AA]">Lighting</dt>
                <dd className="text-[#F4F0E8]">
                  {vibe.lightingTemperatureK}K — {vibe.concept.lightingDirection}
                </dd>
              </div>
              <div>
                <dt className="text-[#A6A0AA]">Atmosphere</dt>
                <dd className="text-[#F4F0E8]">{vibe.concept.atmosphere}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#0B0A0D]/85 p-8">
            <p className="sa-label mb-4">Cultural evidence in the concept</p>
            {evidenceTags.length > 0 ? (
              <ul className="mb-6 flex flex-wrap gap-1.5">
                {evidenceTags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[#8B5CF6]/40 px-2.5 py-1 font-mono text-[10px] text-[#B39DDB]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-6 text-sm text-[#A6A0AA]">No structured Qloo tags for this profile — defaults applied.</p>
            )}
            <p className="sa-label mb-2">Spatial composition</p>
            <p className="text-sm leading-relaxed text-[#F4F0E8]/85">{vibe.concept.spatialComposition}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
