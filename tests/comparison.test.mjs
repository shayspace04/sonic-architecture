import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const req = createRequire(import.meta.url);
const babelTransformSync = req("@babel/core").transformSync;

function loadTs(relPath) {
  const full = path.resolve(PROJECT_ROOT, relPath);
  const code = babelTransformSync(req("fs").readFileSync(full, "utf8"), {
    filename: full,
    presets: [[req.resolve("@babel/preset-typescript"), { allExtensions: true }]],
    plugins: [req.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;

  const mod = { exports: {} };
  const customReq = (id) => {
    if (id.startsWith("@/")) {
      return loadTs(id.slice(2) + (id.endsWith(".ts") || id.endsWith(".tsx") ? "" : ".ts"));
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const target = path.join(path.dirname(full), id);
      return loadTs(path.relative(PROJECT_ROOT, target) + (target.endsWith(".ts") ? "" : ".ts"));
    }
    return req(id);
  };
  const fn = new Function("exports", "require", "module", code);
  fn(mod.exports, customReq, mod);
  return mod.exports;
}

const { generateSceneComparison, generateScene } = loadTs("lib/compare/sceneGenerator.ts");
const { STARTER_PROMPTS, getQlooFixture } = loadTs("lib/fixtures/qlooSamples.ts");

test("Compare Engine: Generates fair-test baseline vs grounded comparison for Jazz + Brutalism", () => {
  const comp = generateSceneComparison({
    prompt: "Jazz + Brutalist Architecture",
    seed: 42,
  });

  console.log("Diff items count:", comp.diff.length);
  console.log("Diff items:", JSON.stringify(comp.diff, null, 2));

  assert.ok(comp.baseline, "baseline spec generated");
  assert.ok(comp.grounded, "grounded spec generated");
  assert.equal(comp.seed, 42, "identical seed preserved across runs");
  assert.equal(comp.isSampleFixture, true, "fixture-backed comparison tagged accurately");
  assert.ok(comp.diff.length >= 4, "meaningful architectural differences detected");

  // Verify magnitudes are normalized in [0, 1] and sorted descending
  for (let i = 0; i < comp.diff.length; i++) {
    const item = comp.diff[i];
    assert.ok(item.magnitude >= 0 && item.magnitude <= 1.0, `magnitude ${item.magnitude} in [0, 1]`);
    if (i > 0) {
      assert.ok(
        comp.diff[i - 1].magnitude >= item.magnitude,
        "diff items sorted by magnitude descending"
      );
    }
  }

  // Verify provenance tags are honest
  const validProvenances = new Set(["qloo-evidence", "inferred", "fallback", "sample-fixture"]);
  comp.diff.forEach((item) => {
    if (item.changedBy) {
      assert.ok(
        validProvenances.has(item.changedBy.provenance),
        `valid provenance label: ${item.changedBy.provenance}`
      );
    }
  });
});

test("Compare Engine: Pre-built fixtures exist for all 4 starter prompts", () => {
  STARTER_PROMPTS.forEach((prompt) => {
    const fixture = getQlooFixture(prompt);
    assert.ok(fixture, `fixture exists for starter prompt: ${prompt}`);
    assert.equal(fixture.source, "fixture");
    assert.ok(fixture.entities.length >= 3, `at least 3 entities for ${prompt}`);
  });
});
