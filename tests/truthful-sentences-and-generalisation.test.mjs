/**
 * Sonic Architecture — Truthful Sentences & Cultural Generalisation Test Suite
 * (/tests/truthful-sentences-and-generalisation.test.mjs)
 *
 * Implements Judge Reliability Requirements 4, 5, and 7:
 * 1. Typology-vs-sentence consistency: Sentence 1 typology wording is strictly derived from scene.typology.
 * 2. Name-search safety: Name-search venue results say "found by name search for '...'" and NEVER "fans gather at".
 * 3. 12 Unseen Cultural Prompts Generalisation Suite:
 *    Bjork, Bad Bunny, Studio Ghibli, Wes Anderson, Kendrick Lamar, Noma restaurant,
 *    Tokyo street fashion, Bollywood wedding, Nirvana, Burial, Fleetwood Mac, Barbie.
 *    Runs without throwing, resolves palettes/materials without fallback, and logs evidence.
 * 4. Honesty Fallback Check: Random non-cultural strings correctly trigger isFallback: true with notice.
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
// TEST 1: Typology-vs-Sentence Consistency (Requirement 7a & 4a)
// ============================================================================
test("Consistency Test 1 — 'Because' sentence typology strictly derives from scene.typology", () => {
  const { generateBecauseSentences } = loadTsModule("lib/design/qlooMapping.ts");

  const typologiesToTest = [
    { typology: "warehouse_rave", expectedFragment: "warehouse rave" },
    { typology: "intimate_club", expectedFragment: "intimate club" },
    { typology: "listening_room", expectedFragment: "listening room" },
    { typology: "cathedral_hall", expectedFragment: "cathedral hall" },
    { typology: "gallery_space", expectedFragment: "gallery space" },
    { typology: "open_air_pavilion", expectedFragment: "open-air pavilion" },
  ];

  const mockBundle = {
    source: "live",
    places: [
      { entity_id: "p1", name: "Village Vanguard" },
      { entity_id: "p2", name: "Blue Note NYC" },
    ],
    venueSource: "insights",
  };

  const mockEntities = [{ id: "e1", name: "Miles Davis", type: "artist" }];
  const mockDerived = {
    palette: { primaryHex: "#1A2238" },
    materials: {
      wallMaterial: "acoustic_slats",
      flooringMaterial: "herringbone_parquet",
      lightingTemperatureK: 2400,
      acousticRT60Target: 0.42,
    },
    appliedChoices: [
      { element: "lighting", triggeredBy: "Miles Davis", choice: "2400K" },
      { element: "wallMaterial", triggeredBy: "Miles Davis", choice: "acoustic_slats" },
    ],
  };

  for (const { typology, expectedFragment } of typologiesToTest) {
    const sentences = generateBecauseSentences(
      "Miles Davis intimate lounge",
      mockBundle,
      mockEntities,
      mockDerived,
      typology
    );

    assert.ok(sentences.length >= 1, `Must generate at least 1 sentence for typology ${typology}`);
    const typologySentence = sentences.find((s) => s.decision === "typology");
    assert.ok(typologySentence, `Must contain a typology decision sentence`);

    const text = typologySentence.sentence.toLowerCase();
    assert.ok(
      text.includes(expectedFragment),
      `Sentence "${typologySentence.sentence}" must contain expected typology fragment "${expectedFragment}" for scene.typology="${typology}"`
    );

    // Verify evidence and interpretation are stated separately (Requirement 4b)
    assert.ok(
      text.includes("qloo returned") && text.includes("our spatial rule maps"),
      `Sentence must state evidence and spatial interpretation separately`
    );
  }
});

// ============================================================================
// TEST 2: Name-Search Safety (Requirement 7b & 4e)
// ============================================================================
test("Safety Test 2 — Name-search venues produce 'found by name search' and NEVER 'fans gather at'", () => {
  const { generateBecauseSentences } = loadTsModule("lib/design/qlooMapping.ts");

  const nameSearchBundle = {
    source: "live",
    places: [
      { entity_id: "p1", name: "Smalls Jazz Club" },
      { entity_id: "p2", name: "Mezzrow" },
    ],
    venueSource: "name_search",
    venueSearchTerm: "jazz",
  };

  const mockEntities = [{ id: "e1", name: "Jazz concept", type: "cultural" }];
  const mockDerived = {
    palette: { primaryHex: "#1A2238" },
    materials: {
      wallMaterial: "acoustic_slats",
      flooringMaterial: "herringbone_parquet",
      lightingTemperatureK: 2400,
      acousticRT60Target: 0.42,
    },
    appliedChoices: [
      { element: "lighting", triggeredBy: "jazz", choice: "2400K" },
      { element: "wallMaterial", triggeredBy: "jazz", choice: "acoustic_slats" },
    ],
  };

  const sentences = generateBecauseSentences(
    "Late night jazz room",
    nameSearchBundle,
    mockEntities,
    mockDerived,
    "listening_room"
  );

  const typologySentence = sentences.find((s) => s.decision === "typology");
  assert.ok(typologySentence, "Must produce typology sentence");

  const text = typologySentence.sentence.toLowerCase();

  // Rule 4e: Must NEVER say "fans gather at"
  assert.ok(
    !text.includes("fans gather at"),
    `Name-search sentence must NEVER contain "fans gather at". Output: "${typologySentence.sentence}"`
  );

  // Rule 4e: Must say "by name search for 'jazz'"
  assert.ok(
    text.includes("by name search") && text.includes("jazz"),
    `Name-search sentence must contain "by name search" and "jazz". Output: "${typologySentence.sentence}"`
  );
});

// ============================================================================
// TEST 3: 12 Unseen Cultural Prompts Generalisation Suite (Requirement 5 & 7c)
// ============================================================================
test("Generalisation Test 3 — 12 Unseen Cultural Prompts derive distinct palettes without fallback", () => {
  const { deriveArchitecturalDesignFromQloo } = loadTsModule("lib/design/qlooMapping.ts");
  const { generateSceneComparison } = loadTsModule("lib/compare/sceneGenerator.ts");

  const UNSEEN_PROMPTS = [
    { prompt: "Bjork glacial volcanic sanctuary", expectedPalette: "glacial_ethereal_cyan" },
    { prompt: "Bad Bunny Caribbean rooftop club in San Juan", expectedPalette: "tropical_sunset_terracotta" },
    { prompt: "Studio Ghibli cedar moss pavilion in the woods", expectedPalette: "pastoral_meadow_cedar" },
    { prompt: "Wes Anderson symmetrical mint and mustard salon", expectedPalette: "vintage_pastel_symmetry" },
    { prompt: "Kendrick Lamar Compton asphalt and raw gold sanctuary", expectedPalette: "westcoast_asphalt_gold" },
    { prompt: "Noma restaurant charred oak botanical dining room", expectedPalette: "nordic_foraged_granite" },
    { prompt: "Tokyo street fashion obsidian neon gallery", expectedPalette: "shibuya_monochrome_neon" },
    { prompt: "Bollywood wedding royal saffron and crimson courtyard", expectedPalette: "royal_saffron_crimson" },
    { prompt: "Nirvana Seattle grunge brick rehearsal space", expectedPalette: "seattle_pine_flannel" },
    { prompt: "Burial nocturnal south london bitumen listening tunnel", expectedPalette: "south_london_nocturnal_asphalt" },
    { prompt: "Fleetwood Mac Laurel Canyon teak sun-bleached studio", expectedPalette: "laurel_canyon_sunbleached_teak" },
    { prompt: "Barbie candy bubblegum hyper-pop dreamhouse", expectedPalette: "bubblegum_lacquer_glamour" },
  ];

  console.log("\n================================================================================");
  console.log("  12 UNSEEN CULTURAL PROMPTS GENERALISATION AUDIT");
  console.log("================================================================================");
  console.log("Prompt".padEnd(45) + "Palette ID".padEnd(32) + "Fallback?");
  console.log("-".repeat(88));

  for (const item of UNSEEN_PROMPTS) {
    const derived = deriveArchitecturalDesignFromQloo(item.prompt);

    assert.ok(derived, `Must derive design for "${item.prompt}"`);
    assert.strictEqual(
      derived.palette.id,
      item.expectedPalette,
      `Prompt "${item.prompt}" should map to palette "${item.expectedPalette}", got "${derived.palette.id}"`
    );
    assert.strictEqual(
      derived.palette.isFallback,
      undefined,
      `Cultural reference "${item.prompt}" must NOT trigger fallback`
    );

    // Verify whole scene generation runs cleanly without throwing
    const comparison = generateSceneComparison({ prompt: item.prompt, seed: 42 });
    assert.ok(comparison.grounded, "Grounded scene must be generated");
    assert.ok(comparison.baseline, "Baseline scene must be generated");

    console.log(
      item.prompt.slice(0, 43).padEnd(45) +
      derived.palette.id.padEnd(32) +
      (derived.palette.isFallback ? "FALLBACK" : "NO (Rich Qloo derived)")
    );
  }
  console.log("================================================================================\n");
});

// ============================================================================
// TEST 4: Fallback Honesty on Random Non-Cultural String (Requirement 5)
// ============================================================================
test("Honesty Test 4 — Non-cultural random string triggers fallback mode with honest UI notice", () => {
  const { deriveArchitecturalDesignFromQloo } = loadTsModule("lib/design/qlooMapping.ts");

  const nonsensePrompt = "xqzqwk 987123984712 zzz999";
  const derived = deriveArchitecturalDesignFromQloo(nonsensePrompt);

  assert.strictEqual(derived.palette.id, "neutral_fallback_slate");
  assert.strictEqual(derived.palette.isFallback, true);
  assert.strictEqual(
    derived.palette.fallbackNotice,
    "No Qloo-derived palette for this reference"
  );

  console.log(`✅ Fallback correctly engaged for non-cultural input: "${derived.palette.fallbackNotice}"`);
});
