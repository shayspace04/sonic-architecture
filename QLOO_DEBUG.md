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
- `GET /search?query=cyberpunk&types=urn:entity:artist&limit=5` returns 200 with an artist entity and `entity_id`.
- `GET /v2/insights?filter.type=urn:entity:artist&signal.interests.entities=<entity_id>&limit=5` returns 200 with `results.entities`.
- `/api/vibe` now returns `fallback: false` and Qloo-derived tracks (e.g. Aerotronic, Mustard Pimp, Redial).
- Colors/lighting/materials remain hash-derived from the resolved entity name; this is not yet fully Qloo-driven design.

## Commands
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/vibe" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"userInput":"cyberpunk","sliderVal":80}' -UseBasicParsing
```
Check terminal for `Qloo /search status: 200` and `Qloo /v2/insights status: 200`.

## Provenance audit (current code)
- `tracks` are populated only from Qloo `/v2/insights` `results.entities`.
- Colors, lighting, flooring, and seating are now mapped from Qloo genre/style/theme/adjective evidence when a recognized genre family is found.
- If no recognized genre family is found, the design uses a neutral default and `reasoning.source` becomes `qloo-partial`.
- If Qloo is unavailable, `fallback: true` and `reasoning.source` is `local-fallback`.
- `/api/vibe` response includes an additive `reasoning` object with `source`, `evidence`, and per-field `rules`.
- Lint and build pass; live verification is currently blocked by the host connectivity failure.
