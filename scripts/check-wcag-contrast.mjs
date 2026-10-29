import { chromium } from "playwright";

/**
 * WCAG 2.1 Contrast Ratio Calculator
 * Relative luminance formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function sRGBtoLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(rgb) {
  const R = sRGBtoLinear(rgb.r);
  const G = sRGBtoLinear(rgb.g);
  const B = sRGBtoLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

// 1. Audit core design tokens
const TOKEN_PAIRS = [
  { name: "Ink on Paper", fg: "#171716", bg: "#f6f6f1", target: 4.5 },
  { name: "Ink on Paper-Deep", fg: "#171716", bg: "#eeeee8", target: 4.5 },
  { name: "Quiet text on Paper", fg: "#66665f", bg: "#f6f6f1", target: 4.5 },
  { name: "Quiet text on Paper-Deep", fg: "#66665f", bg: "#eeeee8", target: 4.5 },
  { name: "Cobalt on Paper (headings/accent)", fg: "#1557e8", bg: "#f6f6f1", target: 4.5 },
  { name: "Paper on Ink (inverted sections)", fg: "#f6f6f1", bg: "#171716", target: 4.5 },
  { name: "Provenance Inferred on Paper", fg: "#8c5d14", bg: "#f6f6f1", target: 4.5 },
  { name: "Provenance Fallback on Paper", fg: "#4a4a45", bg: "#f6f6f1", target: 4.5 },
];

console.log("=================================================================");
console.log("   SONIC ARCHITECTURE — AUTOMATED WCAG 2.1 AA CONTRAST AUDIT");
console.log("=================================================================\n");

let tokenAllPass = true;
console.log("--- 1. DESIGN TOKEN PAIR RATIOS ---");
for (const pair of TOKEN_PAIRS) {
  const ratio = contrastRatio(hexToRgb(pair.fg), hexToRgb(pair.bg));
  const pass = ratio >= pair.target;
  if (!pass) tokenAllPass = false;
  console.log(
    `  ${pair.name.padEnd(38)} | ${ratio.toFixed(2)}:1 | Required: ${pair.target}:1 | ${pass ? "PASS (WCAG AA)" : "FAIL"}`
  );
}

if (!tokenAllPass) {
  console.error("\n[ERROR] Some design tokens failed contrast requirement.");
  process.exit(1);
} else {
  console.log("\n[SUCCESS] All design token color pairs strictly satisfy WCAG 2.1 AA standards.");
}
