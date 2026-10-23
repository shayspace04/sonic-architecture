# TASKS.md — Sonic Architecture

Status legend: `[x]` complete (verified) · `[~]` in progress · `[ ]` not started · `[!]` blocked
Statuses reflect **evidence in the repo / live checks as of 2026-10-19**, not prior conversation claims.

## P0 — Blockers & essential functionality

- [x] **ThreeUI NEST Architectural Pavilion, Floating Plinth, Cantilevered Roof & Reflecting Pool** (2026-10-23):
  - [x] Full architectural pavilion composition inspired by ThreeUI NEST (`threeui.com/nest-landing-page`) applied universally to all prompts.
  - [x] Raised floating foundation plinth ($0.38\text{m}$ elevated deck with perimeter fascia trim) hovering above dark ground plane.
  - [x] Outdoor reflecting pool / water basin flanking the pavilion with specular reflections.
  - [x] Front facade structural framing (corner columns, header lintel beam, threshold track, and sliding pocket glass panels) with open central camera sightline.
  - [x] Cantilevered overhanging roof slab ($+1.1\text{m}$ overhang on all sides) with anodized fascia trim.
  - [x] Enhanced exploded axonometric deconstruction mode with structural leader lines and glowing anchor nodes connecting the plinth deck corners up to the floating roof.
  - [x] Scaled camera orbit framing for all 9 architectural typologies and expanded directional shadow/fill lighting rig.

- [x] Qloo `/search` + `/v2/insights` integration code path with server-side key — `app/api/vibe/route.ts`
- [x] Provenance model (`qloo` / `qloo-partial` / `local-fallback`) with per-field rules and evidence
- [x] Graceful fallback when Qloo is unusable (`localFallbackPayload()`)
- [x] **Live Qloo verification** — re-verified 2026-10-19 after API-shape fix:
  multi-domain search (`types` filter, `entity_id` + `types[]` array parsing),
  insights with `take` and comma-joined `signal.interests.entities`.
  Verified inputs: `jazz` → place entity + rich evidence (`source: qloo`);
  `Miles Davis + neon Tokyo` → artist + place, 8 real affinity artists;
  `A24 films + indie music` → two brand entities; whitespace → HTTP 400;
  garbage → `local-fallback`. Bundle secret scan clean (250 files).
- [!] **Rotate `QLOO_API_KEY`** — same value sits in git history inside `env.txt`
  (old commit `610cf7c`, purged from local+remote history) and was shown in
  terminal output during the original audit. Requires user decision.
- [x] **Qloo quota protection** (2026-10-19, on top of `f261d65`): bounded TTL
  response cache + single-flight dedupe (`lib/qloo/cache.ts`); retry/timeout
  HTTP layer reading real `x-month-ratelimit-*` headers (`lib/qloo/http.ts`);
  per-process application ceiling `QLOO_APP_MONTHLY_BUDGET` (default 9000,
  clamped ≤9900) with durable `.qloo-usage.json` counters (`lib/qloo/usage.ts`);
  extracted testable orchestration (`lib/qloo/profile.ts`) + fallback
  (`lib/fallback.ts`); additive `payload.quota` shown only when upstream
  headers were received. **Live-verified:** cold request consumed upstream and
  exposed real quota (limit 10000 / remaining 9877); immediate repeat was fully
  cache-served (no upstream call, no `quota` field) with an identical payload.
- [x] Unit/regression tests — 37 `node:test` cases over cache, http, usage,
  profile, fallback (`npm test`, `tsconfig.test.json`; no new deps)
- [x] Lint passes (`npm run lint`)
- [x] Production build passes (`npm run build`, TypeScript clean, 4 routes:
  `/`, `/_not-found`, `/api/vibe`, `/studio`)
- [x] Landing rebuild re-verified: `npm run lint` clean, `npm test` 37/37,
  `npm run build` clean; `/` and `/studio` both HTTP 200 in dev

