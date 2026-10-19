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
   **Superseded for the landing only (see decision 31, 2026-10-19):** the
   dark/acid-lime direction now applies to the venue sections and `/studio`;
   the landing itself is a bright, airy cloud world.
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
- Qloo host connectivity from this machine is fixed (Wi-Fi DNS 8.8.8.8/1.1.1.1);
  live calls verified working 2026-10-19.
- Git remote exists: `https://github.com/shayspace04/sonic-architecture` (public),
  branch `main`.

## Decisions from the landing-page build (2026-10-19, visible in committed code)

11. **Canvas 2D for the signature wave over three.js/R3F.** Rationale: no new
    dependency, lighter for a hackathon demo, satisfies the "animated, not
    static" requirement. 3D venue remains an open P2 option. *(Answer to old
    open question 6.)*
12. **Old dashboard preserved at `/studio`, not deleted.** Moved via `git mv`;
    the API payload was extended additively so both views keep working.
    *(Answer to old open question 3: kept as a secondary "control room" view.)*
13. **Search requests are filtered to insights-supported `types`** and parsed
    against the real response shape (`entity_id`, `types[]` array). Discovered
    live: unfiltered searches match albums/actors that `/v2/insights` rejects
    with HTTP 400 — this was the root cause of the earlier "Insights failed"
    errors. *Verified in `route.ts` + live 2026-10-19.*
14. **Insights `take` replaces `limit`.** `limit` is silently ignored by the
    API; `take` is the documented parameter. *Verified live.*
15. **Artist soundtrack = insights entities filtered to
    `urn:entity:artist` subtype only.** Results are cross-domain (places,
    brands, shows…); non-artists are never labeled as artists. Empty
    soundtrack is an honest by-design state.
16. **Search-hit tags count as Qloo evidence.** Genre/style/theme tags on the
    matched search hits are merged into the evidence pool alongside insights
    evidence (still real API data, still labeled provenance `qloo`).
17. **Multi-term input, one resolved entity per term** (up to 5 terms), with
    per-term unresolved tracking and honest partial payloads.

## Decisions from the immersive 3D build (2026-10-19, visible in committed code)

18. **react-three-fiber added for the hero and venue, superseding the
    "canvas 2D only" stance of decision 11.** Rationale: the brief requires a
    real 3D sound surface, a 3D venue centerpiece with live controls, and a
    cinematic sound→architecture transition. Canvas 2D `ResonanceField` is
    retained as the loading state and the no-WebGL / WebGL-failure fallback,
    so nothing static is ever shown as a substitute. *(Supersedes decision 11;
    closes open question 6 for real this time.)*
19. **`@react-three/drei` installed then uninstalled.** Orbit controls are
    hand-rolled (~60 lines in `Venue3D.tsx`): damped spherical drag, phi clamp,
    `touch-action: pan-y` so mobile page scroll still works, auto-orbit only
    while "explore" is active and never under reduced motion. Rationale:
    smaller dependency surface for a hackathon demo.
20. **Scene parameters are a pure client-side derivation from the payload**
    (`lib/scene-params.ts`), not a new API field — the `/api/vibe` contract
    stays stable; `sceneParamsFromPayload` carries a human-readable `rules`
    string per parameter so the evidence→3D mapping is auditable in the UI
    ("3D scene parameters" block).
21. **Texture families (jazz/soul/lo-fi/downtempo) checked before electronic,
    and style tags included in family detection.** Evidence: plain `jazz`
    resolved to a place entity whose genre tags are venues (previously fell to
    neutral), and jazz evidence contains "electro jazz"/"electronic" tags that
    previously won the electronic branch (open observation from 2026-10-18
    changelog, now fixed and documented in `detectGenreFamily`).
22. **Audio reactivity uses a real `AnalyserNode` on the existing procedural
    oscillator** — never fabricated data, never autoplay; the UI says exactly
    that ("procedural oscillator; the field reacts to its real analyser signal").
