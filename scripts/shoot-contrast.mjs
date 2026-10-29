import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(PROJECT_ROOT, "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const ARTIFACT_DIR = "C:\\Users\\SHAYEL\\.gemini\\antigravity\\brain\\d8c6c346-40c6-43e5-adcd-48e01da87700";

const SCENES = [
  {
    name: "Miles Davis + Brutalist concrete",
    slug: "compare-miles-davis",
  },
  {
    name: "Aphex Twin + Brutalist concrete",
    slug: "compare-aphex-twin",
  },
];

async function run() {
  console.log("=================================================================");
  console.log("  SONIC ARCHITECTURE — MILES DAVIS VS APHEX TWIN CONTRAST SHOOT");
  console.log("=================================================================\n");

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
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);

  for (let i = 0; i < SCENES.length; i++) {
    const { name, slug } = SCENES[i];
    console.log(`\n[${i + 1}/2] Generating 3D Scene for: "${name}" ...`);

    const inputSelector = "#world-input";
    await page.waitForSelector(inputSelector, { timeout: 30000 });
    await page.fill(inputSelector, "");
    await page.fill(inputSelector, name);
    await page.waitForTimeout(400);

    // Submit prompt
    await page.press(inputSelector, "Enter");

    console.log("  Waiting for synthesis and 3D settlement ...");
    try {
      await page.waitForSelector(".sa-scene-viewport-isolated canvas, canvas", { timeout: 25000 });
    } catch {
      // Continue if selector already loaded
    }

    // Wait for frame stabilization
    await page.waitForTimeout(6000);

    const outPath = path.resolve(OUT_DIR, `${slug}.png`);
    const viewportEl = await page.$(".sa-scene-viewport-isolated");
    if (viewportEl) {
      await viewportEl.screenshot({ path: outPath, type: "png" });
    } else {
      await page.screenshot({ path: outPath, type: "png" });
    }
    console.log(`  Saved screenshot: ${outPath}`);

    // Copy to artifact directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      const artPath = path.resolve(ARTIFACT_DIR, `${slug}.png`);
      fs.copyFileSync(outPath, artPath);
      console.log(`  Copied to artifact dir: ${artPath}`);
    }
  }

  await browser.close();
  console.log("\nContrast screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
