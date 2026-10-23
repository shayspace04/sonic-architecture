# CHANGELOG — Sonic Architecture

All notable changes, reverse chronological. No secrets in this file.

## 2026-10-23 (Universal Deep 3D Architectural Detail & Dynamic Qloo Element Synthesis)

### Added
- **Universal Multi-Typology Architectural Synthesis (`lib/scene-spec.ts`)**:
  - Expanded from 6 to 9 richly detailed spatial typologies with bespoke envelope volumes, ceiling structures, wall architectures, and zoning:
    1. `grand_hall` (*Cathedral Timber Banquet Hall & Celebration Venue*, 14m × 22m × 7.2m)
    2. `listening_room` (*Japanese Jazz Listening Sanctuary & Audiophile Salon*, 11m × 15m × 3.6m)
    3. `intimate_lounge` (*Mid-Century Cocktail Lounge & Velvet Speakeasy*, 13m × 17m × 4.2m)
    4. `mediterranean_courtyard` (*Sunlit Mediterranean Riad Courtyard & Orangery*, 14m × 18m × 5.2m)
    5. `industrial_loft` (*Warehouse Taproom & Roastery Loft*, 13m × 19m × 5.0m)
    6. `party_venue` (*Underground Cyberpunk / Grunge Celebration Club*, 14m × 18m × 5.2m)
    7. `scandinavian_living` (*Minimalist Nordic Light Pavilion*, 12m × 16m × 4.2m)
    8. `futuristic_launch` (*Kinetic Horizon Product Stage*, 16m × 22m × 6.0m)
    9. `gallery_pavilion` (*Sculptural Contemporary Art Pavilion*, 13m × 16m × 4.4m)
- **Universal Dynamic Qloo Recommendations & Element Binding (`lib/scene-spec.ts`)**:
  - **Dynamic Flooring Material Binding**: `vibe.flooringMaterial` from Qloo is dynamically interpreted into PBR shader properties (`spec.floorFinish`) and exposed directly in the 3D HUD, 2D blueprint, and studio inventory.
  - **Dynamic Seating Fabric Infusion**: `vibe.seatingFabric` (e.g. crushed mohair velvet, saddle leather, bouclé, raw linen) dynamically mutates every seating archetype in the room with exact tactile material strings and acoustic absorption rationale.
  - **Dynamic Lighting Kelvin & Atmosphere**: `vibe.lightingTemperatureK` and `vibe.concept.lightingDirection` directly drive the 3D lighting rig and downlight intensities.
  - **Qloo Cultural Artist Showcase Node**: Surfaced affinity artists (`vibe.artists[0]`) dynamically spawn an architectural travertine/brass vitrine showcase plinth with a dedicated spotlight and functional cultural zone in both 3D and 2D.
  - **Dynamic Evidence Tag Spawn**: Missing architectural archetypes (cocktail bars, library grid walls, hurricane candle lanterns, travertine hearths) are dynamically assembled from Qloo evidence tags (`vibe.evidence.tags`).
- **New Procedural 3D Fixture Archetypes (`components/three/Venue3D.tsx`)**:
  - **Fluted Cocktail Bar Counter**: Fluted walnut/marble front, honed brass footrail, and backlit under-counter LED glow.
  - **Floor-to-Ceiling Grid Library & Vinyl Shelving Wall**: Multi-column timber grid shelving with vinyl record stacks and literature diffusers.
  - **Carved Stone Water Fountain Basin**: Octagonal chiseled limestone basin, high-specular reflective water plane, and central brass bubbling spout.
  - **Architectural Travertine Hearth / Fireplace**: Low cantilevered travertine slab, recessed firebox, and glowing embers casting warm firelight.
  - **Qloo Cultural Showcase Vitrine**: Honed architectural stone pedestal with inscribed brass plaque and showcase vinyl disc under spotlight.
  - **Mouth-Blown Amber Glass Pendants**: Murano amber teardrop glass pendants casting intimate warm downlight pools.
- **Architectural Ceiling & Wall Shell Extensions (`components/three/Venue3D.tsx`)**:
  - Modular ceiling structures: `cathedral_truss`, `acoustic_coffered`, `timber_pergola`, `concrete_beams`, `neon_lightgrid`, `minimal_soffit`.
  - Modular wall architectures: `arched_colonnade`, `timber_slats`, `panoramic_glazing`, `fluted_stone`, `raw_concrete_panels`, `gallery_planes`.
- **Planning HUD & 2D Blueprint Enhancements (`Venue3D.tsx`, `SpatialTranslation.tsx`, `rationale.ts`)**:
  - 3D Layout Planning HUD displays a dedicated **Qloo Recommendations** panel with active flooring, seating, featured artist, and Kelvin bindings.
  - 2D Schematic Floor Plan displays dynamic envelope volume ($m^3$), clear height with structural ceiling type, wall architecture, and Qloo flooring substrate.
  - Rationale section surfaces a 7th card for Qloo Affinity Artist Showcase with full cross-domain provenance.
