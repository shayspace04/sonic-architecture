# TASKS.md — Sonic Architecture

Status legend: `[x]` complete (verified) · `[~]` in progress · `[ ]` not started · `[!]` blocked
Statuses reflect **evidence in the repo / live checks as of 2026-10-19**, not prior conversation claims.

## P0 — Blockers & essential functionality

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
- [x] Lint passes (`npm run lint`)
- [x] Production build passes (`npm run build`, TypeScript clean, 4 routes:
  `/`, `/_not-found`, `/api/vibe`, `/studio`)

## P1 — Essential demo experience

- [x] **Cinematic landing page** as the entry point (`app/page.tsx`):
  - [x] Hero: `SONIC ARCHITECTURE` / "Your taste has a frequency."
  - [x] Input: "What do you love?" + supporting line + 4 example prompts
  - [x] Near-black / acid-lime `#D5FF3F` / violet / warm-white design tokens in `globals.css`
  - [x] Editorial typography + spaced uppercase labels + smoked-glass surfaces
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

- [ ] 3D venue with react-three-fiber (not installed): orbit/zoom/pan, walkthrough
      camera, dollhouse view, dynamic lighting/materials, particles, reduced-motion support
  (`VenueScene.tsx` is a rich 2D SVG scene with lighting states; not 3D)
- [x] Architectural moodboard / design board alongside the venue (`DesignMoodboard.tsx`)
- [x] Operational/design brief export (`lib/brief.ts` → markdown download + copy)
- [x] Use more than the first `/search` result — multi-term input parsing
  (`lib/terms.ts`, up to 5 terms, one resolved entity per term) + search-hit tag
  evidence merged from all supported hits
- [ ] Wire up `sliderVal` (currently discarded server-side) or remove it
- [x] Make time-of-day buttons actually affect the scene (`VenueScene` presets:
  morning / golden hour / peak night drive lighting states)
- [x] Fix mojibake string (old dashboard moved to `/studio` unchanged; bug no
      longer in the live path — fix deferred in the preserved view)
- [x] Real soundtrack section grounded in available API data (artist entities only)
- [ ] `.env.example` maintenance
- [ ] Tests (none exist; no test runner configured)

## Housekeeping / audit leftovers

- [x] `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`, `AGENTS.md`, `CHANGELOG.md` created/updated (2026-10-18)
- [x] `.env.example` added (variable names only)
- [x] Git set up: clean baseline on `main` (`d589bfd`), pushed to remote `shayspace04/sonic-architecture` (public)
- [x] Fix hotspot DNS (Wi-Fi DNS set to 8.8.8.8 / 1.1.1.1) — GitHub and Qloo both resolve; live Qloo verified working
- [ ] **Rotate the Qloo API key** (old key was exposed; see `DECISIONS.md`) and update `.env.local`
- [x] Old dashboard preserved at `/studio` (moved via `git mv`, additive payload keeps it compatible)
