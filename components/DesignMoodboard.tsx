"use client";

import type { VibePayload } from "@/lib/types";
import ResonanceField from "./ResonanceField";

const SWATCHES = (vibe: VibePayload) => [
  { hex: vibe.primaryColorHex, label: "Qloo primary" },
  { hex: vibe.accentColorHex, label: "Qloo accent" },
  { hex: "#D5FF3F", label: "Signal lime" },
  { hex: "#8B5CF6", label: "Ultraviolet" },
  { hex: "#0B0A0D", label: "Charcoal" },
  { hex: "#F4F0E8", label: "Warm white" },
];

function MaterialChip({ label, pattern }: { label: string; pattern: string }) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#F4F0E8]/12">
      <div className="h-20 w-full" style={{ background: pattern }} />
      <p className="bg-[#151018] px-3 py-2 font-mono text-[9px] tracking-[0.18em] text-[#A6A0AA] uppercase">
        {label}
      </p>
    </div>
  );
}

export default function DesignMoodboard({ vibe }: { vibe: VibePayload }) {
  const evidenceTags = [
    ...vibe.evidence.genreTags.slice(0, 3),
    ...vibe.evidence.styleTags.slice(0, 3),
    ...vibe.evidence.themeTags.slice(0, 3),
    ...vibe.evidence.adjectives.slice(0, 3),
  ];

  const principles = [
    { n: "01", text: vibe.concept.spatialComposition },
    { n: "02", text: vibe.concept.atmosphere },
    { n: "03", text: vibe.concept.lightingDirection },
  ];

  const floorPattern =
    vibe.flooringMaterial.toLowerCase().includes("gloss") || vibe.flooringMaterial.toLowerCase().includes("polished")
      ? "linear-gradient(115deg, #1B1822 0%, #35304A 42%, #171420 58%, #2A2440 100%)"
      : vibe.flooringMaterial.toLowerCase().includes("oak") || vibe.flooringMaterial.toLowerCase().includes("linen")
        ? "repeating-linear-gradient(92deg, #2E2620 0 7px, #3A3128 7px 14px)"
        : "radial-gradient(circle at 30% 30%, #2B2734 0%, #1D1A26 60%)";

  const seatPattern =
    vibe.seatingFabric.toLowerCase().includes("velvet") || vibe.seatingFabric.toLowerCase().includes("linen")
      ? "repeating-linear-gradient(45deg, #243028 0 6px, #2C3A30 6px 12px)"
      : "repeating-linear-gradient(0deg, #221E2C 0 5px, #2A2536 5px 10px)";

  return (
    <section id="moodboard" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24 md:py-32">
      <header className="relative z-10 mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sa-label mb-3">04 — Design intelligence</p>
          <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
            Concept presentation
          </h2>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-[#A6A0AA]">
          A creative director&rsquo;s board: palette, materials, light, references and sound
          composed from your cultural profile.
        </p>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-sm">
          <ResonanceField intensity={0.3} />
        </div>

        <div className="relative z-10 grid grid-cols-12 gap-4">
          {/* Concept title */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/88 p-7 backdrop-blur-[2px] md:col-span-7 md:p-10">
            <p className="sa-label mb-4 text-[#D5FF3F]">Concept</p>
            <h3 className="text-[11vw] leading-[0.95] font-light tracking-tight text-[#F4F0E8] md:text-6xl lg:text-7xl">
              {vibe.concept.title}
            </h3>
            <p className="mt-6 max-w-xl border-l-2 border-[#D5FF3F]/60 pl-5 text-sm leading-relaxed text-[#F4F0E8]/85 md:text-base">
              &ldquo;{vibe.concept.thesis}&rdquo;
            </p>
          </div>

          {/* Palette strip */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/92 p-5 backdrop-blur-[2px] md:col-span-5 md:-ml-6 md:mt-10 md:rotate-[0.6deg] md:p-6">
            <p className="sa-label mb-4">Palette study</p>
            <div className="flex h-44 w-full gap-2 md:h-52">
              {SWATCHES(vibe).map((s) => (
                <div key={s.label} className="flex flex-1 flex-col gap-2">
                  <div
                    className="flex-1 rounded-sm border border-[#F4F0E8]/10 transition-transform duration-300 hover:-translate-y-1"
                    style={{ backgroundColor: s.hex }}
                  />
                  <div>
                    <p className="font-mono text-[8px] leading-tight tracking-[0.12em] text-[#A6A0AA] uppercase">
                      {s.label}
                    </p>
                    <p className="font-mono text-[8px] text-[#A6A0AA]/60 uppercase">{s.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Material studies */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/88 p-6 backdrop-blur-[2px] md:col-span-4 md:mt-2 md:-rotate-[0.5deg] md:p-7">
            <p className="sa-label mb-4">Material studies</p>
            <div className="space-y-3">
              <MaterialChip label={`Floor — ${vibe.flooringMaterial}`} pattern={floorPattern} />
              <MaterialChip label={`Seating — ${vibe.seatingFabric}`} pattern={seatPattern} />
              <MaterialChip
                label="Portal frame — brushed dark metal"
                pattern="repeating-linear-gradient(90deg, #17141C 0 3px, #221E2C 3px 6px)"
              />
            </div>
          </div>

          {/* Lighting study */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/88 p-6 backdrop-blur-[2px] md:col-span-4 md:p-7">
            <p className="sa-label mb-4">Lighting study</p>
            <div className="relative h-24 w-full overflow-hidden rounded-sm border border-[#F4F0E8]/10"
              style={{ background: "linear-gradient(90deg, #FF9440 0%, #FFD9A0 35%, #F4F0E8 65%, #BFD8FF 100%)" }}
            >
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#0B0A0D] shadow-[0_0_0_2px_rgba(213,255,63,0.9)]"
                style={{
                  left: `${Math.min(100, Math.max(0, ((vibe.lightingTemperatureK - 2800) / (6500 - 2800)) * 100))}%`,
                }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[9px] text-[#A6A0AA] uppercase">
              <span>2800K warm</span>
              <span className="text-[#D5FF3F]">{vibe.lightingTemperatureK}K concept</span>
              <span>6500K cool</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#A6A0AA]">{vibe.concept.lightingDirection}</p>
          </div>

          {/* Design principles */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/88 p-6 backdrop-blur-[2px] md:col-span-4 md:mt-2 md:p-7">
            <p className="sa-label mb-4">Design principles</p>
            <ol className="space-y-4">
              {principles.map((p) => (
                <li key={p.n} className="flex gap-3">
                  <span className="font-mono text-[10px] text-[#D5FF3F]">{p.n}</span>
                  <span className="text-xs leading-relaxed text-[#F4F0E8]/85">{p.text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Cultural references */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/88 p-6 backdrop-blur-[2px] md:col-span-5 md:-ml-4 md:rotate-[0.4deg] md:p-7">
            <p className="sa-label mb-4">Cultural references</p>
            <ul className="mb-5 flex flex-wrap gap-2">
              {vibe.entities.map((e) => (
                <li
                  key={`${e.id}-${e.searchTerm}`}
                  className="rounded-full border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 px-3 py-1.5 font-mono text-[10px] text-[#B39DDB]"
                >
                  {e.name} <span className="text-[#A6A0AA]">· {e.type.replace("urn:entity:", "")}</span>
                </li>
              ))}
              {vibe.entities.length === 0 && (
                <li className="text-xs text-[#A6A0AA]">Local fallback — no resolved references.</li>
              )}
            </ul>
            {evidenceTags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {evidenceTags.map((tag) => (
                  <li key={tag} className="rounded-full border border-[#D5FF3F]/30 px-2.5 py-1 font-mono text-[10px] text-[#D5FF3F]/85">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#A6A0AA]">No structured Qloo tags — neutral defaults applied.</p>
            )}
            <p className="mt-4 font-mono text-[9px] tracking-[0.16em] text-[#A6A0AA] uppercase">
              Evidence: Qloo · Composition: Sonic Architecture
            </p>
          </div>

          {/* Soundtrack */}
          <div className="col-span-12 rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/92 p-6 backdrop-blur-[2px] md:col-span-7 md:p-9">
            <p className="sa-label mb-4">Soundtrack — artist entities via Qloo insights</p>
            {vibe.artists.length > 0 ? (
              <ul className="space-y-3">
                {vibe.artists.slice(0, 5).map((a, i) => (
                  <li key={a.id || a.name} className="flex items-baseline gap-4 border-b border-[#F4F0E8]/8 pb-2.5 last:border-0">
                    <span className="font-mono text-[10px] text-[#D5FF3F]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-xl font-light text-[#F4F0E8] md:text-2xl">{a.name}</span>
                    {a.sourceEntity && (
                      <span className="ml-auto font-mono text-[9px] text-[#A6A0AA] uppercase">via {a.sourceEntity}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#A6A0AA]">
                No music entities returned for this profile — the board stays silent by design.
              </p>
            )}
            <p className="mt-4 font-mono text-[9px] leading-relaxed text-[#A6A0AA]/80 uppercase">
              Artists, not tracks · no playback claimed · affinity via Qloo insights
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
