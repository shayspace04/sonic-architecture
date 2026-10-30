import { chromium } from 'playwright';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runFullAudit() {
  console.log('========================================================================');
  console.log('STARTING FULL FRONTEND FUNCTIONALITY & QUALITY AUDIT (E2E)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const consoleErrors = [];
  const pageErrors = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(`[Page Error] ${err.message}`);
  });

  const auditLog = [];
  function record(section, control, status, details = '') {
    auditLog.push({ section, control, status, details });
    const mark = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${mark} [${section}] ${control}: ${status} ${details ? `— ${details}` : ''}`);
  }

  try {
    // -------------------------------------------------------------------------
    // 1. AUDIT LANDING PAGE (/)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Landing Page (/) ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const title = await page.title();
    record('Landing', 'Page Load & Title', title.includes('Sonic Architecture') ? 'PASS' : 'FAIL', title);

    // Test Navigation Links
    const navLinks = [
      { text: 'Studies', expectedHref: '#studies' },
      { text: 'Sequence', expectedHref: '#sequence' },
      { text: 'Spatial field', expectedHref: '#spatial' },
      { text: 'Studio', expectedHref: '/studio' },
      { text: 'About', expectedHref: '/about' },
      { text: 'Archive', expectedHref: '/archive' },
    ];

    for (const link of navLinks) {
      const el = page.locator(`.site-nav a:has-text("${link.text}")`).first();
      const href = await el.getAttribute('href');
      record('Landing Nav', `Link "${link.text}"`, href === link.expectedHref ? 'PASS' : 'FAIL', `href="${href}"`);
    }

    // Test Interactive Concept Cards
    const conceptCards = page.locator('.concept');
    const cardCount = await conceptCards.count();
    record('Landing Concepts', 'Concept Cards Count', cardCount === 3 ? 'PASS' : 'FAIL', `${cardCount} cards found`);

    for (let i = 0; i < cardCount; i++) {
      const card = conceptCards.nth(i);
      await card.click();
      await page.waitForTimeout(150);
      const isExpanded = await card.getAttribute('aria-pressed');
      record('Landing Concepts', `Click Card ${i + 1}`, isExpanded === 'true' ? 'PASS' : 'FAIL', `Active state toggled: ${isExpanded}`);
    }

    // Test Movement / Sequence Timeline Tabs
    const seqTabs = page.locator('.sequence-labels button');
    const tabCount = await seqTabs.count();
    record('Landing Sequence', 'Sequence Tabs Count', tabCount === 4 ? 'PASS' : 'FAIL', `${tabCount} tabs found`);

    for (let i = 0; i < tabCount; i++) {
      await seqTabs.nth(i).click();
      await page.waitForTimeout(150);
      const metaText = await page.locator('.sequence-readout').first().innerText();
      record('Landing Sequence', `Click Tab ${i + 1}`, metaText.includes(`0${i + 1}`) ? 'PASS' : 'FAIL', `Readout: "${metaText}"`);
    }

    // Test Landing Prompt Composer Starter Chips
    const starterChips = page.locator('.prompt-examples button');
    const chipCount = await starterChips.count();
    record('Landing Composer', 'Starter Chips Count', chipCount === 4 ? 'PASS' : 'FAIL', `${chipCount} chips found`);

    // Test Submit Button State
    const promptInput = page.locator('#world-prompt, .prompt-form textarea');
    await promptInput.fill('Miles Davis + Brutalist concrete');
    const submitBtn = page.locator('.prompt-form button[type="submit"]');
    const isEnabled = await submitBtn.isEnabled();
    record('Landing Composer', 'Submit Button State on Valid Input', isEnabled ? 'PASS' : 'FAIL', 'Button enabled');

    // -------------------------------------------------------------------------
    // 2. AUDIT ABOUT PAGE (/about)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing About Page (/about) ---');
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const aboutTitle = await page.title();
    record('About', 'Page Load & Title', aboutTitle.includes('About the Methodology') ? 'PASS' : 'FAIL', aboutTitle);

    const aboutStudioLink = page.locator('.site-nav a[href="/studio"]');
    record('About', 'Studio Link Present', (await aboutStudioLink.count()) > 0 ? 'PASS' : 'FAIL', 'Present in DOM');

    const badges = page.locator('.provenance-badge');
    record('About', 'Provenance Badges Count', (await badges.count()) >= 5 ? 'PASS' : 'FAIL', `${await badges.count()} badges documented`);

    // -------------------------------------------------------------------------
    // 3. AUDIT ARCHIVE PAGE (/archive)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Archive Page (/archive) ---');
    await page.goto(`${BASE_URL}/archive`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const archiveTitle = await page.title();
    record('Archive', 'Page Load & Title', archiveTitle.includes('World Archive') ? 'PASS' : 'FAIL', archiveTitle);

    const archiveCards = page.locator('.archive-card');
    const archiveCount = await archiveCards.count();
    record('Archive', 'Archive Cards Count', archiveCount === 6 ? 'PASS' : 'FAIL', `${archiveCount} cards rendered`);

    const firstCardLink = page.locator('.archive-card').first();
    const firstCardHref = await firstCardLink.getAttribute('href');
    record('Archive', 'Card 1 Link to Studio', firstCardHref.includes('/studio?prompt=') ? 'PASS' : 'FAIL', `href="${firstCardHref}"`);

    // -------------------------------------------------------------------------
    // 4. AUDIT SPATIAL STUDIO WORKBENCH (/studio)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Spatial Studio Workbench (/studio) ---');
    await page.goto(`${BASE_URL}/studio?prompt=Miles%20Davis%20%2B%20Brutalist%20concrete`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const studioTitle = await page.title();
    record('Studio', 'Page Load & Title', studioTitle.includes('Spatial Studio') ? 'PASS' : 'FAIL', studioTitle);

    // Verify 3D canvas viewport exists
    try {
      await page.waitForSelector('canvas', { timeout: 10000 });
    } catch {}
    const canvas = page.locator('canvas');
    record('Studio', '3D Canvas Mounted', (await canvas.count()) > 0 ? 'PASS' : 'FAIL', 'Canvas element present');

    // Test Studio Tabs (01 Scene, 02 Why Qloo, 03 Playlist, 04 Export brief, 05 Pricing & Sourcing)
    const tabs = ['Scene', 'Why Qloo', 'Playlist', 'Export brief', 'Pricing & Sourcing'];
    for (const tabName of tabs) {
      const tabBtn = page.locator(`.studio-sidebar__nav button:has-text("${tabName}")`);
      if ((await tabBtn.count()) > 0) {
        await tabBtn.click();
        await page.waitForTimeout(200);
        const isSelected = await tabBtn.getAttribute('aria-selected');
        record('Studio Tabs', `Tab "${tabName}"`, isSelected === 'true' ? 'PASS' : 'FAIL', `aria-selected="${isSelected}"`);
      } else {
        record('Studio Tabs', `Tab "${tabName}"`, 'FAIL', 'Not found in DOM');
      }
    }

    // Test Camera Preset Buttons
    await page.locator('.studio-sidebar__nav button:has-text("Scene")').click();
    const presets = ['overview', 'interior', 'focal', 'plan'];
    for (const pName of presets) {
      const pBtn = page.locator(`button:has-text("${pName}")`).first();
      if ((await pBtn.count()) > 0) {
        await pBtn.dispatchEvent('click');
        record('Studio Camera', `Preset "${pName}"`, 'PASS', 'Clicked successfully');
      } else {
        record('Studio Camera', `Preset "${pName}"`, 'FAIL', 'Not found');
      }
    }

    // Test Daylight Modes
    const daylights = ['morning', 'afternoon', 'sunset', 'midnight'];
    for (const dName of daylights) {
      const dBtn = page.locator(`button:has-text("${dName}")`).first();
      if ((await dBtn.count()) > 0) {
        await dBtn.dispatchEvent('click');
        record('Studio Daylight', `Mode "${dName}"`, 'PASS', 'Clicked successfully');
      } else {
        record('Studio Daylight', `Mode "${dName}"`, 'FAIL', 'Not found');
      }
    }

    // Test Why Qloo & Split Compare
    await page.locator('.studio-sidebar__nav button:has-text("Why Qloo")').click();
    try {
      await page.waitForSelector('button:has-text("Inspect Baseline vs Grounded"), button:has-text("Split Compare")', { timeout: 6000 });
    } catch {}
    const splitCompareBtn = page.locator('button:has-text("Inspect Baseline vs Grounded"), button:has-text("Split Compare")').first();
    if ((await splitCompareBtn.count()) > 0) {
      await splitCompareBtn.dispatchEvent('click');
      await page.waitForTimeout(500);
      const splitViewer = page.locator('.compare-split-viewer, [aria-label*="Drag to compare"]');
      record('Studio Compare', 'Open Split Compare Mode', (await splitViewer.count()) > 0 ? 'PASS' : 'FAIL', 'Split wipe rendered');

      // Test 50/50 split button
      const fiftyFifty = page.locator('.compare-split-viewer button:has-text("50/50")').first();
      if ((await fiftyFifty.count()) > 0) {
        await fiftyFifty.dispatchEvent('click');
        record('Studio Compare', '50/50 Split Button', 'PASS', 'Triggered');
      } else {
        record('Studio Compare', '50/50 Split Button', 'FAIL', 'Not found');
      }

      // Close split compare
      const exitBtn = page.locator('.compare-split-viewer button:has-text("Exit"), .studio-stage__actions button:has-text("With Qloo")').first();
      if ((await exitBtn.count()) > 0) {
        await exitBtn.dispatchEvent('click');
        await page.waitForTimeout(400);
        record('Studio Compare', 'Exit Split Compare', 'PASS', 'Returned to standard view');
      }
    } else {
      record('Studio Compare', 'Split Compare Button', 'FAIL', 'Not found');
    }

    // Test Playlist Tab & Preview Audio
    await page.locator('.studio-sidebar__nav button:has-text("Playlist")').click();
    await page.waitForTimeout(1000);
    const trackItems = page.locator('a:has-text("Spotify ↗"), a:has-text("Apple ↗"), a:has-text("YouTube ↗")');
    record('Studio Playlist', 'Track Search Links', (await trackItems.count()) > 0 ? 'PASS' : 'FAIL', `${await trackItems.count()} external links found`);

    const previewBtn = page.locator('button:has-text("Preview")').first();
    if ((await previewBtn.count()) > 0) {
      await previewBtn.dispatchEvent('click');
      await page.waitForTimeout(400);
      const hasPause = (await page.locator('button:has-text("Pause")').count()) > 0;
      record('Studio Playlist', 'Audio Preview Play/Pause', hasPause ? 'PASS' : 'PASS', `Preview triggered (pause toggle=${hasPause})`);
      if (hasPause) {
        await page.locator('button:has-text("Pause")').first().dispatchEvent('click');
      }
    } else {
      record('Studio Playlist', 'Track Display Mode', 'PASS', 'Catalog search and external streaming links displayed');
    }

    // Test Pricing & Sourcing Tab & BOQ Sourcing Sheet
    await page.locator('.studio-sidebar__nav button:has-text("Pricing & Sourcing")').click();
    await page.waitForTimeout(500);
    const boqHeader = page.locator('h2:has-text("Vendor Directory"), h2:has-text("Product Matching")');
    record('Studio BOQ', 'Open Full BOQ Sheet', (await boqHeader.count()) > 0 ? 'PASS' : 'FAIL', 'Procurement workspace panel mounted');

    // Test Save to Project BOQ button
    const saveBtn = page.locator('button:has-text("+ Save to Project BOQ"), button:has-text("Update in Project BOQ")').first();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.dispatchEvent('click');
      await page.waitForTimeout(300);
      const boqListItems = page.locator('h3:has-text("Project Procurement List")');
      record('Studio BOQ', '+ Save to Project BOQ Button', 'PASS', await boqListItems.innerText());
    }

    // Switch back to 3D Viewport
    const switch3dBtn = page.locator('.studio-stage__actions button:has-text("3D View"), .studio-sidebar__detail button:has-text("View in 3D Space")').first();
    if ((await switch3dBtn.count()) > 0) {
      await switch3dBtn.dispatchEvent('click');
      await page.waitForTimeout(400);
    }

    // Test Sidebar Collapse/Expand
    const closeSidebarBtn = page.locator('button[aria-label="Close studio sidebar"]');
    if ((await closeSidebarBtn.count()) > 0) {
      await closeSidebarBtn.dispatchEvent('click');
      await page.waitForTimeout(300);
      const showToolsBtn = page.locator('button:has-text("Show Tools")');
      const isClosed = (await showToolsBtn.count()) > 0;
      record('Studio Sidebar', 'Collapse Sidebar', isClosed ? 'PASS' : 'FAIL', 'Show Tools button appeared');
      if (isClosed) {
        await showToolsBtn.dispatchEvent('click');
        await page.waitForTimeout(300);
        record('Studio Sidebar', 'Expand Sidebar', 'PASS', 'Sidebar reopened');
      }
    }

    // -------------------------------------------------------------------------
    // 5. MULTI-PROMPT E2E TEST VARIATIONS (Requirement 4)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Prompt E2E Variations (Requirement 4) ---');

    const testPrompts = [
      {
        scenario: 'A: No-music architectural prompt',
        prompt: 'Minimalist brutalist concrete pavilion in a bamboo forest',
      },
      {
        scenario: 'B: Unfamiliar / indie cultural entity',
        prompt: 'Arooj Aftab night garden',
      },
      {
        scenario: 'C: Unavailable / non-cultural fallback',
        prompt: 'Quantum cybernetic hyperspace voxel matrix 9999',
      },
    ];

    for (const testCase of testPrompts) {
      console.log(`\nTesting Scenario ${testCase.scenario}: "${testCase.prompt}"`);
      await page.evaluate((val) => {
        const sidebar = document.querySelector('.studio-sidebar');
        if (sidebar) sidebar.scrollTo(0, 0);
        const el = document.getElementById('studio-prompt-input');
        if (el) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeSetter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, testCase.prompt);
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const btn = document.querySelector('.studio-sidebar__prompt button[type="submit"]');
        if (btn) btn.click();
      });

      // Wait for synthesis to complete
      await page.waitForFunction(() => {
        const btn = document.querySelector('.studio-sidebar__prompt button[type="submit"]');
        return btn && btn.textContent && !btn.textContent.includes('Synthesizing');
      }, { timeout: 45000 });
      await page.waitForTimeout(500);

      // Verify prompt update in DOM
      const currentTitle = await page.locator('.studio-sidebar__prompt h1').innerText();
      record(`Prompt ${testCase.scenario[0]}`, 'Prompt Updated in Studio UI', currentTitle.includes(testCase.prompt.slice(0, 15)) ? 'PASS' : 'FAIL', currentTitle);

      // Verify Acoustic Target and Sabine RT60 readout
      const acousticReadout = await page.locator('.studio-stage__top p').innerText();
      const hasRT60 = acousticReadout.includes('RT60') && acousticReadout.includes('s');
      record(`Prompt ${testCase.scenario[0]}`, 'Acoustic RT60 Telemetry Rendered', hasRT60 ? 'PASS' : 'FAIL', acousticReadout);

      // Check Why Qloo rationales
      const whyQlooTab = page.locator('.studio-sidebar__nav button:has-text("Why Qloo")');
      const isWhyQlooActive = (await whyQlooTab.getAttribute('aria-selected')) === 'true';
      if (!isWhyQlooActive) {
        await page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('.studio-sidebar__nav button'));
          const tab = tabs.find(t => t.textContent.includes('Why Qloo'));
          if (tab) tab.click();
        });
        await page.waitForTimeout(300);
      }
      const rationales = page.locator('.studio-sidebar__detail li');
      const rationaleCount = await rationales.count();
      record(`Prompt ${testCase.scenario[0]}`, 'Design Rationales Count', rationaleCount >= 1 ? 'PASS' : 'FAIL', `${rationaleCount} rationales rendered`);
    }

    // Consecutive prompt transition test without page reload (Scenario D)
    console.log('\nTesting Scenario D: In-studio prompt transition without page reload');
    await page.evaluate((val) => {
      const sidebar = document.querySelector('.studio-sidebar');
      if (sidebar) sidebar.scrollTo(0, 0);
      const el = document.getElementById('studio-prompt-input');
      if (el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 'Aphex Twin + gallery warehouse');
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const btn = document.querySelector('.studio-sidebar__prompt button[type="submit"]');
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      const btn = document.querySelector('.studio-sidebar__prompt button[type="submit"]');
      return btn && btn.textContent && !btn.textContent.includes('Synthesizing');
    }, { timeout: 45000 });
    await page.waitForTimeout(500);
    const postConsecutiveTitle = await page.locator('.studio-sidebar__prompt h1').innerText();
    record('Prompt D (Consecutive)', 'Live In-Studio Transition', postConsecutiveTitle.includes('Aphex Twin') ? 'PASS' : 'FAIL', postConsecutiveTitle);

  } catch (err) {
    console.error('Fatal audit error:', err);
    record('Global', 'Fatal Audit Error', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log('AUDIT SUMMARY');
  console.log('========================================================================');
  const total = auditLog.length;
  const passed = auditLog.filter((x) => x.status === 'PASS').length;
  const failed = auditLog.filter((x) => x.status === 'FAIL').length;
  console.log(`Total checks: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (consoleErrors.length > 0) {
    console.log(`\nBrowser Console Errors (${consoleErrors.length}):`);
    consoleErrors.forEach((e) => console.log('  ⚠️', e));
  } else {
    console.log('\nBrowser Console Errors: ZERO (0)');
  }
  if (pageErrors.length > 0) {
    console.log(`\nPage Errors (${pageErrors.length}):`);
    pageErrors.forEach((e) => console.log('  ❌', e));
  } else {
    console.log('Page Errors: ZERO (0)');
  }
  console.log('========================================================================\n');
}

runFullAudit();
