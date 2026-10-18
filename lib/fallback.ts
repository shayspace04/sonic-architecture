/**
 * Honest local fallback payload: deterministic, neutral, and explicitly
 * labeled `local-fallback`. Never fabricates Qloo evidence, artists, or
 * tracks. Used when the API key is missing, no reference resolves, or the
 * application request budget is exhausted.
 */

import type { VibePayload } from "./types";
import { neutralSpatialMapping } from "./spatial-rules";

export function localFallbackPayload(
  submittedTerms: string[],
  errors: string[],
  extraLimitations: string[] = []
): VibePayload {
  const mapping = neutralSpatialMapping(submittedTerms);
  return {
    primaryColorHex: mapping.primaryColorHex,
    accentColorHex: mapping.accentColorHex,
    lightingTemperatureK: mapping.lightingTemperatureK,
    flooringMaterial: mapping.flooringMaterial,
    seatingFabric: mapping.seatingFabric,
    tracks: [],
    menu: "Local fallback (live cultural intelligence unavailable).",
    fallback: true,
    reasoning: {
      source: "local-fallback",
      evidence: [],
      rules: {
        primaryColorHex: "Qloo unavailable; neutral default color.",
        accentColorHex: "Qloo unavailable; neutral default accent.",
        lightingTemperatureK: "Qloo unavailable; 4500K default.",
        flooringMaterial: "Qloo unavailable; neutral default flooring.",
        seatingFabric: "Qloo unavailable; neutral default seating.",
      },
    },
    partial: false,
    submittedTerms,
    entities: [],
    unresolvedTerms: submittedTerms,
    evidence: { genreTags: [], styleTags: [], themeTags: [], adjectives: [], characteristics: [] },
    artists: [],
    concept: mapping.concept,
    limitations: [
      "Live Qloo cultural intelligence was unavailable; this concept is a labeled local fallback.",
      ...extraLimitations,
    ],
    errors,
  };
}
