# Sonic Architecture — Cultural Intelligence to Spatial Form

**Sonic Architecture** is a Next.js App Router (`React 18` + `TypeScript` + `Framer Motion` + `React Three Fiber` / `Three.js`) application that translates cultural references, musical artists, acoustic targets, and architectural briefs into inhabitable 3D venues, ISO 3382 Sabine RT60 acoustic simulations, verified 4-moment soundtracks, real-world procurement schedules, and exportable architectural design briefs.

---

## 1. Windows Prerequisites

Before setting up the project on Windows 10 or Windows 11, ensure you have:

1. **Node.js LTS (v18.18.0+, v20.x LTS, or v22.x LTS recommended)**
   - Download the Windows Installer (`.msi`) from [https://nodejs.org/](https://nodejs.org/).
   - Verify installation in **PowerShell** or **Command Prompt (`cmd.exe`)**:
     ```powershell
     node -v
     npm -v
     ```
2. **Modern WebGL 2.0 Browser** (Chrome, Edge, Brave, or Firefox with hardware acceleration enabled).
3. **Optional — FFmpeg** (only needed if you wish to re-encode raw background video clips via `npm run encode:hero-media`; pre-packaged background video and WebP poster assets are already included in `public/`).

---

## 2. Exact Windows Setup & Run Instructions

### Step 1: Extract the Project Archive
Extract `sonic-architecture-standalone.zip` to a local folder of your choice (for example, `C:\Projects\sonic-architecture-standalone`) so that it does not overwrite any existing project folder.

### Step 2: Open Terminal in the Project Root
Open **PowerShell** or **Command Prompt** and navigate into the extracted `sonic-architecture` directory (where `package.json` is located):

```powershell
cd path\to\sonic-architecture
```

### Step 3: Configure Environment Variables (`.env.local`)
Copy `.env.example` to `.env.local`:

- **In PowerShell:**
  ```powershell
  Copy-Item .env.example .env.local
  ```
- **In Command Prompt (`cmd.exe`):**
  ```cmd
  copy .env.example .env.local
  ```

> **Zero-Key Local Mode:** The application runs out of the box **without** requiring external API keys.
> - If `QLOO_API_KEY` is not set in `.env.local`, the app operates with truthful fallback labels and typed sample fixtures.
> - To enable live Qloo Taste API queries, edit `.env.local` and add your personal hackathon key:
>   `QLOO_API_KEY=your_qloo_key_here`

### Step 4: Install Dependencies
Install all required Node.js packages:

```powershell
npm install
```

### Step 5: Start the Local Development Server
Start the Next.js development server:

```powershell
npm run dev
```

Once Next.js reports `Ready`, open your browser to [http://localhost:3000](http://localhost:3000).

### Step 6: Test Suite & Production Build Verification
To run all test suites and verify production builds:

```powershell
# Run acceptance test suite
npm test

# Run automated Qloo grounding and contrast proof suite
node --test tests/qloo-proof.test.mjs

# Build optimized production bundle
npm run build
```

---

## 3. How Qloo is Used in Sonic Architecture

Sonic Architecture uses Qloo's Cultural AI as a **direct architectural driver**, proving that cross-domain taste graphs can generate physical 3D spatial geometry, material palettes, acoustic physics, and lighting atmospheres rather than just recommending media.

### Endpoints Called & Architectural Purpose

| Endpoint | Method | Parameters Sent | Architectural Purpose & 3D Impact |
|---|---|---|---|
| `/search` | `GET` | `query=<name>&types=<type>&take=3` | **Entity Resolution:** Resolves cultural names (artists, places, brands, movies) from free-form user prompts into verified Qloo entity IDs. Matches are strictly vetted against whole-word boundaries and token overlap $\ge 0.8$. |
| `/v2/tags` | `GET` | `filter.query=<term>&take=5` (with `feature.semantic_search=true` fallback) | **Concept Mapping:** Translates abstract descriptive concepts (e.g., "brutalist", "ambient", "indie") into canonical Qloo tag URNs (e.g. `urn:tag:decor:qloo:brutalism`, `urn:tag:genre:music:ambient`). |
| `/v2/insights` (Place) | `GET` | `signal.interests.entities=<id>`, `signal.interests.tags=<tags>`, `filter.type=urn:entity:place&take=4&feature.explainability=true` | **Spatial Typology & Venues:** Discovers physical venues (museums, listening lounges, warehouses, galleries) where audiences congregate. Shapes 3D room dimensions, clear-span height, and focal elements. |
| `/v2/insights` (Artist) | `GET` | `filter.type=urn:entity:artist&take=4&feature.explainability=true` | **Sonic & Acoustic Alignment:** Gathers musical genre, instrumentation, and sonic signatures to calibrate Sabine RT60 reverberation decay targets and soundtrack curation. |
| `/v2/insights` (Movie) | `GET` | `filter.type=urn:entity:movie&take=4&feature.explainability=true` | **Cinematic Atmosphere & Lighting:** Extracts visual color temperature (Kelvin), exposure, fog density, and practical lighting fixtures (sconces, chandeliers, industrial neon). |
| `/v2/insights` (Brand) | `GET` | `filter.type=urn:entity:brand&take=4&feature.explainability=true` | **Materiality & Hardware Standards:** Informs physical surface materials (acoustic slotted oak, obsidian terrazzo, raw board concrete, limewash plaster) and procurement specifications. |
| `/v2/insights` (Taste Tags) | `GET` | `signal.interests.entities=<id>&filter.type=urn:tag&take=8` | **Palette Derivation:** Drives the primary, secondary, wall, floor, and accent color hex codes via `lib/design/qlooMapping.ts`. |
| `/api/qloo-health` | `GET` | *(bypasses cache)* | **Live Connectivity & Telemetry:** Executes an uncached live ping to verify Qloo status, measuring real round-trip latency without exposing keys. |

### Architectural Interpretation Layer (`lib/design/qlooMapping.ts`)
Rather than relying on generic default greys, Sonic Architecture translates Qloo's cultural vectors into tactile 3D spatial properties:
- **Miles Davis / Modal Jazz:** Deep nocturnal velvet indigo (`#141724`), warm smoked mahogany floors (`#36281D`), burnished architectural brass accents (`#D4AF37`), 2400K incandescent warmth, and RT60 0.42s.
- **Aphex Twin / Warehouse IDM:** Void obsidian slate (`#0B0D12`), raw cold anthracite concrete (`#1F2328`), electric acid cyan accents (`#00F0FF`), 6500K high-intensity strobe lighting, and RT60 1.15s.

### Code-Built "Because" Sentences
The UI displays 3 deterministic design rationales generated strictly in code from returned Qloo venues, movies, brands, and tags:
> *"Fans of Aphex Twin gather at New Museum, Whitechapel Gallery and MoMA PS1, so this venue is designed as a gallery warehouse."*

---

## 4. Deploy Readiness & Pluggable Cache Architecture

- **Serverless-Ready Cache Adapter (`lib/qloo/cache.ts`):** Uses an in-memory cache adapter by default (zero filesystem dependency for Vercel/AWS Lambda), automatically connecting to Upstash/Vercel KV or Redis when `KV_REST_API_URL` / `KV_REST_API_TOKEN` or `REDIS_URL` are present.
- **Resilient Dual-Tier DNS (`lib/qloo/network.ts`):** Tries standard OS DNS lookup first, falling back to public DNS resolvers (8.8.8.8 / 1.1.1.1) only if the host encounters `ENOTFOUND` or times out.
- **Clean Hygiene:** `.qloo-cache/`, `.qloo-samples/`, and proof artifacts are strictly `.gitignore`d. API keys are strictly masked and never logged.
- **Licence:** Licensed under the [MIT License](LICENSE).

# Type-check and build optimized production bundle
npm run build

# Start production server on http://localhost:3000
npm start
```

---

## 3. Project Structure & Included Modules

```text
sonic-architecture/
├── app/
│   ├── layout.tsx                  # Root layout: next/font/google (Fraunces opsz normal+italic, Manrope, DM Mono) & skip links
│   ├── globals.css                 # Brutalist-editorial design tokens, wash/grain overlays, mobile (<800px) & reduced-motion CSS
│   ├── page.tsx                    # `/` — The Experience route
│   ├── archive/page.tsx            # `/archive` — Spatial Archive route
│   ├── studio/page.tsx             # `/studio` — Design Studio route
│   ├── about/page.tsx              # `/about` — About the Practice route
│   └── api/
│       ├── vibe/route.ts           # POST /api/vibe — Qloo cultural taste resolution, caching, quota & SceneSpec synthesis
│       └── soundtrack/route.ts     # POST /api/soundtrack — 4-moment soundtrack verification, cache & sliding-window quota
├── components/
│   ├── editorial/
│   │   ├── EditorialWorldExperience.tsx # Master coordinator connecting hero shell, 3D studio stage, revisions, audio & brief export
│   │   ├── EditorialShellLayout.tsx     # Shared single-viewport layout, cursor parallax, route transition & aria-live toast
│   │   ├── EditorialBackgroundMedia.tsx # LCP WebP poster (next/image), dual-format 720p video, gradient wash & SVG film grain
│   │   ├── EditorialHeroSection.tsx     # Masked line reveal hero, hairline prompt input, inline validation & 4 prompt chips
│   │   ├── EditorialNav.tsx             # Top mono nav + honest Web Audio AnalyserNode 4-bar equalizer sound toggle
│   │   ├── EditorialFooter.tsx          # Bottom viewport telemetry & practice link
│   │   └── EditorialRouteTransition.tsx # GPU-composited route cross-fade wrapper
│   ├── three/
│   │   ├── Venue3D.tsx                  # Main React Three Fiber 3D venue renderer, camera rigs, overlays & object selection
│   │   ├── ArchitecturalKit.tsx         # Procedural bays, arches, columns, vaults, stairs, mezzanines & contact shadows
│   │   ├── AtmosphereAndSetting.tsx     # Displaced 3D terrain, reflective water, instanced organic trees & horizon rings
│   │   ├── FurnishingPopulator.tsx      # Instanced seating, tables, vinyl shelves, acoustics & event installations
│   │   ├── LightRecipeAndSky.tsx        # Time-of-day solar/sky dome, ACES Filmic exposure & practical light fixtures
│   │   ├── MaterialLibrary.ts           # Procedural PBR textures, tangent-space normal maps & OKLCH palette contrast guard
│   │   ├── PostProcessingAndOverlays.tsx# Selective emissive bloom, optical vignette, acoustic rays & whitewash detector
│   │   └── Scene2DPlan.tsx              # 2D orthographic architectural floor plan renderer
│   └── ui/
│       ├── SoundtrackPanel.tsx          # 4-moment soundtrack UI, provenance badges, copy track list & search links
│       ├── SoundtrackMiniPlayer.tsx     # Persistent audio bar, 16-band spectrum HUD, mode switcher & Spotify URI embed
│       ├── ProcurementWorkspacePanel.tsx# Real-world Buy/Rent/Custom sourcing & budget-aware Bill of Quantities (BOQ)
│       ├── SceneDetailAuditPanel.tsx    # 5-Layer Dev Scene Detail & GPU quality budget audit panel
│       └── ViewportGlassChrome.tsx      # Additional studio viewport HUD controls
├── lib/
│   ├── types.ts                    # Authoritative TypeScript interfaces across 3D scenes, Qloo provenance, audio & BOQ
│   ├── motion.ts                   # Editorial design tokens, parallax physics, Framer Motion variants & reduced-motion hooks
│   ├── editorial-routes.ts         # Typed route configuration for /, /archive, /studio, and /about
│   ├── scene-spec.ts               # Composable free-form prompt interpreter, Sabine RT60 calculator & 3D SceneSpec generator
│   ├── enrichment.ts               # Cultural intelligence entity resolver & architectural rule mapping
│   ├── fallback.ts                 # Deterministic offline VibePayload generator
│   ├── revisions.ts                # Targeted natural-language scene revision engine
│   ├── brief.ts                    # Markdown architectural design brief & 4-moment soundtrack table compiler
│   ├── procurement.ts              # Product matching, multi-currency conversion & BOQ export engine
│   ├── music-profile.ts            # Pure SceneSpec -> MusicProfile derivation, validation & FNV-1a scene hash
│   ├── soundtrack-pipeline.ts      # 3-tier candidate generation, catalog verification, cache & quota manager
│   ├── soundtrack-providers.ts     # iTunes Search API (30s CORS AAC preview) & Spotify Embed/API providers
│   ├── soundtrack-audio-engine.ts  # Web Audio API playback hook, AnalyserNode FFT band extractor & polyphonic synth
│   ├── cache.ts                    # TTL cache for Qloo /api/vibe responses
│   └── quota.ts                    # Upstream Qloo API quota & rate-limit tracker
├── public/
│   ├── bg-720.mp4                  # Faststart 720p H.264 muted brutalist architecture loop
│   ├── bg-720.webm                 # 720p VP9 WebM muted brutalist architecture loop
│   ├── sonic-architecture-bg.mp4   # Fallback MP4 background video
│   ├── sonic-architecture-bg.webm  # Fallback WebM background video
│   ├── modernist-city.webp         # Optimized WebP hero poster image for instant LCP
│   └── modernist-city.png          # High-resolution PNG poster fallback
├── scripts/
│   └── encode-hero-media.sh        # Reference FFmpeg encoding commands for hero video/poster assets
└── tests/
    └── acceptance.test.mjs         # Automated Node.js test runner verifying music profile, soundtrack & brief export
```

---

## 4. Keyboard Shortcuts

- **`1` – `4` (on Hero):** Load preset cultural prompt chip into the input or switch 3D camera chapter when viewing the stage.
- **`M`:** Toggle real venue soundtrack audio on/off.
- **`Esc`:** Interrupt an in-flight submit zoom/lift transition and return immediately to the prompt.
- **`Space` / `[` / `]`:** Play/pause, previous track, and next track in the Soundtrack Mini-Player.
