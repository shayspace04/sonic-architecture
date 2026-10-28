// scripts/fetch-assets.mjs
// Poly Haven CC0 Asset Fetcher & Optimizer for Sonic Architecture
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.resolve(rootDir, 'public', 'assets');
const texturesDir = path.resolve(assetsDir, 'textures');
const hdrisDir = path.resolve(assetsDir, 'hdris');
const modelsDir = path.resolve(assetsDir, 'models');
const manifestPath = path.resolve(assetsDir, 'manifest.json');

const USER_AGENT = 'SonicArchitecture/1.0 (Spatial 3D Venue Generator; local dev build)';
const HEADERS = { 'User-Agent': USER_AGENT };

// Curated texture sets matching Phase 3 requirements
const TEXTURE_SPECS = [
  { semantic: 'raw_concrete', polyhavenId: 'rough_concrete', category: 'concrete', realScaleMeters: 2.0 },
  { semantic: 'polished_concrete', polyhavenId: 'smooth_concrete_floor', category: 'concrete', realScaleMeters: 3.0 },
  { semantic: 'board_formed_concrete', polyhavenId: 'wood_textured_concrete', category: 'concrete', realScaleMeters: 2.5 },
  { semantic: 'dark_wood', polyhavenId: 'dark_wood', category: 'wood', realScaleMeters: 2.0 },
  { semantic: 'light_oak', polyhavenId: 'oak_wood_planks', category: 'wood', realScaleMeters: 2.0 },
  { semantic: 'plaster', polyhavenId: 'white_rough_plaster', category: 'plaster', realScaleMeters: 2.5 },
  { semantic: 'brick', polyhavenId: 'brick_wall_001', category: 'brick', realScaleMeters: 1.8 },
  { semantic: 'terrazzo', polyhavenId: 'terrazzo_tiles', category: 'terrazzo', realScaleMeters: 1.5 },
  { semantic: 'brushed_metal', polyhavenId: 'metal_plate', category: 'metal', realScaleMeters: 1.0 },
  { semantic: 'leather', polyhavenId: 'brown_leather', category: 'leather', realScaleMeters: 1.0 },
  { semantic: 'velvet', polyhavenId: 'velour_velvet', category: 'fabric', realScaleMeters: 1.0 },
  { semantic: 'marble', polyhavenId: 'marble_01', category: 'marble', realScaleMeters: 2.0 },
  { semantic: 'tatami', polyhavenId: 'tatami_mat', category: 'mat', realScaleMeters: 1.8 },
  { semantic: 'stone_tile', polyhavenId: 'stone_tiles', category: 'stone', realScaleMeters: 2.0 },
  { semantic: 'rubber_flooring', polyhavenId: 'rubber_tiles', category: 'rubber', realScaleMeters: 1.5 },
];

const HDRI_SPECS = [
  { id: 'brown_photostudio_02', filename: 'studio_warm.hdr', category: 'interior_studio' },
  { id: 'abandoned_hall_01', filename: 'cathedral_hall.hdr', category: 'interior_hall' },
];

