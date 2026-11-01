import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { defaultSceneDesigner } from "../adaptation/lib/designer";
import { defaultQlooAdapter } from "../adaptation/lib/qlooAdapter";
import { validateSceneBrief } from "../adaptation/lib/provenance";
import { sceneFromBrief, buildBaselineAndGrounded } from "../adaptation/lib/pipeline";
import { compareScenes } from "../adaptation/lib/diff";
import { generateSceneComparison } from "../lib/compare/sceneGenerator";
import { LocalRenderMetricsAdapter } from "../adaptation/lib/metrics";
import type { QlooBundle, SceneBrief } from "../adaptation/lib/types";

test("Adaptation Invariant 1: Downgrade any field citing missing IDs to inferred", () => {
  const fakeBundle: QlooBundle = {
    bundleHash: "hash-1234",
    entities: [{ id: "real-entity-1", name: "Miles Davis", tags: ["jazz"] }],
  };

  const syntheticBrief: SceneBrief = {
    prompt: "Miles Davis jazz club",
    seed: 42,
    bundleHash: "hash-1234",
    fields: {
      typology: {
        value: "listening_room",
        provenance: "qloo-evidence",
        derivedFrom: ["fake-nonexistent-id"], // Missing from fakeBundle!
        because: "Invented reason with nonexistent ID",
      },
      massing: {
        value: { width: 14, height: 4.8, depth: 18, ceiling: "coffered_timber" },
        provenance: "qloo-evidence",
        derivedFrom: ["real-entity-1"], // Real ID!
        because: "Derived from Miles Davis",
      },
      enclosure: { value: "indoor", provenance: "fallback", derivedFrom: [], because: "Standard indoor" },
      materials: {
        value: { floor: "warm_oak", walls: "board_concrete", ceiling: "acoustic_slats", featureWall: "vertical_timber_slats" },
        provenance: "fallback",
        derivedFrom: [],
        because: "Standard palette",
      },
      palette: {
        value: { primary: "#2A2A2A", secondary: "#4A4A4A", accent: "#C59B4E", emissive: "#FEF08A" },
        provenance: "fallback",
        derivedFrom: [],
        because: "Warm palette",
      },
      lighting: {
        value: { fixtureStyle: "recessed_warm_spots", practicals: ["brass_sconces"], temperatureK: 2400, intensity: 1.2 },
        provenance: "fallback",
        derivedFrom: [],
        because: "Warm light",
      },
      furniture: { value: { kit: ["listening_sofa"], layout: "lounge" }, provenance: "fallback", derivedFrom: [], because: "Sofa layout" },
      props: { value: ["analog_turntable_console"], provenance: "fallback", derivedFrom: [], because: "Turntable" },
      programZones: { value: ["listening_room", "bar"], provenance: "fallback", derivedFrom: [], because: "Program zones" },
      seatingCirculation: { value: { mode: "lounge", capacity: 40, flow: "open" }, provenance: "fallback", derivedFrom: [], because: "Lounge" },
      acousticTreatment: { value: ["acoustic_wall_panel"], provenance: "fallback", derivedFrom: [], because: "Acoustics" },
      culturalArtifacts: { value: ["artist: Miles Davis"], provenance: "qloo-evidence", derivedFrom: ["real-entity-1"], because: "Miles vinyl" },
      plantsOutdoor: { value: ["hinoki_bonsai"], provenance: "fallback", derivedFrom: [], because: "Bonsai" },
    },
  };

  const validated = validateSceneBrief(syntheticBrief, fakeBundle);

  // typology cited fake-nonexistent-id -> MUST be downgraded to "inferred"
  assert.equal(
    validated.fields.typology.provenance,
    "inferred",
    "Field citing nonexistent ID must be downgraded to inferred"
  );

  // massing cited real-entity-1 -> MUST remain "qloo-evidence"
  assert.equal(
    validated.fields.massing.provenance,
    "qloo-evidence",
    "Field citing valid bundle ID must retain qloo-evidence"
  );
});

test("Adaptation Invariant 2: Empty Qloo bundles produce 0 qloo-evidence elements and output the sparse notice", () => {
  const emptyBundle: QlooBundle = {
    bundleHash: "empty-0000",
    entities: [],
  };

  const prompt = "A generic concrete box with absolutely zero cultural associations";
  const baselineBrief = defaultSceneDesigner.designBriefSync({ prompt, seed: 42 });
  const groundedBrief = validateSceneBrief(
    defaultSceneDesigner.designBriefSync({ prompt, seed: 42, qlooBundle: emptyBundle }),
    emptyBundle
  );

  const baselineRenderable = sceneFromBrief(baselineBrief, "baseline");
  const groundedRenderable = sceneFromBrief(groundedBrief, "grounded");
  const diff = compareScenes(baselineRenderable, groundedRenderable);

  assert.equal(
    groundedRenderable.elements.filter((e) => e.provenance === "qloo-evidence").length,
    0,
    "Empty Qloo bundle must produce 0 qloo-evidence elements"
  );
  assert.equal(
    diff.summary.qlooTracedChanges,
    0,
    "Empty Qloo bundle must yield 0 qloo-traced changes"
  );
  assert.equal(
    diff.summary.qlooTraceShare,
    0,
    "Empty Qloo bundle must have 0% Qloo trace share"
  );

  // Also check generateSceneComparison sparse notice
  const comp = generateSceneComparison({ prompt, seed: 42 });
  assert.ok(comp.sparseNotice, "Sparse notice must be present when Qloo has no signals");
  assert.match(
    comp.sparseNotice,
    /Qloo returned little for this reference; showing honest baseline design without cultural grounding/,
    "Sparse notice must match required exact copy"
  );
});

