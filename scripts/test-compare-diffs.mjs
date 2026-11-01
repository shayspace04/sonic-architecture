import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJECT_ROOT = process.cwd();
const requireLocal = createRequire(import.meta.url);
const babelTransformSync = requireLocal('@babel/core').transformSync;
const tsPreset = requireLocal('@babel/preset-typescript');
const cjsPlugin = requireLocal('@babel/plugin-transform-modules-commonjs');

function resolveExistingPath(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  for (const ext of ['.ts', '.tsx', '.js', '.mjs', '.json']) {
    if (fs.existsSync(basePath + ext) && fs.statSync(basePath + ext).isFile()) return basePath + ext;
  }
  return basePath;
}

const MODULE_CACHE = new Map();
function loadTsModule(relPath) {
  const resolvedFull = resolveExistingPath(path.resolve(PROJECT_ROOT, relPath));
  if (MODULE_CACHE.has(resolvedFull)) return MODULE_CACHE.get(resolvedFull);

  const code = fs.readFileSync(resolvedFull, 'utf-8');
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
    if (id.startsWith('@/')) return loadTsModule(id.replace('@/', ''));
    if (id.startsWith('./') || id.startsWith('../')) {
      const resolved = path.resolve(path.dirname(resolvedFull), id);
      return loadTsModule(path.relative(PROJECT_ROOT, resolved));
    }
    return requireLocal(id);
  };

  const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', transformed.code);
  fn(m, m.exports, customRequire, resolvedFull, path.dirname(resolvedFull));
  MODULE_CACHE.set(resolvedFull, m.exports);
  return m.exports;
}

const { generateSceneComparison } = loadTsModule('lib/compare/sceneGenerator.ts');

for (const prompt of ['Cedric the Entertainer + Contemporary Comedy Theatre', 'Miles Davis + Brutalist concrete']) {
  console.log('\n======================================================');
  console.log('PROMPT:', prompt);
  const comp = generateSceneComparison({ prompt, seed: 42 });
  console.log('Baseline Title:', comp.baseline.title, '| Typology:', comp.baseline.typology);
  console.log('Grounded Title:', comp.grounded.title, '| Typology:', comp.grounded.typology);
  console.log('Diff count:', comp.diff?.length);
  for (const d of comp.diff || []) {
    console.log('  [' + d.category + '] ' + d.explanation);
  }
}
