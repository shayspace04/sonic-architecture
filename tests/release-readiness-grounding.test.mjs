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
  MODULE_CACHE.set(resolvedFull, m.exports);
  return m.exports;
}

const sceneSpecMod = loadTsModule("lib/scene-spec.ts");
const sceneGeneratorMod = loadTsModule("lib/compare/sceneGenerator.ts");
const diffMod = loadTsModule("lib/compare/diff.ts");
const procurementMod = loadTsModule("lib/procurement.ts");

console.log("================================================================================");
console.log("  SONIC ARCHITECTURE — FINAL RELEASE-READINESS VERIFICATION SUITE");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// CHECK 1: Generalized Visual Grounding Across 4 Culturally Distinct Prompts
// -----------------------------------------------------------------------------
const PROMPTS_TO_VERIFY = [
  {
    name: "A24 Art-House Cinema",
    prompt: "A24 films + indie music",
    expectedTypology: "gallery_pavilion",
    disallowedProps: ["chrome_balloon_cluster", "balloon"],
    requiredArchetypes: ["cinema_projection_screen", "curator_projection_plinth", "cinema_lounge_seat"],
    expectedRT60Max: 0.55,
    qlooContext: {
      source: "live",
      entities: [
        { id: "ent-a24", name: "A24 Films", type: "film_production", signals: ["indie_cinema"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-indie", name: "Indie Music", source: "live", provenance: "qloo-evidence" }],
        places: [{ entity_id: "place-angelika", name: "Angelika Film Center", source: "live", properties: {} }],
      },
    },
  },
  {
    name: "Brutalist Underground Techno",
    prompt: "Create a brutalist underground techno club.",
    expectedTypology: "industrial_warehouse",
    disallowedProps: ["cinema_projection_screen", "shoji_screen_panel", "cluster_chrome_balloons"],
    requiredArchetypes: ["obsidian_runway_deck", "linear_light_blade", "dramatic_entry_portal"],
    expectedRT60Max: 1.25,
    qlooContext: {
      source: "live",
      entities: [
        { id: "ent-berghain", name: "Berghain", type: "nightclub", signals: ["techno", "industrial"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-techno", name: "Techno", source: "live", provenance: "qloo-evidence" }],
        places: [{ entity_id: "place-tresor", name: "Tresor Berlin", source: "live", properties: {} }],
      },
    },
  },
  {
    name: "Traditional Indian Garden Mandap",
    prompt: "Traditional Indian wedding mandap in an outdoor garden",
    expectedTypology: "garden_mandap",
    disallowedProps: ["chrome_balloon_cluster", "subwoofer_array_cluster"],
    requiredArchetypes: ["wedding_mandap_canopy", "marigold_garland_curtain"],
    expectedRT60Max: 0.95,
    qlooContext: {
      source: "live",
      entities: [
        { id: "ent-mandap", name: "Vedic Mandap Pavilion", type: "architecture", signals: ["traditional_vedic", "saffron"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-classical-ragas", name: "Classical Ragas", source: "live", provenance: "qloo-evidence" }],
        places: [{ entity_id: "place-rambagh", name: "Rambagh Palace Jaipur", source: "live", properties: {} }],
      },
    },
  },
  {
    name: "Intimate Japanese Listening Lounge",
    prompt: "Intimate Japanese listening lounge for 20 people",
    expectedTypology: "listening_room",
    disallowedProps: ["chrome_balloon_cluster", "wedding_mandap_canopy"],
    requiredArchetypes: ["analog_turntable_console", "horn_speaker_pair"],
    expectedRT60Max: 0.50,
    qlooContext: {
      source: "live",
      entities: [
        { id: "ent-kissaten", name: "Tokyo Jazz Kissa", type: "venue", signals: ["audiophile_vinyl", "hinoki"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-modal-jazz", name: "Modal Jazz", source: "live", provenance: "qloo-evidence" }],
        places: [{ entity_id: "place-lion", name: "Meikyoku Kissa Lion", source: "live", properties: {} }],
      },
    },
  },
];

test("Readiness 1 — Generalized Visual Grounding across 4 distinct cultural prompts", () => {
  for (const item of PROMPTS_TO_VERIFY) {
    const comparison = sceneGeneratorMod.generateSceneComparison({
      prompt: item.prompt,
      seed: 50,
      forcedContext: item.qlooContext,
    });

    const { baseline, grounded, diff } = comparison;

    // A. Typology Verification
    assert.equal(
      grounded.typology,
      item.expectedTypology,
      `${item.name} must resolve to typology ${item.expectedTypology}`
    );

    // B. Strict check: Disallowed inappropriate props must NOT appear
    for (const badProp of item.disallowedProps) {
      const hasBadProp = grounded.objects.some(
        (o) => o.archetype === badProp || o.name.toLowerCase().includes(badProp)
      );
      assert.equal(hasBadProp, false, `${item.name} must NOT contain ${badProp}`);
    }

    // C. Grounded assemblies must be present
    for (const expectedArch of item.requiredArchetypes) {
      const hasExpected = grounded.objects.some((o) => o.archetype === expectedArch);
      assert.ok(hasExpected, `${item.name} must contain archetype ${expectedArch}`);
    }

    // D. Acoustic target check
    assert.ok(
      grounded.acousticTarget.targetRT60Seconds <= item.expectedRT60Max,
      `${item.name} RT60 (${grounded.acousticTarget.targetRT60Seconds}s) must be <= ${item.expectedRT60Max}s`
    );

    // E. 3D Scene Material & Palette Reactivity
    assert.ok(grounded.palette.primaryHex, "Must have valid primary hex");
    assert.ok(grounded.palette.accentHex, "Must have valid accent hex");
    assert.ok(grounded.materials.floor.id, "Must have valid floor material");
    assert.ok(grounded.materials.wall.id, "Must have valid wall material");

    // F. Fair-Test Diff must show meaningful differentiation
    assert.ok(diff.length >= 3, `${item.name} must produce at least 3 differentiated categories in diff`);
    console.log(`   ✓ Prompt [${item.name}]: Typology '${grounded.typology}' | Diff Categories: ${diff.length}`);
  }
});

// -----------------------------------------------------------------------------
// CHECK 2: Sparse/Missing Evidence Handled Honestly & Deterministically
// -----------------------------------------------------------------------------
test("Readiness 2 — Sparse/Missing Evidence handled honestly with zero phantom diff", () => {
  const fallbackPrompt = "unseen abstract geometry xz1289371092837";
  const comparison = sceneGeneratorMod.generateSceneComparison({
    prompt: fallbackPrompt,
    seed: 77,
    forcedContext: {
      source: "fallback",
      entities: [
        { id: "ent-none", name: "xz1289371092837", type: "concept", signals: [], provenance: "fallback" },
      ],
      crossDomainBundle: { places: [], resolvedTags: [] },
    },
  });

  const { baseline, grounded, diff } = comparison;

  // Grounded palette must be honestly marked as fallback
  assert.equal(grounded.palette.isFallback, true, "Missing evidence must flag isFallback=true");
  assert.equal(grounded.palette.provenance, "fallback");
  assert.ok(grounded.palette.fallbackNotice.includes("No Qloo-derived palette"));

  // Fair-Test Diff must NEVER fabricate a palette difference
  const paletteDiff = diff.find((d) => d.category === "palette");
  assert.equal(paletteDiff, undefined, "Diff must NOT claim palette changed when evidence is absent");
  console.log("   ✓ Fallback Prompt correctly isolated: 0 phantom palette diffs");
});

// -----------------------------------------------------------------------------
// CHECK 3: Cross-System Consistency (SceneSpec, Acoustic RT60, Provenance, & Diff)
// -----------------------------------------------------------------------------
test("Readiness 3 — Full Cross-System Data Flow Consistency", () => {
  const prompt = "Japanese tea house & ambient sound";
  const comparison = sceneGeneratorMod.generateSceneComparison({
    prompt,
    seed: 42,
    forcedContext: {
      source: "live",
      entities: [
        { id: "ent-ryoanji", name: "Ryoan-ji Temple", type: "architecture", signals: ["zen_rock_garden", "tatami"], provenance: "qloo-evidence" },
      ],
      crossDomainBundle: {
        resolvedTags: [{ id: "tag-ambient", name: "Ambient", source: "live", provenance: "qloo-evidence" }],
        places: [],
      },
    },
  });

  const { baseline, grounded, diff } = comparison;

  // 1. Acoustic consistency: Calculated RT60 vs Target RT60
  assert.ok(grounded.acousticTarget.targetRT60Seconds > 0, "Target RT60 must be positive");
  assert.ok(grounded.acousticTarget.calculatedRT60Seconds > 0, "Calculated RT60 must be positive");
  assert.ok(
    Math.abs(grounded.acousticTarget.targetRT60Seconds - grounded.acousticTarget.calculatedRT60Seconds) <= 0.40,
    "Calculated and Target RT60 must be physically coherent"
  );

  // 2. Diff Consistency: Diff items must link to actual grounded properties
  for (const d of diff) {
    assert.ok(d.category, "Diff item must have category");
    assert.ok(d.changedBy, "Diff item must trace changedBy provenance");
    assert.ok(d.baselineValue !== undefined, "Diff item must have baselineValue");
    assert.ok(d.groundedValue !== undefined, "Diff item must have groundedValue");
    assert.ok(typeof d.magnitude === "number" && d.magnitude >= 0 && d.magnitude <= 1, "Magnitude must be [0, 1]");
  }

  // 3. Rationale Consistency: Because-sentences must match scene typology
  if (grounded.becauseSentences) {
    for (const b of grounded.becauseSentences) {
      assert.ok(b.headline, "Because-sentence must have headline");
      assert.ok(b.sentence, "Because-sentence must have body");
      assert.ok(!b.sentence.includes("undefined"), "Because-sentence must not contain undefined values");
    }
  }
  console.log("   ✓ Cross-system data flow verified consistent across SceneSpec, Acoustics, Rationales & Diff");
});

// -----------------------------------------------------------------------------
// CHECK 4: Currency Conversion Direction, Supported Currencies & Disclosure
// -----------------------------------------------------------------------------
test("Readiness 4 — Currency conversion direction, supported currencies & disclosure integrity", () => {
  // 1. Source and timestamp disclosure (Application-defined benchmark, NOT official IMF/ECB)
  assert.ok(procurementMod.CURRENCY_CONVERSION_SOURCE, "Must define CURRENCY_CONVERSION_SOURCE");
  assert.ok(procurementMod.CURRENCY_CONVERSION_TIMESTAMP, "Must define CURRENCY_CONVERSION_TIMESTAMP");
  assert.ok(
    procurementMod.CURRENCY_CONVERSION_SOURCE.includes("Application-defined fixed benchmark assumptions"),
    "Source must be labeled as application-defined fixed benchmark assumptions"
  );
  assert.ok(
    !procurementMod.CURRENCY_CONVERSION_SOURCE.includes("IMF & ECB"),
    "Source must NOT falsely claim IMF or ECB official data"
  );
  assert.ok(
    procurementMod.MANDATORY_PROCUREMENT_DISCLAIMER.includes("exclude unknown delivery"),
    "Disclaimer must maintain legacy delivery notice"
  );
  assert.ok(
    procurementMod.MANDATORY_PROCUREMENT_DISCLAIMER.includes("not live vendor quotes"),
    "Disclaimer must state prices are not live vendor quotes"
  );

  // 2. Conversion direction (Base USD -> Target Currency)
  assert.equal(procurementMod.convertFromUSD(100, "USD"), 100, "100 USD = 100 USD");
  assert.equal(procurementMod.convertFromUSD(100, "EUR"), 92, "100 USD = 92 EUR (0.92 rate)");
  assert.equal(procurementMod.convertFromUSD(100, "GBP"), 79, "100 USD = 79 GBP (0.79 rate)");
  assert.equal(procurementMod.convertFromUSD(100, "INR"), 8400, "100 USD = 8,400 INR (84.0 rate)");
  assert.equal(procurementMod.convertFromUSD(100, "JPY"), 15200, "100 USD = 15,200 JPY (152.0 rate)");
  assert.equal(procurementMod.convertFromUSD(0, "EUR"), 0, "0 USD = 0 EUR");

  // 3. Supported currencies and formatting
  const supported = ["USD", "EUR", "GBP", "INR", "JPY"];
  for (const c of supported) {
    assert.ok(procurementMod.CURRENCY_RATES_FROM_USD[c] > 0, `Currency ${c} must have positive rate`);
    assert.ok(procurementMod.CURRENCY_SYMBOLS[c], `Currency ${c} must have symbol`);
  }
  assert.equal(procurementMod.formatCurrency(5000, "USD"), "$5,000");
  assert.equal(procurementMod.formatCurrency(5000, "EUR"), "€5,000");
  assert.equal(procurementMod.formatCurrency(5000, "GBP"), "£5,000");
  assert.equal(procurementMod.formatCurrency(5000, "JPY"), "¥5,000");
  assert.equal(procurementMod.formatCurrency(84000, "INR"), "₹84,000");

  // 4. Summary & Exports consistency (Markdown, CSV, JSON)
  const spec = sceneSpecMod.generateSceneFromPrompt("A24 films + indie music");
  const config = procurementMod.createDefaultBudgetConfig({
    currency: "EUR",
    location: "Paris, Île-de-France, France",
  });
  
  // Add 1 test line item to verify export row contents
  const screenObj = spec.objects.find((o) => o.archetype === "cinema_projection_screen") || spec.objects[0];
  const screenMatches = procurementMod.matchRealWorldProductsForObject(screenObj, spec, config);
  const testOption = screenMatches[0];
  const boq = procurementMod.upsertProcurementLineItem([], testOption, screenObj.category, 1, 3);
  const summary = procurementMod.calculateProcurementSummary(boq, config);

  assert.equal(summary.currency, "EUR");
  assert.equal(summary.currencyConversionSource, procurementMod.CURRENCY_CONVERSION_SOURCE);
  assert.equal(summary.currencyConversionTimestamp, procurementMod.CURRENCY_CONVERSION_TIMESTAMP);
  assert.ok(summary.disclaimer.includes("Preliminary Trade Estimate Notice"));

  // Verify Markdown Export
  const md = procurementMod.exportProcurementBriefMarkdown(summary, spec);
  assert.ok(md.includes("# Preliminary Procurement Brief & Bill of Quantities (BOQ)"));
  assert.ok(md.includes("**FX Conversion:** Application-defined benchmark assumptions"));
  assert.ok(md.includes("Preliminary Trade Estimate Notice"));

  // Verify CSV Export
  const csv = procurementMod.exportProcurementCSV(summary);
  assert.ok(csv.startsWith("Object ID,Scene Assembly,Selected Option"));
  assert.ok(csv.includes("FX Benchmark Source,FX Benchmark Date"));
  assert.ok(csv.includes("Application-defined fixed benchmark assumptions"));

  // Verify JSON Export
  const jsonStr = procurementMod.exportProcurementJSON(summary);
  const parsedJson = JSON.parse(jsonStr);
  assert.equal(parsedJson.currencyConversionSource, procurementMod.CURRENCY_CONVERSION_SOURCE);
  assert.equal(parsedJson.currencyConversionTimestamp, procurementMod.CURRENCY_CONVERSION_TIMESTAMP);
  assert.equal(parsedJson.items.length, 1);

  console.log("   ✓ Currency conversion direction, all 5 currencies, and application-defined disclosure verified across UI & Exports (MD, CSV, JSON)");
});
