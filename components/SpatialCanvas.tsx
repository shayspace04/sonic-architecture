"use client";

import { motion } from "framer-motion";

interface SpatialCanvasProps {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
}

function glowParams(tempK: number) {
  const t = Math.min(Math.max((tempK - 2000) / 4500, 0), 1);
  const blur = 60 - t * 35;
  const opacity = 0.35 - t * 0.1;
  const radius = 90 + (1 - t) * 40;
  return { blur, opacity, radius };
}

export default function SpatialCanvas({
  primaryColorHex,
  accentColorHex,
  lightingTemperatureK,
  flooringMaterial,
  seatingFabric,
}: SpatialCanvasProps) {
  const { blur, opacity, radius } = glowParams(lightingTemperatureK);

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <svg
        viewBox="0 0 1000 700"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={blur} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.rect
          x={40}
          y={40}
          width={920}
          height={620}
          rx={8}
          fill={primaryColorHex}
          initial={false}
          animate={{ fill: primaryColorHex }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          stroke="#404040"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.18}
        />

        <rect
          x={40}
          y={40}
          width={920}
          height={620}
          rx={8}
          fill="none"
          stroke="#404040"
          strokeWidth={1.5}
        />
        <rect
          x={60}
          y={60}
          width={880}
          height={580}
          rx={6}
          fill="none"
          stroke="#404040"
          strokeWidth={0.5}
          strokeDasharray="6 6"
        />

        {[
          [120, 120],
          [880, 120],
          [120, 580],
          [880, 580],
          [500, 350],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={14} fill="none" stroke="#404040" strokeWidth={1} />
            <circle cx={cx} cy={cy} r={4} fill="#404040" />
            <line
              x1={cx - 18}
              y1={cy}
              x2={cx + 18}
              y2={cy}
              stroke="#404040"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
            <line
              x1={cx}
              y1={cy - 18}
              x2={cx}
              y2={cy + 18}
              stroke="#404040"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          </g>
        ))}

        <motion.rect
          x={400}
          y={300}
          width={200}
          height={100}
          rx={6}
          fill={primaryColorHex}
          animate={{ fill: primaryColorHex }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          stroke="#404040"
          strokeWidth={1.5}
          opacity={0.55}
        />
        <text
          x={500}
          y={355}
          textAnchor="middle"
          fill="#9a9a9a"
          fontSize={11}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          letterSpacing={2}
        >
          BAR
        </text>

        {[
          [200, 200],
          [800, 200],
          [200, 500],
          [800, 500],
          [320, 470],
          [680, 470],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <motion.rect
              x={cx - 40}
              y={cy - 25}
              width={80}
              height={50}
              rx={10}
              fill={primaryColorHex}
              animate={{ fill: primaryColorHex }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              stroke="#404040"
              strokeWidth={1}
              opacity={0.45}
            />
          </g>
        ))}

        {[
          [300, 220],
          [700, 480],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <motion.circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={accentColorHex}
              animate={{ r: radius, opacity: opacity }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              filter="url(#glow)"
              opacity={opacity}
              style={{ mixBlendMode: "screen" }}
            />
            <circle cx={cx} cy={cy} r={3} fill={accentColorHex} opacity={0.9} />
          </g>
        ))}

        <g
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={10}
          fill="#737373"
          letterSpacing={1.5}
        >
          <text x={60} y={600}>FLOORING: {flooringMaterial.toUpperCase()}</text>
          <text x={60} y={620}>SEATING: {seatingFabric.toUpperCase()}</text>
          <text x={820} y={600} textAnchor="end">
            TEMP: {lightingTemperatureK}K
          </text>
        </g>

        <g stroke="#404040" strokeWidth={0.5} strokeDasharray="2 4">
          <line x1={40} y1={30} x2={960} y2={30} />
          <line x1={30} y1={40} x2={30} y2={660} />
        </g>
      </svg>
    </div>
  );
}
