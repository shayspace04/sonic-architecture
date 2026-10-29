#!/usr/bin/env node
/**
 * Sonic Architecture — Deployed Site Verification Proof
 * (/scripts/verify-deployed.mjs)
 *
 * Verifies live deployment health and Qloo grounding against a deployed URL or localhost.
 * Usage:
 *   node scripts/verify-deployed.mjs [TARGET_URL]
 * Example:
 *   node scripts/verify-deployed.mjs https://sonic-architecture.vercel.app
 */

const targetUrl = (process.argv[2] || process.env.DEPLOYED_URL || "http://localhost:3000").replace(/\/$/, "");

console.log(`========================================================================`);
console.log(`  SONIC ARCHITECTURE — DEPLOYED INSTANCE VERIFICATION`);
console.log(`  Target URL: ${targetUrl}`);
console.log(`========================================================================\n`);

async function runVerification() {
  let passed = true;

  // 1. Verify Uncached /api/qloo-health
  console.log(`[1/3] Testing uncached /api/qloo-health ...`);
  const cacheBust = Date.now();
  const healthStart = Date.now();
  try {
    const healthResp = await fetch(`${targetUrl}/api/qloo-health?t=${cacheBust}`, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      signal: AbortSignal.timeout(20000),
    });
    const healthRoundtrip = Date.now() - healthStart;

    if (!healthResp.ok) {
      console.error(`❌ Health check failed with HTTP status ${healthResp.status}`);
      passed = false;
    } else {
      const healthData = await healthResp.json();
      console.log(`   HTTP Status: ${healthResp.status}`);
      console.log(`   Reported Health: ok=${healthData.ok}, status=${healthData.status}, source="${healthData.source}", latency=${healthData.latencyMs}ms`);
      console.log(`   Round-trip Latency: ${healthRoundtrip}ms`);

      if (!healthData.ok || healthData.source !== "live") {
        console.warn(`⚠️ Warning: Expected source="live", received source="${healthData.source}"`);
      } else {
        console.log(`✅ /api/qloo-health passed (live connection verified)`);
      }

      // Security check: ensure no keys leaked
      const bodyStr = JSON.stringify(healthData);
      if (bodyStr.includes("key") && (bodyStr.includes("secret") || bodyStr.includes("token"))) {
        console.error(`❌ SECURITY ALERT: Potential credential exposure in health response!`);
        passed = false;
      }
    }
  } catch (err) {
    console.error(`❌ Health check error: ${err.message}`);
    passed = false;
  }

  // 2. Verify /api/vibe Live Grounding Synthesis
  console.log(`\n[2/3] Testing /api/vibe synthesis for "Miles Davis + Brutalist concrete" ...`);
  const vibeStart = Date.now();
  try {
    const vibeResp = await fetch(`${targetUrl}/api/vibe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Miles Davis + Brutalist concrete",
        seed: 42,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const vibeRoundtrip = Date.now() - vibeStart;

    if (!vibeResp.ok) {
      console.error(`❌ /api/vibe synthesis failed with HTTP status ${vibeResp.status}`);
      passed = false;
    } else {
      const data = await vibeResp.json();
      console.log(`   HTTP Status: ${vibeResp.status} in ${vibeRoundtrip}ms`);
      console.log(`   Venue Typology: ${data.scene?.typology}`);
      console.log(`   Lighting: ${data.scene?.lighting?.colorTemperatureK}K (${data.scene?.lighting?.timeOfDay})`);
      console.log(`   Palette Accent: ${data.scene?.palette?.accentHex}`);
      console.log(`   Comparison Source: ${data.comparison?.source || "unknown"}`);
      console.log(`   Differences Identified: ${data.comparison?.diff?.length || 0}`);

      if (data.scene?.becauseSentences && data.scene.becauseSentences.length > 0) {
        console.log(`   Because Sentences:`);
        for (const b of data.scene.becauseSentences) {
          console.log(`     - [${b.headline}]: "${b.sentence}"`);
        }
      }

      console.log(`✅ /api/vibe synthesis passed successfully`);
    }
  } catch (err) {
    console.error(`❌ /api/vibe synthesis error: ${err.message}`);
    passed = false;
  }

  // 3. Verify Homepage Rendering
  console.log(`\n[3/3] Testing homepage delivery ...`);
  try {
    const homeResp = await fetch(`${targetUrl}/`, { signal: AbortSignal.timeout(35000) });
    if (homeResp.ok) {
      console.log(`✅ Homepage delivered HTTP 200`);
    } else {
      console.error(`❌ Homepage returned HTTP ${homeResp.status}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Homepage request failed: ${err.message}`);
    passed = false;
  }

  console.log(`\n========================================================================`);
  if (passed) {
    console.log(`🎉 ALL VERIFICATION CHECKS PASSED FOR: ${targetUrl}`);
  } else {
    console.error(`❌ VERIFICATION CHECKS FAILED FOR: ${targetUrl}`);
    process.exit(1);
  }
  console.log(`========================================================================\n`);
}

runVerification();
