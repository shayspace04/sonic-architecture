/**
 * Sonic Architecture — Background Starter Prompt Pre-Warmer
 * (/lib/qloo/prewarmer.ts)
 *
 * Implements Requirement 4:
 * Pre-warms the 5 starter prompts on server startup so users and judges experience
 * sub-second scene generation (<6s cold run target).
 */

import { getCrossDomainEvidenceForPrompt } from "./pipeline";
import { STARTER_PROMPTS } from "@/lib/starters";

export { STARTER_PROMPTS };

let prewarmTriggered = false;

export function triggerServerPrewarm(): void {
  if (prewarmTriggered || typeof window !== "undefined") return;
  prewarmTriggered = true;

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) return;

  // Background non-blocking prewarm
  (async () => {
    try {
      console.log("[Qloo Pre-warmer] Starting background pre-warm for starter prompts...");
      for (const prompt of STARTER_PROMPTS) {
        try {
          await getCrossDomainEvidenceForPrompt(prompt);
        } catch {
          // Ignore individual background failures
        }
      }
      console.log("[Qloo Pre-warmer] Starter prompt pre-warming completed.");
    } catch {
      // Ignore background errors
    }
  })();
}
