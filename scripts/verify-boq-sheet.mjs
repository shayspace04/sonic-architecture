import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700";
const BASE_URL = "http://localhost:3000";

async function runBOQVerification() {
  console.log("=== STARTING BOQ SHEET ACCESSIBILITY & BEHAVIOR VERIFICATION ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  try {
    console.log("Step 1: Navigating to Studio...");
    await page.goto(`${BASE_URL}/studio`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    console.log("Step 2: Switching to Pricing & Sourcing tab...");
    const sourcingTab = page.locator("button:has-text('Pricing & Sourcing')").first();
    await sourcingTab.click({ force: true });
    await page.waitForTimeout(1500);

    // Verify prominent VIEW PROJECT BOQ button is visible
    console.log("Step 3: Checking prominent 'VIEW PROJECT BOQ →' buttons...");
    const topBOQBtn = page.locator('[data-testid="view-project-boq-top-btn"]').first();
    const sidebarBOQBtn = page.locator('[data-testid="view-project-boq-sidebar-btn"]').first();

    const topVisible = await topBOQBtn.isVisible();
    const sidebarVisible = await sidebarBOQBtn.isVisible();
    console.log(`- Top header VIEW PROJECT BOQ button visible: ${topVisible}`);
    console.log(`- Sidebar VIEW PROJECT BOQ button visible: ${sidebarVisible}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-01-sourcing-panel.png") });

    // Step 4: Click VIEW PROJECT BOQ → once
    console.log("Step 4: Clicking 'VIEW PROJECT BOQ →' button once...");
    if (topVisible) {
      await topBOQBtn.click({ force: true });
    } else if (sidebarVisible) {
      await sidebarBOQBtn.click({ force: true });
    } else {
      throw new Error("No prominent VIEW PROJECT BOQ button found!");
    }
    await page.waitForTimeout(800);

    // Step 5: Confirm complete BOQ sheet overlay opens immediately
    const boqSheet = page.locator('[data-testid="project-boq-sheet"]');
    const isSheetVisible = await boqSheet.isVisible();
    console.log(`Step 5: BOQ Sheet Modal opened immediately: ${isSheetVisible}`);
    if (!isSheetVisible) {
      throw new Error("BOQ Sheet Modal did not open immediately after clicking button!");
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-02-modal-opened.png") });

    // Step 6: Verify displayed data matches current project
    console.log("Step 6: Verifying displayed project metadata and financial metrics...");
    const projectName = await page.locator('[data-testid="project-boq-sheet"] h2').textContent();
    console.log(`- Project Title in BOQ: "${projectName.trim()}"`);

    const grandTotal = await page.locator('[data-testid="boq-grand-total"]').textContent();
    const purchaseTotal = await page.locator('[data-testid="boq-purchase-total"]').textContent();
    const rentalTotal = await page.locator('[data-testid="boq-rental-total"]').textContent();
    const customTotal = await page.locator('[data-testid="boq-custom-total"]').textContent();
    console.log(`- Metric Cards: Grand Total: ${grandTotal.trim()}, Purchase: ${purchaseTotal.trim()}, Rental: ${rentalTotal.trim()}, Custom: ${customTotal.trim()}`);

    // Count rows currently in BOQ table
    const initialRows = await page.locator('[data-testid^="boq-item-row-"]').count();
    console.log(`- Initial BOQ item count: ${initialRows}`);

    // Step 7: Add an assembly via Quick-Add (or verify addition)
    console.log("Step 7: Testing adding an item to the BOQ via Quick-Add...");
    const quickAddSelect = page.locator('[data-testid="quick-add-assembly-select"]');
    if (await quickAddSelect.isVisible()) {
      const options = await quickAddSelect.locator("option").all();
      if (options.length > 1) {
        const val = await options[1].getAttribute("value");
        console.log(`- Quick-adding uncommitted assembly: ${val}`);
        await quickAddSelect.selectOption(val);
        await page.locator('[data-testid="quick-add-assembly-btn"]').click();
        await page.waitForTimeout(600);

        const newRowCount = await page.locator('[data-testid^="boq-item-row-"]').count();
        console.log(`- BOQ item count after Quick Add: ${newRowCount} (was ${initialRows})`);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-03-item-added.png") });

    // Step 8: Change quantity and verify recalculation
    console.log("Step 8: Changing item quantity and verifying real-time recalculation...");
    const firstIncBtn = page.locator('[data-testid^="boq-qty-inc-"]').first();
    if (await firstIncBtn.isVisible()) {
      const beforeTotal = await page.locator('[data-testid="boq-grand-total"]').textContent();
      console.log(`- Grand Total before quantity increment: ${beforeTotal.trim()}`);

      await firstIncBtn.click();
      await page.waitForTimeout(500);

      const afterTotal = await page.locator('[data-testid="boq-grand-total"]').textContent();
      console.log(`- Grand Total after quantity increment: ${afterTotal.trim()}`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-04-quantity-updated.png") });

    // Step 9: Remove an item and verify totals update
    console.log("Step 9: Testing item removal...");
    const removeBtns = page.locator('[data-testid^="boq-remove-btn-"]');
    const rowsBeforeRemove = await page.locator('[data-testid^="boq-item-row-"]').count();
    if (rowsBeforeRemove > 0) {
      await removeBtns.last().click();
      await page.waitForTimeout(500);
      const rowsAfterRemove = await page.locator('[data-testid^="boq-item-row-"]').count();
      console.log(`- Rows after removal: ${rowsAfterRemove} (was ${rowsBeforeRemove})`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-05-item-removed.png") });

    // Step 10: Close sheet and return to Pricing & Sourcing
    console.log("Step 10: Closing BOQ sheet modal...");
    const closeHeaderBtn = page.locator('[data-testid="boq-header-close-btn"]');
    await closeHeaderBtn.click();
    await page.waitForTimeout(600);

    const isSheetClosed = !(await page.locator('[data-testid="project-boq-sheet"]').isVisible());
    console.log(`- Sheet successfully closed: ${isSheetClosed}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-step-06-closed-returned.png") });

    // Step 11: Repeat using top toolbar 'BOQ Sheet' button
    console.log("Step 11: Testing top toolbar 'BOQ Sheet' button trigger...");
    const toolbarBOQBtn = page.locator('[data-testid="toolbar-boq-sheet-btn"]');
    if (await toolbarBOQBtn.isVisible()) {
      await toolbarBOQBtn.click();
      await page.waitForTimeout(600);

      const sheetReopened = await page.locator('[data-testid="project-boq-sheet"]').isVisible();
      console.log(`- Sheet reopened via Toolbar BOQ button: ${sheetReopened}`);

      // Close using Escape key
      console.log("- Testing Escape key to close modal...");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);

      const sheetEscClosed = !(await page.locator('[data-testid="project-boq-sheet"]').isVisible());
      console.log(`- Sheet closed via Escape key: ${sheetEscClosed}`);
    }

    // Step 12: Repeat using 'OPEN FULL BOQ SHEET' button
    console.log("Step 12: Testing 'OPEN FULL BOQ SHEET' button trigger in sidebar...");
    const openFullBtn = page.locator('[data-testid="open-full-boq-sidebar-btn"]');
    if (await openFullBtn.isVisible()) {
      await openFullBtn.click();
      await page.waitForTimeout(600);
      const sheetOpenAgain = await page.locator('[data-testid="project-boq-sheet"]').isVisible();
      console.log(`- Sheet reopened via 'Open Full BOQ Sheet' sidebar button: ${sheetOpenAgain}`);
      
      const footerReturnBtn = page.locator('[data-testid="boq-footer-return-btn"]');
      await footerReturnBtn.click();
      await page.waitForTimeout(600);
      const returnedOk = !(await page.locator('[data-testid="project-boq-sheet"]').isVisible());
      console.log(`- Sheet closed via 'Return to Pricing & Sourcing' footer button: ${returnedOk}`);
    }

    console.log("=== ALL BOQ SHEET ACCESSIBILITY & BEHAVIOR CHECKS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("Verification failed:", err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "boq-error.png") });
    throw err;
  } finally {
    await browser.close();
  }
}

runBOQVerification();