23. **`react-hooks/immutability` disabled only for `components/three/**`** in
    `eslint.config.mjs` — per-frame mutation of uniforms/cameras/renderer DOM
    is the R3F programming model; the UI-code findings were fixed properly with
    `useSyncExternalStore` instead of blanket-disabling.

## Decisions from the quota-protection build (2026-10-19, visible in committed code)

24. **Cache and budget live server-side, keyed on the full request URL.** The
    response cache (`lib/qloo/cache.ts`) uses `search|<url>` / `insights|<url>`
    keys with insight IDs **sorted and deduplicated** before building the URL, so
    the request and its cache entry are order-independent and duplicate IDs can
    never create a second entry. TTLs: search 24 h, insights 12 h. Rationale:
    identical repeat profiles must cost zero upstream requests without ever
    serving a wrong result.
25. **The application ceiling defaults to 9000 and is hard-clamped to ≤9900**,
    deliberately below the live-verified upstream `x-month-ratelimit-limit` of
    10000 — a margin so the app falls back *before* the provider rejects calls.
    The ceiling is enforced by `shouldStop` inside the HTTP layer (checked before
    every attempt **and** every retry), not by a client-side counter, so retries
    cannot slip past it.
26. **Budget state is persisted per machine to `.qloo-usage.json`** (temp+rename,
    git-ignored) so restarts don't forget the month, but this is explicitly
    **per-process/per-machine, not a global cap** — the docs say so and no global
    guarantee is claimed. Silently pretending otherwise was rejected.
27. **Retries are narrow and bounded**: never retry 400/401/403/404 (invalid
    request / auth failures are not transient), retry only 408/429/5xx plus
    network/timeout and malformed-success bodies; honor `Retry-After` but abandon
    the attempt if it exceeds 10 s rather than sleeping through a quota window.
28. **Quota transparency is additive and honest**: `payload.quota` carries only
    the headers the upstream response actually sent, only when that response
    happened during this request (never on cache-only runs, never fabricated,
    absent on the fallback path). The UI shows used/limit — not an invented
    remaining budget.
29. **Logging is content-free** (`kind`, cache source, status, attempts,
    used/budget) — never API keys, auth headers, or request URLs containing user
    terms, so operational visibility never leaks user input or secrets.
30. **Tests use Node's built-in runner** (`node --test` on `tsconfig.test.json`
    output) rather than adding Jest/Vitest — the repo had no runner configured,
    the built-in one needs no new dependencies, and all new `lib/**` modules use
    relative imports so they compile standalone without the `@/` alias.

## Decisions from the cloud-world landing rebuild (2026-10-19, visible in committed code)

31. **The landing is now a bright, airy, dreamlike cloud world** — pale sky blue
    `#BFE8F5`, powder `#D9F1F7`, cloud white `#F7FBFC`, misty lavender `#DCD8F4`,
    periwinkle `#AAA9EF`, peach sunlight `#FFE1CB`, deep blue-grey type `#26364A`.
    No black background, no acid-lime/UV dominance on the landing. This
    **supersedes decision 3 for the landing only**: the venue sections and
    `/studio` keep the dark direction, so the venue reads as "emerging into
    another world". Light tokens live alongside the dark ones in `globals.css`
    (`--sa-ink`, `--sa-*` atmosphere tokens), so nothing dark was removed.
32. **The cloud world is fully procedural** — one CPU-built tiling value-noise
    `DataTexture` (three shaders: sky dome gradient+sun, cloud billboards,
    points dust), layers of transparent cloud planes at different depths and
    speeds, distant floating architecture and a tiny silhouette on a walkway.
    No image, video or stock assets. Rationale: no asset weight, art-directed
    depth, and it is genuinely 3D rather than a scaled 2D backdrop.
