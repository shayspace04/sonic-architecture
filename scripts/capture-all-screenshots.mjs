import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700";
const BASE_URL = process.argv[2] || "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function capture() {
  console.log(`[Screenshots] Launching Chromium to capture views against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Home /
    console.log(`[Screenshots] Capturing Home (${vp.name})...`);
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const homePath = path.join(ARTIFACT_DIR, `after-home-${vp.name}-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: homePath, fullPage: false });
    console.log(`  Saved: ${homePath}`);

    // 2. About /about
    console.log(`[Screenshots] Capturing About (${vp.name})...`);
    await page.goto(`${BASE_URL}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const aboutPath = path.join(ARTIFACT_DIR, `after-about-${vp.name}-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: aboutPath, fullPage: false });
    console.log(`  Saved: ${aboutPath}`);

    // 3. Archive /archive
    console.log(`[Screenshots] Capturing Archive (${vp.name})...`);
    await page.goto(`${BASE_URL}/archive`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const archivePath = path.join(ARTIFACT_DIR, `after-archive-${vp.name}-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: archivePath, fullPage: false });
    console.log(`  Saved: ${archivePath}`);

    // 4. Studio Tabs: scene, why-qloo, playlist, brief
    for (const tab of ["scene", "why-qloo", "playlist", "brief"]) {
      console.log(`[Screenshots] Capturing Studio tab '${tab}' (${vp.name})...`);
      await page.goto(`${BASE_URL}/studio?prompt=${encodeURIComponent("Miles Davis + Brutalist concrete")}`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(2000);

      // Click corresponding tab button if present
      try {
        const tabSelector = `button:has-text("${tab === "why-qloo" ? "Why Qloo" : tab === "scene" ? "Scene" : tab === "playlist" ? "Soundtrack" : "Brief"}")`;
        const tabBtn = page.locator(tabSelector).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.warn(`  Tab selector click note for ${tab}: ${e.message}`);
      }

      const studioTabPath = path.join(ARTIFACT_DIR, `after-studio-${tab}-${vp.name}-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: studioTabPath, fullPage: false });
      console.log(`  Saved: ${studioTabPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 All required screenshots captured successfully!`);
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
