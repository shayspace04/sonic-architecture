"use client";

import type { VibePayload } from "@/lib/types";

interface SoundtrackSectionProps {
  vibe: VibePayload;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
}

export default function SoundtrackSection({ vibe, isAudioEnabled, onToggleAudio }: SoundtrackSectionProps) {
  return (
    <section id="soundtrack" className="border-y border-[#F4F0E8]/8 bg-[#151018]/40 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="sa-label mb-3">05 — Soundtrack</p>
            <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
              Artists in cultural orbit
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={isAudioEnabled}
            className="rounded-full border border-[#F4F0E8]/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-[#A6A0AA] uppercase transition-colors hover:border-[#D5FF3F]/60 hover:text-[#F4F0E8]"
          >
            Ambient tone {isAudioEnabled ? "on" : "off"}
          </button>
        </header>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#A6A0AA]">
          Qloo&apos;s insights endpoint returns <strong className="text-[#F4F0E8]">artist entities</strong>,
          not individual tracks. Nothing here is playable and no track titles, covers, or streaming links
          are invented. The ambient tone is a local generative drone — not these artists&apos; music.
        </p>

        {vibe.artists.length > 0 ? (
          <ol className="divide-y divide-[#F4F0E8]/8 border-y border-[#F4F0E8]/8">
            {vibe.artists.map((artist, i) => (
              <li key={artist.id || artist.name} className="group flex items-baseline gap-5 py-4">
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#A6A0AA]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-lg font-light text-[#F4F0E8] transition-colors group-hover:text-[#D5FF3F]">
                    {artist.name}
                  </p>
                  {artist.sourceEntity && (
                    <p className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-[#A6A0AA] uppercase">
                      Affinity to {artist.sourceEntity} — via Qloo insights
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-sm border border-[#F4F0E8]/10 p-8 text-sm text-[#A6A0AA]">
            No music entities were returned for this profile. The soundtrack stays empty rather than
            inventing recommendations.
          </div>
        )}
      </div>
    </section>
  );
}
