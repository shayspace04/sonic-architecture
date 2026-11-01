import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJECT_ROOT = process.cwd();
const requireLocal = createRequire(import.meta.url);
const babelTransformSync = requireLocal('@babel/core').transformSync;
const tsPreset = requireLocal('@babel/preset-typescript');
const cjsPlugin = requireLocal('@babel/plugin-transform-modules-commonjs');

// Load .env.local
const envPath = path.join(PROJECT_ROOT, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

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

const entityMod = loadTsModule('lib/qloo/entityExtractor.ts');
const pipelineMod = loadTsModule('lib/qloo/pipeline.ts');

async function testPrompt(p) {
  console.log('\n======================================================');
  console.log('Testing Prompt:', p);
  const res = await pipelineMod.getCrossDomainEvidenceForPrompt(p);
  console.log('Resolution Source:', res.resolution.source);
  console.log('Resolved Entities (' + res.resolution.resolved.length + '):', res.resolution.resolved.map(e => e.name + ' [' + (e.types?.[0] || e.type) + ']'));
  console.log('Unresolved:', res.resolution.unresolved);
  console.log('Matched Tags (' + res.resolution.matchedTags.length + '):', res.resolution.matchedTags.map(t => t.name));
  console.log('Taste Tags (' + (res.bundle?.tasteTags?.length || 0) + '):', res.bundle?.tasteTags?.slice(0, 5).map(t => t.name));
  console.log('Places (' + (res.bundle?.places?.length || 0) + '):', res.bundle?.places?.slice(0, 3).map(p => p.name));
}

async function main() {
  await testPrompt('Miles Davis + Brutalist concrete');
  await testPrompt('Bad Bunny + Caribbean cultural pavilion');
  await testPrompt('Bjork glacial volcanic sanctuary');
  await testPrompt('Cedric the Entertainer + Contemporary Comedy Theatre');
}

main().catch(console.error);
