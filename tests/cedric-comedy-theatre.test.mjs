/**
 * Cedric the Entertainer + Contemporary Comedy Theatre
 * Fair-Test Comparison & Provenance Verification Test
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
const { generateSceneComparison, designScene } = sceneGeneratorMod;

test("Cedric the Entertainer + Contemporary Comedy Theatre: Complete Fair-Test Verification", async (t) => {
  const prompt = "Cedric the Entertainer + Contemporary Comedy Theatre";
  const comparison = generateSceneComparison({ prompt, seed: 42 });

  assert.ok(comparison, "Comparison must be generated");
  assert.ok(comparison.baseline, "Baseline must exist");
  assert.ok(comparison.grounded, "Grounded scene must exist");
  assert.ok(comparison.diff, "Diff must exist");

  const baseline = comparison.baseline;
  const grounded = comparison.grounded;

  console.log("\n--- BASELINE (WITHOUT QLOO) ---");
  console.log("Title:", baseline.title);
  console.log("Typology:", baseline.typology);
  console.log("Primary Color:", baseline.palette.primaryHex);
  console.log("Stage:", baseline.focalPoint.name);
  console.log("Objects:", baseline.objects.map(o => `${o.archetype}: ${o.name}`));
  console.log("RT60 Target:", baseline.acousticTarget.targetRT60Seconds, "Calculated:", baseline.acousticTarget.calculatedRT60Seconds);

  console.log("\n--- GROUNDED (WITH QLOO) ---");
  console.log("Title:", grounded.title);
  console.log("Typology:", grounded.typology);
  console.log("Primary Color:", grounded.palette.primaryHex);
  console.log("Stage:", grounded.focalPoint.name);
  console.log("Objects:", grounded.objects.map(o => `${o.archetype}: ${o.name}`));
  console.log("RT60 Target:", grounded.acousticTarget.targetRT60Seconds, "Calculated:", grounded.acousticTarget.calculatedRT60Seconds);

  console.log("\n--- FAIR-TEST DIFF ---");
  console.log("Diff Count:", comparison.diff.length);
  for (const d of comparison.diff) {
    console.log(`[${d.category.toUpperCase()}] ${d.title}: baseline="${d.baselineValue}" vs grounded="${d.groundedValue}" (mag=${d.magnitude})`);
  }

  console.log("\n--- PROVENANCE TRACING ---");
  const provMap = grounded.provenanceMap || {};
  console.log("Traces in provenanceMap:", Object.keys(provMap));
  for (const [k, v] of Object.entries(provMap)) {
    console.log(`  ${k} -> entity="${v.entityName}" signal="${v.signal}" provenance="${v.provenance}"`);
  }

  // 1. Baseline Verification:
  // Must be a conventional contemporary comedy theatre
  assert.equal(baseline.typology, "comedy_theatre");
  assert.match(baseline.title, /Apollo|Mainstage|Contemporary Comedy/i);
  assert.ok(baseline.objects.some(o => o.archetype === "modular_stage_riser" && o.name.includes("Proscenium")), "Baseline must have proscenium stage");
  assert.ok(baseline.objects.some(o => o.archetype === "tiered_auditorium_row"), "Baseline must have tiered auditorium rows");
  assert.ok(baseline.objects.some(o => o.archetype === "acoustic_wall_panel"), "Baseline must have acoustic backing baffles");

  // 2. Grounded Verification:
  // Must be culturally calibrated to Cedric the Entertainer
  assert.equal(grounded.typology, "comedy_theatre");
  assert.match(grounded.title, /Cedric|Revue|Cabaret/i);
  assert.equal(grounded.palette.primaryHex.toUpperCase(), "#4A0E17", "Grounded palette must be theatrical cabaret burgundy");
  assert.ok(grounded.objects.some(o => o.archetype === "velvet_theatre_curtain"), "Grounded scene must have ruby velvet curtain");
  assert.ok(grounded.objects.some(o => o.archetype === "cabaret_cocktail_table"), "Grounded scene must have cabaret cocktail tables");
  assert.ok(grounded.objects.some(o => o.archetype === "curved_banquette_booth"), "Grounded scene must have curved velvet banquettes");
  assert.ok(grounded.objects.some(o => o.archetype === "acoustic_felt_panel" && o.name.includes("Walnut")), "Grounded scene must have fluted walnut diffusers");

  // 3. Meaningful Divergence (Diffs across multiple categories)
  assert.ok(comparison.diff.length >= 4, "Must have at least 4 distinct diff items");
  const categories = new Set(comparison.diff.map(d => d.category));
  assert.ok(categories.has("palette"), "Diff must include palette");
  assert.ok(categories.has("furniture") || categories.has("program"), "Diff must include furniture/program");
  assert.ok(categories.has("lighting"), "Diff must include lighting");

  // 4. Provenance honesty
  assert.ok(Object.keys(provMap).length >= 4, "Provenance map must have at least 4 traced decisions");
  assert.ok(Object.values(provMap).some(p => p.entityName.includes("Cedric")), "Must trace decisions to Cedric the Entertainer");
});
