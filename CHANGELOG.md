# CHANGELOG — Sonic Architecture

All notable changes, reverse chronological. No secrets in this file.

## 2026-10-19 (cursor-reactive meadow world — real assets)

### Changed — the landing is now a living 3D meadow the cursor can disturb

- **`components/three/CloudWorld.tsx` deleted; new
  `components/three/LandingWorld.tsx`** composes the landing world: displaced
  meadow terrain + winding path, ~62k instanced wind-shaded grass blades, wild
  flowers, scattered GLTF trees/bushes/rocks, a procedural concrete+wood
  pavilion on a knoll, drifting cloud sprites, floating islands, pollen/petals,
  and a skin-animated walker on the path. Sky HDRI provides image-based
  lighting; ACES tone mapping, soft shadows, Bloom + Vignette.
- **New `components/three/world/` module** — `scene.ts` (palette, seeded
  noise/terrain/path maths, blade/flower geometry, shared `world` state,
  `windify()` material injection), `assets.ts` (asset catalogue, surface/HDRI
  loaders, GLTF merge), `Terrain.tsx`, `Vegetation.tsx`, `Sky.tsx`,
  `Pavilion.tsx`, `Landmarks.tsx`, `Character.tsx`, `Atmosphere.tsx`,
  `CameraRig.tsx`.
- **Cursor reactivity is real, not decorative**: a `worldBend()` injection into
  every foliage material bends grass/flowers away from the pointer (projected
  onto the ground plane), and the camera adds damped pointer parallax. One
  shared program (via `customProgramCacheKey`) keeps it cheap.
- **New bundled CC0 assets** under `public/assets/` (~5.5 MB total): Poly Haven
  sky HDRI (`env/sky_1k.hdr`), 53 Kenney Nature Kit GLTFs (`nature/`), a
  Quaternius skinned `char/character.fbx` walker, and downscaled ambientCG
  grass/ground/concrete/wood PBR maps (`textures/`). Full attribution in
  `public/assets/ASSET_CREDITS.md` (16 MB → 2.07 MB after re-encoding).
- **Real-browser verification** (headless Chrome, SwiftShader): zero console
  errors after fixing an undeclared `uGradient` fragment uniform and migrating
  `RGBELoader`→`HDRLoader`; scene confirmed rendering (sky ~46% of frame, meadow
  ~33% green, dark tree/silhouette foreground, pale winding path, floating
  islands) at 1600×900 and 390×844; pointer moves change **47–55 % of pixels**;
  submit → labelled `local-fallback` mock venue → "Explore the concept ↓" works
  with **0** console errors and zero Qloo calls (`?mock=1`).
- **`components/three/LandingWorld.tsx`** re-exported `WorldPhase`; `app/page.tsx`
  now imports it from there and the loading copy is "Composing your world…".
  `components/CulturalInput.tsx` widened to `max-w-3xl`.

## 2026-10-19 (immersive cloud-world landing)

### Changed — the landing is now a bright 3D cloud world

- **`app/page.tsx` rewritten** as a client state machine `landing → travelling →
  venue`. A fixed full-viewport sky sits behind centred copy; submitting issues
  **one** `/api/vibe` request, the world reacts (`charging`), then a forward push
  (`travelling`) is covered by a CSS cloud-wipe and the **venue fills the
  screen** edge-to-edge before the existing editorial sections (signals →
  translation → moodboard → soundtrack → export). `/studio` is untouched.
- **New `components/three/CloudWorld.tsx`** — fully procedural, full-viewport 3D
  sky: gradient/sun sky dome, ~15 layered cloud billboards shaded by a single
  CPU-built tiling value-noise `DataTexture` (three small GLSL shaders; no image,
  video or stock assets), a distant floating pavilion + walkway with a tiny
  walking silhouette, drifting additive dust and a pointer-parallax camera rig.
  Phase prop drives speed/warmth/forward push. Dynamically imported (`ssr:
  false`), no new dependencies.
- **New `components/SkyFallback.tsx`** — pure-CSS dreamlike sky used for the
  dynamic-import loading window, the no-WebGL path, and the static frame under
  `prefers-reduced-motion` (never a blank canvas).
- **`components/CulturalInput.tsx` rewritten** as the floating frosted prompt
  ("A film, an artist, a place, a feeling...", `ENTER YOUR WORLD ↗`). Example
  chips now only **fill** the field — they never auto-submit (Qloo-safety).
- **`components/three/Venue3D.tsx`**: added a `fill` prop to render the venue
  edge-to-edge for the full-screen reveal; default bordered aspect box (used by
  the journey) unchanged.
