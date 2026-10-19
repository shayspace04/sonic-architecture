# Qloo Connectivity Debug Notes

Status: Qloo connectivity verified from this machine on the latest run. Earlier timeouts were transient/network-specific.

## Observed behavior
- Next.js app runs at `http://localhost:3000`.
- `POST /api/vibe` returns HTTP 200 and uses the local fallback because the Qloo request never completes.
- `QLOO_API_KEY` is present in the server environment; the key itself is not logged.
- Configured base URL: `https://hackathon.api.qloo.com`

## DNS
- `hackathon.api.qloo.com` resolves intermittently, and only to IPv6 NAT64 addresses:
  - `64:ff9b::34c9:c4d6`
  - `64:ff9b::23a9:2f65`
  - `64:ff9b::3210:50c7`
- At other times, DNS resolution fails entirely.

## Node.js fetch result
- `fetch("https://hackathon.api.qloo.com")` throws `fetch failed`.
- Cause: `ConnectTimeoutError` (`UND_ERR_CONNECT_TIMEOUT`) to `hackathon.api.qloo.com:443` after ~10 seconds.
- No HTTP status or response body is received.

## Control test
- `qloo.com` resolves to an IPv4 address (`216.150.1.1`) and responds with HTTP 308.
- General internet/DNS connectivity works.

## Conclusion
- This is a local network/DNS/IPv6 (NAT64) connectivity issue to `hackathon.api.qloo.com`, not an authentication error and not a Qloo service outage.
- No API key exposure occurred; credentials remain server-side in `.env.local`.

## Commands to rerun on another network
```powershell
Resolve-DnsName hackathon.api.qloo.com
node -e "fetch('https://hackathon.api.qloo.com').then(r=>console.log('STATUS',r.status)).catch(e=>{console.error('ERROR',e&&e.message);if(e&&e.cause)console.error('CAUSE',e.cause)})"
curl -6 -w 'HTTP %{http_code}\n' https://hackathon.api.qloo.com
Resolve-DnsName qloo.com
```

## Verified successful flow (current code)
- `GET /search?query=cyberpunk&types=<supported URNs>&take=5` returns 200 with an entity and `entity_id`.
- `GET /v2/insights?filter.type=urn:entity:artist&signal.interests.entities=<entity_id>&take=8` returns 200 with `results.entities` (`limit` is silently ignored; `take` is the valid param).
- `/api/vibe` now returns `fallback: false` and Qloo-derived **artist** entities (never fabricated tracks).
- Colors/lighting/materials come from the deterministic evidence→space rule table (`lib/spatial-rules.ts`).

## Commands
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/vibe" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"userInput":"cyberpunk","sliderVal":80}' -UseBasicParsing
```
Check terminal for content-free lines such as `[qloo] kind=search cache=upstream` and the usage summary `[qloo] profile upstream=... resolved=...`.

## Provenance audit (current code)
- Artists are populated only from Qloo `/v2/insights` `results.entities` filtered to `urn:entity:artist`.
- Colors, lighting, flooring, and seating are mapped from Qloo genre/style/theme/adjective evidence when a recognized genre family is found.
- If no recognized genre family is found, the design uses a neutral default and `reasoning.source` becomes `qloo-partial`.
- If Qloo is unavailable, `fallback: true` and `reasoning.source` is `local-fallback`.
- `/api/vibe` response includes an additive `reasoning` object with `source`, `evidence`, and per-field `rules`, plus `quota` only when the upstream response carried quota headers.
- Lint, tests (`npm test`), and build pass. Live verification works (DNS fixed 2026-10-18) and was re-run 2026-10-19 with quota protection: the orchestration/parsers now live in `lib/qloo/profile.ts`; the route wires `lib/qloo/{cache,usage}.ts`.

## Landing request discipline (2026-10-19)
- The meadow-world landing issues **no** Qloo requests on load, on typing, on
  hover, on pointer movement, or during any animation. Example chips only fill
  the input; a request happens only on an explicit submit (Enter or `ENTER YOUR
  WORLD ↗`).
- The cursor drives the world (foliage bends, camera parallaxes) through the
  shared `world` object only — pointer/touch events never touch the network.
- `generate()` in `app/page.tsx` is guarded by `isLoading`, so a duplicate submit
  while a request is in flight is ignored — one request per intentional submit.
- `?mock=1` (dev only) short-circuits to `lib/dev-mock.ts` and makes **zero**
  upstream calls; it is labelled "not Qloo data" and is unreachable in a
  production build. Use it to iterate on the transition/venue without spending
  credits: `http://localhost:3000/?mock=1`.
