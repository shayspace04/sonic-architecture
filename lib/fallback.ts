/**
 * Honest local & LLM-enriched fallback payload.
 * Never fabricates Qloo evidence, entity IDs, or tracks when Qloo is unavailable.
 * Instead, engages Layer-4 LLM architectural & cultural knowledge enrichment
 * with explicit provenance labels (`llm_knowledge`, `design_inference`, `fallback`).
 */

import type { VibePayload } from "./types";
import { enrichPayloadWithKnowledge } from "./enrichment";

export function localFallbackPayload(
  submittedTerms: string[],
  errors: string[],
  promptText?: string
): VibePayload {
  const effectivePrompt =
    promptText || submittedTerms.join(" ") || "Intimate architectural listening sanctuary";
  return enrichPayloadWithKnowledge(effectivePrompt, [], undefined, errors);
}
