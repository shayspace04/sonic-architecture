/**
 * Sonic Architecture — Agentic Layer & Provenance Linkage Test Suite
 *
 * Verifies:
 * 1. Planner domain selection differentiation across divergent prompts
 * 2. derivedFrom validation rejects and repairs fabricated toolCallIds
 * 3. Hard budget limits halt execution cleanly without unhandled errors
 * 4. HTTP 429 quota errors trigger fixture fallback with isSampleFixture banner set
 * 5. Full bidirectional trace-to-scene resolution across every grounded design decision
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const req = createRequire(import.meta.url);
const babelTransformSync = req("@babel/core").transformSync;
const moduleCache = new Map();

function loadTs(relPath) {
  let normalized = relPath.replace(/\\/g, "/");
  if (!normalized.endsWith(".ts") && !normalized.endsWith(".tsx")) {
    if (fs.existsSync(path.resolve(PROJECT_ROOT, normalized + ".ts"))) {
      normalized += ".ts";
    } else if (fs.existsSync(path.resolve(PROJECT_ROOT, normalized + ".tsx"))) {
      normalized += ".tsx";
    }
  }

  if (moduleCache.has(normalized)) {
    return moduleCache.get(normalized);
  }

  const full = path.resolve(PROJECT_ROOT, normalized);
  const code = babelTransformSync(fs.readFileSync(full, "utf8"), {
    filename: full,
    presets: [[req.resolve("@babel/preset-typescript"), { allExtensions: true }]],
    plugins: [req.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;

  const mod = { exports: {} };
  moduleCache.set(normalized, mod.exports);

  const customReq = (id) => {
    if (id.startsWith("@/")) {
      return loadTs(id.slice(2));
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const target = path.join(path.dirname(full), id);
      return loadTs(path.relative(PROJECT_ROOT, target));
    }
    return req(id);
  };

  const fn = new Function("exports", "require", "module", code);
  fn(mod.exports, customReq, mod);
  moduleCache.set(normalized, mod.exports);
  return mod.exports;
}

const {
  selectDomainsForPrompt,
  isDeterministicRevision,
  AgentLoop,
} = loadTs("lib/agent/agentLoop.ts");
const { validateProvenanceMap } = loadTs("lib/agent/tools.ts");
const { FixtureQlooClient } = loadTs("lib/agent/qlooClient.ts");

// ============================================================================
// TEST 1: PLANNER PICKS DIFFERENT DOMAINS FOR TWO DIFFERENT PROMPTS
// ============================================================================
test("Planner picks different domains for two different prompts", () => {
  const listeningRoomPrompt = "Intimate Japanese listening lounge for 20 people";
  const fashionRunwayPrompt = "Luxury fashion runway inside an abandoned industrial warehouse";

  const listeningDomains = selectDomainsForPrompt(listeningRoomPrompt);
  const fashionDomains = selectDomainsForPrompt(fashionRunwayPrompt);

  console.log("Listening Lounge Domains:", listeningDomains);
  console.log("Fashion Runway Domains:", fashionDomains);

  // Listening room needs music and places
  assert.ok(
    listeningDomains.includes("music"),
    "Listening room must query 'music' domain"
  );
  assert.ok(
    listeningDomains.includes("places"),
    "Listening room must query 'places' domain"
  );
  assert.ok(
    !listeningDomains.includes("fashion"),
    "Listening room must not query 'fashion' domain"
  );

  // Fashion runway needs fashion, dining, and music
  assert.ok(
    fashionDomains.includes("fashion"),
    "Fashion runway must query 'fashion' domain"
  );
  assert.ok(
    fashionDomains.includes("dining"),
    "Fashion runway must query 'dining' domain"
  );
  assert.ok(
    fashionDomains.includes("music"),
    "Fashion runway must query 'music' domain"
  );

  // Assert they are distinct sets
  assert.notDeepEqual(
    listeningDomains.sort(),
    fashionDomains.sort(),
    "Divergent prompts must produce divergent domain selections"
  );
});

// ============================================================================
// TEST 2: DERIVEDFROM VALIDATION REJECTS A FABRICATED TOOLCALLID
// ============================================================================
test("derivedFrom validation rejects a fabricated toolCallId", () => {
  const executedToolCallIds = new Set(["call_1_resolveEntities", "call_2_tasteSignals"]);

  const fabricatedProvenanceMap = {
    palette: {
      toolCallId: "call_2_tasteSignals", // Legitimate executed call
      entityId: "artist:miles-davis",
      entityName: "Miles Davis",
      signal: "harmonic_warmth",
      provenance: "sample-fixture",
    },
    materials: {
      toolCallId: "call_999_fabricated_call_id", // FRAUDULENT: never executed!
      entityId: "style:brutalism",
      entityName: "Brutalist Architecture",
      signal: "raw_board_concrete",
      provenance: "qloo-evidence",
    },
    acoustics: {
      toolCallId: null, // Explicit fallback
      signal: "sabine_rt60_target",
      provenance: "fallback",
    },
  };

  const report = validateProvenanceMap(fabricatedProvenanceMap, executedToolCallIds);

  console.log("Validation Report:", JSON.stringify(report, null, 2));

  // Validator must detect violation
  assert.equal(report.isValid, false, "Validation report must flag invalid provenance map");
  assert.equal(report.rejectedOrDowngradedCount, 1, "Must reject exactly 1 fabricated call");
  assert.equal(report.violations.length, 1, "Must record 1 violation");
  assert.equal(report.violations[0].key, "materials");
  assert.equal(report.violations[0].toolCallId, "call_999_fabricated_call_id");

  // Repaired output must strip the fabricated toolCallId and downgrade provenance
  assert.equal(
    report.validatedMap.materials.toolCallId,
    null,
    "Fabricated toolCallId must be cleared to null"
  );
  assert.equal(
    report.validatedMap.materials.provenance,
    "inferred",
    "Fabricated qloo-evidence claim must be downgraded to 'inferred'"
  );

  // Legitimate entry must be preserved untouched
  assert.equal(
    report.validatedMap.palette.toolCallId,
    "call_2_tasteSignals",
    "Legitimate toolCallId must remain intact"
  );
  assert.equal(report.validatedMap.palette.provenance, "sample-fixture");
});

// ============================================================================
// TEST 3: BUDGET LIMITS STOP THE LOOP
// ============================================================================
test("Budget limits stop the loop cleanly without unhandled errors", async () => {
  const agent = new AgentLoop(new FixtureQlooClient());

  // Strict budget: maxSteps = 2, maxQlooCalls = 1
  const result = await agent.run({
    prompt: "Acoustic jazz club in an old brick brewery",
    maxSteps: 2,
    maxQlooCalls: 1,
  });

  console.log("Budget Exhausted Run Summary:", result.summary);

  assert.ok(result.sceneSpec, "SceneSpec must be returned even on budget exhaustion");
  assert.ok(result.trace.length > 0, "Execution trace must contain steps prior to exhaustion");
  assert.ok(result.summary.budgetExhausted, "Summary must record budgetExhausted: true");
  assert.ok(
    result.summary.qlooCalls <= 2,
    `Qloo calls (${result.summary.qlooCalls}) must not exceed budget guard`
  );
});

// ============================================================================
// TEST 4: QUOTA ERROR PRODUCES FIXTURE FALLBACK WITH BANNER FLAG SET
// ============================================================================
test("Quota error produces fixture fallback with the banner flag set", async () => {
  let quotaErrorEmitted = false;

  // Mock a failing QlooClient that throws HTTP 429 quota exhaustion
  const quotaExhaustedClient = {
    async resolveEntities() {
      throw new Error("Qloo API quota exhausted (HTTP 429)");
    },
    async getTasteSignals() {
      throw new Error("Qloo API quota exhausted (HTTP 429)");
    },
    async getCrossDomainLinks() {
      throw new Error("Qloo API quota exhausted (HTTP 429)");
    },
  };

  const agent = new AgentLoop(quotaExhaustedClient);
  const result = await agent.run({
    prompt: "Jazz + Brutalist Architecture",
    onEvent: (event) => {
      if (event.type === "error" && event.errorType === "quota") {
        quotaErrorEmitted = true;
      }
    },
  });

  console.log("Quota Fallback Result Summary:", result.summary);

  // Verify graceful degradation
  assert.ok(result.sceneSpec, "Must produce valid scene despite upstream quota exhaustion");
  assert.equal(
    result.summary.isSampleFixture,
    true,
    "Summary must flag isSampleFixture: true to display warning banner"
  );

  // Verify provenance honesty: no claims of live 'qloo-evidence'
  for (const step of result.trace) {
    assert.notEqual(
      step.provenance,
      "qloo-evidence",
      "Quota fallback steps must never be labeled 'qloo-evidence'"
    );
  }
});

// ============================================================================
// TEST 5: TRACE-TO-SCENE LINK RESOLVES FOR EVERY CHOICE IN A SAMPLE SCENE
// ============================================================================
test("The trace-to-scene link resolves for every choice in a sample scene", async () => {
  const agent = new AgentLoop(new FixtureQlooClient());
  const result = await agent.run({
    prompt: "Jazz + Brutalist Architecture",
  });

  const { sceneSpec, trace } = result;
  const traceMap = new Map(trace.map((s) => [s.toolCallId, s]));

  console.log("Trace Steps Executed:", trace.map((s) => `${s.stepNumber}. ${s.toolCallId} (${s.tool})`));
  console.log("Provenance Map:", JSON.stringify(sceneSpec.provenanceMap, null, 2));

  assert.ok(sceneSpec.provenanceMap, "SceneSpec must carry provenanceMap");
  const choices = Object.entries(sceneSpec.provenanceMap);
  assert.ok(choices.length >= 4, "Must contain grounded choices for palette, materials, lighting, acoustics");

  for (const [key, derived] of choices) {
    if (derived.toolCallId !== null) {
      const step = traceMap.get(derived.toolCallId);
      assert.ok(
        step,
        `Design choice '${key}' references toolCallId '${derived.toolCallId}' which must exist in trace`
      );

      // Verify honesty: provenance matches step provenance
      assert.equal(
        derived.provenance,
        step.provenance,
        `Provenance for '${key}' (${derived.provenance}) must match originating tool call (${step.provenance})`
      );
    } else {
      assert.equal(
        derived.provenance,
        "fallback",
        `Ungrounded choice '${key}' must explicitly declare 'fallback' provenance`
      );
    }
  }
});