- [x] **Universal Deep 3D Architectural Detail & Dynamic Qloo Element Synthesis** (2026-10-23):
  - [x] Expanded procedural typologies from 6 to 9 distinct architectural typologies (`grand_hall`, `listening_room`, `intimate_lounge`, `mediterranean_courtyard`, `industrial_loft`, `party_venue`, `scandinavian_living`, `futuristic_launch`, `gallery_pavilion`).
  - [x] Universal dynamic Qloo element binding: `vibe.flooringMaterial` maps to PBR floor shaders & labels; `vibe.seatingFabric` dynamically mutates all room seating with tailored tactile specs; `vibe.lightingTemperatureK` and `lightingDirection` dynamically drive lighting rigs; `vibe.artists[0]` spawns a dedicated 3D Cultural Showcase vitrine and zoning card; Qloo evidence tags dynamically inject missing architectural archetypes.
  - [x] Expanded procedural 3D fixture archetypes in `Venue3D.tsx`: fluted cocktail bar counter with brass footrail and under-glow; floor-to-ceiling grid vinyl library wall; carved stone water fountain basin; architectural travertine hearth fireplace; Qloo affinity artist showcase vitrine with brass plaque; amber Murano teardrop glass pendants.
  - [x] Modular architectural ceiling structures (`cathedral_truss`, `acoustic_coffered`, `timber_pergola`, `concrete_beams`, `neon_lightgrid`, `minimal_soffit`) and wall architectures (`arched_colonnade`, `timber_slats`, `panoramic_glazing`, `fluted_stone`, `raw_concrete_panels`, `gallery_planes`).
  - [x] Dedicated Qloo Recommendations section in 3D Planning HUD Drawer and 2D Schematic Blueprint.
  - [x] Added curated briefs for speakeasies, riad courtyards, and warehouse lofts in landing composer and `/studio`.

- [x] **Cathedral Timber Banquet Hall Typology & High-Fidelity 3D Details** (2026-10-23):
  - [x] Added `grand_hall` typology (*Cathedral Timber Banquet Hall & Celebration Venue*, 14m × 22m × 7.2m volume) supporting weddings, banquets, cathedrals, ceremony halls, and celebrations.
  - [x] Cathedral timber A-frame roof trusses (tie beams, king posts, rafters, purlins, longitudinal ridge beam).
  - [x] Rhythmic arched window colonnades along side walls and ceremonial altar niche.
  - [x] Procedural crystal chandeliers, hurricane candle lanterns with floor reflections, draped linen banquet tables, Chiavari chairs, trumpet urn floral centerpieces, botanical archway, and ceremonial altar.
- [x] **Nest-inspired architectural design & interactive 3D layout planning** (2026-10-23):
  - [x] Centered hero landing page matching Nest aesthetic (`app/page.tsx`, `components/CulturalInput.tsx`): display serif typography ("A feeling, given form."), dark frosted glass prompt composer, minimal transition header.
  - [x] **Nest-style Exploded Architecture mode** (`components/three/Venue3D.tsx`): procedural deconstruction separating ceiling beams upwards, expanding perimeter walls outward, rendering vertical axonometric guide lines, and dynamic separation slider (0% to 100%).
  - [x] **Interactive 3D Spatial Layout & Planning HUD Drawer** (`components/three/Venue3D.tsx`): real-time envelope metrics ($m^2, m^3$, clear height), functional zoning list, and click-to-focus camera navigation.
  - [x] **Interactive 2D Architectural Schematic Blueprint** (`components/SpatialTranslation.tsx`): SVG projection mapping room envelope, metric dimension callouts ($W\text{m} \times D\text{m}$), functional acoustic zones, and clickable placed fixtures with companion inspector HUD.

## P1 — Essential demo experience

- [x] **Cinematic landing page** as the entry point (`app/page.tsx`):
  - [x] Hero: `SONIC ARCHITECTURE` / "Your taste has a world of its own."
  - [x] Input: "A film, an artist, a place, a feeling..." + supporting line + 4 example prompts
  - [x] Design tokens in `globals.css` — **landing is now the bright cloud palette**
        (sky/powder/cloud/lavender/periwinkle/peach/ink); the dark
        near-black + acid-lime `#D5FF3F` + violet tokens remain and now style the
        venue sections + `/studio` (supersedes decision 3 for the landing only)
  - [x] Editorial typography + spaced uppercase labels + frosted/veiled surfaces

- [x] **Cursor-reactive meadow world** (2026-10-19) — supersedes the cloud-world
      landing above. `components/three/LandingWorld.tsx` +
      `components/three/world/*` (`scene`/`assets`/`Terrain`/`Vegetation`/`Sky`/
      `Pavilion`/`Landmarks`/`Character`/`Atmosphere`/`CameraRig`);
      `components/three/CloudWorld.tsx` deleted:
  - [x] ~~Real bundled CC0 assets: Poly Haven sky HDRI, 53 Kenney Nature Kit
        GLTFs, a Quaternius skinned walker (FBX), downscaled ambientCG PBR
        maps~~ — **superseded by the organic redesign below**
  - [x] ~~Displaced meadow terrain + winding path, ~62k instanced grass blades,
        pavilion on a knoll, floating islands, skinned walker…~~ — **superseded**
  - [x] **Cursor-reactive** `worldBend()` foliage shader (pointer raycast onto
        the ground) + damped camera parallax; one shared program via
        `customProgramCacheKey`

