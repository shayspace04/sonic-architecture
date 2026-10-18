"use client";

import { useMemo } from "react";
import type { VibePayload } from "@/lib/types";
import { sceneParamsFromPayload } from "@/lib/scene-params";

const STEPS = ["Cultural input", "Affinity signals", "Spatial translation", "Venue experience"];

export default function SpatialTranslation({ vibe }: { vibe: VibePayload }) {
  const rules = Object.entries(vibe.reasoning.rules);
  const sceneParams = useMemo(() => sceneParamsFromPayload(vibe), [vibe]);
  const sceneRules = Object.entries(sceneParams.rules);

  return (
    <section id="translate" className="relative scroll-mt-24 border-y border-[#F4F0E8]/8 bg-[#151018]/40 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="mb-12">
          <p className="sa-label mb-3">02 — Translation layer</p>
          <h2 className="text-3xl font-light tracking-tight text-[#F4F0E8] md:text-4xl">
            How taste becomes space
          </h2>
        </header>

        <ol className="mb-14 grid gap-px overflow-hidden rounded-sm border border-[#F4F0E8]/8 bg-[#F4F0E8]/8 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step} className="bg-[#0B0A0D] px-5 py-6">
              <p className="font-mono text-[10px] tracking-[0.28em] text-[#D5FF3F]">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#F4F0E8]">{step}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#A6A0AA]">
                {i === 0 && "Your references, exactly as you entered them."}
                {i === 1 && "Real entities and affinity tags returned by Qloo."}
                {i === 2 && "Sonic Architecture's deterministic rules map evidence to materials and light."}
                {i === 3 && "A coherent venue concept you can walk through below."}
              </p>
            </li>
          ))}
        </ol>

        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="sa-label mb-4">Design thesis</h3>
            <p className="text-lg leading-relaxed font-light text-[#F4F0E8]">{vibe.concept.thesis}</p>
            <dl className="mt-8 space-y-5 text-sm">
              <div>
                <dt className="sa-label mb-1">Atmosphere</dt>
                <dd className="text-[#F4F0E8]/90">{vibe.concept.atmosphere}</dd>
              </div>
              <div>
                <dt className="sa-label mb-1">Spatial composition</dt>
                <dd className="text-[#F4F0E8]/90">{vibe.concept.spatialComposition}</dd>
              </div>
              <div>
                <dt className="sa-label mb-1">Lighting direction</dt>
                <dd className="text-[#F4F0E8]/90">{vibe.concept.lightingDirection}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="sa-label mb-4">Mapping rules applied</h3>
            <p className="mb-5 max-w-md text-xs leading-relaxed text-[#A6A0AA]">
              Each spatial decision below is derived by Sonic Architecture from the affinity evidence —
              it is our interpretation, never a Qloo API output.
            </p>
            <ul className="space-y-3">
              {rules.map(([field, rule]) => (
                <li key={field} className="border-l border-[#8B5CF6]/50 pl-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-[#8B5CF6] uppercase">{field}</p>
                  <p className="mt-0.5 text-sm text-[#F4F0E8]/85">{rule}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 border-t border-[#F4F0E8]/8 pt-10">
          <h3 className="sa-label mb-4">3D scene parameters</h3>
          <p className="mb-6 max-w-2xl text-xs leading-relaxed text-[#A6A0AA]">
            The resonance field and venue above are driven by these deterministic parameters.
            Qloo evidence sets the inputs; Sonic Architecture sets the scene.
          </p>
          <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
            {sceneRules.map(([field, rule]) => (
              <li key={field} className="border-l border-[#D5FF3F]/40 pl-3">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#D5FF3F] uppercase">{field}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#F4F0E8]/80">{rule}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
