import { chromium } from 'playwright';

async function testSinglePrompt(promptText) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  console.log(`\n=============================================================`);
  console.log(`Auditing Prompt: "${promptText}"`);
  await page.goto('http://localhost:3000/studio', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const textarea = page.locator('textarea').first();
  await textarea.fill(promptText);
  const submitBtn = page.locator("button[type='submit'], button:has-text('Update World'), button:has-text('Re-Ground Scene')").first();
  await submitBtn.click({ noWaitAfter: true });

  try {
    await page.locator("text=Grounding taste signals").waitFor({ state: 'visible', timeout: 3000 });
    console.log('  -> Grounding spinner appeared...');
    await page.locator("text=Grounding taste signals").waitFor({ state: 'detached', timeout: 35000 });
    console.log('  -> Grounding spinner detached!');
  } catch (e) {
    console.log('  -> Spinner wait fallback:', e.message);
  }
  await page.waitForTimeout(2500);

  // Check scene title
  const sceneTitle = await page.locator('h1, h2, .scene-title').allInnerTexts();
  console.log('  Scene title elements:', sceneTitle);

  // Open Why Qloo tab
  const whyQlooTab = page.locator("button:has-text('Why Qloo')").first();
  await whyQlooTab.click();
  await page.waitForTimeout(1500);

  const badges = await page.locator('.provenance-badge').allInnerTexts();
  console.log('  Provenance badges:', badges);

  const whyQlooText = await page.locator("div:has-text('Provenance & Grounding')").first().innerText();
  console.log('  Why Qloo Panel snippet (first 300 chars):');
  console.log(whyQlooText.slice(0, 300).replace(/\n+/g, ' | '));

  // Check compare button
  const splitBtn = page.locator("button:has-text('Inspect Baseline vs Grounded'), button:has-text('Split Compare')").first();
  const hasSplit = await splitBtn.isVisible();
  console.log('  Split compare button available:', hasSplit);

  if (hasSplit) {
    await splitBtn.click();
    await page.waitForTimeout(2000);
    const splitCanvases = await page.locator('canvas').count();
    console.log('  Split view canvases count:', splitCanvases);
  }

  await browser.close();
}

async function run() {
  await testSinglePrompt('Miles Davis + Brutalist concrete');
  await testSinglePrompt('Aphex Twin + Brutalist concrete');
  await testSinglePrompt('Bad Bunny + Caribbean cultural pavilion');
  await testSinglePrompt('A24 films + indie music');
}

run().catch(console.error);