- **Studio & Landing Composer Options (`app/studio/page.tsx`, `components/CulturalInput.tsx`)**:
  - Added Mid-Century Speakeasy, Mediterranean Riad, and Industrial Loft Taproom presets.

## 2026-10-23 (Cathedral Timber Banquet Hall & High-Fidelity 3D Details)

### Added
- **Cathedral Banquet Hall Typology (`lib/scene-spec.ts`, `components/three/Venue3D.tsx`)**:
  - Added 6th major architectural typology: `grand_hall` (*Cathedral Timber Banquet Hall & Celebration Venue*, 14m × 22m × 7.2m volume) inspired by Spacely AI celebration architecture.
  - Automatic prompt mapping for weddings, banquets, grand halls, cathedrals, ceremonies, receptions, chandeliers, and timber trusses.
  - Three distinct functional zones: *Candlelit Central Runway & Procession* ($48\text{ m}^2$), *Banquet Dining & Reception Wings* ($110\text{ m}^2$), and *Ceremonial Altar & Floral Arch* ($35\text{ m}^2$).
- **Authentic Cathedral Timber Roof Trusses (`components/three/Venue3D.tsx`)**:
  - Sloped gabled roof panels meeting at an apex ridge beam ($H=7.2\text{m}$).
  - 5 heavy timber A-frame trusses with horizontal tie beams, vertical king posts, diagonal rafters, and longitudinal purlins.
- **Arched Window Colonnades (`components/three/Venue3D.tsx`)**:
  - Rhythmic architectural arched window portals with steel frames and mullions along both side walls.
  - Arched ceremonial altar niche in the back wall.
- **Rich Procedural 3D Furnishings & Atmospheric Lighting (`components/three/Venue3D.tsx`)**:
  - **Grand Baroque Crystal Chandeliers**: Multi-tier faceted crystal prisms, radiating brass branches, and warm glowing candle tips with dynamic point lights.
  - **Hurricane Glass Candle Lanterns**: Brass-framed glass lanterns with wax pillar candles lining the central runway, casting romantic warm reflections on the floor.
  - **Draped Belgian Linen Banquet Tables**: Symmetrical banquet tables with floor-length linens, table runners, tabletop candle votives, and Chiavari chairs.
  - **Elevated Trumpet Urn Floral Centerpieces**: Polished brass pedestal stands with lush white roses, hydrangeas, and cascading eucalyptus foliage.
  - **Cathedral Botanical Floral Archway**: Grand arched living greenery trellis framing the altar.
- **Studio & Composer Updates (`app/studio/page.tsx`, `components/CulturalInput.tsx`)**:
  - Added "Cathedral banquet" curated brief chip to hero composer.
  - Added "Cathedral Banquet Hall" preset and typology override to `/studio`.

## 2026-10-23 (Nest Architectural Design & Interactive 3D Layout Planning)

### Added
- **Nest-Style Exploded Architecture Effect (`components/three/Venue3D.tsx`)**:
  - Procedural layer deconstruction: ceiling beams smoothly elevate in $+Y$, perimeter walls expand outwards in $\pm X$ and $-Z$, and vertical axonometric guide lines connect structural corners to the foundation floor.
  - "Exploded" camera view preset with custom framing and dynamic separation slider (0% to 100%).
  - Architectural layer visibility toggles (Roof Beams, Perimeter Walls, Blueprint Grid).
- **Interactive 3D Spatial Planning & Zoning HUD (`components/three/Venue3D.tsx`)**:
  - Real-time dimensional specs: envelope footprint ($W \times D\text{ m}, m^2$), envelope volume ($m^3$), clear ceiling height ($m$).
  - Dynamic functional zoning (e.g. Acoustic Stage, Intimate Sweet-Spot Hearth, Vinyl Ingress Corridor) defined in `SceneSpec`.
  - Click-to-focus navigation: selecting any zone in the HUD or in 3D smoothly glides the camera to focus on that zone's 3D coordinates.
  - Floating dark glass architectural dock and object inspector cards with backdrop blur.
- **Interactive 2D Architectural Schematic Blueprint (`components/SpatialTranslation.tsx`)**:
  - High-precision SVG floor plan projection rendering walls, window apertures, metric dimension strings ($W\text{m} \times D\text{m}$), and functional zoning boundaries.
  - Placed fixture icons showing relative coordinates with interactive inspection on click.
  - Companion Inspector HUD displaying acoustic purpose, dimensions, materials, and design rationale.
