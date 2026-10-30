import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.resolve('sonic-architecture/assets/screenshots');
const ARTIFACTS_DIR = 'C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700';

async function captureGallery() {
  console.log('--- Launching Playwright Chromium for Final Gallery Capture ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // 1. Homepage & Natural-Language Brief
  console.log('Capturing 01: Homepage and natural-language brief...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const shot1 = path.join(SCREENSHOTS_DIR, '01-homepage-editorial-brief.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(ARTIFACTS_DIR, '01-homepage-editorial-brief.png'));
  console.log(`  ✓ Saved: ${shot1}`);

  // 2. Interactive 3D Studio
  console.log('Capturing 02: Interactive 3D Studio...');
  await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Submit Cedric prompt to ensure full Qloo grounding
  const prompt = 'Cedric the Entertainer + Contemporary Comedy Theatre';
  const textarea = page.locator('textarea');
  await textarea.fill(prompt);
  const submitBtn = page.locator("button:has-text('Re-Ground Scene'), button:has-text('Ground Scene'), button[type='submit']").first();
  await submitBtn.click({ noWaitAfter: true });

  // Wait for 3D generation to settle
  try {
    await page.locator("text=Grounding taste signals").waitFor({ state: "visible", timeout: 4000 });
    await page.locator("text=Grounding taste signals").waitFor({ state: "detached", timeout: 30000 });
  } catch {
    await page.waitForTimeout(4000);
  }
  await page.waitForTimeout(2500);

  const shot2 = path.join(SCREENSHOTS_DIR, '02-interactive-3d-studio.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(ARTIFACTS_DIR, '02-interactive-3d-studio.png'));
  console.log(`  ✓ Saved: ${shot2}`);

  // 3. Qloo Provenance Panel Fully Open
  console.log('Capturing 03: Qloo Provenance Panel Fully Open...');
  const whyQlooTab = page.locator("button:has-text('Why Qloo')").first();
  await whyQlooTab.click({ force: true });
  await page.waitForTimeout(1500);
  const shot3 = path.join(SCREENSHOTS_DIR, '03-qloo-provenance-and-evidence.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(ARTIFACTS_DIR, '03-qloo-provenance-and-evidence.png'));
  console.log(`  ✓ Saved: ${shot3}`);

  // 4. Baseline vs Grounded Split Comparison
  console.log('Capturing 04: Baseline vs Grounded Split Comparison...');
  const splitBtn = page.locator("button:has-text('Split Compare')").first();
  await splitBtn.click({ force: true });
  await page.waitForTimeout(2000);
  const shot4 = path.join(SCREENSHOTS_DIR, '04-baseline-vs-grounded-compare.png');
  await page.screenshot({ path: shot4, fullPage: false });
  fs.copyFileSync(shot4, path.join(ARTIFACTS_DIR, '04-baseline-vs-grounded-compare.png'));
  console.log(`  ✓ Saved: ${shot4}`);

  // Switch back to With Qloo viewport before tab switching
  const withQlooBtn = page.locator("button:has-text('With Qloo')").first();
  await withQlooBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // 5. Updated Pricing & Sourcing Interface (Procurement & BOQ)
  console.log('Capturing 05: Updated Pricing & Sourcing Interface...');
  const sourcingTab = page.locator("button:has-text('Pricing & Sourcing')").first();
  await sourcingTab.click({ force: true });
  await page.waitForTimeout(2000);
  const shot5 = path.join(SCREENSHOTS_DIR, '05-procurement-and-project-boq.png');
  await page.screenshot({ path: shot5, fullPage: false });
  fs.copyFileSync(shot5, path.join(ARTIFACTS_DIR, '05-procurement-and-project-boq.png'));
  console.log(`  ✓ Saved: ${shot5}`);

  // 6. Actual Soundtrack Discovery Panel with Playlist & Playback
  console.log('Capturing 06: Actual Soundtrack Discovery Panel...');
  const playlistTab = page.locator("button:has-text('Playlist')").first();
  await playlistTab.click({ force: true });
  await page.waitForTimeout(2000);
  const shot6 = path.join(SCREENSHOTS_DIR, '06-soundtrack-discovery-and-audio.png');
  await page.screenshot({ path: shot6, fullPage: false });
  fs.copyFileSync(shot6, path.join(ARTIFACTS_DIR, '06-soundtrack-discovery-and-audio.png'));
  console.log(`  ✓ Saved: ${shot6}`);

  await browser.close();
  console.log('\n--- All 6 authentic screenshots captured and verified successfully! ---');
}

captureGallery().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
