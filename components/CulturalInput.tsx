"use client";

import { useId, useState } from "react";

/**
 * The landing prompt: a single frosted, floating object.
 *
 * Qloo-safety: typing, focusing or clicking an example never triggers a
 * request. Example pills only *fill* the field — the visitor still chooses to
 * submit. Exactly one request is issued per explicit submit (guarded by
 * `isLoading`, enforced again by the page).
 */
const EXAMPLES = [
  "A24 films + indie music",
  "Japanese gardens + ambient",
  "Chrome + club culture",
  "Jazz + brutalist architecture",
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
      <div
        className={`sa-frost sa-cast rounded-[26px] transition-all duration-300 ${
          isLoading ? "scale-[0.995] opacity-90" : "hover:shadow-[0_26px_80px_rgba(38,54,74,0.22)]"
        }`}
      >
        <div className="flex items-end gap-3 p-2.5 pl-5">
          <label htmlFor={inputId} className="sr-only">
            Describe what moves you
          </label>
          <textarea
            id={inputId}
            rows={1}
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
            placeholder="A film, an artist, a place, a feeling..."
            aria-describedby={hintId}
            aria-invalid={invalid || undefined}
            className="sa-ink min-h-[3.25rem] flex-1 resize-none bg-transparent py-3.5 text-[15px] leading-relaxed placeholder:text-[#26364a]/45 focus:outline-none disabled:opacity-60 md:text-base"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isLoading}
            aria-busy={isLoading}
            className="sa-ink group mb-1 flex shrink-0 items-center gap-2 rounded-[18px] bg-[#26364a] px-5 py-3.5 font-mono text-[10px] tracking-[0.2em] text-[#f7fbfc] uppercase shadow-[0_10px_30px_rgba(38,54,74,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#1d2a3a] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span className="hidden sm:inline">{isLoading ? "Reading signals" : "Enter your world"}</span>
            <span className="sm:hidden">{isLoading ? "…" : "Enter"}</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              ↗
            </span>
          </button>
        </div>
      </div>

      <div id={hintId} className="mt-3 min-h-[1.25rem] px-1 text-xs">
        {invalid ? (
          <span className="text-[#b4485f]">Add at least one reference to translate.</span>
        ) : (
          <span className="sa-ink-soft">
            {isLoading
              ? "Reading your cultural signals — one request, nothing fabricated."
              : "Press Enter to enter. Separate references with + or a comma."}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="sa-ink-soft self-center font-mono text-[9px] tracking-[0.22em] uppercase opacity-70">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setValue(ex);
              setTouched(false);
            }}
            className="sa-ink rounded-full border border-white/70 bg-white/35 px-3.5 py-1.5 text-xs backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/60 disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
