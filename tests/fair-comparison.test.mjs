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

const { generateScene, generateSceneComparison } = loadTs("lib/compare/sceneGenerator.ts");
const { STARTER_PROMPTS, getQlooFixture } = loadTs("lib/fixtures/qlooSamples.ts");

const ALL_EVAL_PROMPTS = [
  ...STARTER_PROMPTS,
  "Pink Grunge Editorial Loft & Flash Studio",
];

test("Phase 3 Fair Comparison: Baseline and Grounded must differ across palette, materials, lighting, AND geometry", () => {
  for (const prompt of ALL_EVAL_PROMPTS) {
    const fixture = getQlooFixture(prompt);
    assert.ok(fixture, `Fixture must exist for evaluation prompt: "${prompt}"`);

    const seed = 42;
    // 1. Single function entrypoint
    const baseline = generateScene({ prompt, seed, qlooContext: undefined });
    const grounded = generateScene({ prompt, seed, qlooContext: fixture });

    // 2. Palette Difference Test
    const paletteIsEqual =
      JSON.stringify(baseline.palette) === JSON.stringify(grounded.palette);
    assert.equal(
      paletteIsEqual,
      false,
      `[${prompt}] Baseline and Grounded palette must NOT be deeply equal`
    );

    // 3. Materials Difference Test
    const materialsEqual =
      JSON.stringify(baseline.materials) === JSON.stringify(grounded.materials);
    assert.equal(
      materialsEqual,
      false,
      `[${prompt}] Baseline and Grounded materials must NOT be deeply equal`
    );

    // 4. Lighting Difference Test (Kelvin, ambient, or key/fill)
    const lightingEqual =
      baseline.lighting.temperatureK === grounded.lighting.temperatureK &&
      baseline.lighting.ambientIntensity === grounded.lighting.ambientIntensity &&
      baseline.lighting.keyFillRatio === grounded.lighting.keyFillRatio;
    assert.equal(
      lightingEqual,
      false,
      `[${prompt}] Baseline and Grounded lighting must NOT be deeply equal`
    );

    // 5. Geometry Difference Test (dimensions or ceilingStructure)
    const geometryEqual =
      baseline.roomDimensions.width === grounded.roomDimensions.width &&
      baseline.roomDimensions.height === grounded.roomDimensions.height &&
      baseline.roomDimensions.depth === grounded.roomDimensions.depth &&
      baseline.ceilingStructure === grounded.ceilingStructure;
    assert.equal(
      geometryEqual,
      false,
      `[${prompt}] Baseline and Grounded geometry must NOT be deeply equal`
    );

    // 6. Zero Qloo leakage into Baseline
    assert.equal(
      baseline.qlooSource,
      "fallback",
      `[${prompt}] Baseline must have source="fallback" with zero Qloo signals`
    );
    assert.equal(
      baseline.qloo_evidence,
      undefined,
      `[${prompt}] Baseline must have no qloo_evidence attached`
    );

    // 7. Grounded carries legitimate provenance
    assert.ok(
      grounded.qloo_evidence,
      `[${prompt}] Grounded must have structured qloo_evidence attached`
    );
    assert.equal(
      grounded.qloo_evidence.source,
      fixture.source,
      `[${prompt}] Grounded evidence source must match context source ("${fixture.source}")`
    );
  }
});
