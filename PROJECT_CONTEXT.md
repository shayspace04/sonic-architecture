# PROJECT_CONTEXT.md — Sonic Architecture

Last audited: 2026-10-19 (live-verified after the immersive 3D + sound build).
Read this before making any change. Verify claims against code, not history.

**Repo:** local `main` ↔ remote `https://github.com/shayspace04/sonic-architecture` (**public**)
(baseline `d589bfd`; old history containing a leaked key was purged by user decision —
see `DECISIONS.md`).

## Product vision

**"From cultural taste to a space you can walk through."**

User describes what they love (films, musicians, brands, places, moods). The app
uses Qloo cultural-affinity evidence plus our own spatial translation logic to
produce a coherent venue design direction: atmosphere, palette, lighting,
materials, music, hospitality concept, rationale, and an explorable 3D venue
scene (SVG fallback when WebGL is unavailable).

Target users: retail brands, boutique hotels, restaurants, event organizers,
pop-up designers.

Problem solved: interiors, music, menu, and brand experience are usually chosen
separately and end up incoherent. We connect them into one experience.

### Essential distinction (do not violate)

- Qloo provides **cultural affinity evidence** (entities, tags, adjectives).
- Sonic Architecture performs the **spatial translation** (our deterministic rules).
- **Never claim Qloo recommended a specific furniture piece, material, light
  setting, or layout** unless the API response literally says so.
- **Never fabricate** API evidence, scores, artists, tracks, or menus.
- Insights entities filtered to `urn:entity:artist` subtype are shown as
  **artists, not tracks**; when none exist the soundtrack section is
  **empty by design** with honest limitation copy.

## Approved visual direction (user-approved, implemented 2026-10-19)

- Near-black `#0B0A0D` background with plum `#151018` surfaces
- Acid-lime `#D5FF3F`; ultraviolet `#8B5CF6`; warm white `#F4F0E8`; muted `#A6A0AA`
- Fine borders, smoked glass, restrained translucency; editorial typography;
  spaced uppercase labels; atmospheric lighting
- Signature: **3D sound-membrane hero** — `components/three/SonicHero.tsx`
  (R3F + GLSL: point/line/dust field reacting to a real `AnalyserNode`,
  charging/forming transition into portal rings). Canvas-2D
  `components/ResonanceField.tsx` retained as loading + no-WebGL/WebGL-failure
  fallback. Audio never autoplays.
- Copy: `SONIC ARCHITECTURE` / "Your taste has a frequency." /
  input "What do you love?" / 4 example prompts (chips that auto-submit)
- Page narrative (implemented): hero+input → 4-step process band → signals →
  translation → venue scene → moodboard → soundtrack → final CTA (ENTER VENUE,
  export brief, copy, new concept)
- Feel: experimental digital art studio × futuristic architecture studio.

## Current state (verified 2026-10-19)

### What exists

| Path | Role | State |
|---|---|---|
| `app/page.tsx` | Cinematic landing + full journey orchestrator | New; race-safe fetch, staged loading, error/reset/export |
| `app/studio/page.tsx` | Original 3-col dashboard (moved via `git mv`) | Preserved, still works (additive payload) |
| `app/api/vibe/route.ts` | Qloo multi-domain search → insights → evidence → mapping | Live-verified 2026-10-19; wires module-scope cache + usage ceiling |
| `lib/{types,terms,spatial-rules,scene-params,brief}.ts` | Shared types, term parsing, mapping rules, 3D scene params, brief export | New |
| `lib/qloo/{cache,http,usage,profile}.ts` | TTL cache + single-flight, retry/timeout + quota headers, request ceiling + counters, extracted orchestration | New (quota protection) |
| `lib/fallback.ts` | Honest `localFallbackPayload()` (extracted from route) | New |
| `tests/*.test.ts` + `tsconfig.test.json` | `npm test` — 37 Node `node:test` cases (cache/http/usage/profile/fallback) | New |
| `components/ResonanceField.tsx` | Signature canvas-2D wave field (fallback + loading) | New |
| `components/three/{shared,SonicHero,Venue3D}.tsx` | 3D hero, 3D venue with controls, WebGL boundary/probes | New |
| `components/{CulturalInput,ProvenanceIndicator,SignalAnalysis,SpatialTranslation,VenueScene,DesignMoodboard,SoundtrackSection,FinalCta}.tsx` | Journey sections | New |
| `components/SpatialCanvas.tsx` | 2D SVG floor plan | Legacy; used by `/studio` |
| `hooks/useAmbientAudio.ts` | WebAudio oscillator; vibeScore→freq/cutoff | Wired from `/` (audio toggle) |
| `app/globals.css` | `--sa-*` design tokens, `sa-label`/`sa-glass`, reduced-motion | New |
| `app/layout.tsx` | Real metadata (title/description) | Done |
| `.env.local` (untracked) | `QLOO_API_URL`, `QLOO_API_KEY` | Present; never commit/print |

### Stack (from package.json)

- next 16.4.2 (Turbopack), react 19.3.0, typescript 5, tailwindcss 4,
  framer-motion 14.3.0, eslint 9
- **three 0.186.1, @react-three/fiber 9.8.2, @react-three/postprocessing 3.2.0,
  postprocessing** (drei installed then removed — orbit is hand-rolled; see
  `DECISIONS.md` 18–19).
- Scripts: `dev`, `build`, `start`, `lint`, `test` (`npm test` = `tsc -p
  tsconfig.test.json` + Node 24 `node --test`; no test framework dependency).

