"use client";

import { useMemo, useState } from "react";
import type { VibePayload } from "@/lib/types";
import { generateSceneSpec, type SpatialZone, type SpatialObject } from "@/lib/scene-spec";
import { buildDetailedRationale } from "@/lib/rationale";

const STEPS = [
  {
    num: "01",
    label: "Cultural Input",
    desc: "Natural-language design brief with cultural references, materials, and mood.",
  },
  {
    num: "02",
    label: "Affinity Intelligence",
    desc: "Entities, genres, and aesthetic descriptors discovered via Qloo API.",
  },
  {
    num: "03",
    label: "Spatial Translation",
    desc: "Sonic Architecture's deterministic engine maps taste signals to room proportions & materials.",
  },
  {
    num: "04",
    label: "3D Walkable Environment",
    desc: "Real-time interactive architectural environment rendered with Three.js/WebGL.",
  },
];

export default function SpatialTranslation({
  vibe,
  promptText = "",
}: {
  vibe: VibePayload;
  promptText?: string;
}) {
  const sceneSpec = useMemo(() => generateSceneSpec(promptText, vibe), [promptText, vibe]);
  const rationaleEntries = useMemo(
    () => buildDetailedRationale(vibe, sceneSpec, promptText),
    [vibe, sceneSpec, promptText]
  );

  const [selectedPlanZone, setSelectedPlanZone] = useState<SpatialZone | null>(
    sceneSpec.zones?.[0] || null
  );
  const [selectedPlanObject, setSelectedPlanObject] = useState<SpatialObject | null>(null);

  // SVG Blueprint coordinate calculations
  const W = sceneSpec.roomDimensions.width;
  const D = sceneSpec.roomDimensions.depth;
  const svgWidth = 600;
  const svgHeight = 460;
  const pad = 44;
  const scale = Math.min((svgWidth - 2 * pad) / W, (svgHeight - 2 * pad) / D);
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  const roomX = cx - (W / 2) * scale;
  const roomY = cy - (D / 2) * scale;
  const roomW = W * scale;
  const roomH = D * scale;

  return (
    <section id="translate" className="relative scroll-mt-24 border-y border-white/10 bg-[#090D18] py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* Header */}
        <header className="mb-14">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[var(--lintel-terracotta)] uppercase">
            02 — Architectural Translation &amp; Spatial Planning
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-libre-caslon)] text-3xl font-normal tracking-tight text-white md:text-5xl">
            From Cultural Resonance to Built Form
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
            How aesthetic and cultural evidence is interpreted into tangible room layouts, acoustic zoning, materials, and geometry.
          </p>
        </header>

        {/* 4-Step Process Pipeline — Nest-style dark frosted cards */}
        <div className="mb-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-black/60"
            >
              <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[var(--lintel-terracotta)]">
                {step.num}
              </span>
              <h3 className="mt-2.5 font-mono text-xs font-medium tracking-[0.16em] uppercase text-white">
                {step.label}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* --- Interactive 2D Schematic Floor Plan & Layout Planning Section --- */}
        <div className="mb-16 rounded-3xl border border-white/10 bg-black/55 p-6 backdrop-blur-2xl md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[9px] tracking-[0.2em] text-[var(--lintel-moss)] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--lintel-moss)]" />
                Architectural Schematic Plan
              </div>
              <h3 className="mt-2 font-[family-name:var(--font-libre-caslon)] text-2xl text-white">
                Floor Layout &amp; Zoning Blueprint
              </h3>
            </div>
            <p className="max-w-md font-mono text-[10px] leading-relaxed text-white/50">
              Interactive 2D projection mapping cultural affinity to acoustic zones, furniture circulation, and aperture orientations. Click any zone or element to inspect.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* SVG Blueprint Canvas */}
            <div className="relative flex justify-center rounded-2xl border border-white/10 bg-[#060810] p-4 lg:col-span-7">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-auto w-full max-w-lg select-none"
                style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.7))" }}
              >
                {/* Metric blueprint grid pattern */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

                {/* Outer Room Envelope */}
                <rect
                  x={roomX}
                  y={roomY}
                  width={roomW}
                  height={roomH}
                  fill="#0B0E18"
                  stroke="#384358"
                  strokeWidth="3.5"
                />

                {/* Window Aperture (if applicable) on right wall */}
                {sceneSpec.hasWindowAperture && (
                  <g>
                    <line
                      x1={roomX + roomW}
                      y1={roomY + roomH * 0.2}
                      x2={roomX + roomW}
                      y2={roomY + roomH * 0.8}
                      stroke="#64B5F6"
                      strokeWidth="5"
                    />
                    <text
                      x={roomX + roomW + 8}
                      y={roomY + roomH * 0.5}
                      fill="#64B5F6"
                      fontSize="8"
                      fontFamily="monospace"
                      letterSpacing="1"
                    >
                      NATURAL LIGHT APERTURE
                    </text>
                  </g>
                )}

                {/* Functional Zones */}
                {sceneSpec.zones?.map((zone) => {
                  const zx = cx + (zone.center[0] - zone.dimensions[0] / 2) * scale;
                  const zy = cy + (zone.center[2] - zone.dimensions[1] / 2) * scale;
                  const zw = zone.dimensions[0] * scale;
                  const zh = zone.dimensions[1] * scale;
                  const isSelected = selectedPlanZone?.id === zone.id;

                  return (
                    <g
                      key={zone.id}
                      onClick={() => {
                        setSelectedPlanZone(zone);
                        setSelectedPlanObject(null);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={zx}
                        y={zy}
                        width={zw}
                        height={zh}
                        fill={zone.color}
                        fillOpacity={isSelected ? 0.28 : 0.12}
                        stroke={zone.color}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray={isSelected ? "none" : "3,3"}
                        rx="4"
                      />
                      <text
                        x={zx + 8}
                        y={zy + 14}
                        fill={zone.color}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="0.8"
                      >
                        {zone.name.toUpperCase()} ({zone.areaSqM}m²)
                      </text>
                    </g>
                  );
                })}

                {/* Placed Furniture & Fixtures */}
                {sceneSpec.objects.map((obj) => {
                  const ox = cx + obj.position[0] * scale;
                  const oy = cy + obj.position[2] * scale;
                  const isSelected = selectedPlanObject?.id === obj.id;

                  return (
                    <g
                      key={obj.id}
                      onClick={() => {
                        setSelectedPlanObject(obj);
                        setSelectedPlanZone(null);
                      }}
                      className="cursor-pointer transition-transform"
                    >
                      <circle
                        cx={ox}
                        cy={oy}
                        r={isSelected ? 8 : 6}
                        fill={isSelected ? "#FFFFFF" : obj.color}
                        stroke="#111"
                        strokeWidth="1.5"
                      />
                      <text
                        x={ox}
                        y={oy - 9}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fillOpacity="0.75"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        {obj.label.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}

                {/* Dimensions markings */}
                <g stroke="#E8B878" strokeWidth="1" opacity="0.6">
                  {/* Top width dimension */}
                  <line x1={roomX} y1={roomY - 14} x2={roomX + roomW} y2={roomY - 14} />
                  <line x1={roomX} y1={roomY - 18} x2={roomX} y2={roomY - 10} />
                  <line x1={roomX + roomW} y1={roomY - 18} x2={roomX + roomW} y2={roomY - 10} />
                  <text
                    x={cx}
                    y={roomY - 18}
                    textAnchor="middle"
                    fill="#E8B878"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {W}m WIDTH
                  </text>

                  {/* Left depth dimension */}
                  <line x1={roomX - 14} y1={roomY} x2={roomX - 14} y2={roomY + roomH} />
                  <line x1={roomX - 18} y1={roomY} x2={roomX - 10} y2={roomY} />
                  <line x1={roomX - 18} y1={roomY + roomH} x2={roomX - 10} y2={roomY + roomH} />
                  <text
                    x={roomX - 20}
                    y={cy}
                    textAnchor="middle"
                    fill="#E8B878"
                    fontSize="9"
                    fontFamily="monospace"
                    transform={`rotate(-90, ${roomX - 20}, ${cy})`}
                  >
                    {D}m DEPTH
                  </text>
                </g>
              </svg>
            </div>

            {/* Inspector HUD for Selected Plan Element */}
            <div className="space-y-4 lg:col-span-5">
              {selectedPlanZone && (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-5 font-mono text-xs text-white backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--lintel-terracotta)] uppercase">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedPlanZone.color }} />
                    Active Zone Inspector
                  </div>
                  <h4 className="mt-2 text-base font-medium text-white">
                    {selectedPlanZone.name}
                  </h4>
                  <div className="mt-3 space-y-2 text-[11px] text-white/70">
                    <p>
                      <span className="text-white/40">Area Footprint:</span> {selectedPlanZone.areaSqM} m² ({selectedPlanZone.dimensions[0]}m × {selectedPlanZone.dimensions[1]}m)
                    </p>
                    <p className="border-t border-white/10 pt-2 text-[10px] leading-relaxed text-white/80">
                      <span className="text-[var(--lintel-moss)] uppercase font-semibold block mb-0.5">Acoustic &amp; Circulation Purpose:</span>
                      {selectedPlanZone.rationale}
                    </p>
                  </div>
                </div>
              )}

              {selectedPlanObject && (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-5 font-mono text-xs text-white backdrop-blur-xl">
                  <span className="text-[9px] tracking-[0.2em] text-[var(--lintel-moss)] uppercase block mb-1">
                    Fixture Inspector
                  </span>
                  <h4 className="text-base font-medium text-white">
                    {selectedPlanObject.label}
                  </h4>
                  <div className="mt-3 space-y-1.5 text-[11px] text-white/70">
                    <p><span className="text-white/40">Dimensions:</span> {selectedPlanObject.dimensions}</p>
                    <p><span className="text-white/40">Material Finish:</span> {selectedPlanObject.material}</p>
                    <p className="border-t border-white/10 pt-2 text-[10px] text-white/80">
                      <span className="text-[var(--lintel-terracotta)] uppercase font-semibold block mb-0.5">Design Rationale:</span>
                      {selectedPlanObject.rationale}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan Summary Specs */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/40 block">TOTAL ENVELOPE</span>
                  <span className="text-white font-semibold">{W * D} m² ({sceneSpec.roomDimensions.width * sceneSpec.roomDimensions.depth * sceneSpec.roomDimensions.height} m³)</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/40 block">CEILING CLEAR</span>
                  <span className="text-white font-semibold">{sceneSpec.roomDimensions.height}m ({sceneSpec.ceilingStructure.replace("_", " ")})</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/40 block">WALL ARCHITECTURE</span>
                  <span className="text-white font-semibold">{sceneSpec.wallArchitecture.replace("_", " ").toUpperCase()}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/40 block">FLOORING (QLOO)</span>
                  <span className="text-white font-semibold truncate block" title={sceneSpec.qlooFlooring || sceneSpec.floorFinish}>
                    {sceneSpec.qlooFlooring || sceneSpec.floorFinish.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concept Thesis & Spatial Atmosphere */}
        <div className="mb-16 grid gap-6 md:grid-cols-12">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl md:col-span-6">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--lintel-moss)] uppercase">
              DESIGN THESIS
            </span>
            <h3 className="mt-3 font-[family-name:var(--font-libre-caslon)] text-2xl text-white">
              {sceneSpec.typologyLabel}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              {vibe.concept.thesis}
            </p>
            <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60 font-mono">
              <span className="text-white/40">Room Envelope:</span> {sceneSpec.roomDimensions.width}m width × {sceneSpec.roomDimensions.depth}m depth × {sceneSpec.roomDimensions.height}m ceiling height.
            </div>
          </div>

          <div className="space-y-3 md:col-span-6">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                Atmosphere &amp; Acoustics
              </span>
              <p className="mt-1.5 text-sm text-white/85">
                {vibe.concept.atmosphere}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                Spatial Circulation
              </span>
              <p className="mt-1.5 text-sm text-white/85">
                {vibe.concept.spatialComposition}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                Illumination Direction
              </span>
              <p className="mt-1.5 text-sm text-white/85">
                {vibe.concept.lightingDirection}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Decision Attribution Matrix */}
        <div className="border-t border-white/10 pt-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--lintel-terracotta)] uppercase">
                Traceability Matrix
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-libre-caslon)] text-2xl text-white">
                Design Decision Provenance
              </h3>
            </div>
            <p className="max-w-md font-mono text-[11px] leading-relaxed text-white/50">
              Clear attribution distinguishing cultural evidence from deterministic architectural translation rules.
            </p>
          </div>

          <div className="space-y-3">
            {rationaleEntries.map((entry, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:flex-row md:items-start"
              >
                <div className="md:w-1/3">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                    {entry.label}
                  </span>
                  <h4 className="mt-1 text-base font-medium text-white">
                    {entry.value}
                  </h4>
                  <div className="mt-2 inline-block">
                    <span
                      className={`font-mono text-[9px] tracking-[0.16em] uppercase px-2 py-0.5 rounded-full border ${
                        entry.provenance === "qloo"
                          ? "border-[var(--lintel-terracotta)]/70 bg-[var(--lintel-terracotta)]/10 text-[var(--lintel-terracotta)]"
                          : entry.provenance === "engine"
                            ? "border-[var(--lintel-moss)]/70 bg-[var(--lintel-moss)]/10 text-white"
                            : entry.provenance === "user"
                              ? "border-white/30 text-white"
                              : "border-amber-700/60 text-amber-400"
                      }`}
                    >
                      {entry.provenanceLabel}
                    </span>
                  </div>
                </div>

                <div className="flex-1 text-xs text-white/80">
                  <p className="leading-relaxed">{entry.interpretation}</p>
                  {entry.evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                      <span className="text-white/40 uppercase">Evidence cues:</span>
                      {entry.evidence.map((grp) =>
                        grp.items.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-white/70"
                          >
                            #{item}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
