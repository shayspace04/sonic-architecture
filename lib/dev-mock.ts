import type { VibePayload } from "./types";

/**
 * Development-only preview payload.
 *
 * Purpose: let the landing page, the transition and the full-screen venue be
 * iterated on visually **without spending a single Qloo credit** and without
 * waiting on the network. Enabled only when `NODE_ENV !== "production"` and the
 * URL carries `?mock=1`.
 *
 * Honesty contract: this is NOT Qloo data. `reasoning.source` is
 * `local-fallback`, `fallback` is true, and every limitation string says so
 * explicitly. It must never be presented as live cultural evidence, and it is
 * never reachable in a production build.
 */
export const DEV_MOCK_PARAM = "mock";
export const DEV_MOCK_FLAG = "1";

export function isDevMockRequested(search: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return new URLSearchParams(search).get(DEV_MOCK_PARAM) === DEV_MOCK_FLAG;
  } catch {
    return false;
  }
}

const MOCK_NOTE = "DEVELOPMENT MOCK (?mock=1) — not Qloo data, no upstream requests were made.";

export function devMockVibe(): VibePayload {
  return {
    primaryColorHex: "#7fb6d9",
    accentColorHex: "#dcd8f4",
    lightingTemperatureK: 4800,
    flooringMaterial: "Mock — honed pale terrazzo",
    seatingFabric: "Mock — washed linen",
    tracks: [],
    menu: "Development mock",
    fallback: true,
    partial: false,
    submittedTerms: ["development mock"],
    entities: [],
    unresolvedTerms: [],
    artists: [],
    evidence: {
      genreTags: ["ambient"],
      styleTags: ["atmospheric", "airy"],
      themeTags: ["openness"],
      adjectives: ["calm", "spacious"],
      characteristics: ["soft"],
    },
    concept: {
      title: "Development Mock Venue",
      thesis: "A labelled preview used to iterate on the landing transition and the full-screen venue.",
      atmosphere: "Pale, airy, weightless — placeholders only; no cultural claim is being made.",
      spatialComposition: "Open field with a central void and a low horizon.",
      lightingDirection: "High, diffused, slightly cool key light.",
    },
    reasoning: {
      source: "local-fallback",
      evidence: [MOCK_NOTE],
      rules: {
        provenance: "Development mock: neutral scene defaults, no Qloo mapping applied.",
      },
    },
    limitations: [
      MOCK_NOTE,
      "No artists, entities or evidence are fabricated here; the mock only drives the visual preview.",
    ],
    errors: [],
  };
}
