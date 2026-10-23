"use client";

import { useId, useState } from "react";

/**
 * The architectural landing prompt composer:
 * Clear, editorial input connected to the live generation pipeline.
 *
 * Qloo-safety: typing, focusing or clicking an example never triggers an automated request.
 * Example chips populate the field so the visitor maintains deliberate control.
 * Exactly one request is issued per explicit submit (guarded by `isLoading`).
 */
export const ARCHITECTURAL_EXAMPLES = [
  {
    short: "Japanese jazz room",
    full: "A Japanese jazz listening room with dark timber, warm paper lanterns, and intimate seating.",
  },
  {
    short: "Pink grungy party",
    full: "A pink grungy birthday party with chrome furniture, dramatic lighting, and playful details.",
  },
  {
    short: "Scandinavian living",
    full: "A minimalist Scandinavian living room with morning sunlight and natural oak.",
  },
  {
    short: "Futuristic launch",
    full: "An immersive futuristic product launch venue with reflective surfaces and cinematic lighting.",
  },
];

interface CulturalInputProps {
  onSubmit: (value: string) => void;
  isLoading: boolean;
  initial?: string;
}

export default function CulturalInput({ onSubmit, isLoading, initial = "" }: CulturalInputProps) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const trimmed = value.trim();
  const invalid = touched && trimmed.length < 2;

  const submit = () => {
    setTouched(true);
    if (trimmed.length < 2 || isLoading) return;
    onSubmit(trimmed);
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Dark glass input container — Nest-style */}
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isLoading ? "scale-[0.99] opacity-80" : "hover:border-white/20"
        }`}
      >
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:p-5">
          <label htmlFor={inputId} className="sr-only">
            Describe a space or architectural design brief
          </label>
          <textarea
            id={inputId}
            rows={2}
            value={value}
            disabled={isLoading}
            onChange={(e) => {
              setValue(e.target.value);
              if (touched) setTouched(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Describe an architectural space, materials, lighting, or atmosphere..."
            aria-describedby={hintId}
            aria-invalid={invalid || undefined}
            className="min-h-[3.5rem] flex-1 resize-none bg-transparent px-2 py-1 text-base leading-relaxed text-white placeholder:text-white/35 focus:outline-none disabled:opacity-50 md:text-lg"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isLoading}
            aria-busy={isLoading}
            className="group flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.18em] text-black uppercase transition-all hover:bg-[var(--lintel-paper)] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{isLoading ? "Generating…" : "Generate Space"}</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              ↗
            </span>
          </button>
        </div>
      </div>

      {/* Validation / Status hint */}
      <div id={hintId} className="mt-2 min-h-[1.25rem] px-1 text-center text-xs">
        {invalid ? (
          <span className="font-mono text-[var(--lintel-terracotta)]">
            Please enter a spatial description to translate.
          </span>
        ) : (
          <span className="font-mono text-[11px] text-white/40">
            {isLoading
              ? "Synthesizing spatial geometry & cultural affinity..."
              : "Press Enter to generate · specify materials, lighting, or typology"}
          </span>
        )}
      </div>

      {/* Example Prompts — soft row of pills */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {ARCHITECTURAL_EXAMPLES.map((ex, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setValue(ex.full);
              setTouched(false);
            }}
            className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-white/55 uppercase backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            {ex.short}
          </button>
        ))}
      </div>
    </div>
  );
}
