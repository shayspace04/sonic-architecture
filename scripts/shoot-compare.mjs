import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const OUT_DIR = path.resolve(PROJECT_ROOT, "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shoot() {
  console.log("Launching headless browser for comparison screenshots...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // 1. Capture Fixture / Fallback Comparison View (Initial Load / Starter Prompt)
  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });

  console.log("Clicking Compare (C) button...");
  const compareBtn = await page.$('button:has-text("Compare (C)")');
  if (compareBtn) {
    await compareBtn.click();
    await page.waitForTimeout(2000);
  }

  // Scroll down slightly to frame both the 3D comparison viewer and the What Qloo Changed diff panel
  await page.evaluate(() => {
    const el = document.querySelector('button[aria-pressed="true"]');
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(1000);

  console.log("Capturing screenshots/compare-fixture.png ...");
  const fixturePath = path.resolve(OUT_DIR, "compare-fixture.png");
  await page.screenshot({ path: fixturePath, fullPage: false });
  console.log(`Saved fixture screenshot to: ${fixturePath}`);

  const fixtureFullPagePath = path.resolve(OUT_DIR, "compare-fixture-full.png");
  await page.screenshot({ path: fixtureFullPagePath, fullPage: true });

  // 2. Now trigger Live Qloo search / grounding
  // Scroll to prompt input, submit "Pink Grunge Editorial Loft & Flash Studio"
  console.log("Submitting prompt to test live/cached grounding...");
  await page.evaluate(() => window.scrollTo(0, 0));
  const inputSelector = 'textarea, input[type="text"]';
  const inputEl = await page.$(inputSelector);
  if (inputEl) {
    await inputEl.fill("Pink Grunge Editorial Loft & Flash Studio");
    const submitBtn = await page.$('button[type="submit"], button:has-text("Enter Your World"), button:has-text("Synthesize")');
    if (submitBtn) {
      await submitBtn.click();
      console.log("Waiting for scene synthesis handoff...");
      await page.waitForTimeout(9000);
    }
  }

  // Re-engage comparison mode
  const isCompareButton = await page.$('button:has-text("Compare (C)")');
  if (isCompareButton) {
    const isPressed = await isCompareButton.getAttribute("aria-pressed");
    if (isPressed !== "true") {
      await isCompareButton.click();
      await page.waitForTimeout(2000);
    }
  }

  // Scroll to comparison viewer
  const compareBtnLive = await page.$('button:has-text("Compare (C)")');
  if (compareBtnLive) {
    await compareBtnLive.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(1000);

  console.log("Capturing screenshots/compare-live.png ...");
  const livePath = path.resolve(OUT_DIR, "compare-live.png");
  await page.screenshot({ path: livePath, fullPage: false });
  console.log(`Saved live screenshot to: ${livePath}`);

  const liveFullPagePath = path.resolve(OUT_DIR, "compare-live-full.png");
  await page.screenshot({ path: liveFullPagePath, fullPage: true });

  await browser.close();
  console.log("Comparison screenshots captured successfully!");
}

shoot().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
