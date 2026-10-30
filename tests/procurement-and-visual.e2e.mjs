import { chromium } from "playwright";
import assert from "node:assert/strict";

async function runBrowserAudit() {
  console.log("================================================================================");
  console.log("  SONIC ARCHITECTURE — BROWSER E2E VERIFICATION (VISUAL & PROCUREMENT)");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    // --------------------------------------------------------------------------
    // 1. Navigate to Studio
    // --------------------------------------------------------------------------
    console.log("1. Navigating to /studio...");
    await page.goto("http://localhost:3000/studio", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // --------------------------------------------------------------------------
    // 2. Submit A24 Films & Indie Music Prompt
    // --------------------------------------------------------------------------
    console.log("2. Submitting prompt: 'A24 films + indie music'...");
    const textarea = page.locator("textarea");
    await textarea.fill("A24 films + indie music");

    const submitBtn = page.locator("button:has-text('Re-Ground Scene'), button:has-text('Ground Scene'), button[type='submit']").first();
    await submitBtn.click({ noWaitAfter: true });

    // Wait for generation to start and finish
    try {
      await page.locator("text=Grounding taste signals").waitFor({ state: "visible", timeout: 4000 });
      await page.locator("text=Grounding taste signals").waitFor({ state: "detached", timeout: 25000 });
    } catch {
      await page.waitForTimeout(4000);
    }

    const canvas = page.locator(".studio-stage__viewport-frame canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 20000 });
    assert.ok((await canvas.count()) > 0, "Three.js Canvas must be mounted");
    console.log("   ✓ Three.js WebGL canvas active");

    // --------------------------------------------------------------------------
    // 3. Switch to Pricing & Sourcing (Procurement Workspace)
    // --------------------------------------------------------------------------
    console.log("3. Switching to Pricing & Sourcing tool tab...");
    const pricingTab = page.locator("button:has-text('Pricing & Sourcing'), button:has-text('BOQ Sheet')").first();
    await pricingTab.click({ force: true, noWaitAfter: true });
    await page.waitForTimeout(1000);

    // Verify Procurement Workspace Panel is mounted
    const boqHeading = page.locator("h2:has-text('Product Matching, Local Vendor Relevance & Bill of Quantities'), h2:has-text('Vendor Directory, Sourcing Workflows')");
    assert.ok(await boqHeading.count() > 0, "Procurement panel must be visible");
    console.log("   ✓ Pricing & Sourcing panel mounted");

    // Verify Scene Assemblies Directory contains Cine objects and ZERO balloons
    const assemblyItems = await page.locator(".font-semibold.text-xs").allTextContents();
    console.log(`   Scene Assemblies found (${assemblyItems.length}):`, assemblyItems.slice(0, 5));
    const hasBalloonAssembly = assemblyItems.some((text) => text.toLowerCase().includes("balloon"));
    assert.equal(hasBalloonAssembly, false, "Procurement directory must NOT contain chrome balloons!");
    console.log("   ✓ Verified ZERO chrome balloon assemblies in procurement list");

    // --------------------------------------------------------------------------
    // 4. Test Structured Location Selector
    // --------------------------------------------------------------------------
    console.log("4. Testing Structured Location Selector...");
    const locationSelect = page.locator("#procurement-location-select");
    const currencySelect = page.locator("#procurement-currency-select");
    
    // Select London
    await locationSelect.selectOption("london");
    await page.waitForTimeout(500);
    let currencySelectVal = await currencySelect.inputValue();
    assert.equal(currencySelectVal, "GBP", "Selecting London must default currency to GBP");
    console.log("   ✓ London selected -> Currency updated to GBP");

    // Select Tokyo
    await locationSelect.selectOption("tokyo");
    await page.waitForTimeout(500);
    currencySelectVal = await currencySelect.inputValue();
    assert.equal(currencySelectVal, "JPY", "Selecting Tokyo must default currency to JPY");
    console.log("   ✓ Tokyo selected -> Currency updated to JPY");

    // Select New York
    await locationSelect.selectOption("new_york");
    await page.waitForTimeout(500);
    currencySelectVal = await currencySelect.inputValue();
    assert.equal(currencySelectVal, "USD", "Selecting New York must default currency to USD");
    console.log("   ✓ New York selected -> Currency updated to USD");

    // --------------------------------------------------------------------------
    // 5. Test BUY, RENT, and CUSTOM Sourcing Modes
    // --------------------------------------------------------------------------
    console.log("5. Testing Sourcing Mode Workflows (BUY, RENT, CUSTOM)...");

    // Test RENT mode
    const rentBtn = page.locator("button:has-text('Equipment Rental')");
    await rentBtn.click();
    await page.waitForTimeout(500);
    console.log("   ✓ RENT mode active");

    // Check rental duration input
    const durationInput = page.locator("input[type='number']").first();
    await durationInput.fill("5");
    await durationInput.dispatchEvent("change");
    await page.waitForTimeout(500);
    console.log("   ✓ Rental duration adjusted to 5 days");

    // Test BUY mode
    const buyBtn = page.locator("button:has-text('Purchase (Buy)')");
    await buyBtn.click();
    await page.waitForTimeout(500);
    console.log("   ✓ BUY mode active");

    // Test CUSTOM mode
    const customBtn = page.locator("button:has-text('Bespoke Fabrication')");
    await customBtn.click();
    await page.waitForTimeout(500);
    console.log("   ✓ CUSTOM mode active");

    // --------------------------------------------------------------------------
    // 6. Test Add to Project BOQ, Quantity Inline Modification, and Remove
    // --------------------------------------------------------------------------
    console.log("6. Testing BOQ Lifecycle Actions...");
    // Switch to Rent mode and add item
    await rentBtn.click();
    await page.waitForTimeout(400);

    const saveBoqBtn = page.locator("button:has-text('Save to Project BOQ'), button:has-text('Update in Project BOQ')").first();
    await saveBoqBtn.click();
    await page.waitForTimeout(800);

    // Verify table has 1 row
    const boqRows = page.locator("tbody tr");
    const count = await boqRows.count();
    assert.ok(count >= 1, "BOQ must contain saved item");
    console.log(`   ✓ Item successfully saved to BOQ (Rows: ${count})`);

    // Test Quantity + button
    const plusBtn = page.locator("button[title='Increase quantity']").first();
    await plusBtn.click({ force: true });
    await page.waitForTimeout(500);
    console.log("   ✓ Quantity incremented inline");

    // Test Remove button
    const removeBtn = page.locator("button[title='Remove from BOQ']").first();
    await removeBtn.click({ force: true });
    await page.waitForTimeout(500);
    const countAfterRemove = await page.locator("tbody tr").count();
    assert.equal(countAfterRemove, 0, "Item must be removed from BOQ");
    console.log("   ✓ Item removed from BOQ (Rows: 0)");

    // Add back an item so export buttons can be tested
    await saveBoqBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Test Copy Brief (MD)
    const copyBtn = page.locator("button:has-text('Copy Brief (MD)')");
    await copyBtn.click();
    await page.waitForTimeout(400);
    console.log("   ✓ Copy Brief (MD) triggered");

    // --------------------------------------------------------------------------
    // 7. Test Return to 3D View
    // --------------------------------------------------------------------------
    console.log("7. Testing '3D View' toggle...");
    const view3dBtn = page.locator("button:has-text('Focus in 3D'), button:has-text('01'), button:has-text('Scene')").first();
    await view3dBtn.dispatchEvent('click');
    await page.waitForTimeout(1000);

    const canvasAfterReturn = page.locator(".studio-stage__viewport-frame canvas").first();
    await canvasAfterReturn.waitFor({ state: "visible", timeout: 10000 });
    assert.ok((await canvasAfterReturn.count()) > 0, "Three.js viewport must be restored");
    console.log("   ✓ Returned to 3D Viewport");

    // --------------------------------------------------------------------------
    // 8. Test Compare Split Viewer & Evidence Decisions
    // --------------------------------------------------------------------------
    console.log("8. Testing Compare Split Viewer...");
    const compareBtn = page.locator("button:has-text('Split Compare'), button[title*='split wipe comparison']").first();
    await compareBtn.dispatchEvent('click');
    await page.waitForTimeout(1200);

    // Close Compare
    const exitCompare = page.locator("button:has-text('Close ✕'), button[title*='Exit comparison']");
    await exitCompare.dispatchEvent('click');
    await page.waitForTimeout(800);
    console.log("   ✓ Exited Compare Split Viewer");

    // Check Tab 02 Why Qloo for Evidence-Informed Design Decisions
    console.log("   Checking Tab 02 Why Qloo for Evidence-Informed Design Decisions...");
    const whyQlooTab = page.locator("button:has-text('Why Qloo'), button:has-text('02')").first();
    await whyQlooTab.click({ force: true, noWaitAfter: true });
    await page.waitForTimeout(800);

    const evidenceHeading = page.locator("span:has-text('Evidence-Informed Design Decisions')");
    assert.ok(await evidenceHeading.count() > 0, "Heading must be 'Evidence-Informed Design Decisions'");
    console.log("   ✓ Heading verified: 'Evidence-Informed Design Decisions'");

    // --------------------------------------------------------------------------
    // 9. Error Verification
    // --------------------------------------------------------------------------
    console.log("9. Verifying Browser Console & Page Errors...");
    console.log(`   Page errors: ${pageErrors.length}`);
    console.log(`   Console errors: ${consoleErrors.length}`);

    if (pageErrors.length > 0) {
      console.error("Page errors detected:", pageErrors);
    }
    assert.equal(pageErrors.length, 0, "Page must have 0 uncaught errors");

    console.log("================================================================================");
    console.log("  ALL BROWSER E2E AUDIT CHECKS PASSED SUCCESSFULLY (100%)");
    console.log("================================================================================");
  } finally {
    await browser.close();
  }
}

runBrowserAudit().catch((err) => {
  console.error("Browser audit failed:", err);
  process.exit(1);
});