- **Nest-Inspired Hero Landing Experience (`app/page.tsx`, `components/CulturalInput.tsx`)**:
  - Centered hero layout with large editorial display typography ("A feeling, given form.").
  - Dark frosted glass prompt composer with subtle pill-shaped example brief chips.
  - Ultra-minimal transparent header that gracefully transitions to frosted glass in venue mode.

## 2026-10-23 (Full Product Redesign & Spatial Architecture Engine)

### Added
- **Spatial Specification Engine (`lib/scene-spec.ts`)**:
  - Translates natural-language briefs + Qloo affinity signals into 5 distinct architectural typologies:
    1. Japanese Jazz Listening Lounge (tatami scale, walnut acoustic absorption slats, washi paper lanterns, solid walnut turntable credenza, horn speakers).
    2. Underground Grunge Celebration Hall (dark glossy concrete, high ceilings, brutalist DJ console, electric pink/cyan neon architectural framing arches, chrome tubular bar furniture).
    3. Minimalist Nordic Light Pavilion (natural white oak, morning sunlight aperture, sand bouclé modular sofa, travertine credenza, terracotta potted olive tree).
    4. Kinetic Launch Pavilion (reflective obsidian plinth, surgical 6500K hexagon light canopy, linear titanium bench ribbons).
    5. Contemplative Spatial Gallery (museum proportions, concrete observation bench, Roman travertine & volcanic basalt plinths).
  - Explicit parsing of user prompt requirements (spatial typology, materials, seating counts, apertures).
- **Decision Traceability & Rationale Matrix (`lib/rationale.ts`)**:
  - Distinguishes Qloo Cultural Evidence, Spatial Design Translation rules, User Requirements, and Local Fallbacks.
  - Links specific Qloo tags directly to architectural decisions in the UI.
- **Interactive 3D Architectural Viewport (`components/three/Venue3D.tsx`)**:
  - Procedural architectural shells (acoustic slats, PBR floor/wall finishes, window apertures casting directional raking light).
  - Procedural furniture and architectural lighting fixtures with emissive glows and shadows.
  - Interactive object selection & inspection: clicking objects in 3D highlights them and opens an architectural HUD card showing dimensions, material finishes, and design intent.
  - 4 camera view presets: Perspective Orbit, Top-Down Floor Plan, Eye-Level Walk, Focal Macro.
  - Lighting presets (Morning Dawn, Golden Hour, Midnight Session) and floor finish toggles (Gloss / Matte).
- **Upgraded 3D Spatial Studio (`app/studio/page.tsx`)**:
  - Replaced legacy 2D floor plan mock with a full-screen interactive 3D studio workspace.
  - Live design brief editor with one-click presets, taste stratification slider, manual typology selector, and Qloo status indicators.
  - Right inspector sidebar with 3 tabs: Spatial Specifications, Cultural Traceability Rationale, and 3D Object Inventory.
  - Export capabilities: Download Design Brief (.md) and Export 3D Scene Spec (.json).
- **Architectural Editorial Design Foundation**:
  - Colors: warm architectural paper `#EEE8DC`, near-black ink `#171A1F`, deep moss `#2F5A4C`, restrained terracotta `#D9532B`, muted `#5B5F66`.
  - Typography: editorial serif for large headlines, clean sans-serif for UI, monospace for dimensions and metadata.
  - Offline-safe font loading fallbacks avoiding build-time external Google Fonts network dependencies.
  - Clean production build with Webpack (`next build --webpack`), avoiding Turbopack loader IPC issues on Windows.

### Preserved
- Full Qloo API integration with server-side authentication, response caching, quota protection, and honest fallback labeling.
- Stable `/api/vibe` request and response contract.
- All 37 existing unit tests pass cleanly (`npm test`).
- 0 lint errors, 0 lint warnings (`npm run lint`).

## 2026-10-20 (landing background — Sylva Living Green moss-root world)

### Changed — the landing background is now the minted Sylva procedural scene

- **New landing background**: the "Living Green" procedural moss-root world
  (`SylvaLivingWorldScene`, Three.js r149) replaces the angular terrain /
  floating islands / obelisk / pavilion as the full-viewport background behind
  the existing hero. There is never more than one 3D background mounted, and the
  scene is unmounted in the venue state.
