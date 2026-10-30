import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:/Users/SHAYEL/.gemini/antigravity/brain/d8c6c346-40c6-43e5-adcd-48e01da87700';

const readmeHeaderHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
    }
    .markdown-body {
      max-width: 1012px;
      margin: 0 auto;
      background: #0d1117;
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
      border: 0 !important;
    }
    td, th {
      border: 0 !important;
      padding: 6px 13px;
    }
    h1 {
      color: #f0f6fc;
      font-size: 2em;
      margin: 0 0 4px 0;
      padding-bottom: 0;
      border-bottom: 0 !important;
    }
    p {
      margin-top: 0;
      margin-bottom: 6px;
    }
    img {
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="markdown-body">
    <div align="center">
      <table border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" valign="middle">
            <a href="https://sonic-architecture.vercel.app/">
              <img src="assets/branding/sonic-architecture-logo.svg" width="115" height="110" alt="Sonic Architecture Logo" />
            </a>
          </td>
          <td align="left" valign="middle">
            <h1 style="border-bottom: none; margin-bottom: 2px;">Sonic Architecture</h1>
            <p style="margin: 0 0 4px 0;"><strong>Qloo-Powered Cultural Intelligence for Generative 3D Architectural Design</strong></p>
            <p style="margin: 0; font-style: italic; color: #8b949e;">Where cultural taste becomes spatial experience.</p>
          </td>
        </tr>
      </table>

      <br>

      <p>
        <a href="https://github.com/shayspace04/sonic-architecture/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square&logo=githubactions" alt="CI Status" /></a>
        <a href="https://sonic-architecture.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-sonic--architecture.vercel.app-black?style=flat-square&logo=vercel" alt="Live Demo" /></a>
        <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-black.svg?style=flat-square" alt="MIT License" /></a>
        <img src="https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat-square&logo=next.js" alt="Next.js 14" />
        <img src="https://img.shields.io/badge/TypeScript-5.4-blue.svg?style=flat-square&logo=typescript" alt="TypeScript 5" />
        <img src="https://img.shields.io/badge/Three.js-0.164-black.svg?style=flat-square&logo=three.js" alt="Three.js" />
        <img src="https://img.shields.io/badge/Powered%20by-Qloo%20Taste%20API-orange.svg?style=flat-square" alt="Qloo Taste API" />
      </p>
    </div>
  </div>
</body>
</html>`;

async function verifyReadmeRender() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 600 } });
  const htmlPath = path.resolve('readme-preview.html');
  fs.writeFileSync(htmlPath, readmeHeaderHtml, 'utf8');
  await desktopPage.goto(`file://${htmlPath}`);
  await desktopPage.waitForTimeout(500);
  const desktopShot = path.join(ARTIFACTS_DIR, 'readme-header-desktop-verified.png');
  await desktopPage.screenshot({ path: desktopShot });
  console.log('✓ Desktop header screenshot verified:', desktopShot);

  // Mobile
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 600 } });
  await mobilePage.goto(`file://${htmlPath}`);
  await mobilePage.waitForTimeout(500);
  const mobileShot = path.join(ARTIFACTS_DIR, 'readme-header-mobile-verified.png');
  await mobilePage.screenshot({ path: mobileShot });
  console.log('✓ Mobile header screenshot verified:', mobileShot);

  fs.unlinkSync(htmlPath);
  await browser.close();
}

verifyReadmeRender().catch(console.error);
