"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { VibePayload } from "@/lib/types";

type TimeOfDay = "morning" | "golden" | "peak";

const PRESETS: Record<TimeOfDay, { label: string; wash: number; beam: number; pool: number; note: string }> = {
  morning: { label: "09:00 — Morning glow", wash: 0.45, beam: 0.22, pool: 0.1, note: "Cool daylight rake; materials read dry and matte." },
  golden: { label: "16:00 — Golden hour", wash: 0.62, beam: 0.48, pool: 0.16, note: "Low warm light; grain and texture come forward." },
  peak: { label: "20:00 — Peak session", wash: 0.85, beam: 0.75, pool: 0.24, note: "Full accent lighting; the room runs on glow." },
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(166,160,170,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export default function VenueScene({ vibe }: { vibe: VibePayload }) {
  const [time, setTime] = useState<TimeOfDay>("peak");
  const reduced = useReducedMotion();
  const preset = PRESETS[time];
  const primary = vibe.primaryColorHex;
  const accent = vibe.accentColorHex;
  const duration = reduced ? 0 : 0.9;

  const seats: [number, number][] = [
    [250, 470], [340, 500], [430, 525],
    [770, 525], [860, 500], [950, 470],
  ];
  const dust: [number, number, number][] = Array.from({ length: 20 }, (_, i) => {
    const x = 90 + ((i * 137) % 1020);
    const y = 140 + ((i * 89) % 400);
    const r = 1 + (i % 3) * 0.5;
    return [x, y, r];
  });

  return (
    <div className="relative">
      <svg
        viewBox="0 0 1200 680"
        className="block h-auto w-full"
        role="img"
        aria-label={`Concept visualization of ${vibe.concept.title}: ${vibe.concept.atmosphere}`}
      >
        <defs>
          <radialGradient id="wash" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.9" />
            <stop offset="55%" stopColor={primary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0B0A0D" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <rect width="1200" height="680" fill="#0B0A0D" />
        <rect x="0" y="60" width="1200" height="340" fill="#151018" />

        <motion.ellipse
          cx="600" cy="300" rx="540" ry="250"
          fill="url(#wash)"
          initial={false}
          animate={{ opacity: preset.wash }}
          transition={{ duration }}
        />

        <line x1="0" y1="400" x2="1200" y2="400" stroke={hexToRgba("#F4F0E8", 0.1)} strokeWidth="1" />
        <rect x="0" y="400" width="1200" height="280" fill="url(#floor)" />

        <g stroke={hexToRgba("#F4F0E8", 0.05)} strokeWidth="1">
          {[-480, -360, -240, -120, 0, 120, 240, 360, 480].map((dx) => (
            <line key={dx} x1={600 + dx * 0.35} y1="400" x2={600 + dx * 2.2} y2="680" />
          ))}
          {[455, 520, 595, 665].map((y) => (
            <line key={y} x1="0" y1={y} x2="1200" y2={y} />
          ))}
        </g>

        <motion.g initial={false} animate={{ opacity: preset.beam }} transition={{ duration }}>
          <polygon points="330,60 300,400 420,400 380,60" fill="url(#beam)" />
          <polygon points="820,60 780,400 900,400 870,60" fill="url(#beam)" />
          <polygon points="560,60 540,400 660,400 640,60" fill="url(#beam)" opacity="0.6" />
        </motion.g>

        <rect x="150" y="120" width="24" height="280" fill="#0B0A0D" stroke={hexToRgba("#F4F0E8", 0.12)} />
        <rect x="1026" y="120" width="24" height="280" fill="#0B0A0D" stroke={hexToRgba("#F4F0E8", 0.12)} />

        <g>
          <rect x="420" y="305" width="360" height="14" fill={hexToRgba(primary, 0.75)} />
          <rect x="430" y="319" width="340" height="78" fill={hexToRgba(primary, 0.18)} stroke={hexToRgba(primary, 0.4)} />
          <text x="600" y="368" textAnchor="middle" fill={hexToRgba("#F4F0E8", 0.55)} fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="4">BAR</text>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={452 + i * 52} y="330" width="30" height="4" fill={hexToRgba(accent, 0.5)} />
          ))}
        </g>

        <g>
          {[340, 600, 860].map((x, i) => (
            <g key={x}>
              <line x1={x} y1="60" x2={x} y2={140 + i * 10} stroke={hexToRgba("#F4F0E8", 0.2)} />
              <motion.circle
                cx={x} cy={150 + i * 10} r="7"
                fill={accent}
                initial={false}
                animate={{ opacity: 0.35 + preset.pool * 2 }}
                transition={{ duration }}
                filter="url(#soft2)"
              />
              <circle cx={x} cy={150 + i * 10} r="2.5" fill={hexToRgba("#F4F0E8", 0.9)} />
            </g>
          ))}
        </g>

        <motion.g initial={false} animate={{ opacity: preset.pool * 4 }} transition={{ duration }} filter="url(#soft)">
          <ellipse cx="340" cy="560" rx="120" ry="26" fill={accent} />
          <ellipse cx="860" cy="560" rx="120" ry="26" fill={accent} />
          <ellipse cx="600" cy="430" rx="200" ry="30" fill={primary} />
        </motion.g>

        <g>
          {seats.map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 34} y={y - 16} width="68" height="34" rx="8" fill={hexToRgba(primary, 0.22)} stroke={hexToRgba("#F4F0E8", 0.14)} />
            </g>
          ))}
          <rect x="390" y="470" width="120" height="46" rx="4" fill="none" stroke={hexToRgba("#F4F0E8", 0.14)} />
          <rect x="690" y="470" width="120" height="46" rx="4" fill="none" stroke={hexToRgba("#F4F0E8", 0.14)} />
        </g>

        {!reduced && (
          <g>
            {dust.map(([x, y, r], i) => (
              <motion.circle
                key={i}
                cx={x} cy={y} r={r}
                fill={i % 2 === 0 ? "#D5FF3F" : "#8B5CF6"}
                initial={false}
                animate={{ opacity: [0.08, 0.35, 0.08], cy: [y, y - 18, y] }}
                transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
              />
            ))}
          </g>
        )}

        <g fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3" fill={hexToRgba("#F4F0E8", 0.45)}>
          <text x="40" y="640">{`FLOORING — ${vibe.flooringMaterial.toUpperCase()}`}</text>
          <text x="40" y="660">{`SEATING — ${vibe.seatingFabric.toUpperCase()}`}</text>
          <text x="1160" y="640" textAnchor="end">{`LIGHTING — ${vibe.lightingTemperatureK}K`}</text>
          <text x="1160" y="660" textAnchor="end">{vibe.concept.title}</text>
        </g>
      </svg>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Time of day">
          {(Object.keys(PRESETS) as TimeOfDay[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTime(key)}
              aria-pressed={time === key}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors ${
                time === key
                  ? "border-[#D5FF3F] text-[#D5FF3F]"
                  : "border-[#F4F0E8]/12 text-[#A6A0AA] hover:border-[#F4F0E8]/30 hover:text-[#F4F0E8]"
              }`}
            >
              {PRESETS[key].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#A6A0AA]">{preset.note}</p>
      </div>
      <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-[#A6A0AA]/70 uppercase">
        Editorial concept visualization in 2D — not physically accurate architectural geometry
      </p>
    </div>
  );
}
