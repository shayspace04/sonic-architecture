"use client";

import type { VibePayload } from "@/lib/types";
import ProvenanceIndicator from "./ProvenanceIndicator";

const TYPE_LABELS: Record<string, string> = {
  "urn:entity:artist": "Artist",
  "urn:entity:movie": "Film",
  "urn:entity:tv_show": "TV show",
  "urn:entity:book": "Book",
  "urn:entity:brand": "Brand",
  "urn:entity:place": "Place",
  "urn:entity:destination": "Destination",
  "urn:entity:locality": "Locality",
  "urn:entity:person": "Person",
  "urn:entity:podcast": "Podcast",
  "urn:entity:videogame": "Video game",
};

const EVIDENCE_GROUPS: { key: keyof VibePayload["evidence"]; label: string; note: string }[] = [
  { key: "genreTags", label: "Genre signals", note: "Genre tags attached to Qloo's recommended entities." },
  { key: "styleTags", label: "Style signals", note: "Style tags that shape material and palette choices." },
  { key: "themeTags", label: "Theme signals", note: "Thematic tags informing atmosphere." },
  { key: "adjectives", label: "Adjectives", note: "Adjective properties returned with the affinity data." },
  { key: "characteristics", label: "Characteristics", note: "Characteristic properties from Qloo entities." },
];

export default function SignalAnalysis({ vibe }: { vibe: VibePayload }) {
  const totalEvidence = EVIDENCE_GROUPS.reduce((n, g) => n + vibe.evidence[g.key].length, 0);

  return (
    <section id="signals" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sa-label mb-3">01 — Cultural signals</p>
          <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
            What Qloo actually recognized
          </h2>
        </div>
        <ProvenanceIndicator source={vibe.reasoning.source} />
      </header>

      {vibe.fallback && (
        <div className="mb-10 rounded-sm border border-[#A6A0AA]/30 bg-[#151018] p-5 text-sm text-[#A6A0AA]">
          Live cultural intelligence is unavailable right now. The concept below is a labeled local
          fallback — no Qloo entities, affinities, or recommendations are claimed.
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-3">
        <div>
          <h3 className="sa-label mb-4">You entered</h3>
          <ul className="space-y-2">
            {vibe.submittedTerms.map((term) => (
              <li key={term} className="border-l border-[#D5FF3F]/60 pl-3 text-sm text-[#F4F0E8]">
                {term}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="sa-label mb-4">Recognized by Qloo</h3>
          {vibe.entities.length > 0 ? (
            <ul className="space-y-3">
              {vibe.entities.map((entity) => (
                <li key={entity.id} className="border-l border-[#8B5CF6]/60 pl-3">
                  <p className="text-sm text-[#F4F0E8]">{entity.name}</p>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-[#A6A0AA] uppercase">
                    {TYPE_LABELS[entity.type] ?? entity.type.replace("urn:entity:", "")} · resolved from “
                    {entity.searchTerm}”
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#A6A0AA]">No references were resolved.</p>
          )}
        </div>

        <div>
          <h3 className="sa-label mb-4">Not resolved</h3>
          {vibe.unresolvedTerms.length > 0 ? (
            <ul className="space-y-2">
              {vibe.unresolvedTerms.map((term) => (
                <li key={term} className="border-l border-[#A6A0AA]/40 pl-3 text-sm text-[#A6A0AA]">
                  {term}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#A6A0AA]">Every reference found a match.</p>
          )}
        </div>
      </div>

      <div className="mt-14">
        <h3 className="sa-label mb-2">Affinity evidence returned by Qloo</h3>
        <p className="mb-6 max-w-2xl text-sm text-[#A6A0AA]">
          These tags come from the entities Qloo recommended for your profile. They are cultural
          evidence — not design instructions. Sonic Architecture performs the translation.
        </p>
        {totalEvidence === 0 ? (
          <p className="text-sm text-[#A6A0AA]">No structured affinity tags were returned for this profile.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {EVIDENCE_GROUPS.map((group) => {
              const items = vibe.evidence[group.key];
              if (items.length === 0) return null;
              return (
                <div key={group.key}>
                  <h4 className="mb-2 text-sm font-medium text-[#F4F0E8]">{group.label}</h4>
                  <p className="mb-3 text-xs leading-relaxed text-[#A6A0AA]">{group.note}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {items.slice(0, 10).map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-[#F4F0E8]/10 px-2.5 py-1 font-mono text-[10px] tracking-wide text-[#F4F0E8]/80"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(vibe.limitations.length > 0 || vibe.errors.length > 0) && (
        <div className="mt-12 border-t border-[#F4F0E8]/8 pt-6">
          <h3 className="sa-label mb-3">Honest limitations</h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-[#A6A0AA]">
            {[...vibe.limitations, ...vibe.errors].map((line) => (
              <li key={line}>— {line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
