# Gemini Flash implementation prompt

You are adapting the local Sonic Architecture repository. Do not redesign the product. Do not invent Qloo response data. Do not add credentials to source control.

## Repository context

The repository already contains a Next.js application, a Three.js / React Three Fiber scene system, scene specifications, materials, acoustic calculations, Qloo provenance helpers, and a baseline-versus-grounded comparison concept. Your job is to connect the adaptation layer in `adaptation/` to the existing renderer without breaking the current UI.

Read these files first:

- `README.md`
- `lib/types.ts`
- `lib/scene-spec.ts`
- `lib/qloo-provenance.ts`
- `adaptation/ADAPTATION_GUIDE.md`
- `adaptation/lib/types.ts`
- `adaptation/lib/pipeline.ts`
- `adaptation/lib/provenance.ts`
- `adaptation/lib/diff.ts`
- `adaptation/renderer/adapter.ts`

## Goal

Make the difference between a prompt-only baseline scene and a Qloo-grounded scene visible, measurable, and truthful for any prompt. The same designer must produce both scenes. The only allowed input difference is the presence of a runtime Qloo bundle.

## Non-negotiable rules

1. Do not commit Qloo API keys, raw Qloo responses, response images, or personal data.
2. Do not fabricate entities, tags, venue categories, artist names, film names, brands, or demographics.
3. If the Qloo bundle is empty or tiny, show a small real diff and the message `Qloo returned little for this reference`.
4. Every Qloo-derived field and object must store valid source IDs in `derivedFrom` or `sourceIds`.
5. If a source ID is not in the runtime bundle, downgrade provenance to `inferred`.
6. Baseline and grounded runs use the same system prompt, same catalogue, same seed, same temperature, and same validation.
7. Do not degrade the baseline scene to make the grounded diff look larger.
8. Keep the current renderer and UI working while adding the integration.

## Implementation plan

First, implement a server-side Qloo adapter that satisfies `QlooRuntimeAdapter`. It should return a normalized `QlooBundle` with a stable `bundleHash`. The browser must receive only the normalized data needed to render and explain the scene. If the API call fails, return `undefined` and record the reason as a fallback state.

Next, implement the same `DesignBriefProvider` for both runs. Use structured JSON output. The model may choose only from the existing kit catalogue. The output must include the 14 dimensions in `SceneBrief.fields`: typology, massing, enclosure, materials, palette, lighting, furniture, props, program zones, seating/circulation, acoustic treatment, cultural artifacts, and plants/outdoor elements. Every field needs `value`, `provenance`, `derivedFrom`, and `because`.

For baseline, call the designer with `{ prompt, seed }`. For grounded, call it with `{ prompt, seed, qlooBundle }`. Pass both briefs through `validateSceneBrief()`. Convert them with `sceneFromBrief()` or a repository-specific converter that preserves every source ID and explanation.

Then implement `SonicRendererAdapter` for the actual renderer. Each `SceneElement` must become a real mesh or group with real-world scale. Put this metadata on the renderer object:

```ts
object.userData = {
  sceneElementId: element.id,
  provenance: element.provenance,
  sourceIds: element.sourceIds,
  because: element.because,
};
```

Map cultural data into visible objects, not only numbers. Use returned names only for record walls, poster light-boxes, signage planes, cultural artifacts, program zones, and props. Examples include artist names on a record wall, film names on a poster plane, venue categories as zone labels, and returned brand categories as merch/catering objects. Do not use Qloo images unless they are explicitly available at runtime and your product has permission to display them.

Add a Qloo-layer toggle with three visual states: cobalt for `qloo-evidence`, ochre for `inferred`, and grey for `fallback`. Hovering an element should show its `because` explanation and the returned names resolved from `sourceIds`.

Add compare mode. Use `compareScenes(baseline, grounded)` to outline added, removed, and changed elements. Display a summary strip in the existing UI:

`N of M elements differ; K trace to Qloo data`

Use the actual `SceneDiff.summary` values. Never hard-code these numbers.

Add identical-camera capture. Implement `RenderMetricsAdapter.capturePair()` using the project’s existing Playwright or renderer capture setup. Both renders must use the same camera transform, time of day, exposure, resolution, anti-aliasing, and post-processing. Report pixel-difference percentage and SSIM for overview and interior cameras. Do not claim metrics that were not measured.

## Validation commands

Run the existing project checks first. Then add focused tests for:

- invalid `derivedFrom` IDs downgrade to `inferred`;
- an empty Qloo bundle does not create Qloo-evidence elements;
- baseline and grounded calls share the same seed and designer instructions;
- diff counts match actual elements;
- Qloo trace share counts only elements with valid Qloo IDs;
- Qloo images and keys are not written into the repository.

Finally, run the six-prompt measurement set and the 12 held-out acceptance prompts supplied by the project owner. Report categories changed, Qloo trace share, pixel diff percentage, SSIM, screenshots, and the reason for any miss. If a target is missed because the bundle is sparse or tags do not map to the catalogue, report that fact and improve the generic mapping rather than adding prompt-specific hacks.

## Deliverable format

At the end, provide:

1. files changed;
2. renderer adapter mapping summary;
3. Qloo fields and visible objects now expressed;
4. test commands and results;
5. measurement tables and screenshot paths;
6. remaining limitations;
7. confirmation that no key or raw Qloo response was committed.