33. **States are a client machine `landing → travelling → venue`** in `app/page.tsx`.
    The single `/api/vibe` request happens only on an explicit submit; while it
    is in flight the world reacts (`CloudWorld` phase `charging`: thickens,
    warms, slows), then `travelling` (forward camera push) is covered by a CSS
    cloud-wipe before the venue mounts edge-to-edge. Nothing spins the camera
    reactively per keystroke or per audio sample on the landing.
34. **Qloo-safety on the landing**: example pills only *fill* the prompt (they
    never submit), `generate()` is guarded by `isLoading` so a double submit is
    ignored, and there are no mount/keystroke/hover/polling requests. A
    `?mock=1` dev-only preview (`lib/dev-mock.ts`, gated on
    `NODE_ENV !== "production"`) returns an explicitly labelled
    `local-fallback` payload so the transition and venue can be iterated with
    **zero** Qloo credits; it is never reachable in a production build and is
    labelled "not Qloo data" wherever it surfaces.
35. **`Venue3D` gained a `fill` prop** to render edge-to-edge (no aspect box,
    no border) for the full-screen venue. The default (bordered aspect box) is
    unchanged, so `/studio` is untouched.
36. **`SonicHero.tsx` is retained but no longer mounted.** The landing hero is
    now `CloudWorld`; the old dark R3F wave is kept in the tree (spec: do not
    destroy existing work) rather than deleted. `ResonanceField` (canvas 2D) is
    still used by `DesignMoodboard` and remains the honest 2D fallback.
37. **Reduced motion and no-WebGL get the same intentional composition.**
    `components/SkyFallback.tsx` (pure CSS sky: gradient, sun wash, drifting
    blobs, distant pavilion) is used for the loading window, when WebGL is
    unavailable, and as the static frame under `prefers-reduced-motion` — never
    a blank or broken canvas.

## Security decisions / required actions (pending user input)

- **Rotate the Qloo API key — STILL PENDING.** The old key was committed in
  `env.txt` (former history `610cf7c`) and briefly shown in audit terminal output.
- **History handling (decided 2026-10-18):** user chose **"fresh baseline, no
  leaked history"** — the repo was rebuilt as a single clean root commit
  (`d589bfd`) from the working tree; the two old commits were discarded and
  purged (`reflog expire` + `git gc --prune=now`), verified unreachable. This
  is why remote history starts at the baseline.
- **Remote (decided 2026-10-18):** repo
  `https://github.com/shayspace04/sonic-architecture` created via GitHub API;
  initially private, **changed to public the same day** after verifying all
  history was free of secrets. GitHub CLI (`gh` 2.102.0) installed later via
  winget and authenticated as `shayspace04` (keyring, scopes: repo/read:org/gist/workflow).
- **DNS root cause fixed (2026-10-18):** hotspot DNS (`172.20.10.1`) was failing
  to resolve `github.com` and resolving `hackathon.api.qloo.com` only to NAT64
  IPv6. User set Wi-Fi DNS to `8.8.8.8` / `1.1.1.1` — both hosts now resolve to
  IPv4 and **live Qloo calls work again** (`source: qloo`, 5 artist results).

## Open questions requiring user input

1. ~~Should the key be rotated now…?~~ — **Rotation still pending user action**
   (the purge already happened; only rotation remains).
2. ~~What network/DNS fix made Qloo work…?~~ — **Resolved:** Wi-Fi DNS set to
   `8.8.8.8` / `1.1.1.1`; live Qloo verified 2026-10-18 and again 2026-10-19.
3. ~~Dashboard kept or replaced?~~ — **Resolved (decision 12):** kept at
   `/studio` as a control-room view; `/` is the cinematic landing.
4. Which provider did the recently expired/rotated OpenCode key belong to? No
   evidence links it to Qloo; assume separate until confirmed.
5. Where is the approved concept image? It is not in the repo — should it be added
   under `public/` or a `docs/` folder for reference?
6. ~~3D venue: R3F or lighter approach?~~ — **Resolved (decisions 11 → 18):**
   shipped as R3F (hero + venue) with canvas 2D / SVG fallbacks retained.
