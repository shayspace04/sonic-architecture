/**
 * Sonic Architecture — Dynamic Baseline Differentiation & Isolation Verification Suite
 * (/tests/dynamic-baseline-differentiation.test.mjs)
 *
 * Verifies that the "WITHOUT QLOO" baseline is dynamic, intelligent, and prompt-specific:
 * 1. Independent generation without access to Qloo signals or entities.
 * 2. Distinct spatial typologies, dimensions, materials, lighting, RT60, and furniture assemblies.
 * 3. Pairwise divergence across all benchmark prompts (zero scene collisions).
 * 4. Deterministic consistency with identical seeds.
 * 5. Strict separation of concerns: baseline never leaks Qloo evidence or claims.
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

const sceneGeneratorMod = loadTsModule("lib/compare/sceneGenerator.ts");
const diffMod = loadTsModule("lib/compare/diff.ts");

const BENCHMARK_PROMPTS = [
  {
    name: "Japanese Gardens + Ambient",
    prompt: "Japanese Gardens + ambient",
    expectedTypology: "tea_room",
    expectedOpenAir: true,
    expectedFloorMatSubstring: "tatami",
    expectedFocalSubstring: "tsukubai",
  },
  {
    name: "A24 Films + Indie Music",
    prompt: "A24 films + indie music",
    expectedTypology: "gallery_pavilion",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "concrete",
    expectedFocalSubstring: "cinema",
  },
  {
    name: "Brutalist Underground Techno Club",
    prompt: "Brutalist underground techno club",
    expectedTypology: "underground_club",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "concrete",
    expectedFocalSubstring: "dj bunker",
  },
  {
    name: "Traditional Indian Wedding Mandap",
    prompt: "Traditional Indian wedding mandap in an outdoor garden",
    expectedTypology: "garden_mandap",
    expectedOpenAir: true,
    expectedFloorMatSubstring: "sandstone",
    expectedFocalSubstring: "mandap",
  },
  {
    name: "Mediterranean Coastal Residence",
    prompt: "Mediterranean coastal residence",
    expectedTypology: "mediterranean_courtyard",
    expectedOpenAir: true,
    expectedFloorMatSubstring: "terracotta",
    expectedFocalSubstring: "fountain",
  },
  {
    name: "Minimalist Reading Library",
    prompt: "Minimalist reading library",
    expectedTypology: "intimate_lounge",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "parquet",
    expectedFocalSubstring: "reading table",
  },
  {
    name: "Tropical Beachside Retreat",
    prompt: "Tropical beachside corporate retreat",
    expectedTypology: "coastal_retreat",
    expectedOpenAir: true,
    expectedFloorMatSubstring: "teak",
    expectedFocalSubstring: "retreat pavilion",
  },
  {
    name: "Aphex Twin + Industrial Gallery Warehouse",
    prompt: "Aphex Twin + industrial gallery warehouse",
    expectedTypology: "industrial_warehouse",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "concrete",
    expectedFocalSubstring: "sound deck",
  },
  {
    name: "Nordic Stave Church Ambient Sanctuary",
    prompt: "Nordic stave church ambient sanctuary",
    expectedTypology: "cathedral_banquet",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "limestone",
    expectedFocalSubstring: "altar dais",
  },
  {
    name: "Modern Acoustic Lounge for 12 Guests",
    prompt: "Modern acoustic listening lounge for 12 guests with warm timber",
    expectedTypology: "listening_room",
    expectedOpenAir: false,
    expectedFloorMatSubstring: "oak",
    expectedFocalSubstring: "turntable",
  },
];

test("Dynamic Baseline 1 — 10 Distinct Prompts Produce 10 Distinct, Typology-Accurate Baselines", () => {
  const generated = [];

  for (const item of BENCHMARK_PROMPTS) {
    const base = sceneGeneratorMod.designScene({ prompt: item.prompt, seed: 42 });
    generated.push({ item, base });

    // Verify typology
    assert.equal(
      base.typology,
      item.expectedTypology,
      `Prompt "${item.prompt}" must resolve to typology ${item.expectedTypology}, got ${base.typology}`
    );

    // Verify enclosure mode
    assert.equal(
      base.isOpenAir,
      item.expectedOpenAir,
      `Prompt "${item.prompt}" openAir expectation mismatch (expected ${item.expectedOpenAir}, got ${base.isOpenAir})`
    );

    // Verify material
    const floorLower = base.materials.floor.name.toLowerCase();
    assert.ok(
      floorLower.includes(item.expectedFloorMatSubstring),
      `Floor material "${base.materials.floor.name}" must contain "${item.expectedFloorMatSubstring}"`
    );

    // Verify focal point
    const focalLower = base.focalPoint.name.toLowerCase();
    assert.ok(
      focalLower.includes(item.expectedFocalSubstring),
      `Focal point "${base.focalPoint.name}" must contain "${item.expectedFocalSubstring}"`
    );

    // Strict Qloo isolation
    assert.equal(base.qlooSource, "fallback", "Baseline must have qlooSource fallback");
    assert.equal(base.qloo_evidence, undefined, "Baseline must never carry qloo_evidence");
    assert.equal(base.provenanceMap, undefined, "Baseline must never carry provenanceMap");
    assert.equal(base.comparison, undefined, "Baseline must never carry comparison");
  }

  // Count distinct typologies generated across the 10 prompts
  const uniqueTypologies = new Set(generated.map((g) => g.base.typology));
  assert.ok(
    uniqueTypologies.size >= 8,
    `Must generate at least 8 distinct typologies across the 10 test briefs (found ${uniqueTypologies.size})`
  );
});

test("Dynamic Baseline 2 — Strict Pairwise Divergence (Zero Baseline Collisions)", () => {
  const baselines = BENCHMARK_PROMPTS.map((item) => ({
    prompt: item.prompt,
    spec: sceneGeneratorMod.designScene({ prompt: item.prompt, seed: 42 }),
  }));

  let collisions = 0;

  for (let i = 0; i < baselines.length; i++) {
    for (let j = i + 1; j < baselines.length; j++) {
      const b1 = baselines[i];
      const b2 = baselines[j];

      const sameTypology = b1.spec.typology === b2.spec.typology;
      const sameFocal = b1.spec.focalPoint.name === b2.spec.focalPoint.name;
      const sameDims =
        b1.spec.roomDimensions.width === b2.spec.roomDimensions.width &&
        b1.spec.roomDimensions.depth === b2.spec.roomDimensions.depth;
      const sameFloor = b1.spec.materials.floor.name === b2.spec.materials.floor.name;

      if (sameTypology && sameFocal && sameDims && sameFloor) {
        collisions++;
        assert.fail(`Collision between "${b1.prompt}" and "${b2.prompt}": identical baseline specs!`);
      }
    }
  }

  assert.equal(collisions, 0, "Zero baseline collisions across all benchmark pairs");
});

test("Dynamic Baseline 3 — Deterministic Repeatability with Identical Seed", () => {
  for (const item of BENCHMARK_PROMPTS.slice(0, 5)) {
    const run1 = sceneGeneratorMod.designScene({ prompt: item.prompt, seed: 100 });
    const run2 = sceneGeneratorMod.designScene({ prompt: item.prompt, seed: 100 });

    assert.equal(run1.typology, run2.typology);
    assert.equal(run1.roomDimensions.width, run2.roomDimensions.width);
    assert.equal(run1.roomDimensions.depth, run2.roomDimensions.depth);
    assert.equal(run1.roomDimensions.height, run2.roomDimensions.height);
    assert.equal(run1.materials.floor.id, run2.materials.floor.id);
    assert.equal(run1.materials.wall.id, run2.materials.wall.id);
    assert.equal(run1.focalPoint.name, run2.focalPoint.name);
    assert.equal(run1.lighting.temperatureK, run2.lighting.temperatureK);
    assert.equal(run1.acousticTarget.calculatedRT60Seconds, run2.acousticTarget.calculatedRT60Seconds);
    assert.equal(run1.objects.length, run2.objects.length);
  }
});

test("Dynamic Baseline 4 — Fair-Test Comparison Diff Accurately Detects Real Divergence", () => {
  const comparison = sceneGeneratorMod.generateSceneComparison({
    prompt: "A24 films + indie music",
    seed: 42,
    forcedContext: {
      source: "live",
      entities: [
        { id: "ent-a24", name: "A24 Films", type: "film_production", signals: ["indie_cinema"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-indie", name: "Indie Music", source: "live", provenance: "qloo-evidence" }],
        places: [{ entity_id: "place-angelika", name: "Angelika Film Center", source: "live", properties: {} }],
      },
    },
  });

  const { baseline, grounded, diff } = comparison;

  // Baseline has no Qloo
  assert.equal(baseline.qlooSource, "fallback");
  assert.equal(grounded.qlooSource, "live");

  // Diff must contain valid categories
  assert.ok(diff.length > 0, "Fair-Test Diff must report real differences");
  for (const d of diff) {
    assert.ok(d.category, "Diff item must have category");
    assert.ok(d.baselineValue, "Diff item must have baselineValue");
    assert.ok(d.groundedValue, "Diff item must have groundedValue");
    assert.ok(typeof d.magnitude === "number" && d.magnitude >= 0, "Diff item must have non-negative magnitude");
  }
});
