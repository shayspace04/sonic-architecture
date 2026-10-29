import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const tag = process.argv[2] || "before";
const OUT_DIR = path.resolve(PROJECT_ROOT, "screenshots", `theme-${tag}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const ARTIFACT_DIR = "C:\\Users\\SHAYEL\\.gemini\\antigravity\\brain\\d8c6c346-40c6-43e5-adcd-48e01da87700";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/studio", name: "studio" },
  { path: "/about", name: "about" },
  { path: "/archive", name: "archive" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function run() {
  console.log(`=================================================================`);
  console.log(`  SONIC ARCHITECTURE — SCREENSHOT CAPTURE (${tag.toUpperCase()})`);
  console.log(`=================================================================\n`);

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

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const r of ROUTES) {
      const url = `http://localhost:3000${r.path}`;
      console.log(`[${vp.name.toUpperCase()}] Capturing ${r.name} (${url}) ...`);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
        await page.waitForTimeout(3500);

        const fileName = `${tag}-${r.name}-${vp.name}-${vp.width}x${vp.height}.png`;
        const outPath = path.resolve(OUT_DIR, fileName);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`  Saved: ${outPath}`);

        if (fs.existsSync(ARTIFACT_DIR)) {
          const artPath = path.resolve(ARTIFACT_DIR, fileName);
          fs.copyFileSync(outPath, artPath);
        }
      } catch (err) {
        console.error(`  Failed capturing ${r.name} at ${vp.width}x${vp.height}:`, err.message);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\n${tag.toUpperCase()} screenshots captured successfully!`);
}

run().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
