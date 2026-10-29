/**
 * Sonic Architecture — Single Source of Truth for Starter Prompts
 * (/lib/starters.ts)
 *
 * Implements Requirement 2:
 * Exactly matches the 4 landing-page chips across landing, studio, archive,
 * prewarm script, and KV cache keys.
 */

export const STARTER_PROMPTS = [
  "Miles Davis + Brutalist concrete",
  "Aphex Twin + gallery warehouse",
  "A24 films + indie music",
  "Japanese Gardens + ambient",
] as const;

export type StarterPrompt = (typeof STARTER_PROMPTS)[number];

/**
 * Returns deterministic KV cache key for any starter prompt
 */
export function getStarterKvKey(prompt: string): string {
  const normalized = prompt.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
  return `starter_${normalized}`;
}

/**
 * Checks whether candidate prompt matches one of the canonical landing starters
 */
export function isStarterPrompt(prompt: string): boolean {
  if (!prompt) return false;
  const norm = prompt.toLowerCase().trim();
  return STARTER_PROMPTS.some((s) => s.toLowerCase().trim() === norm);
}

/**
 * Helper to build studio URL for a starter
 */
export function buildStudioHref(prompt: string): string {
  return `/studio?prompt=${encodeURIComponent(prompt.trim())}`;
}
