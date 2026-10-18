# Agent working instructions — Sonic Architecture

Before any substantial change: read `PROJECT_CONTEXT.md`, `TASKS.md`,
`ARCHITECTURE.md`, and `DECISIONS.md`. Then inspect the actual code — prior
conversation claims are not reliable.

## Hard rules

- **Inspect before modifying.** Source code beats documentation beats chat history.
- **Preserve working integrations.** Keep `/api/vibe` request/response shape and
  the provenance contract (`qloo` / `qloo-partial` / `local-fallback`) stable, or
  update both `route.ts` and `page.tsx` together (the types are duplicated).
- **Never expose secrets.** Keys live only in `.env.local`, are read
  server-side only, and must never be printed, committed, or sent to the client.
  `env.txt` and `.env*` are git-ignored. Note: the Qloo key is already in git
  history and must be rotated (see `DECISIONS.md`).
- **Never fabricate Qloo results** — no invented artists, tracks, tags, scores,
  or menus; never attribute our spatial decisions to Qloo. The `menu` field is
  metadata, not a generated menu; insights entities are artists, not songs.
- **Do not redesign the whole app in one pass.** Land small, testable changes.
- **Do not start a second dev server** — one is usually already running on :3000.
- **Do not run destructive git commands** (reset, clean, force-push, history
  rewrite) without explicit authorization.

## Git workflow (mandatory for every session)

- **Before editing:** `git status` + `git log --oneline -5`; read the docs above.
- **While working:** focused, logically related changes only. Never commit
  half-written code, secrets, or generated artifacts (`node_modules/`, `.next/`,
  `.env.local`, `env.txt`).
- **After each working milestone:** run `npm run lint` and `npm run build`,
  review `git diff` and `git diff --check`, review the exact staged list
  (`git status`), confirm no secrets, then make one small descriptive commit
  using conventional prefixes (`feat:` `fix:` `style:` `refactor:` `docs:`
  `test:` `chore:`).
- **Update `TASKS.md` + `CHANGELOG.md`** whenever status or behavior changes materially.
- **Remote:** origin `https://github.com/shayspace04/sonic-architecture.git` (public),
  branch `main`. Push at sensible milestones; never force-push or rewrite pushed
  history without explicit authorization. Do not claim work is backed up until
  the push succeeds.
- **Note:** this machine's hotspot DNS intermittently fails to resolve
  `github.com` (and `hackathon.api.qloo.com`). If `git push` fails with
  "Could not resolve host", that is the cause — retry, or set Wi-Fi DNS to
  8.8.8.8 / 1.1.1.1 (the fix that previously worked for Qloo).
- **Before ending a session:** update docs/changelog, commit completed work,
  push, and report the latest commit hash, `git status`, and sync state.

## After implementing

- Run `npm run lint` and `npm run build`; fix what breaks. Report real results.
- If behavior changed materially, update `PROJECT_CONTEXT.md` / `ARCHITECTURE.md`
  / `TASKS.md` in the same change.
- Live Qloo calls consume credits — prefer inspecting code/tests over spamming the API.

## Next.js version warning (auto-generated block — keep intact)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
