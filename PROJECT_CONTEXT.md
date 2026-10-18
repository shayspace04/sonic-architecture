# PROJECT_CONTEXT.md — Sonic Architecture

Last audited: 2026-10-18 (full handoff audit from files + git + live checks).
Read this before making any change. Verify claims against code, not history.

**Repo:** local `main` ↔ private remote `https://github.com/shayspace04/sonic-architecture.git`
(baseline commit `d589bfd`; old history containing a leaked key was purged by user decision —
see `DECISIONS.md`).

## Product vision

**"From cultural taste to a space you can walk through."**

User describes what they love (films, musicians, brands, places, moods). The app
uses Qloo cultural-affinity evidence plus our own spatial translation logic to
produce a coherent venue design direction: atmosphere, palette, lighting,
materials, music, hospitality concept, rationale, and (eventually) an explorable
3D venue.

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

## Approved visual direction (user-approved, do not change casually)

- Near-black background with charcoal/plum undertones
- Acid-lime accent ≈ `#D5FF3F`; ultraviolet/violet highlights; warm-white type
- Fine borders, smoked glass, restrained translucency; editorial typography;
  spaced uppercase labels; liquid-chrome forms; atmospheric lighting
- Signature: **thousands of particles forming undulating wave surfaces** —
  waveforms becoming architecture, not a generic equalizer. Must be animated
  (a static image is explicitly unacceptable).
- Copy: `SONIC ARCHITECTURE` / "Your taste has a frequency." /
  input label "What do you love?" / "Films, artists, places, sounds, moods…
  describe your world." / examples: "A24 films + indie music", "Japanese
  gardens + ambient", "Chrome + club culture", "Jazz + brutalist architecture"
- Page narrative: hero+input → cultural-signal visualization → signals-to-form
  transformation → venue preview → rationale/moodboard → soundtrack → ENTER VENUE
- Feel: experimental digital art studio × futuristic architecture studio.
  Not a SaaS landing page, not a dashboard.

**Status: NONE of the approved landing-page direction is implemented yet.**
The current UI (see below) is a 3-column technical dashboard.

## Current state (verified from actual files)

### What exists

| Path | Role | State |
|---|---|---|
| `app/page.tsx` (236 L) | Single-page 3-col dashboard: vibe input, SpatialCanvas, tracks/menu/design-basis panels | Working, but NOT the approved design |
| `app/api/vibe/route.ts` (397 L) | Server route: Qloo `/search` → `/v2/insights` → evidence → spatial mapping → payload | Working code; live Qloo currently unreachable (see below) |
| `components/SpatialCanvas.tsx` (210 L) | 2D SVG floor plan (bar, seats, glow lights) driven by palette/material/temp | Working; this is 2D, not 3D |
| `hooks/useAmbientAudio.ts` (106 L) | WebAudio sine oscillator + lowpass; slider maps to freq/cutoff | Working |
| `app/layout.tsx` | Root layout, Geist fonts | Metadata still default "Create Next App" |
| `app/globals.css` | Tailwind v4 tokens | Still create-next-app defaults (`#ffffff`/`#0a0a0a`), no design tokens |
| `QLOO_DEBUG.md` | Connectivity debug log | See "Qloo connectivity" below |
| `.env.local` (untracked, git-ignored) | `QLOO_API_URL`, `QLOO_API_KEY` | Present |

No other components, routes, tests, scripts, or docs exist. `README.md` is the
stock create-next-app file.

### Stack (from package.json)

- next 16.4.2 (Turbopack), react 19.3.0, typescript 5, tailwindcss 4,
  framer-motion 14.3.0, eslint 9
- **No three.js / @react-three/fiber / drei installed** — the 3D venue does not exist yet.
- Scripts: `dev`, `build`, `start`, `lint` (no test script, no test files).

### Data flow (implemented)

```
userInput (free text) ──POST /api/vibe──▶ server
  1. GET {QLOO_API_URL}/search?query=<userInput>&types=urn:entity:artist&limit=5
     header X-Api-Key: <server-side env only>
  2. take FIRST result's entity id  (only first entity is used)
  3. GET /v2/insights?filter.type=urn:entity:artist&signal.interests.entities=<id>&limit=5
  4. extractTracks()      → up to 5 {title, artist} (artists, NOT tracks)
  5. collectEvidence()    → genre/style/theme tags + adjectives + characteristics
  6. mapFromEvidence()    → deterministic genre-family rules →
       {primaryColorHex, accentColorHex, lightingTemperatureK,
        flooringMaterial, seatingFabric} + per-field rules text
  7. response { …design fields, tracks, menu, fallback:false,
                reasoning:{source, evidence, rules} }
client ──▶ setCurrentVibe() ──▶ SpatialCanvas (colors/materials/temp) + panels
```

