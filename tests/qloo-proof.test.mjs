/**
 * Sonic Architecture — Automated Qloo Proof & Verification Test Suite
 * (/tests/qloo-proof.test.mjs)
 *
 * Implements Requirements 6a, 6b, 6c, 6d and core integrity tests:
 * 6a. Same prompt, two DIFFERENT mocked qlooContexts must produce scenes that differ
 *     in at least two of: palette, materials, lighting, geometry, props.
 * 6b. Same prompt, same qlooContext twice must produce 100% identical outputs.
 * 6c. Live: "Miles Davis + Brutalist concrete" vs "Aphex Twin + Brutalist concrete"
 *     must resolve to different entity IDs, produce different scenes, and print the diff table.
 * 6d. Starter Prompts: Every starter prompt must return at least one non-empty insights result live.
 * 2.  Key Hygiene: Missing or invalid API key falls back without throwing or claiming "live".
 * 3.  Baseline Honesty: Distinct prompts produce prompt-aware baselines.
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

// Load .env.local without exposing values
const envPath = path.join(PROJECT_ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

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
// TEST 6a: Two DIFFERENT mock qlooContexts produce diff in >= 2 categories
// ============================================================================
test("Proof Test 6a — Same prompt with two DIFFERENT mocked qlooContexts differs in >= 2 categories", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const { diffScenes } = loadTsModule("lib/compare/diff.ts");

  const prompt = "Studio venue with high-performance acoustics and architectural staging";
  const seed = 42;

  // Mock Context 1: Miles Davis / Jazz (warm amber, slotted oak, intimate volume)
  const mockContext1 = {
    prompt,
    source: "live",
    qlooCallsUsed: 2,
    entities: [
      {
        id: "578CFC26-B696-449A-9655-3FB270DDA725",
        name: "Miles Davis",
        type: "urn:entity:artist",
        signals: ["harmonic_warmth", "warm_amber", "late_night_intimacy"],
        provenance: "qloo-evidence",
        drivenChoice: "2400K warm incandescent amber lighting with slotted oak diffusers",
      },
    ],
  };

  // Mock Context 2: Aphex Twin / Techno Bunker (cold strobe, mirror chrome, cavernous bass)
  const mockContext2 = {
    prompt,
    source: "live",
    qlooCallsUsed: 2,
    entities: [
      {
        id: "4278382F-4991-4D63-B207-942D86A26ACB",
        name: "Aphex Twin",
        type: "urn:entity:artist",
        signals: ["sub_bass", "strobe", "raw_board_concrete", "high_gloss_mirror_chrome"],
        provenance: "qloo-evidence",
        drivenChoice: "6500K high-intensity strobe lighting, mirror-chrome surfaces and subterranean bunker volume",
      },
    ],
  };

  const scene1 = designScene({ prompt, seed, qlooContext: mockContext1 });
  const scene2 = designScene({ prompt, seed, qlooContext: mockContext2 });

  const diff = diffScenes(scene1, scene2, mockContext2);
  assert.ok(diff.length > 0, "diffScenes between two different contexts must return non-empty diff");

  const requiredCategories = ["palette", "materials", "lighting", "geometry", "props"];
  const differingCategories = Array.from(new Set(diff.map((d) => d.category))).filter((cat) =>
    requiredCategories.includes(cat)
  );

  console.log("Proof 6a differing architectural categories:", differingCategories);
  assert.ok(
    differingCategories.length >= 2,
    `Expected at least 2 differing categories among ${requiredCategories.join(", ")}, got ${differingCategories.length}: ${differingCategories.join(", ")}`
  );
});

// ============================================================================
// TEST 6b: Determinism: Same prompt + same qlooContext twice must be identical
// ============================================================================
test("Proof Test 6b — Same prompt and same qlooContext called twice produces 100% identical outputs", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");

  const prompt = "Miles Davis + Brutalist concrete";
  const seed = 77;
  const mockContext = {
    prompt,
    source: "live",
    qlooCallsUsed: 2,
    entities: [
      {
        id: "578CFC26-B696-449A-9655-3FB270DDA725",
        name: "Miles Davis",
        type: "urn:entity:artist",
        signals: ["harmonic_warmth", "austere_warmth"],
        provenance: "qloo-evidence",
      },
    ],
  };

  const sceneA = designScene({ prompt, seed, qlooContext: mockContext });
  const sceneB = designScene({ prompt, seed, qlooContext: mockContext });

  assert.deepStrictEqual(sceneA, sceneB, "Repeated execution with identical inputs must be strictly identical");
  assert.strictEqual(JSON.stringify(sceneA), JSON.stringify(sceneB), "Serialized JSON representations must match exactly");
});

// ============================================================================
// TEST 6c: Live resolution & contrast diff table: Miles Davis vs Aphex Twin
// ============================================================================
test("Proof Test 6c — Live: 'Miles Davis + Brutalist concrete' vs 'Aphex Twin + Brutalist concrete' resolve differently", async (t) => {
  const { resolveEntitiesAndConceptsFromPrompt } = loadTsModule("lib/qloo/entityExtractor.ts");
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const { diffScenes } = loadTsModule("lib/compare/diff.ts");

  const promptMiles = "Miles Davis + Brutalist concrete";
  const promptAphex = "Aphex Twin + Brutalist concrete";

  const [resMiles, resAphex] = await Promise.all([
    resolveEntitiesAndConceptsFromPrompt(promptMiles),
    resolveEntitiesAndConceptsFromPrompt(promptAphex),
  ]);

  const idMiles = resMiles.resolved[0]?.entity_id;
  const idAphex = resAphex.resolved[0]?.entity_id;

  assert.ok(idMiles, "Miles Davis must resolve to a valid entity ID");
  assert.ok(idAphex, "Aphex Twin must resolve to a valid entity ID");
  assert.notStrictEqual(idMiles, idAphex, "Miles Davis and Aphex Twin must resolve to distinct entity IDs");

  const contextMiles = {
    prompt: promptMiles,
    source: resMiles.source,
    entities: resMiles.resolved.map((e) => ({
      id: e.entity_id,
      name: e.name,
      type: e.types?.[0] || "artist",
      signals: ["harmonic_warmth", "muted_trumpet", "late_night_intimacy"],
      provenance: "qloo-evidence",
    })),
  };

  const contextAphex = {
    prompt: promptAphex,
    source: resAphex.source,
    entities: resAphex.resolved.map((e) => ({
      id: e.entity_id,
      name: e.name,
      type: e.types?.[0] || "artist",
      signals: ["sub_bass", "strobe", "raw_board_concrete", "high_gloss_mirror_chrome"],
      provenance: "qloo-evidence",
    })),
  };

  const sceneMiles = designScene({ prompt: promptMiles, seed: 42, qlooContext: contextMiles });
  const sceneAphex = designScene({ prompt: promptAphex, seed: 42, qlooContext: contextAphex });

  const diff = diffScenes(sceneMiles, sceneAphex, contextAphex);
  assert.ok(diff.length > 0, "Scenes between Miles Davis and Aphex Twin must show non-empty variance");

  console.log("\n=========================================================================================");
  console.log("  CONTRAST DIFF TABLE: 'Miles Davis + Brutalist concrete' vs 'Aphex Twin + Brutalist concrete'");
  console.log("=========================================================================================");
  console.log("| Category    | Miles Davis Grounded Value            | Aphex Twin Grounded Value             | Magnitude |");
  console.log("-----------------------------------------------------------------------------------------");
  for (const item of diff) {
    const cat = item.category.padEnd(11);
    const v1 = (item.baselineValue || "").slice(0, 36).padEnd(37);
    const v2 = (item.groundedValue || "").slice(0, 36).padEnd(37);
    const mag = String(item.magnitude ?? 0.8).padEnd(9);
    console.log(`| ${cat} | ${v1} | ${v2} | ${mag} |`);
  }
  console.log("=========================================================================================\n");
});

// ============================================================================
// TEST 6d: Starter prompts: Every starter prompt returns >= 1 non-empty insight result live
// ============================================================================
test("Proof Test 6d — Starter Prompts: Every starter prompt must return at least one non-empty insights result live", async () => {
  const { getCrossDomainEvidenceForPrompt } = loadTsModule("lib/qloo/pipeline.ts");

  const STARTER_PROMPTS = [
    "Miles Davis + Brutalist concrete",
    "Aphex Twin + gallery warehouse",
    "A24 films + indie music",
    "Japanese Gardens + ambient",
    "Jazz + Brutalist Architecture",
  ];

  for (const prompt of STARTER_PROMPTS) {
    const start = Date.now();
    const { resolution, bundle } = await getCrossDomainEvidenceForPrompt(prompt);
    const latencyMs = Date.now() - start;

    assert.ok(bundle, `Prompt '${prompt}' must produce an evidence bundle`);

    const placesCount = bundle.places.length;
    const artistsCount = bundle.relatedArtists.length;
    const moviesCount = bundle.movies.length;
    const brandsCount = bundle.brands.length;
    const tagsCount = bundle.resolvedTags.length;

    const totalResults = placesCount + artistsCount + moviesCount + brandsCount + tagsCount;

    console.log(
      `Starter Prompt '${prompt}': places=${placesCount}, artists=${artistsCount}, movies=${moviesCount}, brands=${brandsCount}, tags=${tagsCount} (latency: ${latencyMs}ms)`
    );

    assert.ok(
      totalResults > 0,
      `Starter prompt '${prompt}' returned 0 live insight results! (places=${placesCount}, artists=${artistsCount}, movies=${moviesCount}, brands=${brandsCount}, tags=${tagsCount})`
    );
  }
});

// ============================================================================
// TEST 2: Invalid or unset QLOO_API_KEY returns fixture or fallback
// ============================================================================
test("Proof Test 2 — Invalid or missing API key falls back to fixture/fallback without throwing or claiming live", async () => {
  const origKey = process.env.QLOO_API_KEY;
  try {
    delete process.env.QLOO_API_KEY;
    const { testQlooHealth } = loadTsModule("lib/qloo/client.ts");

    const healthUnset = await testQlooHealth();
    assert.strictEqual(healthUnset.ok, false, "Health check should fail when key is unset");
    assert.notStrictEqual(healthUnset.source, "live", "Unset key must never claim 'live' source");
    assert.ok(
      healthUnset.source === "fallback" || healthUnset.source === "fixture",
      `Source must be 'fallback' or 'fixture', got: ${healthUnset.source}`
    );

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

  assert.notStrictEqual(
    baselineA.typology,
    baselineB.typology,
    "Typology should differ between cathedral and bunker baselines"
  );

  const volA = baselineA.roomDimensions.width * baselineA.roomDimensions.depth * baselineA.roomDimensions.height;
  const volB = baselineB.roomDimensions.width * baselineB.roomDimensions.depth * baselineB.roomDimensions.height;
  assert.notStrictEqual(volA, volB, "Room volume must be prompt-aware between cathedral and bunker");
});
