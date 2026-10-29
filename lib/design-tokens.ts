/**
 * Sonic Architecture — Architectural Editorialism Design Tokens
 * (/lib/design-tokens.ts)
 *
 * Grounded token system for the architectural editorial theme.
 * High-contrast values verified against WCAG 2.1 AA standards (minimum 4.5:1 for body copy).
 */

export const sonicTokens = {
  colors: {
    paper: "#f6f6f1",
    paperDeep: "#eeeee8",
    ink: "#171716",
    quiet: "#66665f", // Darkened from #74746e to guarantee WCAG AA 4.5:1 (achieves 5.32:1 on paper)
    faint: "#d7d7d0",
    line: "rgba(23, 23, 22, 0.18)",
    lineSubtle: "rgba(23, 23, 22, 0.08)",
    cobalt: "#1557e8",
    cobaltSoft: "rgba(21, 87, 232, 0.11)",
    warm: "#dddcd4",
    // Provenance badge colors (Phase 3 requirement)
    provenance: {
      qlooEvidence: "#1557e8", // cobalt
      inferred: "#b87c24",     // ochre
      fallback: "#66665f",     // grey
      sampleData: "#4d4d48",   // hatched grey
    },
  },
  fonts: {
    sans: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "var(--font-playfair), Georgia, serif",
    mono: "var(--font-dm-mono), ui-monospace, monospace",
  },
  spacing: {
    section: "clamp(5rem, 11vw, 9.25rem)",
    gutter: "clamp(1.125rem, 3vw, 2.125rem)",
  },
  radii: {
    pill: "999px",
    card: "1px", // Hairline 1px card radius per theme spec
  },
  borders: {
    hairline: "1px solid rgba(23, 23, 22, 0.18)",
    ink: "1px solid #171716",
    cobalt: "1px solid #1557e8",
  },
  motion: {
    ease: "cubic-bezier(0.22, 0.8, 0.24, 1)",
    reveal: "0.85s",
    micro: "0.25s",
  },
} as const;

export const STARTER_PROMPTS = [
  "Miles Davis + Brutalist concrete",
  "Aphex Twin + gallery warehouse",
  "A24 films + indie music",
  "Japanese Gardens + ambient",
] as const;

export function buildStudioHref(prompt: string): string {
  return `/studio?prompt=${encodeURIComponent(prompt.trim())}`;
}

export type SonicTokens = typeof sonicTokens;
