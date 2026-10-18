# ARCHITECTURE.md — Sonic Architecture

Snapshot of the actual implementation (updated 2026-10-19, 3D layer added).
Next.js **16.4.2** with Turbopack, React 19.3, TypeScript strict, Tailwind v4,
Framer Motion 14, **three 0.186 + @react-three/fiber 9.8 +
@react-three/postprocessing 3.2**.

> Note: `AGENTS.md` carries a Next.js warning that this version has breaking
> changes vs older Next. Before writing Next-specific code, read
> `node_modules/next/dist/docs/`. Observed so far: `LayoutProps<"/">` global type
> in `app/layout.tsx`, `cacheComponents`/`partialPrefetching` flags, Tailwind v4
> wired through a Turbopack loader rule in `next.config.ts`, and a split
> `.next/dev` vs `.next/build` output tree.

## Routes

| Route | File | Kind | Responsibility |
|---|---|---|---|
| `/` | `app/page.tsx` | client component page | Cinematic landing + full journey (hero, input, signals, translation, venue, moodboard, soundtrack, export) |
| `/studio` | `app/studio/page.tsx` | client component page | Preserved original 3-column dashboard (control-room view) |
| `/api/vibe` | `app/api/vibe/route.ts` | dynamic POST | Qloo integration + spatial translation; returns `VibePayload` |

## Components & hooks

Landing journey (`/`):

- `components/ResonanceField.tsx` — canvas-2D signature wave field: layered
  undulating wave grids + drifting particles, DPR-aware, pointer parallax,
  `intensity` prop (0–1; loading raises it), IntersectionObserver +
  `document.visibilityState` pause, reduced-motion static frame, full cleanup.
- `components/CulturalInput.tsx` — "What do you love?" textarea, Enter submit,
  4 example chips that auto-submit, validation hint, TRANSLATE MY TASTE CTA.
- `components/ProvenanceIndicator.tsx` — source badge (`qloo` /
  `qloo-partial` / `local-fallback`).
- `components/SignalAnalysis.tsx` — entered / resolved / unresolved columns,
  evidence groups (genres, styles, themes, adjectives, characteristics),
  limitations + errors, fallback banner.
- `components/SpatialTranslation.tsx` — 4-step chain, concept thesis,
  per-field mapping rules list.
- `components/VenueScene.tsx` — rich 2D SVG venue scene (wash/beam/floor
  gradients, bar, seats, pendants, glow pools, dust particles), lighting-state
  presets (morning / golden hour / peak night) driven by `lightingTemperatureK`;
  labeled "2D — not physically accurate".
- `components/DesignMoodboard.tsx` — concept title/thesis, palette swatches,
  materials/light, evidence tags, embedded mini ResonanceField.
- `components/SoundtrackSection.tsx` — artist entities from insights (honest
  copy: artists, not tracks; no playback), empty-by-design state with
  limitation, ambient tone toggle.
- `components/FinalCta.tsx` — "Step inside your taste." + ENTER VENUE anchor,
  markdown brief download / copy, create-another-concept.

3D layer (loaded with `next/dynamic` `ssr: false`; each behind a WebGL
availability probe and error boundary):

- `components/three/shared.tsx` — `WebGLBoundary` (class error boundary → 2D
  fallback), `usePrefersReducedMotion` / `useWebGLSupport`
  (`useSyncExternalStore`, SSR-safe).
- `components/three/SonicHero.tsx` — hero scene: shared-GLSL sound membrane
  (points + contour strips + dust), phase machine (`resonance` / `charging` /
  `forming` morphing the field into three portal rings), damped camera rig with
  pointer parallax and real `AnalyserNode` bass input, Bloom + Vignette.
  Default export falls back to `ResonanceField`.
- `components/three/Venue3D.tsx` — venue scene: architecture from
  `SceneParams` (columns by openness, portals, bar, seats, pendants), lighting
  presets + haze + gloss/matte controls, hand-rolled orbit rig (exploring,
  `touch-action: pan-y` for mobile scroll, reduced-motion aware), material
  study panel. Falls back to `VenueScene` SVG.
- `components/DesignMoodboard.tsx` — editorial layered grid (palette strip,
  CSS material chips from flooring/seating strings, lighting-study gradient,
  principles, cultural references).

Shared/legacy:

- `components/SpatialCanvas.tsx` — original 2D SVG floor plan, used by `/studio`.
- `hooks/useAmbientAudio.ts` — lazily created `AudioContext` sine oscillator →
  lowpass → gain (0.06); `vibeScore` (0–100) maps to frequency 440→120 Hz and
  cutoff 1200→300 Hz; play/pause on toggle; full teardown on unmount. Driven
  from `/` by `lightingTemperatureK`. Optional `analyserRef` taps an
  `AnalyserNode` (fft 256, smoothing 0.82) after the gain node — the hero's
  `Rig` reads it for real audio reactivity. Never autoplays.

## Shared libraries

- `lib/types.ts` — `VibePayload`, `ResolvedEntity`, `CulturalEvidence`,
  `ArtistRec`, `Track`, `Concept`, `DesignReasoning` (single source of truth
  imported by both route and UI).
- `lib/terms.ts` — `parseTasteTerms` (up to `MAX_TERMS = 5`; separators
  `+ , ; & and with`), `MAX_INPUT_LENGTH`.