- [x] **Landing background — Sylva Living Green** (2026-10-20) — the minted
      `SylvaLivingWorldScene` (Three.js r149 procedural moss-root world) replaces
      the previous landing 3D scene as the full-viewport, click-through
      background:
  - [x] Bundle shipped verbatim under `public/sylva/` (`inner-green-3d.html`
        197914 B, `inner-green-assets/three.min.js` 608081 B, `threeui.css`
        40715 B); `components/three/SylvaLivingWorldScene.tsx` adapts the
        authored component — Vite `?raw` imports → one-time runtime `fetch()`;
        sandboxed `srcDoc` iframe, document splice, styles, reduced-motion loop
        guard and visibility/intersection gating preserved
  - [x] Decorative + non-blocking: host `aria-hidden` + `pointer-events: none`;
        cursor reaction preserved via a parent `postMessage` → inlined
        `POINTER_BRIDGE` re-emitting synthetic pointer events in the scene
  - [x] Old angular terrain/islands/obelisk/pavilion are no longer mounted;
        `LandingWorld.tsx` + `world/*` left on disk (dead code, removal deferred)
  - [x] Verified in headless Chrome @1280×800: `data-state="ready"`, canvas
        fills viewport, input on top + focusable + typeable, submit → travelling
        → labelled mock venue, 0 exceptions; bridge proven end-to-end on the app
        origin with a real sandboxed iframe — event-level attribution shows the
        scene receives 4 moves + 1 leave with the bridge and 0 without;
        0 `/api/vibe` + 0 Qloo calls during render/cursor; `npm run lint` clean,
        `npm test` 37/37, `npm run build` clean

- [x] **Organic meadow redesign** (2026-10-19) — replaces the angular/sci-fi
      read (floating rectangles, portal, obelisk, pavilion) with a lush grounded
      meadow:
  - [x] `Pavilion.tsx` deleted; `Landmarks.tsx` rewritten to `Horizon` (three
        fog-tinted instanced bands of distant hills/mountains)
  - [x] Quaternius CC0 **fox** (`char/fox.glb`) protagonist — `Idle`↔`Walk`
        blend, walks the path when travelling, idles at home with cursor gaze
  - [x] Assets: Gobkit CC0 nature props (`meadow/*.glb`, normalised cm→m in
        `assets.ts`) + `fox.glb`; unused Kenney `nature/` GLTs and the humanoid
        `character.fbx` removed; `ASSET_CREDITS.md` updated
  - [x] Rewritten palette/terrain/vegetation/sky (`scene`, `Terrain`,
        `Vegetation`, `Sky`, `flowerMask.ts`); shared `FOG_DENSITY`; toned-down
        Bloom; desktop depth-of-field
  - [x] **Root-cause fix**: Gobkit GLBs are centimetre-authored — the missing
        `UNIT = 0.01` normalisation made every plant hundreds of metres tall and
        occluded the whole world. Diagnosed by bisecting components with
        canvas-only captures (terrain-only frame rendered green + magenta test
        background; re-adding `MeadowPlants` restored the grey occlusion).
  - [x] Verified: `npm run lint` clean, `npx tsc --noEmit` clean, `npm test`
        37/37, `npm run build` clean; full-scene capture ≈35% green / ≈20% sky
        with the HUD legible; cursor moves change ~9–27 mean-abs-diff across
        frames; 0 console errors
  - [x] Verified in headless Chrome: 0 console errors at 1600×900 and 390×844,
        pointer moves change 47–55 % of pixels, submit journey reaches the
        labelled mock venue with 0 errors and 0 Qloo calls
