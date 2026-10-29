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

const { generateSceneComparison } = loadTsModule("lib/compare/sceneGenerator.ts");

for (const prompt of [
  "Miles Davis + Brutalist concrete",
  "Aphex Twin + Brutalist concrete",
]) {
  console.log(`\n======================================================`);
  console.log(`PROMPT: "${prompt}"`);
  console.log(`======================================================`);
  const comp = generateSceneComparison({ prompt, seed: 42 });
  console.log(`BASELINE ("Without Qloo (prompt-only design)"):`);
  console.log(`  Typology: ${comp.baseline.typology}`);
  console.log(`  RT60: ${comp.baseline.acousticTarget.calculatedRT60Seconds}s`);
  console.log(`  Palette: primary=${comp.baseline.palette.primaryHex}, accent=${comp.baseline.palette.accentHex}, wall=${comp.baseline.palette.wallHex}`);
  console.log(`  Height: ${comp.baseline.roomDimensions.height}m`);

  console.log(`\nGROUNDED ("Qloo-Grounded Design"):`);
  console.log(`  Typology: ${comp.grounded.typology}`);
  console.log(`  RT60: ${comp.grounded.acousticTarget.calculatedRT60Seconds}s`);
  console.log(`  Palette: primary=${comp.grounded.palette.primaryHex}, accent=${comp.grounded.palette.accentHex}, wall=${comp.grounded.palette.wallHex}`);
  console.log(`  Height: ${comp.grounded.roomDimensions.height}m`);
  console.log(`  Because Sentences:`);
  for (const s of comp.grounded.becauseSentences || []) {
    console.log(`    - [${s.headline}]: "${s.sentence}"`);
  }
}
