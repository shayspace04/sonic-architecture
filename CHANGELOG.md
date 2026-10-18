# CHANGELOG — Sonic Architecture

All notable changes, reverse chronological. No secrets in this file.

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
