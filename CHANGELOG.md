# CHANGELOG — Sonic Architecture

All notable changes, reverse chronological. No secrets in this file.

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
