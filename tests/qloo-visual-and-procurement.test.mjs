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
const qlooMappingMod = loadTsModule("lib/design/qlooMapping.ts");
const procurementMod = loadTsModule("lib/procurement.ts");
const diffMod = loadTsModule("lib/compare/diff.ts");

// ============================================================================
// PART 1 TESTS: VISIBLE QLOO GROUNDING, AUTHENTIC SCENES & NO MISLEADING COPY
// ============================================================================

test("Test 1 — A24 Films & Indie Music produces authentic Cine-Lounge (Zero pink balloons)", () => {
  const prompt = "A24 films + indie music";
  const baseline = sceneGeneratorMod.designScene({ prompt, seed: 42 });
  
  // Create realistic Qloo context for A24 films & indie music
  const mockA24Context = {
    source: "live",
    entities: [
      {
        id: "ent-a24",
        name: "A24 Films",
        type: "film_production",
        signals: ["art_house_cinema", "subdued_naturalism", "indie_cinema"],
        provenance: "qloo-evidence",
      },
    ],
    crossDomainBundle: {
      resolvedTags: [
        { id: "tag-indie", name: "Indie Music", source: "live", provenance: "qloo-evidence" },
        { id: "tag-ambient-cinema", name: "Art House Cinema", source: "live", provenance: "qloo-evidence" },
      ],
      places: [
        {
          entity_id: "place-bam",
          name: "BAM Rose Cinemas",
          source: "live",
          properties: { description: "Art-house cinema and screening room" },
        },
      ],
    },
  };

  const grounded = sceneGeneratorMod.designScene({
    prompt,
    seed: 42,
    qlooContext: mockA24Context,
  });

  // 1. Verify Grounded Scene Typology & Identity
  assert.equal(grounded.typology, "gallery_pavilion", "A24 prompt must resolve to gallery_pavilion");
  assert.ok(
    grounded.title.toLowerCase().includes("cine") || grounded.title.toLowerCase().includes("screening") || grounded.title.toLowerCase().includes("auteur"),
    "Title must describe a cinematic screening space"
  );

  // 2. Strict Check: NO Pink Grunge Chrome Balloons!
  const hasBalloons = grounded.objects.some(
    (o) => o.archetype === "chrome_balloon_cluster" || o.name.toLowerCase().includes("balloon")
  );
  assert.equal(hasBalloons, false, "A24 films must NEVER contain chrome balloon clusters!");

  // 3. Verify Genuine Architectural & Cinema Assemblies
  const screenObj = grounded.objects.find((o) => o.archetype === "cinema_projection_screen");
  assert.ok(screenObj, "Must include tensioned cinema projection screen");
  assert.ok(screenObj.dimensions[0] >= 5.0, "Screen width must be architectural scale (>= 5m)");

  const plinthObj = grounded.objects.find((o) => o.archetype === "curator_projection_plinth");
  assert.ok(plinthObj, "Must include sculpted curator/projection plinth");

  const seatingObj = grounded.objects.find((o) => o.archetype === "cinema_lounge_seat");
  assert.ok(seatingObj, "Must include archival low-profile cinema seating");

  // 4. Verify Acoustic Calibration for Dialogue & Screen Audio
  assert.ok(grounded.acousticTarget.targetRT60Seconds <= 0.55, "Cinema acoustic target must be tight (<= 0.55s)");
});

test("Test 2 — Baseline and Grounded are genuinely isolated & differentiated", () => {
  const prompt = "Brutalist jazz listening room in Kyoto";
  const baseline = sceneGeneratorMod.designScene({ prompt, seed: 100 });
  
  const mockJazzContext = {
    source: "live",
    entities: [
      {
        id: "ent-miles",
        name: "Miles Davis",
        type: "artist",
        signals: ["modal_jazz", "trumpet", "cool_jazz"],
        provenance: "qloo-evidence",
      },
    ],
    crossDomainBundle: {
      resolvedTags: [
        { id: "tag-modal-jazz", name: "Modal Jazz", source: "live", provenance: "qloo-evidence" },
      ],
      places: [
        {
          entity_id: "place-blue-note",
          name: "Blue Note Tokyo",
          source: "live",
          properties: { description: "Intimate jazz club" },
        },
      ],
    },
  };

  const grounded = sceneGeneratorMod.designScene({
    prompt,
    seed: 100,
    qlooContext: mockJazzContext,
  });

  // Verify Baseline has ZERO Qloo traces
  assert.equal(baseline.qlooSource, "fallback");
  assert.equal(baseline.qloo_evidence, undefined);
  assert.equal(baseline.comparison, undefined);

  // Verify Grounded carries verified evidence and modulated values
  assert.equal(grounded.qlooSource, "live");
  assert.notEqual(baseline.palette.floorHex, grounded.palette.floorHex, "Grounded palette must reflect cultural signals");
  assert.notEqual(baseline.lighting.temperatureK, grounded.lighting.temperatureK, "Grounded lighting temperature must modulate");
});

