/**
 * Sonic Architecture — Automated Acceptance & Free-Form Prompt Differentiation Test Suite
 * Runs natively on Node.js (`node --test tests/acceptance.test.mjs`) on Windows, macOS, and Linux.
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

let babelTransformSync = null;
try {
  const localReq = createRequire(import.meta.url);
  babelTransformSync = localReq("@babel/core").transformSync;
} catch {
  try {
    const sysReq = createRequire("/usr/share/nodejs/");
    babelTransformSync = sysReq("@babel/core").transformSync;
  } catch {
    babelTransformSync = null;
  }
}

function stripTypeScript(src, filename = "module.ts") {
  if (babelTransformSync) {
    let sysReq;
    try {
      sysReq = createRequire(import.meta.url);
      sysReq.resolve("@babel/preset-typescript");
    } catch {
      sysReq = createRequire("/usr/share/nodejs/");
    }
    const res = babelTransformSync(src, {
      filename,
      presets: [[sysReq.resolve("@babel/preset-typescript"), { allExtensions: true }]],
      plugins: [sysReq.resolve("@babel/plugin-transform-modules-commonjs")],
      configFile: false,
      babelrc: false,
    });
    return res.code;
  }

  let s = src;
  // 1. Remove `import type ... from ...;`
  s = s.replace(/import\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "");
  // 2. Convert `import { ... } from "./foo";` (removing inline `type Foo`)
  s = s.replace(
    /import\s+\{([\s\S]*?)\}\s+from\s+["']([^"']+)["'];?/g,
    (_, imports, modPath) => {
      const kept = imports
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && !part.startsWith("type "))
        .join(", ");
      if (!kept) return "";
      return `const { ${kept} } = require("${modPath}");`;
    }
  );
  // 3. Remove `export interface ...` and `interface ...` blocks
  s = s.replace(/(?:export\s+)?interface\s+\w+\s*\{[\s\S]*?\n\}/g, "");
  // 4. Remove `export type ... = ...;` and `type ... = ...;`
  s = s.replace(/(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=[\s\S]*?;/g, "");
  // 5. Strip generic type arguments on `new Set<...>()` and `new Map<...>()`
  s = s.replace(/\bnew\s+(Set|Map|Array)<[^>()]*>\(/g, "new $1(");
  // 6. Convert `export const foo: Type =` or `export const foo =`
  s = s.replace(/export\s+const\s+(\w+)\s*(?::[\s\S]*?)?=/g, "const $1 = exports.$1 =");
  // 7. Strip variable declaration type annotations (`const x: Type =`)
  s = s.replace(/\b(const|let|var)\s+(\w+)\s*:\s*[^=;]+=/g, "$1 $2 =");
  // 8. Convert `export async function fn` and `export function fn`
  s = s.replace(/export\s+async\s+function\s+(\w+)/g, "const $1 = exports.$1 = async function $1");
  s = s.replace(/export\s+function\s+(\w+)/g, "const $1 = exports.$1 = function $1");
  // 9. Strip function parameter types and return types
  s = s.replace(
    /((?:async\s+)?function\s+\w+)\s*\(([\s\S]*?)\)\s*(?::\s*(?:\{[\s\S]*?\}|[A-Za-z0-9_<>,\[\]'"|\s.&]+))?\s*\{/g,
    (_, fnHead, params) => {
      let cleanParams = params
        .replace(/\breadonly\s+/g, "")
        .replace(/(\w+)\?\s*:\s*(?:\{[^{}]*\}|ReadonlyArray<[^>]+>|[A-Za-z0-9_<>,\[\]'"|\s.&]+)/g, "$1")
        .replace(/(\w+)\s*:\s*(?:\{[^{}]*\}|ReadonlyArray<[^>]+>|[A-Za-z0-9_<>,\[\]'"|\s.&]+)(?=\s*[,=]|$)/g, "$1");
      return `${fnHead}(${cleanParams}) {`;
    }
  );
  // 10. Strip arrow function parameter & return types
  s = s.replace(
    /\(([^()]*)\)\s*(?::\s*[A-Za-z0-9_<>,\[\]'"|]+)?\s*=>/g,
    (_, args) => {
      const cleaned = args
        .replace(/\breadonly\s+/g, "")
        .replace(/(\w+)\?\s*:\s*[A-Za-z0-9_<>,\[\]'"|]+/g, "$1")
        .replace(/(\w+)\s*:\s*[A-Za-z0-9_<>,\[\]'"|]+/g, "$1");
      return `(${cleaned}) =>`;
    }
  );
  // 11. Strip `as unknown as Type` and `as SomeType` (including `Record<string, unknown>`)
  s = s.replace(/\s+as\s+unknown\s+as\s+(?:\{[^{}]*\}|[A-Za-z0-9_<>,\[\]'"|\s]+?)(?=[;)\],\n])/g, "");
  s = s.replace(/\s+as\s+[A-Za-z0-9_<>,\[\]'"|\s]+?(?=[;)\],\n])/g, "");
  return s;
}

function loadTsModule(relPath, cache = new Map()) {
  const normalizedRel = relPath.endsWith(".ts") ? relPath : `${relPath}.ts`;
  const fullPath = path.resolve(PROJECT_ROOT, normalizedRel);
  if (cache.has(fullPath)) return cache.get(fullPath);

  const source = fs.readFileSync(fullPath, "utf8");
  const jsCode = stripTypeScript(source, fullPath);

  const mod = { exports: {} };
  cache.set(fullPath, mod.exports);
  const customRequire = (id) => {
    if (id.startsWith("./") || id.startsWith("../")) {
      const targetRel = path.relative(
        PROJECT_ROOT,
        path.resolve(path.dirname(fullPath), id)
      );
      return loadTsModule(targetRel, cache);
    }
    if (id.startsWith("@/")) {
      return loadTsModule(id.slice(2), cache);
    }
    throw new Error(`Unexpected external import: ${id}`);
  };
  try {
    const fn = new Function("exports", "require", "module", jsCode);
    fn(mod.exports, customRequire, mod);
  } catch (err) {
    console.error("Failed transpiling:", normalizedRel, "\n", jsCode);
    throw err;
  }
  cache.set(fullPath, mod.exports);
  return mod.exports;
}

const enrichment = loadTsModule("lib/enrichment.ts");
const sceneSpecMod = loadTsModule("lib/scene-spec.ts");
const revisionsMod = loadTsModule("lib/revisions.ts");
const briefMod = loadTsModule("lib/brief.ts");

// Required 6 Free-Form Prompts from Critical Fix Specification
const REQ_PROMPT_1 = "Design an intimate Japanese listening lounge for 20 people.";
const REQ_PROMPT_2 = "Create a futuristic electric vehicle launch for 500 guests.";
const REQ_PROMPT_3 = "Design a traditional Indian wedding mandap in an outdoor garden.";
const REQ_PROMPT_4 = "Create a brutalist underground techno club.";
const REQ_PROMPT_5 = "Design a luxury fashion runway inside an abandoned industrial warehouse.";
const REQ_PROMPT_6 = "Create a tropical beachside corporate retreat.";

// Original Benchmark Prompts A, B, C
const PROMPT_A =
  "A Japanese jazz listening room at midnight. Intimate and quietly luxurious, with warm timber, considered acoustic treatments, analog audio equipment, comfortable listening seats, restrained Japanese-inspired detailing, layered low-level lighting, and a carefully composed listening focal point. Keep the space tactile and sophisticated, not stereotypically themed.";

const PROMPT_B =
  "A premium futuristic launch venue for unveiling a next-generation electric vehicle. Create a spacious, high-ceilinged presentation environment with a central illuminated product plinth, a dramatic architectural backdrop, audience seating with clear sightlines, restrained metallic finishes, controlled architectural lighting, and organized guest circulation.";

const PROMPT_C =
  "An elegant candlelit banquet in a cathedral-inspired hall. Create a high and ceremonially proportioned interior, with appropriate arches or vertical architectural rhythms, warm stone, a refined banquet layout, carefully arranged tables and chairs, floral or candlelit centrepieces, and layered warm lighting. Maintain practical guest circulation and a restrained, sophisticated atmosphere.";

test("Required Test 1 — Intimate Japanese listening lounge for 20 people", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_1);
  assert.equal(interp.requestedCapacityGuests, 20, "Must extract explicit 20-person capacity");
  assert.equal(interp.focalProgram, "listening_console");
  assert.equal(interp.isOpenAir, false);

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_1);
  assert.equal(spec.typology, "listening_room");
  assert.ok(spec.roomDimensions.width <= 9.0, "Listening lounge width must remain intimate (<= 9.0m)");
  assert.ok(spec.validation.estimatedCapacityGuests >= 20, "Must accommodate at least 20 guests");
  assert.equal(spec.materials.floor.id, "warm_oak");
  assert.equal(spec.materials.wall.id, "acoustic_slats");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("analog_turntable_console"), "Must include analog turntable console");
  assert.ok(archetypes.has("horn_speaker_pair"), "Must include horn speakers");
  assert.ok(archetypes.has("acoustic_wall_panel"), "Must include acoustic treatment");
  assert.ok(archetypes.has("low_lounge_chair"), "Must include intimate listening chairs");
});

test("Required Test 2 — Futuristic electric vehicle launch for 500 guests", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_2);
  assert.equal(interp.requestedCapacityGuests, 500, "Must extract explicit 500-guest capacity");
  assert.equal(interp.focalProgram, "product_launch_plinth");

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_2);
  assert.equal(spec.typology, "futuristic_launch");
  assert.ok(spec.roomDimensions.width >= 30.0, "500-guest EV arena must scale larger than default 22m width");
  assert.ok(spec.validation.areaSqMeters >= 900, "500-guest EV arena must have >= 900 m² floor area");
  assert.ok(spec.validation.estimatedCapacityGuests >= 500, "Must validate for >= 500 guests");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("ev_product_plinth"), "Must include EV reveal plinth");
  assert.ok(archetypes.has("concept_vehicle_sculpture"), "Must include EV prototype sculpture");
  assert.ok(archetypes.has("curved_led_backdrop"), "Must include presentation backdrop");
  const seatingRows = spec.objects.filter((o) => o.archetype === "tiered_auditorium_row");
  assert.ok(seatingRows.length >= 4, "500-guest arena must generate 4 tiered auditorium rows");
});

test("Required Test 3 — Traditional Indian wedding mandap in an outdoor garden", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_3);
  assert.equal(interp.isOpenAir, true, "Outdoor garden mandap must be open-air");
  assert.equal(interp.enclosureMode, "open_air_canopy");
  assert.equal(interp.environmentalSetting, "garden");
  assert.equal(interp.focalProgram, "wedding_mandap");

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_3);
  assert.equal(spec.typology, "garden_mandap");
  assert.equal(spec.isOpenAir, true, "Outdoor garden wedding must NOT be an enclosed room");
  assert.equal(spec.setting, "garden");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("wedding_mandap_canopy"), "Must include four-pillar wedding mandap canopy");
  assert.ok(archetypes.has("marigold_garland_curtain"), "Must include wedding marigold floral decor");
  assert.ok(archetypes.has("diwan_bolster_lounge"), "Must include wedding guest seating courts");
  assert.ok(archetypes.has("olive_tree_planter"), "Must include outdoor garden trees");
});

test("Required Test 4 — Brutalist underground techno club", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_4);
  assert.equal(interp.isUnderground, true, "Must detect underground subterranean setting");
  assert.equal(interp.enclosureMode, "underground");
  assert.equal(interp.isOpenAir, false);
  assert.equal(interp.focalProgram, "techno_dj_bunker");

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_4);
  assert.equal(spec.typology, "underground_club", "Must NOT collapse underground techno club into fashion runway");
  assert.equal(spec.isOpenAir, false);
  assert.equal(spec.enclosureMode, "underground");
  assert.equal(spec.materials.wall.id, "board_concrete");
  assert.equal(spec.materials.floor.id, "polished_concrete");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("dj_flash_rig"), "Must include subterranean DJ bunker");
  assert.ok(archetypes.has("techno_sound_stack"), "Must include quad-point techno horn sound stacks");
  assert.ok(archetypes.has("monolithic_concrete_pier"), "Must include brutalist concrete piers");
  assert.ok(!archetypes.has("obsidian_runway_deck"), "Techno club must NOT have a fashion runway deck");
});

test("Required Test 5 — Luxury fashion runway inside an abandoned industrial warehouse", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_5);
  assert.equal(interp.focalProgram, "fashion_runway");
  assert.equal(interp.isOpenAir, false);
  assert.equal(interp.explicitMaterials.wall, "distressed_brick");

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_5);
  assert.equal(spec.typology, "industrial_warehouse");
  assert.equal(spec.materials.wall.id, "distressed_brick", "Industrial warehouse must use distressed brick walls");
  assert.equal(spec.ceilingStructure, "exposed_industrial_rig");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("obsidian_runway_deck"), "Must include central fashion runway deck");
  assert.ok(archetypes.has("warehouse_truss_portal"), "Must include industrial steel roof truss bays");
  assert.ok(archetypes.has("dramatic_entry_portal"), "Must include backstage model entry portal");
  assert.ok(archetypes.has("linear_light_blade"), "Must include overhead runway light blade");
  assert.ok(archetypes.has("sculptural_concrete_bench"), "Must include flanking audience benches");
});

test("Required Test 6 — Tropical beachside corporate retreat", () => {
  const interp = enrichment.interpretArchitecturalBrief(REQ_PROMPT_6);
  assert.equal(interp.isOpenAir, true, "Beachside retreat must be open-air");
  assert.equal(interp.environmentalSetting, "coast");
  assert.equal(interp.focalProgram, "coastal_retreat_pavilion");

  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_6);
  assert.equal(spec.typology, "coastal_retreat", "Must NOT fall back to default listening_room");
  assert.equal(spec.isOpenAir, true, "Beachside retreat must NOT be rendered as an enclosed indoor room");
  assert.equal(spec.setting, "coast");
  assert.equal(spec.materials.floor.id, "teak_decking");
  assert.equal(spec.timeOfDay, "afternoon");

  const archetypes = new Set(spec.objects.map((o) => o.archetype));
  assert.ok(archetypes.has("retreat_timber_pavilion"), "Must include open-air coastal timber pavilion");
  assert.ok(archetypes.has("circular_water_feature"), "Must include coastal reflection water pool");
  assert.ok(archetypes.has("olive_tree_planter"), "Must include tropical palm landscaping");
});

test("Pairwise Structural & Geometric Differentiation across all 6 Required Prompts", () => {
  const prompts = [REQ_PROMPT_1, REQ_PROMPT_2, REQ_PROMPT_3, REQ_PROMPT_4, REQ_PROMPT_5, REQ_PROMPT_6];
  const specs = prompts.map((p) => sceneSpecMod.generateSceneFromPrompt(p));

  // Verify every single prompt produces a unique typology, focal point, and object signature
  const typologies = new Set(specs.map((s) => s.typology));
  assert.equal(typologies.size, 6, "All 6 required prompts must resolve to distinct typologies");

  const focalNames = new Set(specs.map((s) => s.focalPoint.name));
  assert.equal(focalNames.size, 6, "All 6 required prompts must have distinct focal structures");

  // Compare capacity scaling between 20-person lounge and 500-guest EV launch
  assert.ok(
    specs[1].validation.areaSqMeters > specs[0].validation.areaSqMeters * 10,
    "500-guest EV launch must have >10x the floor area of the 20-person listening lounge"
  );

  // Compare indoor vs outdoor structural enclosure
  assert.equal(specs[0].isOpenAir, false);
  assert.equal(specs[1].isOpenAir, false);
  assert.equal(specs[2].isOpenAir, true);  // Outdoor Indian wedding mandap
  assert.equal(specs[3].isOpenAir, false); // Underground techno club
  assert.equal(specs[4].isOpenAir, false); // Industrial warehouse runway
  assert.equal(specs[5].isOpenAir, true);  // Tropical beachside retreat
});

test("Iterative Natural-Language Revisions — All 7 Required Revision Scenarios", () => {
  // Base scene: Outdoor Indian Wedding Mandap
  let spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_3);
  const initialMandapObjCount = spec.objects.length;

  // Revision 1: "Make the venue suitable for 300 people."
  spec = revisionsMod.applyTargetedRevision(spec, "Make the venue suitable for 300 people.");
  assert.equal(spec.validation.estimatedCapacityGuests, 300, "Capacity must update to 300 guests");
  assert.equal(spec.typology, "garden_mandap", "Must preserve garden_mandap typology");

  // Revision 2: "Add a circular water feature around the mandap."
  spec = revisionsMod.applyTargetedRevision(spec, "Add a circular water feature around the mandap.");
  assert.ok(
    spec.objects.some((o) => o.archetype === "circular_water_feature"),
    "Must add circular water feature around the mandap"
  );

  // Revision 3: "Change the lighting to warm sunset illumination."
  spec = revisionsMod.applyTargetedRevision(spec, "Change the lighting to warm sunset illumination.");
  assert.equal(spec.timeOfDay, "sunset");
  assert.ok(spec.lighting.temperatureK <= 2600);

  // Base scene 2: Brutalist Underground Techno Club
  let clubSpec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_4);

  // Revision 4: "Move the stage to the back and add a central runway."
  clubSpec = revisionsMod.applyTargetedRevision(
    clubSpec,
    "Move the stage to the back and add a central runway."
  );
  assert.ok(
    clubSpec.objects.some((o) => o.archetype === "obsidian_runway_deck"),
    "Must add central runway deck"
  );
  assert.ok(
    clubSpec.focalPoint.position[2] <= -clubSpec.roomDimensions.depth * 0.35,
    "Focal stage must move to the back"
  );

  // Revision 5: "Replace the concrete with warm sandstone."
  clubSpec = revisionsMod.applyTargetedRevision(
    clubSpec,
    "Replace the concrete with warm sandstone."
  );
  assert.equal(clubSpec.materials.floor.id, "warm_sandstone");
  assert.equal(clubSpec.materials.wall.id, "warm_sandstone");

  // Revision 6: "Make the event open-air with a translucent canopy."
  clubSpec = revisionsMod.applyTargetedRevision(
    clubSpec,
    "Make the event open-air with a translucent canopy."
  );
  assert.equal(clubSpec.isOpenAir, true);
  assert.equal(clubSpec.ceilingStructure, "draped_textile_canopy");
  assert.ok(
    clubSpec.objects.some((o) => o.archetype === "translucent_canopy"),
    "Must add overhead translucent canopy object"
  );

  // Revision 7: "Make the entrance more dramatic but preserve the seating layout."
  const seatingBefore = JSON.stringify(
    clubSpec.objects.filter((o) => o.category === "Furniture").map((o) => o.position)
  );
  clubSpec = revisionsMod.applyTargetedRevision(
    clubSpec,
    "Make the entrance more dramatic but preserve the seating layout."
  );
  const seatingAfter = JSON.stringify(
    clubSpec.objects.filter((o) => o.category === "Furniture").map((o) => o.position)
  );
  assert.equal(seatingBefore, seatingAfter, "Seating positions must be strictly preserved");
  assert.ok(
    clubSpec.objects.some((o) => o.archetype === "dramatic_entry_portal"),
    "Must add dramatic entrance portal"
  );
  assert.ok(initialMandapObjCount > 0);
});

test("Original Benchmark Acceptance Tests A, B, C & Qloo Provenance / Quota Resilience", () => {
  const specA = sceneSpecMod.generateSceneFromPrompt(PROMPT_A);
  const specB = sceneSpecMod.generateSceneFromPrompt(PROMPT_B);
  const specC = sceneSpecMod.generateSceneFromPrompt(PROMPT_C);

  assert.equal(specA.typology, "listening_room");
  assert.equal(specB.typology, "futuristic_launch");
  assert.equal(specC.typology, "cathedral_banquet");

  // Simulate Qloo HTTP 429 quota exhaustion / failure
  const quotaExhaustedPayload = enrichment.enrichPayloadWithKnowledge(
    REQ_PROMPT_6,
    [],
    undefined,
    ["Qloo API quota exhausted (HTTP 429); engaged deterministic cultural fallback."]
  );
  assert.equal(quotaExhaustedPayload.fallback, true);
  const qlooClaims = quotaExhaustedPayload.reasoning.provenanceClaims.filter(
    (c) => c.source === "qloo_evidence"
  );
  assert.equal(qlooClaims.length, 0, "Must never fabricate Qloo claims when quota is exhausted");
  const fallbackSpec = sceneSpecMod.buildSceneSpecFromPayload(quotaExhaustedPayload, REQ_PROMPT_6);
  assert.equal(fallbackSpec.typology, "coastal_retreat");
  assert.equal(fallbackSpec.isOpenAir, true);

  const md = briefMod.generateMarkdownDesignBrief(specA);
  assert.ok(md.includes(specA.title));
  assert.ok(md.includes("7.80 m"));
});

test("Real-World Sourcing, Product Matching, Budget Fit & Project Procurement List (BOQ)", () => {
  const procurementMod = loadTsModule("lib/procurement.ts");
  const spec = sceneSpecMod.generateSceneFromPrompt(REQ_PROMPT_3); // Outdoor Indian wedding mandap
  assert.ok(spec.objects.length >= 6);

  // 1. Verify Structured Object Procurement Metadata on all objects
  const mandapObj = spec.objects.find((o) => o.archetype === "wedding_mandap_canopy") || spec.objects[0];
  assert.ok(mandapObj.procurement, "Scene objects must include backward-compatible procurement metadata");
  assert.equal(mandapObj.procurement.unit, "m");
  assert.ok(mandapObj.procurement.essentialAttributes.length >= 2);
  assert.ok(mandapObj.procurement.suggestedMethods.includes("rent"));
  assert.ok(mandapObj.procurement.suggestedMethods.includes("buy"));
  assert.ok(mandapObj.procurement.suggestedMethods.includes("custom"));

  // 2. Verify Real-World Product & Supplier Matching (Buy, Rent, Custom × Economy, Recommended, Premium)
  const budgetConfigINR = procurementMod.createDefaultBudgetConfig({
    currency: "INR",
    location: "Bhubaneswar, Odisha, India",
    totalBudget: 3800000,
    tierPreference: "balanced",
    sourcingPreference: "rent",
    rentalDurationDays: 3,
  });

  const matches = procurementMod.matchRealWorldProductsForObject(
    mandapObj,
    spec,
    budgetConfigINR,
    []
  );
  assert.equal(matches.length, 9, "Should return 3 sourcing methods × 3 budget tiers = 9 matches");

  const buyOpts = matches.filter((m) => m.sourcingMethod === "buy");
  const rentOpts = matches.filter((m) => m.sourcingMethod === "rent");
  const customOpts = matches.filter((m) => m.sourcingMethod === "custom");
  assert.equal(buyOpts.length, 3);
  assert.equal(rentOpts.length, 3);
  assert.equal(customOpts.length, 3);

  // Verify mock data disclosure & valid public supplier links
  matches.forEach((m) => {
    assert.equal(m.isMockReferenceData, true, "Mock reference data must be transparently disclosed");
    assert.ok(m.productUrl.startsWith("https://"), "Must provide valid HTTPS supplier URL");
    assert.ok(m.supplierSearchUrl.startsWith("https://"), "Must provide valid HTTPS search URL");
    assert.equal(m.isLocalVendorMatch, true, "Bhubaneswar/India location should match India local suppliers");
    assert.ok(m.budgetFitExplanation.length > 20, "Must explain why option fits user preferences");
  });

  // 3. Verify Budget Responsiveness (changing budget or rental duration updates line totals & fit status)
  const recRent = rentOpts.find((m) => m.tier === "recommended");
  const tightBudgetConfig = procurementMod.createDefaultBudgetConfig({
    currency: "INR",
    location: "Bhubaneswar, Odisha, India",
    totalBudget: 50000, // Tight budget
    rentalDurationDays: 5,
  });
  const tightMatches = procurementMod.matchRealWorldProductsForObject(
    mandapObj,
    spec,
    tightBudgetConfig,
    []
  );
  const tightRentRec = tightMatches.find((m) => m.sourcingMethod === "rent" && m.tier === "recommended");
  assert.ok(
    tightRentRec.estimatedLineTotalInUserCurrency > recRent.estimatedLineTotalInUserCurrency,
    "5-day rental total must exceed 3-day rental total"
  );
  assert.equal(tightRentRec.budgetFitStatus, "over_allocation", "Tight budget must flag over_allocation");

  // 4. Verify Project Procurement List (BOQ) Calculation & Zero Double-Counting
  let boqList = [];
  boqList = procurementMod.upsertProcurementLineItem(
    boqList,
    recRent,
    mandapObj.category,
    1,
    3
  );
  assert.equal(boqList.length, 1);

  // Selecting a different tier (e.g. Economy Rent) for the SAME object must update the item, not double-count!
  const econRent = rentOpts.find((m) => m.tier === "economy");
  boqList = procurementMod.upsertProcurementLineItem(
    boqList,
    econRent,
    mandapObj.category,
    2,
    3
  );
  assert.equal(boqList.length, 1, "Saving an alternative for the same object ID must not double-count");
  assert.equal(boqList[0].tier, "economy");
  assert.equal(boqList[0].quantity, 2);

  const summary = procurementMod.calculateProcurementSummary(boqList, budgetConfigINR);
  assert.equal(summary.items.length, 1);
  assert.equal(summary.rentSubtotal, boqList[0].lineTotalInCurrency);
  assert.equal(summary.grandTotalEstimated, summary.rentSubtotal);
  assert.ok(summary.disclaimer.includes("exclude unknown delivery"));

  const briefMd = procurementMod.exportProcurementBriefMarkdown(summary, spec);
  assert.ok(briefMd.includes("Preliminary Procurement Brief & Bill of Quantities (BOQ)"));
  assert.ok(briefMd.includes("Bhubaneswar, Odisha, India"));
});