const MODEL_SPECS = [
  { id: 'WoodenChair_01', semantic: 'wooden_chair', category: 'seating', defaultScale: 1.0 },
  { id: 'modern_arm_chair_01', semantic: 'armchair', category: 'seating', defaultScale: 0.95 },
  { id: 'modern_coffee_table_01', semantic: 'coffee_table', category: 'table', defaultScale: 0.9 },
  { id: 'dining_table', semantic: 'dining_table', category: 'table', defaultScale: 1.0 },
  { id: 'wooden_stool_01', semantic: 'wooden_stool', category: 'seating', defaultScale: 0.9 },
  { id: 'sofa_02', semantic: 'lounge_sofa', category: 'seating', defaultScale: 1.0 },
  { id: 'potted_plant_01', semantic: 'potted_plant', category: 'decor', defaultScale: 0.8 },
  { id: 'wine_bottles_01', semantic: 'wine_bottles', category: 'clutter', defaultScale: 0.85 },
  { id: 'hanging_industrial_lamp', semantic: 'hanging_lamp', category: 'lighting', defaultScale: 0.9 },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: status ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Download failed for ${url}: status ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('=== Sonic Architecture: Fetching CC0 Assets from Poly Haven ===');
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`Licence: CC0 1.0 Universal (Public Domain)`);

  fs.mkdirSync(texturesDir, { recursive: true });
  fs.mkdirSync(hdrisDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });

  const manifest = {
    updatedAt: new Date().toISOString(),
    licence: 'CC0 1.0 Universal (Public Domain Dedication)',
    termsSummary: 'Free for personal and commercial use without attribution or royalties. Attribution preserved in manifest.',
    source: 'https://polyhaven.com',
    textures: {},
    hdris: {},
    models: {},
    proceduralFallbacks: {
      brass: {
        description: 'Physical metallic PBR tuned with brushed_metal micro-roughness/normal maps and brass specular albedo',
        licence: 'Procedural Shader / CC0 derivative'
      },
      glass_frosted: {
        description: 'Physical transmission PBR with micro-surface roughness and IOR 1.45',
        licence: 'Procedural Shader / Three.js MeshPhysicalMaterial'
      }
    }
  };

  let totalBytes = 0;

  // 1. Process Textures
  for (const spec of TEXTURE_SPECS) {
    console.log(`\nProcessing texture: ${spec.semantic} (${spec.polyhavenId})...`);
    await sleep(200);

    let meta = {};
    let fileInfo = {};
    try {
      meta = await fetchJson(`https://api.polyhaven.com/info/${spec.polyhavenId}`);
      await sleep(150);
      fileInfo = await fetchJson(`https://api.polyhaven.com/files/${spec.polyhavenId}`);
    } catch (err) {
      console.error(`  Error fetching Poly Haven info for ${spec.polyhavenId}:`, err.message);
      continue;
    }

    const outFolder = path.join(texturesDir, spec.semantic);
    fs.mkdirSync(outFolder, { recursive: true });

    const mapTargets = [
      { key: 'albedo', candidate: fileInfo.Diffuse?.['1k']?.jpg || fileInfo.Diffuse?.['1k']?.png },
      { key: 'normal', candidate: fileInfo.nor_gl?.['1k']?.jpg || fileInfo.nor_gl?.['1k']?.png },
      { key: 'roughness', candidate: fileInfo.Rough?.['1k']?.jpg || fileInfo.Rough?.['1k']?.png },
      { key: 'ao', candidate: fileInfo.ao?.['1k']?.jpg || fileInfo.AO?.['1k']?.jpg || fileInfo.ao?.['1k']?.png || fileInfo.AO?.['1k']?.png },
    ];

    const savedMaps = {};

    for (const map of mapTargets) {
      if (!map.candidate || !map.candidate.url) {
        continue;
      }

      const outName = `${map.key}.webp`;
      const outPath = path.join(outFolder, outName);
      const relPath = `/assets/textures/${spec.semantic}/${outName}`;

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        const sz = fs.statSync(outPath).size;
        totalBytes += sz;
        savedMaps[map.key] = {
          file: relPath,
          sizeBytes: sz,
          sourceUrl: map.candidate.url,
          format: 'webp'
        };
        continue;
      }

      try {
        await sleep(120);
        const rawBuf = await downloadBuffer(map.candidate.url);
        const quality = (map.key === 'normal' || map.key === 'roughness') ? 90 : 85;
        const webpBuf = await sharp(rawBuf).webp({ quality, effort: 4 }).toBuffer();
        fs.writeFileSync(outPath, webpBuf);

        const sz = webpBuf.length;
        totalBytes += sz;
        savedMaps[map.key] = {
          file: relPath,
          sizeBytes: sz,
          sourceUrl: map.candidate.url,
          format: 'webp'
        };
        console.log(`  ✓ ${map.key}: ${(sz / 1024).toFixed(1)} KB`);
      } catch (err) {
        console.error(`  ✗ Error processing ${map.key}:`, err.message);
      }
    }

    manifest.textures[spec.semantic] = {
      semanticName: spec.semantic,
      polyhavenId: spec.polyhavenId,
      assetName: meta.name || spec.polyhavenId,
      authors: meta.authors || { 'Poly Haven Team': 'All' },
      licence: 'CC0 1.0 Universal',
      realScaleMeters: spec.realScaleMeters,
      category: spec.category,
      maps: savedMaps
    };
  }

  // 2. Process HDRIs
  for (const hdri of HDRI_SPECS) {
    console.log(`\nProcessing HDRI: ${hdri.id}...`);
    await sleep(200);

    const outPath = path.join(hdrisDir, hdri.filename);
    const relPath = `/assets/hdris/${hdri.filename}`;

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
      const sz = fs.statSync(outPath).size;
      totalBytes += sz;
      manifest.hdris[hdri.id] = {
        id: hdri.id,
        filename: relPath,
        sizeBytes: sz,
        licence: 'CC0 1.0 Universal'
      };
      console.log(`  ✓ HDRI cached (${(sz / 1024 / 1024).toFixed(2)} MB)`);
      continue;
    }

    try {
      const fileInfo = await fetchJson(`https://api.polyhaven.com/files/${hdri.id}`);
      const hdrUrl = fileInfo.hdri?.['1k']?.hdr?.url;
      if (!hdrUrl) continue;
      await sleep(150);
      const buf = await downloadBuffer(hdrUrl);
      fs.writeFileSync(outPath, buf);
      const sz = buf.length;
      totalBytes += sz;
      manifest.hdris[hdri.id] = {
        id: hdri.id,
        filename: relPath,
        sizeBytes: sz,
        sourceUrl: hdrUrl,
        licence: 'CC0 1.0 Universal'
      };
      console.log(`  ✓ HDRI downloaded: ${(sz / 1024 / 1024).toFixed(2)} MB`);
    } catch (err) {
      console.error(`  ✗ Error downloading HDRI ${hdri.id}:`, err.message);
    }
  }

  // 3. Process 3D Models
  for (const mSpec of MODEL_SPECS) {
    console.log(`\nProcessing 3D Model: ${mSpec.id} (${mSpec.semantic})...`);
    await sleep(250);

    let meta = {};
    let fileInfo = {};
    try {
      meta = await fetchJson(`https://api.polyhaven.com/info/${mSpec.id}`);
      await sleep(180);
      fileInfo = await fetchJson(`https://api.polyhaven.com/files/${mSpec.id}`);
    } catch (err) {
      console.error(`  Error fetching Poly Haven info for model ${mSpec.id}:`, err.message);
      continue;
    }

    const gltfPkg = fileInfo.gltf?.['1k']?.gltf;
    if (!gltfPkg || !gltfPkg.url) {
      console.error(`  1k glTF not found for ${mSpec.id}`);
      continue;
    }

    const modelFolder = path.join(modelsDir, mSpec.id);
    fs.mkdirSync(modelFolder, { recursive: true });

    // Download main .gltf
    const gltfFileName = `${mSpec.id}_1k.gltf`;
    const gltfFilePath = path.join(modelFolder, gltfFileName);
    const gltfRelPath = `/assets/models/${mSpec.id}/${gltfFileName}`;

    let modelBytes = 0;

    if (!fs.existsSync(gltfFilePath)) {
      try {
        await sleep(120);
        const gltfBuf = await downloadBuffer(gltfPkg.url);
        fs.writeFileSync(gltfFilePath, gltfBuf);
        modelBytes += gltfBuf.length;
      } catch (err) {
        console.error(`  ✗ Error downloading .gltf for ${mSpec.id}:`, err.message);
      }
    } else {
      modelBytes += fs.statSync(gltfFilePath).size;
    }

    // Download included files (.bin, textures)
    if (gltfPkg.include) {
      for (const [relPath, incMeta] of Object.entries(gltfPkg.include)) {
        const destPath = path.join(modelFolder, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
          modelBytes += fs.statSync(destPath).size;
          continue;
        }

        try {
          await sleep(150);
          const incBuf = await downloadBuffer(incMeta.url);
          fs.writeFileSync(destPath, incBuf);
          modelBytes += incBuf.length;
          console.log(`    + included: ${relPath} (${(incBuf.length / 1024).toFixed(1)} KB)`);
        } catch (err) {
          console.error(`    ✗ Error downloading ${relPath}:`, err.message);
        }
      }
    }

    totalBytes += modelBytes;
    manifest.models[mSpec.semantic] = {
      semanticName: mSpec.semantic,
      polyhavenId: mSpec.id,
      assetName: meta.name || mSpec.id,
      authors: meta.authors || { 'Poly Haven Team': 'All' },
      licence: 'CC0 1.0 Universal',
      category: mSpec.category,
      gltfPath: gltfRelPath,
      sizeBytes: modelBytes,
      sizeFormatted: `${(modelBytes / 1024 / 1024).toFixed(2)} MB`,
      defaultScale: mSpec.defaultScale
    };
    console.log(`  ✓ Model ${mSpec.id} complete: ${(modelBytes / 1024 / 1024).toFixed(2)} MB`);
  }

  manifest.totalSizeBytes = totalBytes;
  manifest.totalSizeFormatted = `${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Also write THIRD_PARTY_ASSETS.md
  let doc = `# Third-Party Assets & Attribution\n\n`;
  doc += `All 3D models, textures, and environment HDRIs in Sonic Architecture are licensed under **Creative Commons 0 1.0 Universal (Public Domain Dedication)** sourced from Poly Haven.\n\n`;
  doc += `> Total asset package footprint: **${manifest.totalSizeFormatted}** (Budget limit: 40 MB)\n\n`;
  doc += `## 1. 3D Furniture & Prop Models (CC0)\n\n`;
  doc += `| Semantic Name | Poly Haven ID | Asset Title | Author(s) | Category | Package Size |\n`;
  doc += `|---|---|---|---|---|---|\n`;
  for (const m of Object.values(manifest.models)) {
    const authors = Object.keys(m.authors).join(', ');
    doc += `| \`${m.semanticName}\` | [${m.polyhavenId}](https://polyhaven.com/a/${m.polyhavenId}) | ${m.assetName} | ${authors} | ${m.category} | ${m.sizeFormatted} |\n`;
  }

  doc += `\n## 2. PBR Photographic Texture Sets (CC0)\n\n`;
  doc += `| Semantic Name | Poly Haven ID | Texture Title | Author(s) | Category | Real-World Scale |\n`;
  doc += `|---|---|---|---|---|---|\n`;
  for (const t of Object.values(manifest.textures)) {
    const authors = Object.keys(t.authors).join(', ');
    doc += `| \`${t.semanticName}\` | [${t.polyhavenId}](https://polyhaven.com/a/${t.polyhavenId}) | ${t.assetName} | ${authors} | ${t.category} | ${t.realScaleMeters}m |\n`;
  }

  doc += `\n## 3. High Dynamic Range Environments (HDRIs - CC0)\n\n`;
  for (const h of Object.values(manifest.hdris)) {
    doc += `- **${h.id}**: \`${h.filename}\` (${(h.sizeBytes / 1024 / 1024).toFixed(2)} MB) — CC0 1.0 Universal\n`;
  }

  doc += `\n## 4. Procedural / Mathematical Shaders\n\n`;
  for (const [k, p] of Object.entries(manifest.proceduralFallbacks)) {
    doc += `- **\`${k}\`**: ${p.description} (${p.licence})\n`;
  }

  const docPath = path.resolve(rootDir, 'THIRD_PARTY_ASSETS.md');
  fs.writeFileSync(docPath, doc, 'utf8');

  console.log('\n=== Download, Manifest & THIRD_PARTY_ASSETS.md Complete ===');
  console.log(`Total Asset Size: ${manifest.totalSizeFormatted} (budget: 40 MB)`);
  console.log(`Manifest saved to: ${manifestPath}`);
  console.log(`Attribution document saved to: ${docPath}`);
}

main().catch((err) => {
  console.error('Fatal error in fetch-assets.mjs:', err);
  process.exit(1);
});
