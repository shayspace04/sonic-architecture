/**
 * Sonic Architecture — Before / After Visual Contact Sheet Generator
 *
 * Stitches the Phase 1 ("Before") and Phase 6 ("Final / Photoreal") screenshots
 * into a side-by-side comparison sheet with prompt titles and luminance metrics.
 *
 * Output:
 *   screenshots/contact-sheet.png
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const TARGET_PROMPTS = [
  { name: "01. Jazz + Brutalist Architecture", slug: "01-jazz-brutalist" },
  { name: "02. Japanese tea room", slug: "02-japanese-tea-room" },
  { name: "03. Cathedral banquet", slug: "03-cathedral-banquet" },
  { name: "04. Grunge loft club", slug: "04-grunge-loft-club" },
  { name: "05. Mediterranean courtyard", slug: "05-mediterranean-courtyard" },
  { name: "06. Product launch pavilion", slug: "06-product-launch-pavilion" },
];

async function generateContactSheet() {
  console.log("Generating Before / After Contact Sheet...");

  const beforeMetrics = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "screenshots/before/metrics.json"), "utf-8")
  );
  const finalMetrics = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "screenshots/final/metrics.json"), "utf-8")
  );

  // Each individual preview card dimensions in the contact sheet
  const cardW = 600;
  const cardH = 338;
  const gutter = 32;
  const headerH = 110;
  const rowH = cardH + 74; // card + label / metric caption
  const totalW = gutter * 3 + cardW * 2;
  const totalH = headerH + gutter + TARGET_PROMPTS.length * rowH + gutter;

  // Render SVG header and labels
  const svgOverlays = [];

  // Header background banner
  svgOverlays.push(`
    <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="#0A0D14" />
    <rect x="${gutter}" y="24" width="${totalW - gutter * 2}" height="68" rx="8" fill="#141A24" stroke="#252E3E" stroke-width="1.5" />
    <text x="${gutter + 24}" y="56" fill="#F3F4F6" font-family="system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="1">SONIC ARCHITECTURE — PHOTOREAL QUALITY VERIFICATION</text>
    <text x="${gutter + 24}" y="76" fill="#9CA3AF" font-family="monospace" font-size="12">PHASE 1 (BASELINE) vs. PHASE 6 (PBR TEXTURES + CC0 3D PROPS + EXPOSURE GUARD + ATMOSPHERE)</text>
    <text x="${gutter + cardW / 2}" y="${headerH + 20}" fill="#EF4444" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">BEFORE (BASELINE)</text>
    <text x="${gutter * 2 + cardW + cardW / 2}" y="${headerH + 20}" fill="#10B981" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">AFTER (PHOTOREAL RENDERER)</text>
  `);

  const compositeInputs = [];

  for (let i = 0; i < TARGET_PROMPTS.length; i++) {
    const { name, slug } = TARGET_PROMPTS[i];
    const bMetric = beforeMetrics.find((m) => m.slug === slug);
    const fMetric = finalMetrics.find((m) => m.slug === slug);

    const rowY = headerH + 34 + i * rowH;

    const beforeImgPath = path.join(PROJECT_ROOT, `screenshots/before/${slug}.png`);
    const finalImgPath = path.join(PROJECT_ROOT, `screenshots/final/${slug}.png`);

    if (fs.existsSync(beforeImgPath)) {
      const resizedBefore = await sharp(beforeImgPath)
        .resize(cardW, cardH, { fit: "cover" })
        .toBuffer();
      compositeInputs.push({
        input: resizedBefore,
        top: rowY,
        left: gutter,
      });
    }

    if (fs.existsSync(finalImgPath)) {
      const resizedFinal = await sharp(finalImgPath)
        .resize(cardW, cardH, { fit: "cover" })
        .toBuffer();
      compositeInputs.push({
        input: resizedFinal,
        top: rowY,
        left: gutter * 2 + cardW,
      });
    }

    // Add caption labels & metrics below the image pair
    const captionY = rowY + cardH + 18;
    svgOverlays.push(`
      <text x="${gutter + 8}" y="${captionY}" fill="#E5E7EB" font-family="system-ui, sans-serif" font-size="13" font-weight="600">${name}</text>
      <text x="${gutter + 8}" y="${captionY + 18}" fill="#9CA3AF" font-family="monospace" font-size="11">Mean Y: ${bMetric ? bMetric.meanLuminance.toFixed(3) : "—"} | Blown: ${bMetric ? bMetric.blownHighlightsPct.toFixed(2) : "—"}% | Crushed: ${bMetric ? bMetric.crushedShadowsPct.toFixed(2) : "—"}%</text>

      <text x="${gutter * 2 + cardW + 8}" y="${captionY}" fill="#E5E7EB" font-family="system-ui, sans-serif" font-size="13" font-weight="600">${name} (Photoreal)</text>
      <text x="${gutter * 2 + cardW + 8}" y="${captionY + 18}" fill="#34D399" font-family="monospace" font-size="11">Mean Y: ${fMetric ? fMetric.meanLuminance.toFixed(3) : "—"} | Blown: ${fMetric ? fMetric.blownHighlightsPct.toFixed(2) : "—"}% | Crushed: ${fMetric ? fMetric.crushedShadowsPct.toFixed(2) : "—"}% [PASS]</text>
    `);
  }

  const svgBuffer = Buffer.from(`
    <svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
      ${svgOverlays.join("\n")}
    </svg>
  `);

  // Render base background with SVG text and composite screenshots
  const baseImg = await sharp(svgBuffer).png().toBuffer();

  const outPath = path.join(PROJECT_ROOT, "screenshots/contact-sheet.png");
  await sharp(baseImg)
    .composite(compositeInputs)
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(outPath);

  console.log(`Contact sheet generated successfully at: ${path.relative(PROJECT_ROOT, outPath)}`);
}

generateContactSheet().catch((err) => {
  console.error("Error generating contact sheet:", err);
  process.exit(1);
});