Any failure (missing key, search non-2xx/throw, no entity id, insights
non-2xx/throw) short-circuits to `fallbackPayload()` →
`fallback:true, reasoning.source:"local-fallback"`.

Provenance values: `qloo` (recognized genre family matched),
`qloo-partial` (Qloo responded but no recognized genre → neutral defaults),
`local-fallback` (Qloo unusable).

### Qloo connectivity (verified live 2026-10-18)

- `hackathon.api.qloo.com` currently resolves **only to IPv6 NAT64** addresses
  (`64:ff9b::…`) and `fetch` fails with **connect timeout to :443**.
- `POST /api/vibe` therefore returns HTTP 200 with `fallback:true` right now.
- This is the same host/network failure mode already documented in `QLOO_DEBUG.md`
  (which also records an earlier period where it worked after a DNS settings fix).
- Not an auth error, not a Qloo outage. **Live end-to-end Qloo verification is
  currently blocked by the host network.**

### Security (important)

- `.gitignore` correctly ignores `.env*` and `env.txt`; `.env.local` is untracked.
- **BUT** `env.txt` containing `QLOO_API_KEY` was committed in `610cf7c` and is
  still in git history. Hash comparison confirms it holds the **same value** as
  the current `.env.local` key. The working tree deletion is staged but history
  was not rewritten.
- There is **no git remote**, so nothing has been pushed. Risk is local-only today.
- The key value was displayed once in this audit's terminal output; treat the
  credential as exposed and rotate it.
- Recommendation (needs user authorization, do not do silently): rotate the Qloo
  key, then optionally purge history (`git filter-repo`) if the repo will ever be shared.
- API key is only read server-side in `route.ts` — that part is correct.
- No `.env.example` existed (one is now provided; variable names only).

## Implemented and verified

- Qloo request schema, auth header, and provenance/fallback logic (code-level).
- 2D SVG spatial visualization reacting to palette/material/lighting changes.
- Ambient audio toggle + slider-driven oscillator.
- Lint passes (`npm run lint`, clean).
- Production build passes (`npm run build`, Next 16.4.2 Turbopack, 5 routes,
  TypeScript clean).
- Dev server was already running on `http://localhost:3000` during the audit
  (`next dev`, PIDs 17444/34456) — do not start a second one.

## Partially implemented

- Qloo integration: correct code path, but live success not currently reproducible
  from this machine (network), so the qloo/qloo-partial branches are unverified today.
- `menu` field: currently a **metadata sentence** ("Qloo insights returned N
  item(s) for X"), not a real menu. Do not present it as a generated menu.
- `tracks`: entities returned by insights are **artists**, not individual tracks;
  `artist` field is usually blank. Do not present as song recommendations.

## Not implemented (from approved direction)

- Cinematic landing page (hero copy, "What do you love?" input, example prompts).
- Signature particle-wave animation (no canvas/WebGL code anywhere).
- 3D venue, orbit/zoom/pan, walkthrough camera, dollhouse view, dynamic
  lighting/materials/particles.
- Page narrative sections 2–7 (signal viz, transformation, ENTER VENUE,
  moodboard, soundtrack section).
- Approved design tokens (acid-lime `#D5FF3F`, violet, smoked glass, editorial type).
- Reduced-motion support and performance safeguards.
- Multi-entity search parsing (only the first search hit is used).
- Layout metadata/title still stock.

## Known bugs / limitations (from code inspection)

- `sliderVal` is sent and accepted but discarded (`void sliderVal`) — no effect.
- Time-of-day buttons (`activeHour`) are pure UI state; they do not affect the canvas.
- Mojibake inside a debug string in `app/page.tsx`
  (`console.log("…s… Injecting Vibe Payload…")`).
- `layout.tsx` metadata still says "Create Next App".
- No error/loading UI beyond a spinner-less `isLoading` flag; fetch errors only log.

## Configuration (names only — never paste values)

- `QLOO_API_URL` — default `https://hackathon.api.qloo.com`
- `QLOO_API_KEY` — server-side only; **rotate it** (see Security)

## Assumptions still unverified

- Whether the recently expired/rotated OpenCode provider key relates to Qloo at
  all (no evidence it does; treat as separate).
- Whether Qloo works right now from any network (currently fails from this host).
- Exact approved concept image is not present in the repo (no screenshots found).

## Most important next tasks

1. Rotate the Qloo API key and purge/neutralize the leaked `env.txt` in history (user decision needed).
2. Restore/confirm Qloo connectivity, then verify the `qloo` and `qloo-partial` branches live.
3. Build the approved cinematic landing page + particle-wave animation (replaces the dashboard as entry point).
See `TASKS.md` for the prioritized backlog.