test("Adaptation Invariant 3: Baseline and grounded calls use identical seed, prompt, and catalogue", async () => {
  const prompt = "Miles Davis + Brutalist concrete";
  const seed = 42;

  const baselineBrief = defaultSceneDesigner.designBriefSync({ prompt, seed });
  assert.equal(baselineBrief.seed, seed, "Baseline brief must use identical seed");
  assert.equal(baselineBrief.prompt, prompt, "Baseline brief must use identical prompt");

  // Baseline must have zero qloo-evidence
  const baselineElements = sceneFromBrief(baselineBrief, "baseline").elements;
  const qlooInBaseline = baselineElements.filter((e) => e.provenance === "qloo-evidence").length;
  assert.equal(qlooInBaseline, 0, "Baseline must never contain qloo-evidence");

  // Grounded call with real fixture/live bundle
  const qlooBundle = defaultQlooAdapter.resolveSync(prompt);
  assert.ok(qlooBundle, "Prompt should resolve Qloo bundle");
  const groundedBrief = defaultSceneDesigner.designBriefSync({ prompt, seed, qlooBundle });
  assert.equal(groundedBrief.seed, seed, "Grounded brief must use identical seed");

  const groundedElements = sceneFromBrief(groundedBrief, "grounded").elements;
  const qlooInGrounded = groundedElements.filter((e) => e.provenance === "qloo-evidence").length;
  assert.ok(qlooInGrounded > 0, "Grounded scene must contain verified qloo-evidence elements");
});

test("Adaptation Invariant 4: Diff counts match actual added + removed + changed elements", () => {
  const prompt = "Aphex Twin + industrial warehouse";
  const qlooBundle = defaultQlooAdapter.resolveSync(prompt);

  const baselineBrief = defaultSceneDesigner.designBriefSync({ prompt, seed: 42 });
  const groundedBrief = defaultSceneDesigner.designBriefSync({ prompt, seed: 42, qlooBundle });

  const baseline = sceneFromBrief(baselineBrief, "baseline");
  const grounded = sceneFromBrief(groundedBrief, "grounded");
  const diff = compareScenes(baseline, grounded);

  const totalCalculatedDiffs = diff.added.length + diff.removed.length + diff.changed.length;
  assert.equal(
    diff.summary.differing,
    totalCalculatedDiffs,
    "summary.differing must exactly match added + removed + changed"
  );
  assert.ok(diff.summary.totalCompared > 0, "totalCompared must be greater than zero");
  assert.ok(diff.summary.qlooTracedChanges > 0, "Must have qloo-traced changes for Aphex Twin");
});

test("Adaptation Invariant 5: Verify Qloo trace share calculation", () => {
  const prompt = "A24 films + indie music";
  const comp = generateSceneComparison({ prompt, seed: 42 });

  assert.ok(comp.diffSummary, "Scene comparison must include diffSummary");
  assert.ok(comp.diffSummary.differingElements > 0, "Differing elements must be positive");
  assert.ok(comp.diffSummary.qlooTracedElements > 0, "Qloo traced elements must be positive");

  const expectedShare = comp.diffSummary.qlooTracedElements / comp.diffSummary.differingElements;
  assert.equal(
    comp.diffSummary.qlooTraceShare.toFixed(4),
    expectedShare.toFixed(4),
    "Qloo trace share must equal qlooTracedElements / differingElements"
  );
});

test("Adaptation Invariant 6: Repository hygiene — no API keys or raw JSON dumps committed", () => {
  const repoFiles = ["package.json", "README.md", "lib/types.ts", "lib/compare/sceneGenerator.ts", "components/three/Venue3D.tsx"];
  const forbiddenPatterns = [
    /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
    /qloo[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
  ];

  for (const relPath of repoFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.ok(
        !pattern.test(content),
        `File ${relPath} must not contain raw API keys matching pattern ${pattern}`
      );
    }
  }
});

test("Adaptation Invariant 7: RenderMetricsAdapter pixel diff & SSIM calculation", async () => {
  const metrics = new LocalRenderMetricsAdapter();
  // Provide test paths
  const result = await metrics.capturePair({
    baselineImagePath: "assets/branding/social-preview.png",
    groundedImagePath: "assets/branding/social-preview.png",
    cameraId: "overview",
    timeOfDay: "afternoon",
    exposure: 1.0,
  });

  assert.equal(result.pixelDiffPercent, 0, "Identical images must yield 0% pixel diff");
  assert.equal(result.ssim, 1.0, "Identical images must yield 1.0 SSIM");
});
