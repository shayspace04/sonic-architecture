"use client";

import { useState } from "react";

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
  const trimmed = value.trim();
  const invalid = touched && trimmed.length < 2;

  const submit = () => {
    setTouched(true);
    if (trimmed.length < 2 || isLoading) return;
    onSubmit(trimmed);
  };

  return (
    <div className="w-full max-w-2xl">
      <label htmlFor="taste-input" className="sa-label mb-3 block text-[#D5FF3F]">
        What do you love?
      </label>
      <div className="sa-glass rounded-sm p-1.5">
        <textarea
          id="taste-input"
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
          placeholder="Describe your world — artists, films, places, sounds, moods..."
          className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-[#F4F0E8] placeholder:text-[#A6A0AA]/60 focus:outline-none disabled:opacity-60"
          aria-describedby="taste-input-hint"
        />
      </div>

      <div id="taste-input-hint" className="mt-2 min-h-[1.25rem] text-xs text-[#A6A0AA]">
        {invalid ? (
          <span className="text-[#FF3366]">Enter at least one reference to translate.</span>
        ) : (
          <span>Separate references with + or a comma. Press Enter to translate.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setValue(ex);
              setTouched(false);
              onSubmit(ex);
            }}
            className="rounded-full border border-[#F4F0E8]/12 px-3 py-1.5 text-xs text-[#A6A0AA] transition-colors hover:border-[#D5FF3F]/60 hover:text-[#F4F0E8] disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={isLoading}
          className="group relative overflow-hidden rounded-sm bg-[#D5FF3F] px-7 py-3.5 text-sm font-semibold tracking-[0.18em] text-[#0B0A0D] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "TRANSLATING..." : "TRANSLATE MY TASTE"}
        </button>
        <a
          href="#how"
          className="text-xs tracking-[0.2em] text-[#A6A0AA] uppercase underline-offset-8 transition-colors hover:text-[#F4F0E8] hover:underline"
        >
          Explore the experience
        </a>
      </div>
    </div>
  );
}
