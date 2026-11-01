import { chromium } from 'playwright';

async function testCommitWithPrompt() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto('http://localhost:3000/studio', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const textarea = page.locator('textarea').first();
  await textarea.fill('Cedric the Entertainer + Contemporary Comedy Theatre');
  const submitBtn = page.locator("button[type='submit'], button:has-text('Update World'), button:has-text('Re-Ground Scene')").first();
  await submitBtn.click({ noWaitAfter: true });

  try {
    await page.locator("text=Grounding taste signals").waitFor({ state: 'visible', timeout: 3500 });
    await page.locator("text=Grounding taste signals").waitFor({ state: 'detached', timeout: 35000 });
  } catch {}
  await page.waitForTimeout(2000);

  const sourcingTab = page.locator("button:has-text('Pricing & Sourcing')").first();
  await sourcingTab.click();
  await page.waitForTimeout(2000);

  // Click BUY method
  const buyBtn = page.locator("button:has-text('Direct Purchase')").first();
  if (await buyBtn.isVisible()) {
    await buyBtn.click();
    await page.waitForTimeout(1000);
  }

  const saveBtns = page.locator("button:has-text('Save to Project BOQ')");
  console.log('Save to Project BOQ buttons count:', await saveBtns.count());
  if (await saveBtns.count() > 0) {
    await saveBtns.first().click({ force: true });
    console.log('Successfully clicked Save to Project BOQ!');
    await page.waitForTimeout(1000);
  }

  // Click RENT method
  const rentBtn = page.locator("button:has-text('Equipment Rental')").first();
  if (await rentBtn.isVisible()) {
    await rentBtn.click();
    await page.waitForTimeout(1000);
  }

  // Select another assembly in the assembly list
  const assemblyCards = page.locator('.assembly-pill, button:has-text(\"Curved\"), button:has-text(\"Velvet\"), button:has-text(\"Table\")');
  console.log('Assembly cards count:', await assemblyCards.count());
  if (await assemblyCards.count() > 1) {
    await assemblyCards.nth(1).click({ force: true });
    await page.waitForTimeout(1000);
    const saveBtnsRent = page.locator("button:has-text('Save to Project BOQ')");
    if (await saveBtnsRent.count() > 0) {
      await saveBtnsRent.first().click({ force: true });
      console.log('Successfully saved second assembly in RENT mode!');
      await page.waitForTimeout(1000);
    }
  }

  // Scroll to BOQ
  const boqLocator = page.locator('text=PROJECT BILL OF QUANTITIES').first();
  await boqLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  const committedText = await page.locator("span:has-text('Committed Assemblies')").allInnerTexts();
  console.log('Committed text in BOQ:', committedText);

  const boqRows = await page.locator('table tr').allInnerTexts();
  console.log('BOQ table rows count:', boqRows.length);
  console.log('Sample rows:', boqRows);

  await browser.close();
}

testCommitWithPrompt().catch(console.error);
