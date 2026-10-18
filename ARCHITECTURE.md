# ARCHITECTURE.md — Sonic Architecture

Snapshot of the actual implementation (audited 2026-10-18). Next.js **16.4.2**
with Turbopack, React 19.3, TypeScript strict, Tailwind v4, Framer Motion 14.

> Note: `AGENTS.md` carries a Next.js warning that this version has breaking
> changes vs older Next. Before writing Next-specific code, read
> `node_modules/next/dist/docs/`. Observed so far: `LayoutProps<"/">` global type
> in `app/layout.tsx`, `cacheComponents`/`partialPrefetching` flags, Tailwind v4
> wired through a Turbopack loader rule in `next.config.ts`, and a split
> `.next/dev` vs `.next/build` output tree.

## Routes

| Route | File | Kind | Responsibility |
|---|---|---|---|
| `/` | `app/page.tsx` | client component page | Entire UI: input, generate button, 3-col dashboard, audio toggle, hour buttons |
| `/api/vibe` | `app/api/vibe/route.ts` | dynamic POST | Qloo integration + spatial translation; returns `VibePayload` |

No other routes, layouts, or navigation exist.

## Components & hooks

- `components/SpatialCanvas.tsx` — "use client". Pure **2D SVG** floor plan
  (room outline, bar block, 6 seats, two glow lights, dimension ticks, footer
  labels for flooring/seating/temp). Props: `primaryColorHex`, `accentColorHex`,
  `lightingTemperatureK`, `flooringMaterial`, `seatingFabric`. Animates `fill`
  and glow radius/opacity with Framer Motion. No interaction, no 3D.
- `hooks/useAmbientAudio.ts` — "use client". Lazily creates an `AudioContext`
  with a sine oscillator → lowpass → gain (0.06). `vibeScore` (0–100) maps to
  frequency 440→120 Hz and cutoff 1200→300 Hz. Suspending/resuming on toggle;
  full teardown on unmount.

## State management

Local React state only, in `app/page.tsx`: `userInput`, `sliderVal`,
`activeHour`, `isAudioEnabled`, `isLoading`, `isFallback`, `networkStatus`,
`currentVibe` (initialized from `DEFAULT_VIBE`). No store, no context, no URL state.

## Data contracts

Shared shape (declared independently in both `route.ts` and `page.tsx` — not
imported from a shared types module; keep them in sync or extract later):

```ts
interface Track { title: string; artist: string }
interface DesignReasoning {
  source: "qloo" | "qloo-partial" | "local-fallback";
  evidence: string[];              // matched Qloo tag/adjective names
  rules: Record<string, string>;   // per-field human-readable rationale
}
interface VibePayload {
  primaryColorHex: string; accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string; seatingFabric: string;
  tracks: Track[]; menu: string; fallback: boolean;
  reasoning: DesignReasoning;
}
```

Request body: `{ userInput: string; sliderVal: number }` (slider currently unused).

## API integration (server-side only)

- Base: `process.env.QLOO_API_URL` (default `https://hackathon.api.qloo.com`)
- Auth: header `X-Api-Key: process.env.QLOO_API_KEY` — never sent to the client.
- `GET /search?query=<seed>&types=urn:entity:artist&limit=5`
- `GET /v2/insights?filter.type=urn:entity:artist&signal.interests.entities=<entityId>&limit=5`
- Defensive parsing: `firstEntityId`/`firstEntityName` accept
  `results|data|items|entities` arrays and `id|entity_id|qloo_id` fields, because
  the exact response envelope has varied.
- `extractTracks` pulls up to 5 entities → `{title: name|title|Insight N, artist: creator|artist|""}`.
  In practice these are **artist** entities.
- `collectEvidence` harvests `tags[].name` bucketed by `tags[].type`
  (genre/style/theme) plus `properties.adjectives_for_music` and
  `properties.characteristics`.
- `mapFromEvidence` is a **deterministic, documented rule table** (no LLM):
  genre families → palette/material; mood adjectives → lighting temperature.
  Unrecognized input yields neutral defaults with `source: "qloo-partial"`.

## Failure & fallback ladder

1. `QLOO_API_KEY` missing → `fallbackPayload()`
2. `/search` non-2xx or throws → `fallbackPayload()`
3. No usable entity id → `fallbackPayload()`
4. `/v2/insights` non-2xx or throws → `fallbackPayload()`
5. Otherwise → mapped payload, `fallback:false`

`fallbackPayload()` = grey palette, 4500K, micro-cement/canvas, empty tracks,
`menu: "Local fallback (Qloo unavailable)."`, `source: "local-fallback"`.

## Rendering / animation strategy

- Tailwind v4 via `@import "tailwindcss"` + `@theme inline` in `app/globals.css`;
  loaded through the `@tailwindcss/turbopack` loader rule in `next.config.ts`.
- Framer Motion for opacity/fill/glow tweens. No canvas, no WebGL, no Three.js.
- The approved signature particle-wave animation will need a new rendering
  layer (canvas 2D or WebGL/R3F) — nothing in the current stack provides it.

## How the landing page should connect to the venue (target, not built)

`/` becomes the cinematic landing page (hero + "What do you love?" input +
particle-wave). Submitting the input POSTs to `/api/vibe` as today; the wave
animation morphs into the venue stage; the 2D `SpatialCanvas` is superseded by
(or embedded alongside) a 3D venue view; rationale/moodboard/soundtrack panels
follow; final action "ENTER VENUE" opens the walkthrough. Keep `/api/vibe` and
its provenance contract intact — only the presentation layer changes.

## Important decisions encoded in code

- Spatial translation is a **local deterministic rule table**, deliberately not an
  LLM, so every design field can be traced to a named Qloo tag (honesty requirement).
- Provenance is first-class in the API response (`reasoning`) rather than an
  afterthought, so the UI can display exactly how grounded a result is.
- Failing closed to a labeled `local-fallback` (instead of fabricating results)
  is a hard constraint.
