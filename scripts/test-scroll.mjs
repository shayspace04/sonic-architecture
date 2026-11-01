import { chromium } from 'playwright';

async function testScroll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto('http://localhost:3000/studio', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const sourcingTab = page.locator("button:has-text('Pricing & Sourcing')").first();
  await sourcingTab.click();
  await page.waitForTimeout(2000);

  const scrollInfo = await page.evaluate(() => {
    const scrollables = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });
    return scrollables.map((el) => ({
      tagName: el.tagName,
      className: el.className,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
    }));
  });
  console.log('Scrollable elements:', scrollInfo);

  const boqLocator = page.locator('text=PROJECT BILL OF QUANTITIES').first();
  console.log('BOQ text visible before scroll:', await boqLocator.isVisible());
  await boqLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  console.log('BOQ text visible after scrollIntoViewIfNeeded:', await boqLocator.isVisible());

  await browser.close();
}

testScroll().catch(console.error);
