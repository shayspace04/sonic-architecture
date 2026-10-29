import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700";
const BASE_URL = "http://localhost:3000";

async function verifyFeatures() {
  console.log("Launching browser to verify all 4 studio features...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to Studio...");
  await page.goto(`${BASE_URL}/studio`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 1. Capture Scene view
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified-01-scene.png") });
  console.log("Captured Scene view");

  // 2. Click Why Qloo tab (Tab 02)
  console.log("Opening Why Qloo tab...");
  const whyQlooBtn = page.getByRole("tab", { name: /Why Qloo/i });
  await whyQlooBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified-02-why-qloo.png") });
  console.log("Captured Why Qloo with WhatQlooChangedList");

  // 3. Click Playlist tab (Tab 03)
  console.log("Opening Playlist tab...");
  const playlistBtn = page.getByRole("tab", { name: /Playlist/i });
  await playlistBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified-03-playlist.png") });
  console.log("Captured Playlist with listening links");

  // 4. Click Sourcing tab (Tab 05)
  console.log("Opening Sourcing tab...");
  const sourcingBtn = page.getByRole("tab", { name: /Pricing & Sourcing/i });
  await sourcingBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified-04-sourcing-boq.png") });
  console.log("Captured Pricing & Sourcing BOQ Suite");

  // 5. Click Split Compare view
  console.log("Testing Split Compare mode...");
  const splitBtn = page.getByRole("button", { name: /Split Compare/i }).first();
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified-05-split-compare.png") });
    console.log("Captured Split Compare mode");
  }

  await browser.close();
  console.log("Verification screenshots captured successfully!");
}

verifyFeatures().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
