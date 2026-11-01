# Evaluation protocol

## Phase 1: six-prompt baseline

Use six prompts: the four reference prompts from the brief plus two project-owner prompts. For every prompt, record the prompt text, seed, Qloo bundle hash, bundle size, baseline scene hash, grounded scene hash, and every changed field. Classify each change as visible in 3D (geometry, materials, props, signage, zones) or invisible (numbers and metadata).

Render baseline and grounded at identical camera, time, exposure, resolution, and post-processing. Record `pixelDiffPercent` and `ssim` for at least an overview camera and an interior camera. Save screenshots outside the repository or in an ignored evaluation directory.

## Phase 2: schema coverage

Confirm that the scene brief contains independently variable values for typology, massing, enclosure, floor/wall/ceiling/feature-wall materials, palette, lighting, furniture, props, program zones, seating/circulation, acoustic treatment, cultural artifacts, and plants/outdoor elements. Every field must contain provenance and source IDs.

## Phase 3: fair designer comparison

Verify that baseline and grounded calls use the same designer, system prompt, catalogue, seed, and temperature. The only input difference is the optional Qloo bundle. Cache by `(prompt, seed, bundleHash)` and never cache raw credentials.

## Phase 4: visible cultural layer

Check that returned artist, film, venue-category, brand-category, and tag values become visible runtime objects when available. Each object must expose `{ provenance, sourceIds, because }` in renderer `userData`.

## Phase 5: kit expressiveness

Count the available catalogue. The target from the brief is at least 12 typologies, 20 material sets, and 40 props grouped by category. If the existing repository catalogue is smaller, report the actual count and extend generic catalogue families rather than adding prompt-specific rules.

## Phase 6: viewer evidence

Verify the Qloo-layer toggle: cobalt means `qloo-evidence`, ochre means `inferred`, grey means `fallback`. Verify compare mode outlines added, removed, and changed elements. The summary strip must be computed from the actual `SceneDiff`.

## Phase 7: guardrails

Run an empty-bundle case. It must show `Qloo returned little for this reference`, contain no Qloo-evidence elements, and produce only the real diff. Run an invalid-ID case and verify automatic downgrade to `inferred`.

## Phase 8: held-out acceptance

For the 12 held-out prompts supplied by the project owner, print the categories changed out of 12, the share of changed elements traced to valid Qloo IDs, overview and interior pixel difference percentage, overview and interior SSIM, bundle size, and misses with their reasons. The requested target is at least 8 changed categories, at least 40% Qloo-traced changed elements, and at least 25% overview pixel diff when Qloo returned sufficient data. These are evaluation targets, not numbers to fake or force.
