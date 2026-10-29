#!/usr/bin/env node
/**
 * Sonic Architecture — Starter Prompts KV / Cache Pre-warmer
 * (scripts/prewarm-kv.mjs)
 *
 * Pre-warms the 5 curated starter prompts in KV (Upstash / Vercel KV) or deployed server cache:
 * 1. Aphex Twin warehouse in London
 * 2. Miles Davis intimate jazz lounge with bourbon bar
 * 3. Brian Eno ambient vapor pavilion
 * 4. Fela Kuti open-air Afrobeat shrine
 * 5. Bill Evans quiet Japanese garden listening room
 *
 * Usage:
 *   node scripts/prewarm-kv.mjs [targetUrl]
 *   npm run prewarm [targetUrl]
 *
 * NOTE: Never prints or logs API keys. Caches remain server-side / gitignored.
 */

import fs from "node:fs";
import path from "node:path";

// Load .env.local if available without printing
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const STARTER_PROMPTS = [
  "Aphex Twin warehouse in London",
  "Miles Davis intimate jazz lounge with bourbon bar",
  "Brian Eno ambient vapor pavilion",
  "Fela Kuti open-air Afrobeat shrine",
  "Bill Evans quiet Japanese garden listening room",
];

const targetBaseUrl = (
  process.argv[2] ||
  process.env.DEPLOYED_URL ||
  "https://sonic-architecture.vercel.app"
).replace(/\/$/, "");

console.log(`[Prewarm] Target Host: ${targetBaseUrl}`);
console.log(`[Prewarm] Pre-warming ${STARTER_PROMPTS.length} starter prompts into KV/edge cache...\n`);

async function prewarmSinglePrompt(prompt, index, total) {
  const start = Date.now();
  const url = `${targetBaseUrl}/api/vibe`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, seed: 42 }),
      signal: AbortSignal.timeout(18_000),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      console.warn(
        `[Prewarm] [${index}/${total}] "${prompt}" FAILED: HTTP ${res.status} (${latencyMs}ms)`
      );
      return { ok: false, prompt, status: res.status, latencyMs };
    }

    const data = await res.json();
    const source = data.source || (data.scene?.qloo_evidence ? "live" : "unknown");
    const domainStatus = data.bundle?.domainStatus || {};

    console.log(
      `[Prewarm] [${index}/${total}] "${prompt}"\n          status=${res.status} latency=${latencyMs}ms source=${source}`
    );
    if (Object.keys(domainStatus).length > 0) {
      console.log(`          domains: ${JSON.stringify(domainStatus)}`);
    }

    return { ok: true, prompt, status: res.status, source, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error(
      `[Prewarm] [${index}/${total}] "${prompt}" ERROR: ${err instanceof Error ? err.message : String(err)} (${latencyMs}ms)`
    );
    return { ok: false, prompt, status: 0, latencyMs, error: String(err) };
  }
}

async function main() {
  const results = [];
  for (let i = 0; i < STARTER_PROMPTS.length; i++) {
    const prompt = STARTER_PROMPTS[i];
    const res = await prewarmSinglePrompt(prompt, i + 1, STARTER_PROMPTS.length);
    results.push(res);
    // 200ms spacing
    await new Promise((r) => setTimeout(r, 200));
  }

  const successful = results.filter((r) => r.ok).length;
  console.log(`\n[Prewarm] Summary: ${successful}/${STARTER_PROMPTS.length} starter prompts warm in KV/cache.`);
  if (successful < STARTER_PROMPTS.length) {
    process.exitCode = 1;
  }
}

main();