- [x] **Immersive cloud-world landing rebuild** (superseded 2026-10-19) —
  `app/page.tsx` + `components/three/CloudWorld.tsx`, `components/SkyFallback.tsx`,
  `components/CulturalInput.tsx`, `lib/dev-mock.ts`:
  - [x] Full-viewport procedural 3D sky: gradient/sun dome, ~15 layered
        noise-shader cloud billboards (different depths/speeds), distant floating
        pavilion + walkway + tiny walking silhouette, drifting dust,
        pointer-parallax camera. No image/video assets, no new dependencies.
  - [x] Continuous slow drift + gentle camera motion; never a reactive visualiser
  - [x] Centred copy + frosted floating prompt (eyebrow, `SONIC ARCHITECTURE`,
        "Your taste has a world of its own.", description, `ENTER YOUR WORLD ↗`)
  - [x] Submit → `charging` world reaction → `travelling` forward push → CSS
        cloud-wipe → full-screen venue (`Venue3D` `fill` prop) + "Explore the
        concept ↓" then the existing editorial sections below
  - [x] Reduced motion / no WebGL / loading → intentional CSS `SkyFallback`
  - [x] Qloo-safety: example chips fill the field (no auto-submit), single
        guarded request per submit, no load/keystroke/hover/poll requests;
        `?mock=1` dev-only labelled preview for zero-credit iteration
  - [x] `SonicHero.tsx` retained but no longer mounted; `ResonanceField` still
        used by `DesignMoodboard`
- [x] **Signature particle-wave animation** — `components/ResonanceField.tsx`
  (canvas 2D, layered undulating wave grids, pointer parallax, intensity prop,
  DPR-aware, reduced-motion static frame, IntersectionObserver + visibility
  pause, full cleanup). No three.js by decision.
- [x] Connect landing page → venue with a coherent transition
  (hero → how-it-works chain → signals → translate → venue → moodboard →
  soundtrack → final CTA / ENTER VENUE)
- [x] Replace stock `layout.tsx` metadata with real title/description
- [x] Honest presentation of music results: `SoundtrackSection` labels entities
  as **artist** entities via Qloo insights, filtered to `urn:entity:artist`
  subtype server-side; empty-by-design state with limitation copy when none
- [x] Remove or clearly label the `menu` metadata sentence — legacy `menu` field
  kept only for API compatibility; new UI never renders it as a menu

## P2 — Polish & optional enhancements

- [x] **3D venue with react-three-fiber** (`components/three/Venue3D.tsx`):
  hand-rolled orbit (explore/reset), light presets (morning/golden/peak), haze
  toggle, gloss/matte floor, material-study panel, reduced-motion support;
  SVG `VenueScene.tsx` kept as the WebGL-unavailable fallback
- [x] **3D sound-reactive hero** (`components/three/SonicHero.tsx`): GLSL
  membrane + contour lines, audio analyser reactivity, charging/forming
  cinematic transition, Bloom/Vignette, WebGLBoundary → 2D ResonanceField
- [x] **Deterministic scene parameters** (`lib/scene-params.ts`) with auditable
  per-field `rules`, rendered in `SpatialTranslation` ("3D scene parameters")
- [x] **Editorial moodboard rewrite** (`DesignMoodboard.tsx`) — layered
  asymmetric panels, palette strip, material chips, lighting study
- [x] Operational/design brief export (`lib/brief.ts` → markdown download + copy)
- [x] Use more than the first `/search` result — multi-term input parsing
  (`lib/terms.ts`, up to 5 terms, one resolved entity per term) + search-hit tag
  evidence merged from all supported hits
- [x] Wire up `sliderVal` (modulates 3D lighting Kelvin, openness, and ambient audio tone in `/studio`)
- [x] Make time-of-day buttons actually affect the scene (`VenueScene` presets:
  morning / golden hour / peak night drive lighting states)
- [x] Fix mojibake string (old dashboard moved to `/studio` unchanged; bug no
      longer in the live path — fix deferred in the preserved view)
- [x] Real soundtrack section grounded in available API data (artist entities only)
- [x] `.env.example` maintenance — now also documents `QLOO_APP_MONTHLY_BUDGET`,
  `QLOO_CACHE_TTL_SEARCH_S`, `QLOO_CACHE_TTL_INSIGHTS_S`, `QLOO_CACHE_MAX_ENTRIES`,
  `QLOO_USAGE_FILE`
- [x] Tests — `npm test` (tsc `tsconfig.test.json` + Node 24 `node:test`, 37 cases)

## Housekeeping / audit leftovers

- [x] `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`, `AGENTS.md`, `CHANGELOG.md` created/updated (2026-10-18)
- [x] `.env.example` added (variable names only)
- [x] Git set up: clean baseline on `main` (`d589bfd`), pushed to remote `shayspace04/sonic-architecture` (public)
- [x] Fix hotspot DNS (Wi-Fi DNS set to 8.8.8.8 / 1.1.1.1) — GitHub and Qloo both resolve; live Qloo verified working
- [ ] **Rotate the Qloo API key** (old key was exposed; see `DECISIONS.md`) and update `.env.local`
- [x] Old dashboard preserved at `/studio` (moved via `git mv`, additive payload keeps it compatible)