- `lib/spatial-rules.ts` — `mapFromEvidence` (deterministic family detection:
  electronic / hip-hop / punk / atmospheric / neutral → palette, materials,
  lighting; concept titles e.g. "VOLTAGE HALL") and `neutralSpatialMapping`.
  `detectGenreFamily` (exported) scans genre **and style** tags, checking
  texture families (jazz/soul/lo-fi/downtempo) before electronic so jazz
  evidence containing "electro jazz" doesn't fall into the electronic family.
- `lib/scene-params.ts` — `SceneParams` (crest/shadow colors, key-light K,
  wave amplitude/speed, point density/size, reflectivity, openness, fog, bloom,
  shadow depth, material language), `sceneParamsFromPayload(vibe)` with a
  readable `rules` string per field, `neutralSceneParams()`, `blendHex`,
  `kelvinToRgb`. Pure functions; consumed client-side by the hero and venue.
- `lib/brief.ts` — `buildDesignBrief` (markdown export) + `downloadBrief`.

## State management

Local React state in `app/page.tsx`: `vibe`, `isLoading`, `error`, `stage`
(loading message index), `isAudioEnabled`, `heroPhase`
(`resonance`/`charging`/`forming`); refs for request sequencing (`seqRef`),
abort (`abortRef`), and the shared audio `analyserRef`. WebGL support and
prefers-reduced-motion come from `useSyncExternalStore`. No store, no context,
no URL state.

## Data contracts

Declared once in `lib/types.ts` (route and UI import it):

```ts
interface VibePayload {
  primaryColorHex: string; accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string; seatingFabric: string;
  tracks: Track[]; menu: string; fallback: boolean;   // legacy /studio compat
  reasoning: DesignReasoning;                          // { source, evidence, rules }
  // additive fields (new UI + richer API):
  partial: boolean; submittedTerms: string[];
  entities: ResolvedEntity[]; unresolvedTerms: string[];
  evidence: CulturalEvidence; artists: ArtistRec[];
  concept: Concept; limitations: string[]; errors: string[];
}
```

Request body: `{ userInput: string }` (`sliderVal` still accepted, unused).

## API integration (server-side only)

- Base: `process.env.QLOO_API_URL` (default `https://hackathon.api.qloo.com`)
- Auth: header `X-Api-Key: process.env.QLOO_API_KEY` — never sent to the client.
- `GET /search?query=<term>&types=<supported URN list>&take=5` — the `types`
  filter limits matches to insights-supported entities; response items use
  `entity_id` and a `types` **array** (both parsed; first insights-supported
  type wins; hits with no supported type are skipped).
- `GET /v2/insights?filter.type=<urn>&signal.interests.entities=<id,id,...>&take=8`
  — up to `MAX_INSIGHT_CALLS = 3` calls, grouped by entity type, comma-joined
  signal IDs. (Documented `take` replaces the previously used, silently
  ignored `limit`.)
- Evidence = insights tags (`genre`/`style`/`theme` buckets),
  `properties.adjectives_for_music`, `properties.characteristics`, **plus**
  genre/style/theme tags on the search hits themselves; merged with dedupe.
- Artists = insights entities filtered to `urn:entity:artist` subtype only
  (results are cross-domain; non-artists are never mislabeled).
- `mapFromEvidence` is a **deterministic, documented rule table** (no LLM).
- Timeouts: 12 s per upstream call (`AbortSignal.timeout`).

## Failure & fallback ladder

1. `QLOO_API_KEY` missing → `localFallbackPayload()`
2. A term's `/search` fails → term marked unresolved (other terms continue)
3. No term resolves → `localFallbackPayload()`
4. Insights call(s) fail → recorded in `errors`, payload becomes `qloo-partial`
5. Otherwise → mapped payload, `fallback: false`, `source: qloo` or
   `qloo-partial` (no evidence / partial signals)

`localFallbackPayload()` = neutral mapping, empty evidence/artists,
`source: "local-fallback"`, `fallback: true`, with limitation copy.

## Rendering / animation strategy

- Tailwind v4 via `@import "tailwindcss"` + design tokens (`--sa-*`) in
  `app/globals.css`; loaded through the `@tailwindcss/turbopack` loader rule.
- Framer Motion for entrance/section transitions; SVG for the venue fallback
  and moodboard chrome.
- **3D via react-three-fiber** for the hero membrane and the venue
  (`components/three/*`), all imported with `next/dynamic` `ssr: false` and a
  2D loading fallback; a WebGL availability probe + `WebGLBoundary` error
  boundary route failures to `ResonanceField` (hero) / `VenueScene` SVG
  (venue). Canvas-2D `ResonanceField` remains the no-WebGL path and the
  loading state (decision 11 superseded by decision 18 in `DECISIONS.md`).
- ESLint: `react-hooks/immutability` disabled **only** for
  `components/three/**` — WebGL uniforms/cameras/canvas styles are mutated per
  frame by design; UI code keeps the rule enabled.

## Important decisions encoded in code

- Spatial translation is a **local deterministic rule table**, deliberately not
  an LLM, so every design field can be traced to a named Qloo tag (honesty
  requirement).
- Provenance is first-class in the API response (`reasoning.source`) rather
  than an afterthought, so the UI can display exactly how grounded a result is.
- Failing closed to a labeled `local-fallback` (instead of fabricating results)
  is a hard constraint.
- The soundtrack never claims tracks/playback; only artist entities that
  Qloo actually returned.
