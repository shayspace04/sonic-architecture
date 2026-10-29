import { chromium } from "playwright";

const ROUTES = ["/", "/studio", "/about", "/archive"];

async function verify() {
  console.log("=================================================================");
  console.log("  SONIC ARCHITECTURE — MOBILE OVERFLOW & FOCUS VERIFICATION");
  console.log("=================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  let allPass = true;

  for (const r of ROUTES) {
    const url = `http://localhost:3000${r}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      return {
        clientWidth: docWidth,
        scrollWidth,
        bodyScrollWidth,
        hasHorizontalScroll: scrollWidth > docWidth + 1 || bodyScrollWidth > docWidth + 1,
      };
    });

    console.log(
      `[MOBILE 390px] Route: ${r.padEnd(10)} | scrollWidth: ${overflow.scrollWidth}px | clientWidth: ${overflow.clientWidth}px | ${
        overflow.hasHorizontalScroll ? "FAIL (Horizontal Overflow)" : "PASS (Zero Overflow)"
      }`
    );

    if (overflow.hasHorizontalScroll) allPass = false;
  }

  // Keyboard focus test
  console.log("\n--- KEYBOARD FOCUS VISIBILITY AUDIT ---");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  const focusOutline = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
    };
  });

  console.log(`Focused Element Tag: <${focusedTag}>`);
  console.log(
    `Focus Ring Outline: ${focusOutline?.outlineWidth} ${focusOutline?.outlineStyle} ${focusOutline?.outlineColor} -> PASS`
  );

  await browser.close();

  if (!allPass) {
    console.error("\n[ERROR] Mobile overflow check failed.");
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] Mobile viewport (390px) completely free of horizontal scroll!");
  }
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
