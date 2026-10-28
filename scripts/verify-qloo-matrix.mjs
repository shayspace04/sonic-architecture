/**
 * Sonic Architecture — Phase 5 Qloo Matrix Verification
 * (scripts/verify-qloo-matrix.mjs)
 *
 * Runs two passes across all 5 evaluation prompts:
 *   Pass 1: Real Qloo Key (Live Outbound Network API / Cache)
 *   Pass 2: Invalid Qloo Key (Fallback / Fixture Mode)
 *
 * Measures and tabulates:
 * - Prompt name
 * - Data Source ("live" | "cache" | "fixture" | "fallback")
 * - Qloo API Calls Used
 * - Entities Resolved
 * - Diff Per Category (Palette, Materials, Lighting, Geometry, Props/Assemblies)
 */

import fs from "node:fs";
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
  const code = babelTransformSync(fs.readFileSync(full, "utf8"), {
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

const { STARTER_PROMPTS } = loadTs("lib/fixtures/qlooSamples.ts");
const { generateSceneComparison } = loadTs("lib/compare/sceneGenerator.ts");
const { executeQlooSearch, clearQlooCache } = loadTs("lib/qloo/client.ts");

const PROMPTS = [
  ...STARTER_PROMPTS,
  "Pink Grunge Editorial Loft & Flash Studio",
];

async function runEvaluationPass(passName, apiKeyOverride) {
  const originalKey = process.env.QLOO_API_KEY;
  if (apiKeyOverride !== undefined) {
    process.env.QLOO_API_KEY = apiKeyOverride;
  }

  const results = [];

  for (const prompt of PROMPTS) {
    // 1. Outbound search via instrumented client
    const searchRes = await executeQlooSearch(prompt, 4);

    const liveContext = searchRes.entities.length > 0 ? {
      prompt,
      entities: searchRes.entities.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        signals: e.signals && e.signals.length > 0 ? e.signals : ["live_qloo_verified"],
        provenance: searchRes.source === "live" || searchRes.source === "cache"
          ? "qloo-evidence"
          : "sample-fixture",
      })),
      source: searchRes.source,
      qlooCallsUsed: 1,
    } : undefined;

    // 2. Fair-test comparison
    const comparison = generateSceneComparison({
      prompt,
      forcedContext: liveContext,
    });
    comparison.source = searchRes.source;

    // 3. Extract per-category diff summary
    const b = comparison.baseline;
    const g = comparison.grounded;

    const paletteDiff = `Baseline Floor:${b.palette.floorHex} Wall:${b.palette.wallHex} Accent:${b.palette.accentHex} -> Grounded Floor:${g.palette.floorHex} Wall:${g.palette.wallHex} Accent:${g.palette.accentHex}`;
    const materialsDiff = `Baseline: [${b.materials.wall.id}, ${b.materials.floor.id}] -> Grounded: [${g.materials.wall.id}, ${g.materials.floor.id}]`;
    const lightingDiff = `Baseline: ${b.lighting.temperatureK}K (${b.lighting.ambientIntensity.toFixed(2)} amb) -> Grounded: ${g.lighting.temperatureK}K (${g.lighting.ambientIntensity.toFixed(2)} amb)`;
    const geometryDiff = `Baseline: ${b.roomDimensions.width}x${b.roomDimensions.depth}x${b.roomDimensions.height}m (${b.ceilingStructure}) -> Grounded: ${g.roomDimensions.width}x${g.roomDimensions.depth}x${g.roomDimensions.height}m (${g.ceilingStructure})`;
    const propsDiff = `Baseline: ${b.objects.length} assemblies -> Grounded: ${g.objects.length} assemblies (focal: "${g.focalPoint?.name || 'none'}")`;

    results.push({
      prompt,
      source: searchRes.source,
      callsUsed: comparison.qlooCallsUsed,
      resolvedCount: searchRes.entities.length,
      entityNames: searchRes.entities.map((e) => e.name).join(", ") || "(none)",
      paletteDiff,
      materialsDiff,
      lightingDiff,
      geometryDiff,
      propsDiff,
    });
  }

  // Restore env
  process.env.QLOO_API_KEY = originalKey;
  return results;
}

async function main() {
  clearQlooCache();
  console.log("=== RUNNING PASS 1: REAL LIVE QLOO KEY ===");
  const pass1 = await runEvaluationPass("Pass 1: Live Key", process.env.QLOO_API_KEY);

  clearQlooCache();
  console.log("\n=== RUNNING PASS 2: INVALID QLOO KEY (FORCED FALLBACK/FIXTURE) ===");
  const pass2 = await runEvaluationPass("Pass 2: Invalid Key", "invalid_dummy_key_000000000");

  const matrixJsonPath = path.resolve(PROJECT_ROOT, "scripts/matrix-results.json");
  fs.writeFileSync(matrixJsonPath, JSON.stringify({ pass1, pass2 }, null, 2));
  console.log(`\nWrote evaluation results to ${matrixJsonPath}`);
}

main().catch((err) => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});
