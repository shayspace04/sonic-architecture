# Sonic Architecture — Local Adaptation Layer

This folder is a renderer-agnostic bridge around the original repository. It is designed for local development with Gemini Flash or another lower-cost model that may not be able to visually inspect the full application.

## What this package does

- Defines a scene brief with 14 independently variable dimensions.
- Stores `provenance`, `derivedFrom`, and `because` on every field and renderable element.
- Validates that `qloo-evidence` IDs actually exist in the runtime Qloo bundle. Invalid claims downgrade to `inferred`.
- Runs the same designer contract for baseline and grounded scenes. Baseline receives prompt + seed; grounded receives prompt + seed + the runtime bundle.
- Provides a renderer adapter interface that can target Three.js, React Three Fiber, Babylon, Unity export, Blender Python, or a custom renderer.
- Provides a scene diff summary with added, removed, changed, unchanged, and Qloo trace share.
- Leaves pixel-diff and SSIM capture behind an explicit adapter so identical camera/time/exposure can be enforced by the renderer owner.
- Keeps Qloo runtime data out of the repository. No API key, response payload, or Qloo image is committed.

## Files

- `lib/types.ts` — scene brief, bundle, element, and renderable scene contracts.
- `lib/provenance.ts` — source-ID validation, element counts, and human-readable explanations.
- `lib/pipeline.ts` — same-designer baseline/grounded pipeline and cache-key helper.
- `lib/diff.ts` — truthful scene diff and render metric interfaces.
- `renderer/adapter.ts` — renderer integration seam and default element mapper.
- `examples/qloo-bundle.example.json` — shape-only runtime fixture with fake IDs.
- `prompts/gemini-flash-adapter.md` — copy/paste implementation prompt.
- `prompts/designer-system.md` — structured-output system prompt for the scene designer.
- `evaluation-protocol.md` — six-prompt measurement, 12-prompt acceptance, and reporting format.

## Adaptation sequence

1. Keep the existing repository UI and Three.js renderer working.
2. Map your current `SceneSpec` into `SceneBrief` or write a small conversion function.
3. Implement `QlooRuntimeAdapter.resolve()` using your server-side Qloo client. Never expose keys in the browser.
4. Implement `DesignBriefProvider.designBrief()` using the same system prompt, catalogue, seed, and temperature for both modes.
5. Call `buildBaselineAndGrounded()` from a server action, route handler, or local script.
6. Convert the returned `RenderableScene` into your existing meshes using `SonicRendererAdapter.addElement()`.
7. Attach `element.sourceIds`, `element.provenance`, and `element.because` to your renderer object's `userData`.
8. Build Qloo layer, hover explanations, diff outlines, and summary strip from `compareScenes()`; do not create visual differences that are not in the specs.
9. Add a Playwright or renderer-native `RenderMetricsAdapter` that captures the same camera, time, exposure, resolution, and post-processing for both scenes.

## Truthfulness rules

A small or empty Qloo bundle must produce a small or empty grounded diff. Do not pad the scene to hit a target. If a source ID is not in the current bundle, the validator downgrades the field to `inferred`. Keep baseline instructions and catalogue access identical to grounded instructions.
