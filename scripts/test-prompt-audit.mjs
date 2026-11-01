import { chromium } from 'playwright';

async function testPrompt(prompt) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  console.log(`\n==================================================`);
  console.log(`Testing Studio UI for prompt: "${prompt}"`);
  await page.goto(`http://localhost:3000/studio?prompt=${encodeURIComponent(prompt)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Check scene header
  const eyebrow = await page.locator('.eyebrow').allInnerTexts();
  console.log('Eyebrows:', eyebrow);

  // Click Why Qloo tab
  const whyQlooTab = page.locator("button:has-text('Why Qloo')").first();
  if (await whyQlooTab.isVisible()) {
    await whyQlooTab.click();
    await page.waitForTimeout(1000);
    const badges = await page.locator('.provenance-badge').allInnerTexts();
    console.log('Provenance badges in Why Qloo:', badges);

    const diffItems = await page.locator('.diff-item, .what-changed-item, li').allInnerTexts();
    console.log('Sample list items in Why Qloo:', diffItems.slice(0, 6));

    // Check split compare button
    const splitBtn = page.locator("button:has-text('Inspect Baseline vs Grounded'), button:has-text('Split Compare')").first();
    const hasSplit = await splitBtn.isVisible();
    console.log('Has Split Compare button:', hasSplit);

    if (hasSplit) {
      await splitBtn.click();
      await page.waitForTimeout(1500);
      const canvasCount = await page.locator('canvas').count();
      console.log('Canvas count in Split mode:', canvasCount);
    }
  }

  await browser.close();
}

async function main() {
  await testPrompt('Miles Davis + Brutalist concrete');
  await testPrompt('A24 films + indie music');
  await testPrompt('Japanese Gardens + ambient');
  await testPrompt('Cedric the Entertainer + Contemporary Comedy Theatre');
  await testPrompt('Bad Bunny + Caribbean cultural pavilion');
}

main().catch(console.error);
