import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const logoSvgPath = path.resolve('assets/branding/sonic-architecture-logo.svg');
const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background-color: #F6F6F1;
      color: #171716;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 54px 68px;
      position: relative;
      overflow: hidden;
    }
    /* Subtle architectural grid pattern */
    body::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(23, 23, 22, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(23, 23, 22, 0.04) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(23, 23, 22, 0.12);
      padding-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .top-eyebrow {
      font-family: "SF Mono", "Fira Code", Menlo, monospace;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666;
    }
    .top-badge {
      font-family: "SF Mono", "Fira Code", Menlo, monospace;
      font-size: 12px;
      background: #171716;
      color: #F6F6F1;
      padding: 4px 10px;
      border-radius: 3px;
      letter-spacing: 0.05em;
    }
    .main-body {
      display: flex;
      align-items: center;
      gap: 52px;
      margin: auto 0;
      position: relative;
      z-index: 1;
    }
    .logo-container {
      width: 190px;
      height: 190px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FFFFFF;
      border: 1px solid rgba(23, 23, 22, 0.15);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .logo-container svg {
      width: 100%;
      height: 100%;
      fill: #171716;
    }
    .content-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .title {
      font-family: "Playfair Display", Georgia, "Times New Roman", serif;
      font-size: 58px;
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.02em;
      color: #171716;
    }
    .description {
      font-size: 24px;
      line-height: 1.35;
      font-weight: 500;
      color: #333330;
      max-width: 780px;
    }
    .tagline {
      font-size: 18px;
      font-style: italic;
      color: #666660;
      font-family: Georgia, serif;
    }
    .features-row {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .feature-tag {
      font-family: "SF Mono", "Fira Code", Menlo, monospace;
      font-size: 11px;
      background: rgba(23, 23, 22, 0.05);
      border: 1px solid rgba(23, 23, 22, 0.1);
      padding: 5px 10px;
      border-radius: 4px;
      color: #444;
      font-weight: 500;
    }
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(23, 23, 22, 0.12);
      padding-top: 18px;
      position: relative;
      z-index: 1;
    }
    .footer-domain {
      font-family: "SF Mono", "Fira Code", Menlo, monospace;
      font-size: 15px;
      font-weight: 600;
      color: #171716;
      letter-spacing: 0.02em;
    }
    .footer-meta {
      font-family: "SF Mono", "Fira Code", Menlo, monospace;
      font-size: 13px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="top-eyebrow">Sonic Architecture • Cultural Intelligence to Spatial Form</div>
    <div class="top-badge">Qloo Hackathon 2026</div>
  </div>

  <div class="main-body">
    <div class="logo-container">
      ${logoSvg}
    </div>
    <div class="content-area">
      <h1 class="title">Sonic Architecture</h1>
      <p class="description">Qloo-powered cultural intelligence for interactive 3D architectural design.</p>
      <p class="tagline">Where cultural taste becomes spatial experience.</p>
      <div class="features-row">
        <span class="feature-tag">Three.js WebGL</span>
        <span class="feature-tag">Qloo Taste API</span>
        <span class="feature-tag">Sabine Acoustics</span>
        <span class="feature-tag">Fair-Test Diff</span>
        <span class="feature-tag">Four-Moment Audio</span>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div class="footer-domain">https://sonic-architecture.vercel.app</div>
    <div class="footer-meta">MIT License • Next.js 14 • TypeScript 5</div>
  </div>
</body>
</html>`;

async function generateSocialPreview() {
  console.log('--- Generating High-Resolution 1200x630 Social Preview ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const targets = [
    path.resolve('assets/branding/social-preview.png'),
    path.resolve('public/brand/og-image.png'),
    path.resolve('app/opengraph-image.png'),
    'C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700/social-preview-verified.png',
  ];

  const firstPath = targets[0];
  await page.screenshot({ path: firstPath, fullPage: false });

  for (let i = 1; i < targets.length; i++) {
    fs.copyFileSync(firstPath, targets[i]);
  }

  await browser.close();
  console.log('✓ Successfully generated 1200x630 social preview at all target paths:');
  targets.forEach(t => console.log('  -', t));
}

generateSocialPreview().catch(err => {
  console.error('Failed to generate social preview:', err);
  process.exit(1);
});
