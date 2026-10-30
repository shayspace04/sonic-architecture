import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ARTIFACTS_DIR = 'C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700';
const BASE_URL = 'http://localhost:3000';

async function auditCedricPrompt() {
  console.log('--- Launching Playwright Chromium ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });

  console.log(`1. Navigating to ${BASE_URL}/studio...`);
  await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 2. Submit prompt
  const prompt = 'Cedric the Entertainer + Contemporary Comedy Theatre';
  console.log(`2. Entering prompt: "${prompt}"...`);
  const textarea = page.locator('textarea');
  await textarea.fill(prompt);

  const submitBtn = page.locator("button:has-text('Re-Ground Scene'), button:has-text('Ground Scene'), button[type='submit']").first();
  await submitBtn.click({ noWaitAfter: true });

  // Wait for generation to start and finish
  console.log('3. Waiting for Qloo taste grounding & 3D scene synthesis...');
  try {
    await page.locator("text=Grounding taste signals").waitFor({ state: "visible", timeout: 4000 });
    await page.locator("text=Grounding taste signals").waitFor({ state: "detached", timeout: 30000 });
  } catch {
    await page.waitForTimeout(5000);
  }

  // Ensure Three.js canvas is mounted
  const canvas = page.locator(".studio-stage__viewport-frame canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  assert.ok((await canvas.count()) > 0, "Three.js WebGL canvas must be active");
  console.log('   ✓ Three.js WebGL canvas active');

  // Let Three.js render frames
  await page.waitForTimeout(2000);

  // Take screenshot of Grounded Scene (WITH QLOO)
  const groundedShot = path.join(ARTIFACTS_DIR, 'cedric-with-qloo-scene.png');
  await page.screenshot({ path: groundedShot, fullPage: false });
  console.log(`   ✓ Saved Grounded Scene screenshot: ${groundedShot}`);

  // 4. Inspect Why Qloo / Provenance Tab
  console.log('4. Switching to "Why Qloo" Tab (Provenance & Grounding)...');
  const whyQlooTab = page.locator("button:has-text('Why Qloo')").first();
  await whyQlooTab.click({ force: true });
  await page.waitForTimeout(1000);

  const provShot = path.join(ARTIFACTS_DIR, 'cedric-provenance-panel.png');
  await page.screenshot({ path: provShot, fullPage: false });
  console.log(`   ✓ Saved Provenance Panel screenshot: ${provShot}`);

  // Extract Provenance sidebar text
  const sidebarText = await page.locator('.studio-sidebar__detail').innerText();
  console.log('\n--- PROVENANCE SIDEBAR TEXT ---');
  console.log(sidebarText.slice(0, 1500));

  // Verify entities used > 0 and Cedric is resolved
  assert.ok(!sidebarText.includes('0 entities used'), 'Must NOT report 0 entities used');
  assert.ok(!sidebarText.includes('0 of 0 design decisions traced'), 'Must NOT report 0 of 0 decisions traced');
  assert.ok(/cedric/i.test(sidebarText), 'Must cite Cedric the Entertainer');

  // 5. Inspect WITHOUT QLOO Scene
  console.log('\n5. Switching to "Without Qloo" Baseline Mode...');
  const withoutQlooBtn = page.locator("button:has-text('Without Qloo')").first();
  await withoutQlooBtn.click({ force: true });
  await page.waitForTimeout(2000);

  const baselineShot = path.join(ARTIFACTS_DIR, 'cedric-without-qloo-baseline.png');
  await page.screenshot({ path: baselineShot, fullPage: false });
  console.log(`   ✓ Saved Without Qloo Baseline screenshot: ${baselineShot}`);

  // 6. Inspect SPLIT COMPARE (Fair-Test Diff wipe)
  console.log('\n6. Switching to "Split Compare" Fair-Test Mode...');
  const splitBtn = page.locator("button:has-text('Split Compare')").first();
  await splitBtn.click({ force: true });
  await page.waitForTimeout(2000);

  const splitShot = path.join(ARTIFACTS_DIR, 'cedric-split-wipe-comparison.png');
  await page.screenshot({ path: splitShot, fullPage: false });
  console.log(`   ✓ Saved Split Compare screenshot: ${splitShot}`);

  // Extract Diff list text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n--- LIVE COMPARISON TEXT HIGHLIGHTS ---');
  const diffLines = bodyText.split('\n')
    .map(l => l.trim())
    .filter(l => /apollo|cedric|revue|theatre|proscenium|thrust|cabaret|curtain|banquette|rt60|magnitude|delta|without qloo|with qloo/i.test(l))
    .slice(0, 25);
  console.log(diffLines.join('\n'));

  console.log('\nConsole Errors caught during audit:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log(consoleErrors.slice(0, 5).join('\n'));
  }

  await browser.close();
  console.log('\n========================================================================');
  console.log('BROWSER E2E AUDIT PASSED: CEDRIC THE ENTERTAINER + COMEDY THEATRE VERIFIED');
  console.log('========================================================================\n');
}

auditCedricPrompt().catch((err) => {
  console.error('Browser audit failed:', err);
  process.exit(1);
});