### Data flow (implemented, live-verified)

```
userInput (free text) ──POST /api/vibe──▶ server
  1. parseTasteTerms() → up to 5 terms
  2. per term: GET /search?query=<term>&types=<supported URNs>&take=5
     (served from TTL cache when fresh; concurrent duplicates single-flight)
  3. group resolved entities by type → up to 3 GET /v2/insights
     ?filter.type=<urn>&signal.interests.entities=<id,id>&take=8 (sorted ids)
  4. artists = insights entities with subtype urn:entity:artist (never tracks)
  5. evidence = insights tags/adjectives/characteristics + search-hit tags
  6. mapFromEvidence() deterministic rules → design fields + rules text + concept
  7. budget: every attempt counted; ceiling checked before each request/retry
     (exhausted → labeled local-fallback, no upstream call)
  8. payload.quota attached only if THIS request saw upstream quota headers
client ──▶ sceneParamsFromPayload() → 3D hero/venue parameters
   staged loading ──▶ SignalAnalysis → SpatialTranslation → Venue3D (SVG
   fallback) → DesignMoodboard → SoundtrackSection → FinalCta (export/copy)
```

Provenance values: `qloo` (evidence-backed mapping), `qloo-partial`
(resolved but incomplete evidence/insights), `local-fallback` (Qloo unusable).

### Qloo connectivity (verified live 2026-10-19)

- Wi-Fi DNS set to `8.8.8.8` / `1.1.1.1` (fixes hotspot NAT64-only resolution).
- Live results: `jazz` → place entity + rich evidence (`source: qloo`);
  `Miles Davis + neon Tokyo` → artist + place, 8 real affinity artists;
  `A24 films + indie music` → two brand entities; whitespace → 400;
  garbage → `local-fallback`. Bundle secret scan clean.
- Key API facts learned live: search responses use `entity_id` + `types[]`
  array; unfiltered searches match unsupported types (albums/actors) that
  insights reject with HTTP 400 — hence the `types` filter; `take` is the
  valid insights param (`limit` is silently ignored).
- **Quota headers (live, 2026-10-18/19):** `x-month-ratelimit-limit: 10000`,
  `x-month-ratelimit-remaining`, `x-month-ratelimit-reset` (delta-seconds),
  `x-second-ratelimit-limit: 5`, `x-second-ratelimit-remaining`,
  `x-second-ratelimit-reset`, `x-qloo-request-id`. No `Retry-After` observed on
  200. These are what `parseQuotaHeaders` reads and what the UI surfaces.
- **Quota-protection live check (2026-10-19, 2 requests, 1 term):** cold run →
  `source: qloo`, 8 artists, real `quota` attached (limit 10000 / remaining
  9877); immediate repeat → identical payload, **zero upstream calls**, no
  `quota` field; `.qloo-usage.json` recorded `search 1 / insights 1 / 200×2`.

### Security

- `.gitignore` ignores `.env*` and `env.txt`; `.env.local` is untracked.
- History was purged (fresh baseline `d589bfd`); full-history grep confirms no
  credential in any commit; repo is public.
- **Key rotation still pending** — the pre-baseline key was exposed (history +
  one audit terminal print). Rotate in the Qloo dashboard, update only
  `.env.local`.
- API key is only read server-side; `.next` bundle scan (250 files) shows no
  key literal.

## Known bugs / limitations

- `sliderVal` accepted by `/api/vibe` but discarded — remove or wire it.
- `/studio` retains the old debug-log mojibake and inert time-of-day buttons
  (preserved view; the live `/` path uses `Venue3D` presets instead).
- Venue is 3D via R3F with an SVG `VenueScene` fallback labeled "not
  physically accurate"; no first-person walkthrough (orbit only).
- Headless screenshots were captured but **not visually inspected** in the
  2026-10-19 session (verified only by pixel statistics).
- Soundtrack is empty when insights return no artist subtypes (honest
  empty-by-design; not a bug).
- Coarse mapping: genre-family rules can produce surprising-but-honest results
  (e.g. a "jazz" *place* match mapping to hospitality tags); texture families
  now checked before electronic (`detectGenreFamily`).
- **Quota cache/budget are per-process** (module scope + `.qloo-usage.json` on
  this machine). They cut duplicate and repeat spend but are **not a global
  monthly cap** across hosts/instances — a shared atomic store would be needed
  for that guarantee; none is claimed.
- Response cache is cold on restart (memory only); the usage *counter* is
  durable, the cached *responses* are not.

## Configuration (names only — never paste values)

- `QLOO_API_URL` — default `https://hackathon.api.qloo.com`
- `QLOO_API_KEY` — server-side only; **rotate it** (see Security)
- `QLOO_APP_MONTHLY_BUDGET` — application request ceiling (default 9000, clamped ≤9900)
- `QLOO_CACHE_TTL_SEARCH_S` / `QLOO_CACHE_TTL_INSIGHTS_S` — response cache TTLs (86400 / 43200)
- `QLOO_CACHE_MAX_ENTRIES` — cache size bound (default 500)
- `QLOO_USAGE_FILE` — counter file path (default `.qloo-usage.json`, git-ignored)

## Most important next tasks

1. Rotate the Qloo API key (user decision) and update `.env.local`.
2. Decide whether the budget/cache need to be shared (multi-instance) — if so,
   swap `.qloo-usage.json` for an atomic shared store; otherwise keep documenting
   the per-process limitation. See `DECISIONS.md` 24–30.
3. P2 backlog: `sliderVal` — see `TASKS.md`.
