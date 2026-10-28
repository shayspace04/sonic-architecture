/**
 * Sonic Architecture — Automated Visual Diagnostic & Quality Gate (scripts/shoot.mjs)
 *
 * Uses Playwright to load the live app, generate 6 spatial prompts,
 * wait for the 3D WebGL scene to settle, capture 1600x900 screenshots,
 * and compute photographic luminance metrics:
 * - Mean Luminance (0.00 to 1.00)
 * - % Blown Highlights (Y > 0.95)
 * - % Crushed Shadows (Y < 0.05)
 *
 * Usage:
 *   node scripts/shoot.mjs [--out screenshots/before] [--port 3000]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
let outDirName = "screenshots/before";
let port = "3000";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    outDirName = args[i + 1];
    i++;
  } else if (args[i] === "--port" && args[i + 1]) {
    port = args[i + 1];
    i++;
  }
}

const TARGET_PROMPTS = [
  { name: "Jazz + Brutalist Architecture", slug: "01-jazz-brutalist" },
  { name: "Japanese tea room", slug: "02-japanese-tea-room" },
  { name: "Cathedral banquet", slug: "03-cathedral-banquet" },
  { name: "Grunge loft club", slug: "04-grunge-loft-club" },
  { name: "Mediterranean courtyard", slug: "05-mediterranean-courtyard" },
  { name: "Product launch pavilion", slug: "06-product-launch-pavilion" },
];

const OUT_DIR = path.resolve(PROJECT_ROOT, outDirName);
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  console.log(`\n===============================================================`);
  console.log(`  SONIC ARCHITECTURE — PHOTOREAL QUALITY SHOOT`);
  console.log(`  Target: http://localhost:${port} | Destination: ${outDirName}`);
  console.log(`===============================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=default",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const results = [];

  try {
    console.log(`Navigating to http://localhost:${port}...`);
    await page.goto(`http://localhost:${port}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Wait for initial hydration
    await page.waitForTimeout(3000);

    for (let i = 0; i < TARGET_PROMPTS.length; i++) {
      const { name, slug } = TARGET_PROMPTS[i];
      console.log(`\n[${i + 1}/6] Generating: "${name}"...`);

      // Fill prompt input
      const inputSelector = "#world-input";
      await page.waitForSelector(inputSelector, { timeout: 35000 });
      await page.fill(inputSelector, name);
      await page.waitForTimeout(300);

      // Submit via form submit button or Enter key
      await page.press(inputSelector, "Enter");

      // Wait for scene transition and 3D settlement
      console.log(`  Waiting for 3D viewport to settle (frame stabilization)...`);
      await page.waitForSelector(".sa-scene-viewport-isolated canvas", { timeout: 15000 });

      // Allow frame 14 whitewash guard and post-processing to settle
      await page.waitForTimeout(4000);

      // Scroll viewport into clean view
      await page.evaluate(() => {
        const viewport = document.querySelector(".sa-scene-viewport-isolated");
        if (viewport) {
          viewport.scrollIntoView({ behavior: "instant", block: "center" });
        }
      });
      await page.waitForTimeout(600);

      // Capture high-res 1600x900 screenshot of the isolated 3D viewport stage
      const viewportEl = await page.$(".sa-scene-viewport-isolated");
      const outPath = path.join(OUT_DIR, `${slug}.png`);

      let screenshotBuffer;
      if (viewportEl) {
        screenshotBuffer = await viewportEl.screenshot({ type: "png" });
      } else {
        screenshotBuffer = await page.screenshot({ type: "png" });
      }
      fs.writeFileSync(outPath, screenshotBuffer);

      // Measure luminance directly in the browser via canvas for precision
      const metrics = await page.evaluate(async (base64Png) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const totalPixels = data.length / 4;

            let totalY = 0;
            let blownCount = 0;
            let crushedCount = 0;

            for (let p = 0; p < data.length; p += 4) {
              const r = data[p] / 255;
              const g = data[p + 1] / 255;
              const b = data[p + 2] / 255;
              // Rec. 709 Relative Luminance
              const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

              totalY += y;
              if (y > 0.95) blownCount++;
              if (y < 0.05) crushedCount++;
            }

            resolve({
              width: img.width,
              height: img.height,
              meanLuminance: Number((totalY / totalPixels).toFixed(4)),
              blownHighlightsPct: Number(((blownCount / totalPixels) * 100).toFixed(2)),
              crushedShadowsPct: Number(((crushedCount / totalPixels) * 100).toFixed(2)),
            });
          };
          img.src = "data:image/png;base64," + base64Png;
        });
      }, screenshotBuffer.toString("base64"));

      console.log(`  Saved: ${path.relative(PROJECT_ROOT, outPath)}`);
      console.log(
        `  Metrics -> Mean Luminance: ${metrics.meanLuminance.toFixed(3)} | ` +
        `Blown (>95%): ${metrics.blownHighlightsPct.toFixed(2)}% | ` +
        `Crushed (<5%): ${metrics.crushedShadowsPct.toFixed(2)}%`
      );

      results.push({
        prompt: name,
        slug,
        filePath: path.relative(PROJECT_ROOT, outPath),
        ...metrics,
      });
    }

    // Write JSON summary
    const summaryPath = path.join(OUT_DIR, "metrics.json");
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

    console.log(`\n===============================================================`);
    console.log(`  SHOOT COMPLETE: METRICS TABLE (${outDirName})`);
    console.log(`===============================================================\n`);
    console.table(
      results.map((r) => ({
        Prompt: r.prompt,
        "Mean Y": r.meanLuminance.toFixed(3),
        "Blown (>95%)": `${r.blownHighlightsPct.toFixed(2)}%`,
        "Crushed (<5%)": `${r.crushedShadowsPct.toFixed(2)}%`,
        Pass: r.blownHighlightsPct < 8.0 && r.crushedShadowsPct < 10.0 ? "PASS" : "FAIL",
      }))
    );
  } catch (err) {
    console.error("Error during shoot execution:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
