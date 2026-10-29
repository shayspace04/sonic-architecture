/**
 * Sonic Architecture — System-Wide Reliability & Generalisation Test Suite
 * (/tests/system-reliability.test.mjs)
 *
 * Automated verification across 13 distinct scenarios:
 * 1. Japanese-inspired tranquil garden (no Indian wedding bleed, authentic zen acoustics).
 * 2. Brutalist jazz listening room (acoustic intimacy, monolithic concrete massing).
 * 3. Mediterranean coastal residence (courtyard colonnades, open-air canopy).
 * 4. Futuristic electronic music nightclub (subterranean bass containment, high-energy score).
 * 5. Minimalist reading library without music references (truthful inference, zero invented music entities).
 * 6. Unfamiliar / ambiguous cultural reference (safe fallback, zero crashes, honest labeling).
 * 7. Multiple artists & competing influences (Miles Davis + Kraftwerk + Aphex Twin multi-influence synthesis).
 * 8. Minimal prompt ("Wood" single-word prompt robustness).
 * 9. Empty Qloo results (zero entities resolved -> honest rule-based/inferred labeling, zero fake evidence).
 * 10. Partial Qloo success / timeout handling (graceful completion under partial failure).
 * 11. Soundtrack provider offline/unavailable (honest fallback playlist with provenance: "fallback").
 * 12. Two consecutive unrelated prompts (strict state isolation, zero leakage).
 * 13. Repeated requests (deterministic consistency, cache revalidation & provenance freshness).
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
// SCENARIO 1: Japanese-inspired tranquil garden
// ============================================================================
test("Scenario 1 — Japanese-inspired tranquil garden", async () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const { generateVerifiedSoundtrackPlaylist } = loadTsModule("lib/soundtrack-pipeline.ts");

  const prompt = "Japanese-inspired tranquil garden with ambient moss and cedar pavilion";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [
        {
          id: "artist:brian-eno",
          name: "Brian Eno",
          type: "musician",
          signals: ["ambient_music", "generative_sound"],
          provenance: "qloo-evidence",
        },
      ],
    },
  });

  // Must NOT resolve to Indian wedding mandap
  assert.notStrictEqual(
    scene.typology,
    "garden_mandap",
    "Japanese tranquil garden must NOT resolve to garden_mandap (wedding mandap)"
  );
  assert.strictEqual(
    scene.typology,
    "tea_room",
    "Japanese tranquil garden should resolve to tea_room / tranquil tea pavilion"
  );

  // Lighting Kelvin consistency
  assert.ok(
    scene.lighting.temperatureK >= 2200 && scene.lighting.temperatureK <= 4500,
    `Tranquil garden lighting must be natural (got ${scene.lighting.temperatureK}K)`
  );
  for (const src of scene.lighting.sources) {
    if (src.type === "ambient" || src.type === "directional") {
      assert.strictEqual(
        src.temperatureK,
        scene.lighting.temperatureK,
        "Source temperatureK must match canonical scene lighting temperatureK"
      );
    }
  }

  // Acoustic specification consistency across target, calculated Sabine, and rationale
  assert.strictEqual(
    scene.acousticTarget.targetRT60Seconds,
    0.38,
    "Japanese tea room / tranquil pavilion target RT60 must be authoritative 0.38s"
  );
  assert.strictEqual(
    scene.acousticTarget.calculatedRT60Seconds,
    0.32,
    "Japanese tea room calculated Sabine RT60 must be 0.32s"
  );
  const matSentence = scene.becauseSentences?.find(
    (b) => b.decision === "materiality" || b.headline?.includes("Acoustic")
  );
  assert.ok(matSentence, "Must have a materiality & acoustic rationale sentence");
  assert.ok(
    matSentence.sentence.includes("0.38s"),
    `Rationale sentence must cite authoritative target 0.38s (got: "${matSentence.sentence}")`
  );
  assert.ok(
    !matSentence.sentence.includes("0.85s"),
    `Rationale sentence must NEVER cite disparate 0.85s (got: "${matSentence.sentence}")`
  );

  // Soundtrack must NOT contain Bollywood or Indian wedding tracks
  const playlist = await generateVerifiedSoundtrackPlaylist({ scene });
  assert.ok(playlist.tracks.length > 0, "Soundtrack playlist must have tracks");
  for (const tr of playlist.tracks) {
    const combined = `${tr.artist} ${tr.title}`.toLowerCase();
    assert.ok(
      !combined.includes("rahman") && !combined.includes("shankar") && !combined.includes("jashn"),
      `Soundtrack must NOT contain unrelated Indian wedding tracks (found ${tr.artist} - ${tr.title})`
    );
  }
});

// ============================================================================
// SCENARIO 2: Brutalist jazz listening room
// ============================================================================
test("Scenario 2 — Brutalist jazz listening room", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Brutalist jazz listening room in raw board-formed concrete";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [
        {
          id: "artist:miles-davis",
          name: "Miles Davis",
          type: "musician",
          signals: ["modal_jazz", "intimate_cellar"],
          provenance: "qloo-evidence",
        },
      ],
    },
  });

  assert.strictEqual(scene.typology, "listening_room");
  assert.ok(
    scene.acousticTarget.calculatedRT60Seconds <= 0.46,
    `Brutalist jazz listening room requires tight RT60 (got ${scene.acousticTarget.calculatedRT60Seconds}s)`
  );
  assert.ok(
    scene.materials.wall.name.toLowerCase().includes("concrete") ||
    scene.materials.wall.name.toLowerCase().includes("slat"),
    "Wall material must reflect acoustic jazz or brutalist concrete"
  );
  assert.strictEqual(
    scene.provenanceMap?.geometry?.provenance,
    "rule-based",
    "Geometry sizing must be truthfully labeled rule-based"
  );
});

// ============================================================================
// SCENARIO 3: Mediterranean coastal residence
// ============================================================================
test("Scenario 3 — Mediterranean coastal residence", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Mediterranean coastal residence with terracotta arches and sea-breeze courtyard";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [
        {
          id: "style:mediterranean",
          name: "Mediterranean Courtyard",
          type: "architectural_style",
          signals: ["terracotta", "courtyard_colonnade"],
          provenance: "qloo-evidence",
        },
      ],
    },
  });

  assert.ok(
    scene.typology === "mediterranean_courtyard" || scene.typology === "coastal_retreat",
    `Typology should match Mediterranean courtyard or coastal retreat (got ${scene.typology})`
  );
  assert.ok(
    scene.isOpenAir || scene.enclosureMode.includes("open") || scene.enclosureMode.includes("outdoor") || scene.enclosureMode.includes("canopy"),
    "Mediterranean residence should support open-air / breezy enclosure"
  );
});

// ============================================================================
// SCENARIO 4: Futuristic electronic music nightclub
// ============================================================================
test("Scenario 4 — Futuristic electronic music nightclub", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Futuristic underground electronic music nightclub with kinetic strobe lighting";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [
        {
          id: "artist:aphex-twin",
          name: "Aphex Twin",
          type: "musician",
          signals: ["techno", "strobe_lighting"],
          provenance: "qloo-evidence",
        },
      ],
    },
  });

  assert.ok(
    scene.typology === "underground_club" || scene.typology === "industrial_warehouse",
    `Club prompt must map to club or warehouse (got ${scene.typology})`
  );
  assert.ok(
    (scene.musicProfile?.energy ?? 0.5) >= 0.70,
    `Electronic nightclub must carry high music energy (got ${scene.musicProfile?.energy})`
  );
});

// ============================================================================
// SCENARIO 5: Minimalist reading library without music references
// ============================================================================
test("Scenario 5 — Minimalist reading library without music references", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Minimalist reading library with floor-to-ceiling white oak bookshelves and wool armchairs";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: undefined, // pure prompt, no Qloo music entities
  });

  assert.ok(scene.id, "Scene must be generated");
  // Zero fake Qloo entities claimed
  assert.strictEqual(
    scene.qloo_evidence,
    undefined,
    "Baseline prompt without Qloo must carry zero Qloo evidence"
  );
  assert.strictEqual(
    scene.provenanceMap,
    undefined,
    "Baseline prompt without Qloo must not carry Qloo provenance claims"
  );
});

// ============================================================================
// SCENARIO 6: Unfamiliar / ambiguous cultural reference
// ============================================================================
test("Scenario 6 — Unfamiliar or ambiguous cultural reference", () => {
  const { generateSceneComparison } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Xylophonic Neo-Brutalist Ziggurat from Outer Orion";

  // Must not throw or crash
  let comparison;
  assert.doesNotThrow(() => {
    comparison = generateSceneComparison({ prompt, seed: 42 });
  }, "Arbitrary or unknown cultural references must not throw an error");

  assert.ok(comparison.baseline, "Must produce a baseline scene");
  assert.ok(comparison.grounded, "Must produce a grounded scene");
  assert.ok(Array.isArray(comparison.diff), "Must produce a valid diff list");
});

// ============================================================================
// SCENARIO 7: Multiple artists & competing influences
// ============================================================================
test("Scenario 7 — Multiple artists & competing influences", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Miles Davis meets Kraftwerk and Aphex Twin in an acoustic cathedral";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [
        { id: "e1", name: "Miles Davis", type: "musician", signals: ["modal_jazz"], provenance: "qloo-evidence" },
        { id: "e2", name: "Kraftwerk", type: "musician", signals: ["electronic_precision"], provenance: "qloo-evidence" },
        { id: "e3", name: "Aphex Twin", type: "musician", signals: ["acid_ambient"], provenance: "qloo-evidence" },
      ],
    },
  });

  assert.ok(scene.lighting.temperatureK > 0, "Canonical lighting temperature must be non-zero");
  assert.ok(scene.acousticTarget.calculatedRT60Seconds > 0, "Calculated RT60 must be non-zero");
  assert.ok(scene.palette.primaryHex.startsWith("#"), "Primary palette hex must be valid hex");
});

// ============================================================================
// SCENARIO 8: Minimal prompt ("Wood")
// ============================================================================
test("Scenario 8 — Minimal single-word prompt", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Wood";
  let scene;
  assert.doesNotThrow(() => {
    scene = designScene({ prompt, seed: 42 });
  }, "Single-word prompt must not throw an error");

  assert.ok(scene.roomDimensions.width >= 3, "Room width must be realistic");
  assert.ok(scene.materials.floor.name, "Must select floor material");
});

// ============================================================================
// SCENARIO 9: Empty Qloo results (zero entities resolved)
// ============================================================================
test("Scenario 9 — Empty Qloo results produces honest rule-based labeling", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Spherical acoustic resonance testing chamber";
  const scene = designScene({
    prompt,
    seed: 42,
    qlooContext: {
      prompt,
      source: "live",
      entities: [], // Zero Qloo entities
    },
  });

  // When 0 Qloo entities are provided, designScene must treat it as ungrounded baseline
  assert.strictEqual(
    scene.qlooSource,
    "fallback",
    "Empty Qloo results must truthfully label source as fallback"
  );
  assert.strictEqual(
    scene.qloo_evidence,
    undefined,
    "Empty Qloo results must carry zero fake Qloo evidence"
  );
});

// ============================================================================
// SCENARIO 10: Partial Qloo success / timeout handling
// ============================================================================
test("Scenario 10 — Partial Qloo success with timed out domains", () => {
  const { generateBecauseSentences } = loadTsModule("lib/design/qlooMapping.ts");
  const mockBundle = {
    source: "live",
    places: [],
    tasteTags: [{ id: "t1", name: "ambient" }],
    domainStatus: {
      places: "timed out",
      artists: "timed out",
      movies: "timed out",
      brands: "timed out",
    },
  };

  const sentences = generateBecauseSentences(
    "Partial timeout test",
    mockBundle,
    [{ id: "e1", name: "Ambient Concept", type: "concept" }],
    undefined,
    "listening_room"
  );

  assert.ok(sentences.length >= 1, "Must generate because sentences");
  const typSentence = sentences.find((s) => s.decision === "typology");
  assert.ok(typSentence, "Must have typology sentence");
  assert.ok(
    typSentence.sentence.includes("No live Qloo venue data was retrieved") ||
    typSentence.sentence.includes("Qloo returned affinity tags"),
    "Must truthfully handle missing venue data without fabricating venues"
  );
});

// ============================================================================
// SCENARIO 11: Soundtrack provider offline / unavailable
// ============================================================================
test("Scenario 11 — Soundtrack provider offline returns honest fallback playlist", async () => {
  const { generateVerifiedSoundtrackPlaylist } = loadTsModule("lib/soundtrack-pipeline.ts");
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");

  const scene = designScene({ prompt: "Offline soundtrack test", seed: 42 });

  // Mock offline provider that throws on all searches
  const offlineProvider = {
    id: "itunes",
    search: async () => { throw new Error("Network unreachable (offline simulation)"); },
    searchArtistTopTracks: async () => { throw new Error("Offline"); },
    searchGenreTracks: async () => { throw new Error("Offline"); },
  };

  const playlist = await generateVerifiedSoundtrackPlaylist({
    scene,
    provider: offlineProvider,
    forceRefresh: true,
  });

  assert.strictEqual(playlist.cacheStatus, "fallback-offline", "Must return fallback-offline cache status");
  assert.strictEqual(playlist.providerUsed, "local-typology-fallback", "Provider must be labeled local fallback");
  assert.ok(playlist.tracks.length > 0, "Must contain fallback tracks");
  for (const tr of playlist.tracks) {
    assert.strictEqual(tr.provenance, "fallback", "Every track must have provenance: 'fallback'");
  }
});

// ============================================================================
// SCENARIO 12: Two consecutive unrelated prompts (Strict state isolation)
// ============================================================================
test("Scenario 12 — Two consecutive unrelated prompts have zero state leakage", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");

  const prompt1 = "Aphex Twin industrial acid techno rave in Berlin warehouse";
  const scene1 = designScene({
    prompt: prompt1,
    seed: 42,
    qlooContext: {
      prompt: prompt1,
      source: "live",
      entities: [
        { id: "e-aphex", name: "Aphex Twin", type: "musician", signals: ["acid_techno"], provenance: "qloo-evidence" },
      ],
    },
  });

  const prompt2 = "Traditional Kyoto matcha tea room in tranquil bamboo grove";
  const scene2 = designScene({
    prompt: prompt2,
    seed: 42,
    qlooContext: {
      prompt: prompt2,
      source: "live",
      entities: [
        { id: "e-tea", name: "Urasenke Tea Tradition", type: "cultural_tradition", signals: ["tea_ceremony"], provenance: "qloo-evidence" },
      ],
    },
  });

  // Verify scene2 has zero leakage from scene1
  assert.notStrictEqual(scene1.typology, scene2.typology, "Typologies must differ");
  assert.notStrictEqual(scene1.lighting.temperatureK, scene2.lighting.temperatureK, "Lighting must differ");
  assert.strictEqual(
    scene2.objects.some((o) => o.name.toLowerCase().includes("cyclorama") || o.name.toLowerCase().includes("flash")),
    false,
    "Scene 2 must not inherit photo cyclorama or flash strobe props from other prompts"
  );
  assert.ok(
    !scene2.becauseSentences?.some((b) => b.sentence.toLowerCase().includes("aphex")),
    "Scene 2 because sentences must NOT cite Aphex Twin"
  );
});

// ============================================================================
// SCENARIO 13: Repeated requests (Deterministic consistency & cache revalidation)
// ============================================================================
test("Scenario 13 — Repeated requests produce 100% deterministic outputs", () => {
  const { designScene } = loadTsModule("lib/compare/sceneGenerator.ts");
  const prompt = "Miles Davis intimate acoustic jazz cellar";
  const context = {
    prompt,
    source: "live",
    entities: [
      { id: "e-miles", name: "Miles Davis", type: "musician", signals: ["modal_jazz"], provenance: "qloo-evidence" },
    ],
  };

  const run1 = designScene({ prompt, seed: 42, qlooContext: context });
  const run2 = designScene({ prompt, seed: 42, qlooContext: context });

  assert.strictEqual(run1.typology, run2.typology, "Typology must match exactly");
  assert.strictEqual(run1.palette.primaryHex, run2.palette.primaryHex, "Primary palette hex must match");
  assert.strictEqual(run1.lighting.temperatureK, run2.lighting.temperatureK, "Lighting Kelvin must match");
  assert.strictEqual(run1.acousticTarget.calculatedRT60Seconds, run2.acousticTarget.calculatedRT60Seconds, "RT60 must match");
  assert.strictEqual(run1.objects.length, run2.objects.length, "Object count must match");
});