- **Integration without Vite or dependency changes.** The four bundle files are
  shipped verbatim under `public/sylva/`
  (`sources/inner-green-3d.html` — 197914 B, `sources/inner-green-assets/
  three.min.js` — 608081 B, `threeui.css` — 40715 B; byte sizes match the
  bundle's stated sizes and the HTML/CSS/`three.min.js` decode cleanly).
  `components/three/SylvaLivingWorldScene.tsx` is the adapted component: the
  authored Vite `?raw` imports are replaced with a one-time runtime `fetch()`
  of those files (documented in the component header). The sandboxed-`srcDoc`
  iframe architecture (`sandbox="allow-scripts"`), the scene-only document
  splice, the injected styles, the variant styles, the reduced-motion loop
  guard, and the IntersectionObserver + `visibilitychange` + matchMedia gating
  are all preserved from the source.
- **Cursor reaction preserved without stealing clicks.** The host is `aria-hidden`
  and `pointer-events: none`, so the page keeps every click. Because a
  click-through iframe receives no pointer events, the parent forwards its
  pointer position over `postMessage` and a small inlined bridge
  (`POINTER_BRIDGE`) re-emits synthetic `pointermove` / `pointerleave` events on
  the scene's own `window`, which is what the authored listeners read.
- **Qloo safety unchanged**: rendering and cursor interaction issue **zero**
  `/api/vibe` and **zero** Qloo calls (only an explicit submit does).
- **ESLint**: `public/sylva/**` added to `globalIgnores` (the vendored r149 UMD
  is not app code).
- **Verified in headless Chrome @1280×800**: scene host `data-state="ready"`,
  canvas fills the viewport, input is on top and focuses on click + accepts
  text, submit → travelling → labelled mock venue with 0 exceptions; the
  `postMessage` bridge was proven end-to-end (parent payload →
  `pointermove`/`pointerleave` with correct coordinates) against a real
  `sandbox="allow-scripts"` iframe on the app origin, and an event-level
  attribution run (bridge ON vs OFF, ambient animation irrelevant) confirmed the
  scene's own `window` receives 4 moves + 1 leave with the bridge and **0** with
  it disabled. `npm run lint` clean, `npm test` 37/37, `npm run build` clean
  (4 routes).
  The old `LandingWorld.tsx` + `world/*` files remain on disk but are no longer
  mounted (dead code; removal deferred to keep this change small/reversible).

## 2026-10-19 (organic meadow redesign — fox + Gobkit)

### Changed — the landing is now a lush, organic meadow, not an angular field

- **Killed the angular/sci-fi read.** `Pavilion.tsx` deleted; `Landmarks.tsx`
  rewritten from floating islands + obelisk to a single `Horizon` of three
  fog-tinted instanced bands (hills / mountains / far mountains). No more
  floating rectangles or portal.
- **Fox protagonist.** `Character.tsx` now loads the Quaternius CC0
  `char/fox.glb` (1848 tris): `AnimationMixer` blends `Idle`↔`Walk` on
  `world.travel`, walks the path when travelling and idles at home with cursor
  gaze. `char/character.fbx` (humanoid) removed.
- **New CC0 nature kit**: `public/assets/meadow/*.glb` (Gobkit free library,
  CC0 1.0) — `tree_high/med/low`, bushes, reed, rock, hill, mountain,
  mountain_far. The unused Kenney `public/assets/nature/` GLTs were deleted.
  `public/assets/ASSET_CREDITS.md` rewritten for the fox + Gobkit sets.
- **Rewritten world**: `scene.ts` (new airy palette, terrain/path maths, blade/
  flower geometry, exported `FOG_DENSITY`), new `flowerMask.ts`, `Terrain.tsx`
  (vertex-coloured meadow + soil patches + path ribbon), `Vegetation.tsx`
  (`GrassField` 82k/26k, `WildflowerField` 4.2k/1.4k, `MeadowPlants`, `HeroTree`),
  `Sky.tsx` (4-stop dome + sun glow + cumulus sprites), `Landmarks.tsx`
  (`Horizon`), `Character.tsx` (fox), retuned `CameraRig.tsx`.
- **Bug fixed (world was invisible)**: the Gobkit GLBs are authored in
  centimetres (`TreeHigh001` ≈ 849 units). Without normalisation every plant
  stood hundreds of metres tall and filled the camera with flat grey. `assets.ts`
  `flatten()` now applies a uniform `UNIT = 0.01` (proportions preserved) and
  group scales act on metre-sized geometry. Root cause confirmed by bisecting
  components against a magenta test background in canvas-only captures.
- **Tuning**: shared `FOG_DENSITY` (scene `fogExp2` + wildflower shader), bloom
  `0.28→0.16` / threshold `0.9→0.95`, desktop `DepthOfField` in the composer.
- **Verified**: `npm run lint`, `npx tsc --noEmit`, `npm test` (37/37),
  `npm run build` all clean; full-scene capture ≈35 % green / ≈20 % sky with the
  HUD legible; pointer moves change frames (mean-abs-diff 9–27); 0 console errors.

## 2026-10-19 (cursor-reactive meadow world — real assets)

> **Superseded** by the organic meadow redesign above for the landing world, the
> asset set, and the protagonist.

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