- **New `lib/dev-mock.ts`** — dev-only `?mock=1` preview payload (explicitly
  labelled `local-fallback` / "not Qloo data", gated on
  `NODE_ENV !== "production"`) so the transition and venue can be iterated with
  **zero** Qloo credits.
- **`app/globals.css`**: added the light atmosphere tokens (`--sa-ink`,
  sky/powder/cloud/lavender/periwinkle/peach, `--sa-frost*`) plus `.sa-frost`,
  `.sa-veil`, `.sa-cloud-*` and their keyframes; the dark tokens are kept and now
  style the venue sections + `/studio`. **Supersedes decision 3 for the landing
  only** (see `DECISIONS.md` #31).
- **`app/layout.tsx`** metadata updated to the new landing voice.
- **`components/three/SonicHero.tsx` retained but no longer mounted** (the cloud
  world replaced it); `ResonanceField` remains the honest 2D fallback used by
  `DesignMoodboard`.

### Qloo-safety (unchanged guarantees, re-verified)

- No request on load, keystroke, hover, animation frame or example-chip click;
  one guarded request per explicit submit (double submits ignored); `?mock=1`
  makes none. Provenance/fallback honesty untouched.

### Verification

- `npm run lint` clean · `npm test` 37/37 · `npm run build` clean (4 routes) ·
  `/` and `/studio` return HTTP 200 in dev.

## 2026-10-19 (quota protection)

### Added — Qloo quota protection & tests

- **Bounded TTL response cache with single-flight dedupe** (`lib/qloo/cache.ts`):
  search responses 24 h, insights 12 h, LRU capped at 500 entries (env-
  configurable); concurrent identical requests share one upstream call; failed
  loads are never cached. Scoped to one server process (documented limitation).
- **Retry/timeout-aware HTTP layer** (`lib/qloo/http.ts`): 12 s per-attempt
  timeout, ≤3 attempts, exponential backoff + jitter, `Retry-After` respected
  (gives up if > 10 s), retries only 408/429/5xx (never 400/401/403/404), drains
  failed bodies, never throws. Reads the **real** Qloo quota headers
  (`x-month-ratelimit-limit/remaining/reset`, `x-second-ratelimit-*`,
  `x-qloo-request-id`).
- **Application request ceiling** (`lib/qloo/usage.ts`): `QLOO_APP_MONTHLY_BUDGET`
  (default 9000, clamped ≤9900 — below the upstream limit of 10000), counted per
  actual attempt (retries included) with status histogram and UTC-month rollover;
  durable counters in git-ignored `.qloo-usage.json` (temp+rename; corrupt or
  unwritable file degrades to memory-only). Checked before **every** upstream
  attempt via `shouldStop`.
- **Extracted, testable profile orchestration** (`lib/qloo/profile.ts`) and
  honest fallback (`lib/fallback.ts`); `app/api/vibe/route.ts` now wires
  module-scope cache + usage tracker. Insights entity IDs are sorted and
  deduplicated so request/cache keys are order-independent.
- **Quota transparency (additive contract)**: `VibePayload.quota?` is attached
  only when the request actually received upstream headers; shown in
  `SignalAnalysis` as "upstream quota: used/limit this month". Never present on
  cache-only runs, never on the fallback path.
- **Tests**: 37 `node:test` cases (cache TTL/single-flight/LRU/eviction, HTTP
  retries/backoff/Retry-After/shouldStop/quota parsing, usage budget/clamp/
  rollover/persistence, profile reuse/caching/concurrency/budget, fallback
  honesty) via `npm test` (`tsconfig.test.json` → Node 24 native runner, no new
  deps).
- **Live verification (2 requests, 1 term)**: cold run → `source: qloo`,
  8 artists, real headers attached (`limit 10000, remaining 9877`); immediate
  repeat → identical payload with **no upstream call and no quota field**;
  `.qloo-usage.json` counted `search 1 / insights 1 / 200×2`.
- **Docs/config**: `.env.example` documents all quota env vars; `.gitignore`
  ignores `.qloo-usage.json` + `.test-dist/`; eslint ignores compiled tests.
- **Limitation (explicit, not claimed away)**: cache and budget are
  **per-process**, persisted per machine — this is not a global monthly cap
  across hosts; shared atomic storage would be required for that.

## 2026-10-19 (later)

### Added — immersive 3D + sound redesign

- **3D resonance hero** (`components/three/SonicHero.tsx`): react-three-fiber
  scene with GLSL sound-membrane (point cloud + contour lines + dust sharing
  one displacement vertex program), hero phase machine (`resonance` →
  `charging` during submit → `forming` cinematic morph pulling the field into
  three vertical portal rings, then back), pointer-parallax + damped camera rig,
  crest/shadow point lights, Bloom + Vignette postprocessing, fog. Falls back to
  `ResonanceField` (2D) via error boundary and a WebGL availability probe.
- **3D venue centerpiece** (`components/three/Venue3D.tsx`): architectural scene
  (portal frames, columns scaled by openness, bar spine, seats, pendants) with
  live controls — explore/reset orbit, light presets (morning / golden hour /
  peak), atmosphere haze toggle, gloss/matte floor — plus a material-study
  panel (flooring, seating, key K, accent, provenance). Hand-rolled damped
  orbit rig (`touch-action: pan-y` keeps mobile scroll; auto-orbit respects
  reduced motion). WebGL failure → `VenueScene` SVG fallback.
- **Deterministic scene parameters** (`lib/scene-params.ts`): `SceneParams` +
  `sceneParamsFromPayload()` mapping Qloo evidence to 3D uniforms (crest/shadow
  colors, key-light Kelvin, wave amplitude/speed, point density, openness, fog,
  bloom, material language) with a human-readable `rules` string per field;
  `neutralSceneParams()` for pre-profile state; `blendHex`/`kelvinToRgb`
  helpers. Rendered audibly in a new "3D scene parameters" block in
  `SpatialTranslation`.
- **Audio-reactive visuals**: `useAmbientAudio` gained an optional
  `AnalyserNode` tap (fft 256, smoothing 0.82) wired into the hero rig — the
  membrane swells with the procedural tone's real frequency data. Audio still
  never autoplays; hero carries an honesty note ("procedural oscillator / real
  analyser signal").
- **Shared 3D utilities** (`components/three/shared.tsx`): `WebGLBoundary`
  error boundary, `usePrefersReducedMotion` + `useWebGLSupport` via
  `useSyncExternalStore` (SSR-safe: `null` → boolean on client).
- **Editorial moodboard rewrite** (`DesignMoodboard.tsx`): layered asymmetric
  grid panels, palette strip, CSS material chips derived from flooring/seating
  strings, lighting-study gradient with the concept Kelvin marker, numbered
  design principles, cultural reference chips.
- **Page orchestration** (`app/page.tsx`): `next/dynamic` `ssr: false` imports
  for both 3D scenes with 2D loading fallbacks, shared analyser ref, hero phase
  timing (scroll to signals after the forming transition), audio-honesty copy.

### Changed

- **Dependencies**: added `three@0.186.1`, `@react-three/fiber@9.8.2`,
  `@react-three/postprocessing@3.2.0`, `postprocessing`. `@react-three/drei`
  was installed then removed — orbit controls are hand-rolled to keep the
  dependency surface small.
- **Genre-family detection** (`lib/spatial-rules.ts`): `detectGenreFamily` now
  also scans style tags and checks texture families (jazz/soul/lo-fi/downtempo)
  before electronic — plain `jazz` previously fell to neutral, and jazz
  evidence containing "electro jazz"/"electronic" tags mapped to the
  electronic family (the open question noted in the 2026-10-18 entry).
- **ESLint**: scoped `react-hooks/immutability` off for `components/three/**`
  only (WebGL uniforms/cameras are mutated per frame by design); the three
  `set-state-in-effect` findings in UI code were fixed properly with
  `useSyncExternalStore`.

### Verified (2026-10-19, after the 3D build)

- `npm run lint` clean (exit 0); `npm run build` passes, 4 routes.
- Live `/api/vibe`: `jazz` → `qloo`/`#FF6B35`, `Miles Davis + neon Tokyo` →
  `qloo`/`#00E5FF` + 8 artists, `80s synthwave rave` → `qloo-partial`/neutral,
  whitespace → 400; `/` and `/studio` 200.
- `sceneParamsFromPayload` exercised directly against real profile shapes:
  jazz → atmospheric family (amp 0.70, soft, open 0.62), synthwave → electronic
  (amp 2.07, gloss, open 0.90), neutral/`qloo-partial` → neutral defaults;
  `rules` strings readable per field.
- Headless Edge screenshots (1440×900 and 390×844) captured; pixel analysis
  confirms rendered hero content (66%/59% non-black samples, acid-lime accent
  pixels present) — **not visually inspected** (no image-capable viewer in
  this session).
- Staged/worktree secret scan for the key literal: clean (43 files).

### Still open

- **Rotate the Qloo API key** (old key was exposed pre-baseline) and update `.env.local`.
- Tests, `sliderVal` wiring, `.env.example` maintenance — see `TASKS.md` P2.

## 2026-10-19

### Added — cinematic landing experience (P1 complete)

- **New `/` landing page** (`app/page.tsx`, client component): fixed smoked-glass
  header with section nav + audio toggle; full-viewport hero ("SONIC
  ARCHITECTURE" / "Your taste has a frequency.") over an animated resonance
  field; "What do you love?" input with 4 example prompts; 4-step process band;
  staged loading states with `aria-live` announcements; race-safe fetch
  (AbortController + request-sequence guard); scroll-to-results; error banner;
  reset/new-concept; footer with provenance line and `/studio` link.
- **`components/ResonanceField.tsx`** — signature canvas-2D particle-wave
  (layered undulating wave grids, DPR-aware, pointer parallax, intensity prop,
  IntersectionObserver + `document.visibilityState` pause, reduced-motion static
  frame, full cleanup on unmount). Canvas 2D chosen over three.js/R3F (lighter,
  no new dependency; recorded in `DECISIONS.md`).
- **Journey components**: `CulturalInput` (textarea, Enter submit, chips,
  validation hint), `ProvenanceIndicator`, `SignalAnalysis` (entered/resolved/
  unresolved columns, evidence groups, limitations, fallback banner),
  `SpatialTranslation` (4-step chain, thesis, per-field rules), `VenueScene`
  (rich SVG scene: wash/beam/floor gradients, bar, seats, pendants, glow pools,
  dust particles; morning/golden-hour/peak-night presets; honesty label
  "2D — not physically accurate"), `DesignMoodboard` (concept title/thesis,
  palette swatches, materials/light, embedded mini resonance field),
  `SoundtrackSection` (artist entities, honest no-playback copy, ambient tone
  toggle), `FinalCta` ("Step inside your taste." + ENTER VENUE / export / copy
  / new-concept).
- **`lib/brief.ts`** — markdown design-brief builder (references, resolved
  entities, Qloo evidence, spatial direction, mapping rules, artists,
  limitations; never secrets) + client download helper.
- **Design tokens & metadata**: `globals.css` rewritten with `--sa-*` tokens,
  `sa-label`/`sa-glass` utilities, reduced-motion, focus-visible, selection
  styles; `layout.tsx` metadata now real (title/description).
- Old dashboard preserved at **`/studio`** (`git mv app/page.tsx
  app/studio/page.tsx`) as a control-room view; additive payload keeps it working.

### Changed — Qloo integration (fixes live 400s; verified end-to-end)

- **Search request now sends `types` filter** with the insights-supported
  entity list (artist, book, brand, destination, locality, movie, person,
  place, podcast, tv_show, videogame) — previously unfiltered searches matched
  unsupported types (albums/actors) that insights rejected with HTTP 400.
- **Search response parsing fixed to the real API shape**: `entity_id` (not
  `id`) and a `types` **array** (not a single `type` string). The old parser
  silently defaulted every hit to `urn:entity:artist`, which broke insights for
  non-artist matches. This was the root cause of the live "Insights failed
  (HTTP 400)" errors.
- **Multi-term input** (`lib/terms.ts`, up to 5 terms; separators `+ , ; & and
  with`), one resolved entity per term, per-term unresolved tracking.
- **Insights**: up to 3 calls grouped by entity type with comma-joined
  `signal.interests.entities` and `take=8` (documented param; replaces the
  previously ignored `limit`).
- **Insights artist extraction filtered to `urn:entity:artist` subtype** —
  affinity results are cross-domain and are no longer mislabeled as artists.
- **Search-hit tag evidence** (genre/style/theme tags on the matched hits
  themselves) merged into the evidence pool alongside insights evidence.
- Payload extended additively (`partial`, `submittedTerms`, `entities`,
  `unresolvedTerms`, `evidence`, `artists`, `concept`, `limitations`,
  `errors`); legacy fields (`tracks`, `menu`, `reasoning`, design fields)
  preserved for `/studio` compatibility. Provenance contract unchanged.
- Shared types extracted to `lib/types.ts`; spatial rules to
  `lib/spatial-rules.ts` (unchanged mapping behavior).

### Verified (2026-10-19, live)

- `jazz` → 200, `source: qloo`, place entity, rich genre/style/theme evidence,
  concept "GOLDEN HOUR BLOCK", honest empty-soundtrack limitation.
- `Miles Davis + neon Tokyo` → artist + place entities, 8 real affinity artists
  (Coltrane, Parker, Monk, Mingus, Brubeck, Hancock, Blakey).
- `A24 films + indie music` → two brand entities, `source: qloo`.
- Whitespace input → HTTP 400. Garbage input → `local-fallback` with
  unresolved terms listed.
- `/` and `/studio` render 200. `npm run lint` clean; `npm run build` passes.
- `.next` bundle secret scan: clean (250 files, no key literal).

### Still open

- **Rotate the Qloo API key** (old key was exposed pre-baseline) and update `.env.local`.
- 3D venue (R3F), tests, `sliderVal` wiring — see `TASKS.md` P2.

## 2026-10-18 (later)

### Changed
- **Repository made public** (`shayspace04/sonic-architecture`) after verifying
  via full-history grep that no credential exists in any commit.
- **Qloo live integration verified working** — after the user set Wi-Fi DNS to
  `8.8.8.8` / `1.1.1.1`, `POST /api/vibe` returned `source: qloo`,
  `fallback: false`, 5 artist recommendations, full palette/lighting mapping.
  This closes the main P0 connectivity blocker. (One observation to investigate:
  a "jazz" query matched the electronic/high-energy rule family — the mapping may
  be coarse or Qloo's tags for the first hit were unexpected.)
- **GitHub CLI installed and authenticated** — `gh` 2.102.0 via winget; logged in
  as `shayspace04` (keyring; scopes repo/read:org/gist/workflow). gh is now the
  preferred tool for remote operations.
- Docs updated: `DECISIONS.md`, `TASKS.md` reflect the DNS fix, gh setup, and
  verified Qloo status.

### Still open
- **Rotate the Qloo API key** (old key was exposed pre-baseline) and update `.env.local`.

## 2026-10-18

### Added
- **Git/GitHub version control setup.** Local repo rebuilt as a **clean single-commit
  baseline on `main`** (`d589bfd` — "chore: establish Sonic Architecture project
  baseline") and pushed to a **private** GitHub remote
  `https://github.com/shayspace04/sonic-architecture.git`.
  - *Why:* the previous history (commit `610cf7c`) contained the live Qloo API key
    in `env.txt`. Per user decision, history was replaced with a fresh baseline so
    **no credential exists in any commit or in the pushed history**. All project
    files were preserved; only the two old commits were discarded.
  - Old refs purged (`reflog expire` + `git gc --prune=now`); old commit verified unreachable.
- `.gitignore` now un-ignores `.env.example` (`!.env.example`) so the safe template
  can be committed while `.env.local` and `env.txt` stay ignored.
- `.env.example` — environment variable names with empty placeholders only.
- `PROJECT_CONTEXT.md`, `TASKS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `AGENTS.md`
  — persistent project memory from the full handoff audit (vision, architecture,
  provenance contract, prioritized backlog, open questions).
- `QLOO_DEBUG.md` — Qloo connectivity diagnostics (committed as reference).
- `CHANGELOG.md` (this file).

### Security
- **Qloo API key rotation still pending.** The key that was in the old history was
  also briefly displayed during the audit terminal session; treat it as exposed and
  rotate it in the Qloo dashboard, then update `.env.local` only (never commit it).
  History purge means the rotated key will be the only live one.
- Verified before committing: no `.env.local`, no `env.txt`, no `node_modules`,
  no `.next` staged; staged content scanned for the actual API-key literal — none found.

### Changed (carried into the baseline, from earlier uncommitted work)
- `app/api/vibe/route.ts` — provenance object (`qloo` / `qloo-partial` /
  `local-fallback`) with per-field `rules` and matched `evidence`; deterministic
  genre-family → palette/material/lighting mapping; defensive Qloo response parsing.
- `app/page.tsx` — Design Basis panel showing source/evidence/rules.
- Checks: `npm run lint` clean; `npm run build` passes (Next 16.4.2, TS clean).

### Known limitations / environment
- **Qloo live calls currently fail from this machine** — hotspot DNS
  (`172.20.10.1`) resolves `hackathon.api.qloo.com` only to NAT64 IPv6 and
  connect-times-out; `/api/vibe` returns `local-fallback`. Same class of issue
  affected `github.com` resolution during this setup (worked around temporarily
  with a hosts entry; permanent fix = set Wi-Fi DNS to 8.8.8.8 / 1.1.1.1).
- Insights entities are **artists**, not tracks; `menu` field is metadata, not a
  generated menu — present honestly in the UI.
- No 3D venue or landing-page animation yet (see `TASKS.md` P1/P2).
