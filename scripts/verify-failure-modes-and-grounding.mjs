import assert from "assert";

async function verifyLiveGroundingAndFailures() {
  console.log("==================================================================");
  console.log("  VERIFICATION SUITE: REAL QLOO GROUNDING & FAILURE HANDLING");
  console.log("==================================================================");

  const results = {
    liveGrounding: false,
    pairwiseContrast: false,
    unresolvedPromptHonesty: false,
    soundtrackOfflineHonesty: false,
    healthEndpointHonesty: false,
  };

  // 1. Live Qloo Health Check
  console.log("\n[Test 1] Checking Live Qloo Health Endpoint...");
  const healthResp = await fetch("http://localhost:3000/api/qloo-health");
  const healthData = await healthResp.json();
  console.log(`   ✓ Qloo Health: ok=${healthData.ok}, status=${healthData.status}, latency=${healthData.latencyMs}ms, source="${healthData.source}"`);
  assert.strictEqual(healthData.ok, true, "Qloo Health endpoint must be OK");
  assert.ok(["live", "cache"].includes(healthData.source), "Health source must be live or cache");
  results.healthEndpointHonesty = true;

  // 2. Real Qloo Grounding with Usable Entities & Traceable Spec Decisions
  console.log("\n[Test 2] Testing Real Qloo Grounding ('Miles Davis + Brutalist concrete')...");
  const vibeResp = await fetch("http://localhost:3000/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Miles Davis + Brutalist concrete" }),
  });
  const vibeData = await vibeResp.json();

  const evidence = vibeData.sceneSpec?.qloo_evidence;
  const resolvedEntities = evidence?.resolved_entities || [];
  console.log(`   ✓ Qloo Evidence Source: "${evidence?.source}"`);
  console.log(`   ✓ Usable Entities Retrieved: ${resolvedEntities.length}`);
  resolvedEntities.forEach((e) => {
    console.log(`      -> Entity: "${e.entity_name}" (${e.entity_type}) | Signal: "${e.qloo_signal}" | Provenance: "${e.provenance}"`);
  });

  assert.ok(resolvedEntities.length > 0, "Must retrieve at least 1 real usable entity");
  assert.strictEqual(resolvedEntities[0].entity_name, "Miles Davis");
  assert.strictEqual(resolvedEntities[0].provenance, "qloo-evidence");

  // Traceable Decisions linked to evidence
  console.log(`   ✓ Traceable Decisions in SceneSpec:`);
  console.log(`      -> Typology: "${vibeData.sceneSpec.typology}"`);
  console.log(`      -> Calculated RT60: ${vibeData.sceneSpec.acousticTarget?.calculatedRT60Seconds}s (Target: ${vibeData.sceneSpec.acousticTarget?.targetRT60Seconds}s)`);
  console.log(`      -> Lighting Kelvin: ${vibeData.sceneSpec.lighting?.temperatureK}K`);
  console.log(`      -> Flooring Material: "${vibeData.sceneSpec.materials?.floor?.name}"`);
  console.log(`      -> Wall Material: "${vibeData.sceneSpec.materials?.wall?.name}"`);
  console.log(`      -> Diff Summary: ${vibeData.comparison?.diffSummary?.differingElements} differing elements (${Math.round((vibeData.comparison?.diffSummary?.qlooTraceShare || 0) * 100)}% Qloo trace)`);

  assert.ok(vibeData.comparison?.diffSummary?.differingElements > 0, "Baseline and grounded must have differing elements");
  assert.strictEqual(vibeData.sceneSpec.typology, "listening_room");
  results.liveGrounding = true;

  // 3. Contrast & Pairwise Divergence (Miles Davis vs Aphex Twin)
  console.log("\n[Test 3] Testing Contrast & Differentiation ('Aphex Twin + gallery warehouse')...");
  const aphexResp = await fetch("http://localhost:3000/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Aphex Twin + gallery warehouse" }),
  });
  const aphexData = await aphexResp.json();

  console.log(`   ✓ Miles Davis Typology: ${vibeData.sceneSpec.typology} | Aphex Twin Typology: ${aphexData.sceneSpec.typology}`);
  console.log(`   ✓ Miles Davis Kelvin: ${vibeData.sceneSpec.lighting?.temperatureK}K | Aphex Twin Kelvin: ${aphexData.sceneSpec.lighting?.temperatureK}K`);
  console.log(`   ✓ Miles Davis RT60: ${vibeData.sceneSpec.acousticTarget?.calculatedRT60Seconds}s | Aphex Twin RT60: ${aphexData.sceneSpec.acousticTarget?.calculatedRT60Seconds}s`);

  assert.notStrictEqual(vibeData.sceneSpec.typology, aphexData.sceneSpec.typology, "Typologies must diverge");
  assert.notStrictEqual(vibeData.sceneSpec.lighting?.temperatureK, aphexData.sceneSpec.lighting?.temperatureK, "Lighting temperatures must diverge");
  results.pairwiseContrast = true;

  // 4. Failure Mode: Non-Cultural / Unresolved Prompt Honesty
  console.log("\n[Test 4] Testing Failure Mode: Non-cultural gibberish input...");
  const gibberishResp = await fetch("http://localhost:3000/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "asdkfjh938472938472randomnonculturalinput" }),
  });
  const gibberishData = await gibberishResp.json();
  const gibberishEntities = gibberishData.sceneSpec?.qloo_evidence?.resolved_entities || [];

  console.log(`   ✓ Gibberish Entities Count: ${gibberishEntities.length} (Expected: 0)`);
  console.log(`   ✓ Gibberish Source: "${gibberishData.sceneSpec?.qlooSource || gibberishData.source}"`);
  console.log(`   ✓ Diff Qloo Traced: ${gibberishData.comparison?.diffSummary?.qlooTracedElements || 0} (Expected: 0)`);

  assert.strictEqual(gibberishEntities.length, 0, "Non-cultural prompt must have 0 resolved entities");
  assert.strictEqual(gibberishData.comparison?.diffSummary?.qlooTracedElements || 0, 0, "Non-cultural prompt must have 0 qloo traced elements");
  results.unresolvedPromptHonesty = true;

  // 5. Soundtrack Fallback Honesty
  console.log("\n[Test 5] Testing Soundtrack Pipeline Fallback Honesty...");
  const soundtrackResp = await fetch("http://localhost:3000/api/soundtrack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sceneSpec: vibeData.sceneSpec,
      forceRefresh: true,
    }),
  });
  const soundtrackData = await soundtrackResp.json();

  console.log(`   ✓ Soundtrack Status: ${soundtrackResp.status}`);
  console.log(`   ✓ Tracks Returned: ${soundtrackData.tracks?.length || 0}`);
  console.log(`   ✓ Cache Status: "${soundtrackData.cacheStatus}"`);
  console.log(`   ✓ Provider: "${soundtrackData.provider || 'catalog'}"`);

  assert.strictEqual(soundtrackResp.status, 200);
  assert.ok(soundtrackData.tracks?.length >= 2, "Soundtrack must return verified tracks or catalog links");
  results.soundtrackOfflineHonesty = true;

  console.log("\n==================================================================");
  console.log("  ALL GROUNDING & FAILURE HANDLING INVARIANTS VERIFIED!");
  console.log("==================================================================");
  console.log(JSON.stringify(results, null, 2));
}

verifyLiveGroundingAndFailures().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
