export const MAX_TERMS = 5;
export const MAX_TERM_LENGTH = 120;
export const MAX_INPUT_LENGTH = 600;

const SEPARATORS = /\s*(?:\+|,|;|&|\band\b|\bwith\b)\s*/gi;

export function parseTasteTerms(raw: string): string[] {
  const text = raw.trim().slice(0, MAX_INPUT_LENGTH);
  if (!text) return [];
  const parts = text
    .split(SEPARATORS)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 2 && p.length <= MAX_TERM_LENGTH);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
    if (unique.length >= MAX_TERMS) break;
  }
  if (unique.length === 0 && text.length >= 2) unique.push(text.slice(0, MAX_TERM_LENGTH));
  return unique;
}