test("Test 3 — Sparse/Unavailable Qloo data produces honest fallback with ZERO contradictory Diff", () => {
  const prompt = "Random unknown theoretical geometry 908123";
  const baseline = sceneGeneratorMod.designScene({ prompt, seed: 7 });
  const grounded = sceneGeneratorMod.designScene({
    prompt,
    seed: 7,
    qlooContext: {
      source: "fallback",
      entities: [
        {
          id: "ent-nonsense",
          name: "xqzqwk 987123984712",
          type: "concept",
          signals: [],
          provenance: "fallback",
        },
      ],
      crossDomainBundle: { places: [], resolvedTags: [] },
    },
  });

  // In fallback mode, grounded palette is flagged as fallback
  assert.equal(grounded.palette.isFallback, true);
  assert.equal(grounded.palette.provenance, "fallback");
  assert.ok(grounded.palette.fallbackNotice.includes("No Qloo-derived palette"));

  // Fair-Test Diff must NEVER claim Qloo changed the palette when palette is fallback!
  const diffs = diffMod.diffScenes(baseline, grounded);
  const paletteDiff = diffs.find((d) => d.category === "palette");
  assert.equal(
    paletteDiff,
    undefined,
    "Fair-Test Diff must NEVER fabricate a palette change when fallback palette is active"
  );
});

// ============================================================================
// PART 2 TESTS: REAL-WORLD PROCUREMENT, LOCATION, BUY/RENT/CUSTOM, & BOQ
// ============================================================================

test("Test 4 — Location selection updates vendor directories, regional dispatch & search queries", () => {
  const spec = sceneSpecMod.generateSceneFromPrompt("A24 films + indie music");
  const targetObj = spec.objects.find((o) => o.archetype === "cinema_projection_screen") || spec.objects[0];

  // 1. Test US / New York Location
  const configNY = procurementMod.createDefaultBudgetConfig({
    location: "New York, NY, USA",
    currency: "USD",
  });
  const matchesNY = procurementMod.matchRealWorldProductsForObject(targetObj, spec, configNY);
  const rentMatchNY = matchesNY.find((m) => m.sourcingMethod === "rent");
  assert.ok(rentMatchNY.supplierName.includes("PRG") || rentMatchNY.supplierName.includes("4Wall"));
  assert.ok(rentMatchNY.supplierSearchUrl.includes("New%20York"));

  // 2. Test UK / London Location
  const configLondon = procurementMod.createDefaultBudgetConfig({
    location: "London, Greater London, UK",
    currency: "GBP",
  });
  const matchesLondon = procurementMod.matchRealWorldProductsForObject(targetObj, spec, configLondon);
  const rentMatchLondon = matchesLondon.find((m) => m.sourcingMethod === "rent");
  assert.ok(rentMatchLondon.supplierName.includes("Solotech UK") || rentMatchLondon.supplierName.includes("PRG UK"));
  assert.ok(rentMatchLondon.supplierSearchUrl.includes("London"));

  // 3. Test Japan / Tokyo Location
  const configTokyo = procurementMod.createDefaultBudgetConfig({
    location: "Tokyo, Kanto, Japan",
    currency: "JPY",
  });
  const matchesTokyo = procurementMod.matchRealWorldProductsForObject(targetObj, spec, configTokyo);
  const rentMatchTokyo = matchesTokyo.find((m) => m.sourcingMethod === "rent");
  assert.ok(rentMatchTokyo.supplierName.includes("Sound Crew Tokyo") || rentMatchTokyo.supplierName.includes("Actio"));
  assert.ok(rentMatchTokyo.currency === "JPY");

  // 4. Test India / Bhubaneswar Location
  const configIndia = procurementMod.createDefaultBudgetConfig({
    location: "Bhubaneswar, Odisha, India",
    currency: "INR",
  });
  const matchesIndia = procurementMod.matchRealWorldProductsForObject(targetObj, spec, configIndia);
  const rentMatchIndia = matchesIndia.find((m) => m.sourcingMethod === "rent");
  assert.ok(rentMatchIndia.supplierName.includes("IndiaMART"));
  assert.equal(rentMatchIndia.isLocalVendorMatch, true);
});

