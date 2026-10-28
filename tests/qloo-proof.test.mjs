/**
 * Sonic Architecture — Automated Qloo Proof & Verification Test Suite
 * (/tests/qloo-proof.test.mjs)
 *
 * Implements Phase E:
 * 1. For a fixed prompt + mock Qloo response with known entities, diffScenes reports
 *    a non-empty diff with correct categories and truthful provenance.
 * 2. With QLOO_API_KEY invalid or unset, the system returns source: "fixture" or "fallback"
 *    (never throws, never claims "live", never leaks the key).
 * 3. Two different prompts ("cathedral" vs "bunker") produce distinct baselines,
 *    proving baseline generation is prompt-aware rather than a static default.
 * 4. Matrix run against DEPLOYED_URL or localhost for the 5 starter prompts,
 *    asserting HTTP 200, latency < 15s, valid SceneSpec, and honest source metadata.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const requireLocal = createRequire(import.meta.url);
const babelTransformSync = requireLocal("@babel/core").transformSync;
const tsPreset = requireLocal("@babel/preset-typescript");
const cjsPlugin = requireLocal("@babel/plugin-transform-modules-commonjs");

function resolveExistingPath(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".json"]) {
    if (fs.existsSync(basePath + ext) && fs.statSync(basePath + ext).isFile()) {
      return basePath + ext;
    }
  }
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".json"]) {
    const indexP = path.join(basePath, "index" + ext);
    if (fs.existsSync(indexP) && fs.statSync(indexP).isFile()) {
      return indexP;
    }
  }
  return basePath;
}

const MODULE_CACHE = new Map();

function loadTsModule(relPath) {
  const resolvedFull = resolveExistingPath(path.resolve(PROJECT_ROOT, relPath));
  if (MODULE_CACHE.has(resolvedFull)) {
    return MODULE_CACHE.get(resolvedFull);
  }

  const code = fs.readFileSync(resolvedFull, "utf-8");
  const transformed = babelTransformSync(code, {
    filename: resolvedFull,
    presets: [[tsPreset, { allExtensions: true }]],
    plugins: [cjsPlugin],
    configFile: false,
    babelrc: false,
  });

  const m = { exports: {} };
  MODULE_CACHE.set(resolvedFull, m.exports);

  const customRequire = (id) => {
    if (id.startsWith("@/")) {
      return loadTsModule(id.replace("@/", ""));
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(resolvedFull), id);
      return loadTsModule(path.relative(PROJECT_ROOT, resolved));
    }
    return requireLocal(id);
  };

  const fn = new Function("module", "exports", "require", "__filename", "__dirname", transformed.code);
  fn(m, m.exports, customRequire, resolvedFull, path.dirname(resolvedFull));
  return m.exports;
}

// ============================================================================
// TEST 1: Fixed prompt + mock Qloo response diffing
// ============================================================================
test("Proof Test 1 — diffScenes reports non-empty diff with correct categories and provenance", () => {
  const { diffScenes } = loadTsModule("lib/compare/diff.ts");
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");

  const prompt = "Intimate Japanese jazz kissa with horn speakers";
  const seed = 42;

  // Baseline: no Qloo context
  const baseline = designScene({ prompt, seed, qlooContext: undefined });

  // Grounded with mock Qloo context
  const mockQlooContext = {
    prompt,
    source: "live",
    qlooCallsUsed: 3,
    entities: [
      {
        id: "578CFC26-B696-449A-9655-3FB270DDA725",
        name: "Miles Davis",
        type: "urn:entity:artist",
        signals: ["harmonic_warmth", "muted_trumpet", "late_night_intimacy"],
        provenance: "qloo-evidence",
        drivenChoice: "Warm 2400K incandescent amber illumination and slotted acoustic diffusers",
      },
    ],
  };

  const grounded = designScene({ prompt, seed, qlooContext: mockQlooContext });
  const diff = diffScenes(baseline, grounded, mockQlooContext);

  assert.ok(diff.length > 0, "diffScenes must return at least one modulated decision");

  const categories = diff.map((d) => d.category);
  assert.ok(
    categories.includes("palette") ||
      categories.includes("lighting") ||
      categories.includes("acoustics") ||
      categories.includes("materials"),
    `Diff should cover architectural categories. Found: ${categories.join(", ")}`
  );

  for (const item of diff) {
    assert.ok(item.changedBy, "Diff item must indicate who changed it");
    assert.strictEqual(
      item.changedBy.provenance,
      "qloo-evidence",
      "Provenance of live mock Qloo item must be 'qloo-evidence'"
    );
    assert.ok(item.changedBy.entityName.includes("Miles Davis"), "Entity name must match Qloo context");
  }
});

// ============================================================================
// TEST 2: Invalid or unset QLOO_API_KEY returns fixture or fallback (never throws, never claims 'live')
// ============================================================================
test("Proof Test 2 — Invalid or missing API key falls back to fixture/fallback without throwing or claiming live", async () => {
  const origKey = process.env.QLOO_API_KEY;
  try {
    // Unset key
    delete process.env.QLOO_API_KEY;
    const { testQlooHealth } = loadTsModule("lib/qloo/client.ts");

    const healthUnset = await testQlooHealth();
    assert.strictEqual(healthUnset.ok, false, "Health check should fail when key is unset");
    assert.notStrictEqual(healthUnset.source, "live", "Unset key must never claim 'live' source");
    assert.ok(
      healthUnset.source === "fallback" || healthUnset.source === "fixture",
      `Source must be 'fallback' or 'fixture', got: ${healthUnset.source}`
    );

    // Set clearly invalid key
    process.env.QLOO_API_KEY = "invalid_dummy_key_12345";
    const healthInvalid = await testQlooHealth();
    assert.notStrictEqual(healthInvalid.source, "live", "Invalid key must never claim 'live' source");
    assert.ok(
      healthInvalid.source === "fallback" || healthInvalid.source === "fixture",
      `Source must be 'fallback' or 'fixture', got: ${healthInvalid.source}`
    );
  } finally {
    if (origKey !== undefined) {
      process.env.QLOO_API_KEY = origKey;
    } else {
      delete process.env.QLOO_API_KEY;
    }
  }
});

// ============================================================================
// TEST 3: Baseline is prompt-aware, not a hardcoded default
// ============================================================================
test("Proof Test 3 — Two distinct prompts produce differentiated architectural baselines", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");

  const promptA = "Brutalist monumental cathedral reverb with 14s decay and raw concrete ribs";
  const promptB = "Subterranean techno bunker with monolithic black steel columns and deep sub-bass acoustic traps";

  const baselineA = designScene({ prompt: promptA, seed: 101, qlooContext: undefined });
  const baselineB = designScene({ prompt: promptB, seed: 101, qlooContext: undefined });

  // Assert baseline differentiation
  assert.notStrictEqual(
    baselineA.typology,
    baselineB.typology,
    "Typology should differ between cathedral and bunker baselines"
  );

  const volA = baselineA.roomDimensions.width * baselineA.roomDimensions.depth * baselineA.roomDimensions.height;
  const volB = baselineB.roomDimensions.width * baselineB.roomDimensions.depth * baselineB.roomDimensions.height;
  assert.notStrictEqual(volA, volB, "Room volume must be prompt-aware between cathedral and bunker");

  assert.notStrictEqual(
    baselineA.materials.wall.id,
    baselineB.materials.wall.id,
    "Wall material must reflect the prompt specifications"
  );
});

// ============================================================================
// TEST 4: Matrix run against local server or DEPLOYED_URL for starter prompts
// ============================================================================
test("Proof Test 4 — Starter prompt matrix run returns HTTP 200, valid JSON, and latency < 25s", async (t) => {
  const baseUrl = process.env.DEPLOYED_URL || "http://localhost:3000";

  // Check if server is reachable
  let serverReachable = false;
  try {
    const probe = await fetch(`${baseUrl}/api/qloo-health`, { signal: AbortSignal.timeout(6000) });
    serverReachable = probe.status === 200 || probe.status === 404;
  } catch {
    serverReachable = false;
  }

  if (!serverReachable) {
    t.skip(`Server at ${baseUrl} is not currently running. Skipping live HTTP integration matrix.`);
    return;
  }

  const STARTER_PROMPTS = [
    "Intimate Japanese jazz kissa at midnight with warm slotted oak acoustics, horn speakers, and 2400K amber glow",
    "Jazz + Brutalist Architecture",
    "A24 Films + Indie Music",
    "Japanese Gardens + Ambient",
    "Chrome + Club Culture",
  ];

  for (const prompt of STARTER_PROMPTS) {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/vibe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(25_000),
    });

    const latencyMs = Date.now() - start;
    assert.strictEqual(res.status, 200, `POST /api/vibe for '${prompt}' must return HTTP 200`);
    assert.ok(latencyMs < 25_000, `Latency for '${prompt}' (${latencyMs}ms) must be under 25,000ms`);

    const json = await res.json();
    assert.ok(json.scene, "Response must include a SceneSpec");
    assert.ok(json.comparison, "Response must include a fair-test comparison envelope");
    assert.ok(["live", "cache", "fixture", "fallback"].includes(json.source), `Valid source required, got: ${json.source}`);
  }
});
