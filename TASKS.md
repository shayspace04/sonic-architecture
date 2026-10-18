# TASKS.md — Sonic Architecture

Status legend: `[x]` complete (verified) · `[~]` in progress · `[ ]` not started · `[!]` blocked
Statuses reflect **evidence in the repo / live checks as of 2026-10-18**, not prior conversation claims.

## P0 — Blockers & essential functionality

- [x] Qloo `/search` + `/v2/insights` integration code path with server-side key — `app/api/vibe/route.ts`
- [x] Provenance model (`qloo` / `qloo-partial` / `local-fallback`) with per-field rules and evidence
- [x] Graceful fallback when Qloo is unusable (`fallbackPayload()`)
- [!] **Live Qloo verification** — host resolves only to IPv6 NAT64 and connect-times-out; `/api/vibe` currently returns `local-fallback`. Needs network/DNS fix or a working network. See `QLOO_DEBUG.md`.
- [!] **Rotate `QLOO_API_KEY`** — same value sits in git history inside `env.txt` (commit `610cf7c`) and was shown in terminal output during audit. Requires user decision (rotate + optional history purge). Repo has no remote, so risk is local today.
- [x] Lint passes (`npm run lint`)
- [x] Production build passes (`npm run build`, TypeScript clean, 5 routes)

## P1 — Essential demo experience

- [ ] **Cinematic landing page** as the entry point (replaces the current 3-column dashboard as `/`):
  - [ ] Hero: `SONIC ARCHITECTURE` / "Your taste has a frequency."
  - [ ] Input: "What do you love?" + supporting line + 4 example prompts
  - [ ] Near-black / acid-lime `#D5FF3F` / violet / warm-white design tokens in `globals.css`
  - [ ] Editorial typography + spaced uppercase labels + smoked-glass surfaces
- [ ] **Signature particle-wave animation** (canvas/WebGL, thousands of particles,
  undulating wave surfaces that read as sound-made-visible; must react to input;
  static image is not acceptable). No such code exists yet.
- [ ] Connect landing page → venue with a coherent transition (section narrative:
  signals → form → venue → ENTER VENUE)
- [ ] Replace stock `layout.tsx` metadata ("Create Next App") with real title/description
- [ ] Honest presentation of music results: label as **artist** recommendations, not tracks
- [ ] Remove or clearly label the `menu` metadata sentence (it is not a generated menu)

## P2 — Polish & optional enhancements

- [ ] 3D venue with react-three-fiber (not installed): orbit/zoom/pan, walkthrough
      camera, dollhouse view, dynamic lighting/materials, particles, reduced-motion support
- [ ] Architectural moodboard / design board alongside the venue
- [ ] Operational/design brief export
- [ ] Use more than the first `/search` result (multi-signal input parsing)
- [ ] Wire up `sliderVal` (currently discarded server-side) or remove it
- [ ] Make time-of-day buttons actually affect the canvas
- [ ] Fix mojibake string in `app/page.tsx` debug log
- [ ] Real soundtrack section grounded in available API data
- [ ] `.env.example` maintenance; commit the currently-uncommitted doc/config work
- [ ] Tests (none exist; no test runner configured)

## Housekeeping / audit leftovers

- [x] `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`, `AGENTS.md` created/updated (2026-10-18)
- [x] `.env.example` added (variable names only)
- [ ] Uncommitted working-tree changes (`app/page.tsx`, `app/api/vibe/route.ts`,
      `.gitignore`, staged `env.txt` deletion, untracked `QLOO_DEBUG.md` + new docs)
      — commit only when the user asks
