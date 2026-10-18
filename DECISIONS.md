# DECISIONS.md — Sonic Architecture

Only decisions with supporting evidence (committed code, git history, or the
2026-10-18 handoff brief) are listed. Anything speculative is marked as an open
question. Do not invent history.

## Established by the user

1. **Product concept**: translate cultural taste (via Qloo) into walkable space.
   Retail/hospitality/event brands as users. *Source: handoff brief; consistent
   with the existing Qloo integration.*
2. **Qloo provides evidence, we provide translation.** Never attribute a spatial
   decision to Qloo unless the API response literally supports it; never
   fabricate artists/tracks/evidence/menus. *Source: handoff brief; enforced in
   `route.ts` via the `reasoning` object and `local-fallback` behavior.*
3. **Approved visual direction**: near-black + acid-lime `#D5FF3F` + violet +
   warm-white; smoked glass; editorial type; animated thousands-of-particles
   wave ("sound made visible"); hero copy "Your taste has a frequency.";
   input "What do you love?"; 7-part page narrative ending in "ENTER VENUE".
   A static image is **not** an acceptable substitute for the animation.
   *Source: handoff brief, stated as already approved.*
4. **The landing page must be animated**, cinematic, art-studio-like — explicitly
   not a SaaS landing page or analytics dashboard. *Source: handoff brief.*
5. **Do not rebuild from scratch / do not duplicate the venue.** Extend what exists.
   *Source: handoff brief.*
6. **Qloo API config**: base `https://hackathon.api.qloo.com`, header `X-Api-Key`,
   `/search` then `/v2/insights` with `filter.type`. Key stays server-side in
   `.env.local`. *Source: handoff brief + verified in `route.ts`.*
7. **Credentials must never be printed, committed, or exposed**; `env.txt` was
   removed from tracking and git-ignored. *Source: handoff brief + `.gitignore`.*

## Decisions visible in the committed code (rationale inferred from code/comments)

8. **Deterministic local rule table for spatial translation** (`mapFromEvidence`)
   instead of an LLM call — every field carries a human-readable `rules` entry so
   the design basis is auditable. Comment in `route.ts` states this explicitly.
9. **Provenance tiers `qloo` / `qloo-partial` / `local-fallback`** with a
   fail-closed fallback payload rather than guessing. *Commit `610cf7c`:
   "feat: complete end-to-end multisensory spatial reskinner engine fully functional".*
10. **Genre-family mapping** (electronic / hip-hop / punk-rock / atmospheric)
    drives palette + materials; mood adjectives drive lighting temperature;
    anything unrecognized → neutral grey defaults labeled `qloo-partial`.

## Constraints

- Next.js 16.4.2 breaking changes: consult `node_modules/next/dist/docs/` before
  writing Next-specific code (auto-added rule in `AGENTS.md`).
- No tests or test runner exist; verification = lint + build + targeted live API calls.
- Qloo host connectivity from this machine is intermittent (see `QLOO_DEBUG.md`);
  plan for fallback states in demos.
- Git repo has **no remote**; all work is local.

## Security decisions / required actions (pending user input)

- **Rotate the Qloo API key — STILL PENDING.** The old key was committed in
  `env.txt` (former history `610cf7c`) and briefly shown in audit terminal output.
- **History handling (decided 2026-10-18):** user chose **"fresh baseline, no
  leaked history"** — the repo was rebuilt as a single clean root commit
  (`d589bfd`) from the working tree; the two old commits were discarded and
  purged (`reflog expire` + `git gc --prune=now`), verified unreachable. This
  is why remote history starts at the baseline.
- **Remote (decided 2026-10-18):** private repo
  `https://github.com/shayspace04/sonic-architecture.git` created via GitHub API
  using the already-stored Windows Credential Manager token (token never printed
  or committed). gh CLI is not installed on this machine.
- Local DNS workaround used once for the initial push (temporary `github.com`
  hosts entry, removed afterward). Permanent fix recommended: set Wi-Fi DNS to
  8.8.8.8 / 1.1.1.1.

## Open questions requiring user input

1. Should the key be rotated now, and may I (or you) purge `env.txt` from history?
2. What network/DNS fix made Qloo work previously (the Windows DNS change in
   `QLOO_DEBUG.md`)? It is failing again and blocks live verification.
3. Is the dashboard UI meant to be **kept as a secondary "control room" view**
   alongside the new landing page, or **fully replaced** by it?
4. Which provider did the recently expired/rotated OpenCode key belong to? No
   evidence links it to Qloo; assume separate until confirmed.
5. Where is the approved concept image? It is not in the repo — should it be added
   under `public/` or a `docs/` folder for reference?
6. 3D venue: is react-three-fiber acceptable, or is a lighter canvas-2D/WebGL
   approach preferred for the particle wave first?