test("Test 5 — BUY, RENT, and CUSTOM functional procurement modes produce distinct calculations", () => {
  const spec = sceneSpecMod.generateSceneFromPrompt("A24 films + indie music");
  const targetObj = spec.objects.find((o) => o.archetype === "curator_projection_plinth") || spec.objects[0];

  const budgetConfig = procurementMod.createDefaultBudgetConfig({
    currency: "USD",
    location: "New York, NY, USA",
    rentalDurationDays: 4,
  });

  const matches = procurementMod.matchRealWorldProductsForObject(targetObj, spec, budgetConfig);

  const buyOption = matches.find((m) => m.sourcingMethod === "buy" && m.tier === "recommended");
  const rentOption = matches.find((m) => m.sourcingMethod === "rent" && m.tier === "recommended");
  const customOption = matches.find((m) => m.sourcingMethod === "custom" && m.tier === "recommended");

  assert.ok(buyOption, "Must return buy option");
  assert.ok(rentOption, "Must return rent option");
  assert.ok(customOption, "Must return custom option");

  // BUY should be lump sum / per unit purchase
  assert.equal(buyOption.pricingPeriod, "per_unit");
  assert.equal(buyOption.estimatedLineTotalInUserCurrency, buyOption.unitPriceUSD * buyOption.recommendedQuantity);

  // RENT should multiply by rentalDurationDays (4 days)
  assert.equal(rentOption.pricingPeriod, "per_day");
  assert.equal(
    rentOption.estimatedLineTotalInUserCurrency,
    rentOption.unitPriceUSD * rentOption.recommendedQuantity * 4,
    "Rental subtotal must equal daily rate * quantity * duration"
  );

  // CUSTOM should reflect bespoke fabrication lead time
  assert.ok(customOption.leadTimeOrDeliveryNote.toLowerCase().includes("fabrication"));
  assert.ok(customOption.title.toLowerCase().includes("bespoke") || customOption.title.toLowerCase().includes("custom"));
});

test("Test 6 — BOQ Lifecycle: Upsert, Quantity Update, Multi-Item Summary & Exports (CSV, JSON, MD)", () => {
  const spec = sceneSpecMod.generateSceneFromPrompt("A24 films + indie music");
  const screenObj = spec.objects.find((o) => o.archetype === "cinema_projection_screen") || spec.objects[0];
  const plinthObj = spec.objects.find((o) => o.archetype === "curator_projection_plinth") || spec.objects[1];

  const budgetConfig = procurementMod.createDefaultBudgetConfig({
    currency: "USD",
    totalBudget: 50000,
    rentalDurationDays: 3,
  });

  const screenMatches = procurementMod.matchRealWorldProductsForObject(screenObj, spec, budgetConfig);
  const plinthMatches = procurementMod.matchRealWorldProductsForObject(plinthObj, spec, budgetConfig);

  const screenRent = screenMatches.find((m) => m.sourcingMethod === "rent" && m.tier === "recommended");
  const plinthBuy = plinthMatches.find((m) => m.sourcingMethod === "buy" && m.tier === "recommended");

  let boq = [];
  // 1. Add Screen (Rent)
  boq = procurementMod.upsertProcurementLineItem(boq, screenRent, screenObj.category, 1, 3);
  assert.equal(boq.length, 1);

  // 2. Add Plinth (Buy)
  boq = procurementMod.upsertProcurementLineItem(boq, plinthBuy, plinthObj.category, 1, 3);
  assert.equal(boq.length, 2);

  // 3. Verify calculateProcurementSummary
  const summary = procurementMod.calculateProcurementSummary(boq, budgetConfig);
  assert.equal(summary.items.length, 2);
  assert.ok(summary.rentSubtotal > 0, "Rent subtotal must be greater than 0");
  assert.ok(summary.buySubtotal > 0, "Buy subtotal must be greater than 0");
  assert.equal(summary.grandTotalEstimated, summary.rentSubtotal + summary.buySubtotal);
  assert.equal(summary.remainingBudget, budgetConfig.totalBudget - summary.grandTotalEstimated);

  // 4. Verify Export Formats
  const csv = procurementMod.exportProcurementCSV(summary);
  assert.ok(csv.startsWith("Object ID,Scene Assembly,Selected Option"), "CSV must include headers");
  assert.ok(csv.includes(screenObj.id), "CSV must include screen object ID");

  const jsonStr = procurementMod.exportProcurementJSON(summary);
  const parsedJson = JSON.parse(jsonStr);
  assert.equal(parsedJson.items.length, 2);
  assert.equal(parsedJson.currency, "USD");

  const md = procurementMod.exportProcurementBriefMarkdown(summary, spec);
  assert.ok(md.includes("# Preliminary Procurement Brief & Bill of Quantities (BOQ)"));
  assert.ok(md.includes("Purchase (Buy) Subtotal:"));
  assert.ok(md.includes("Event Rental (3 Days) Subtotal:"));
  assert.ok(md.includes("**FX Conversion:** Application-defined benchmark assumptions"));

  // 5. Verify Currency Conversion Direction & Application-Defined Disclosure
  assert.equal(procurementMod.convertFromUSD(100, "USD"), 100);
  assert.equal(procurementMod.convertFromUSD(100, "EUR"), 92);
  assert.equal(procurementMod.convertFromUSD(100, "GBP"), 79);
  assert.equal(procurementMod.convertFromUSD(100, "INR"), 8400);
  assert.equal(procurementMod.convertFromUSD(100, "JPY"), 15200);
  assert.ok(csv.includes("FX Benchmark Source,FX Benchmark Date"));
  assert.ok(parsedJson.currencyConversionSource.includes("Application-defined"));
});
