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
> - If `QLOO_API_KEY` is not set in `.env.local`, `POST /api/vibe` automatically uses the built-in Layer-4 Cultural Knowledge & Spatial Synthesis Engine (`lib/enrichment.ts`, `lib/scene-spec.ts`, `lib/fallback.ts`).
> - `POST /api/soundtrack` uses the free, zero-key **iTunes Search API** for real track verification and 30-second CORS AAC audio previews, falling back to the built-in procedural Web Audio venue synthesizer (`lib/soundtrack-audio-engine.ts`) when offline.
> - To enable live Qloo Taste API queries, edit `.env.local` and replace `your_qloo_api_key_here` with your Qloo API key.

### Step 4: Install Dependencies
Install all required Node.js packages (`next`, `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`, `lucide-react`, `tailwindcss`, `typescript`):

```powershell
npm install
```

*(Note: If you encounter peer-dependency warnings on newer npm versions with `@react-three/fiber`, run `npm install --legacy-peer-deps`.)*

### Step 5: Start the Local Development Server
Start the Next.js development server:

```powershell
npm run dev
```

Once Next.js reports `Ready`, open your browser to:
- **Home / The Experience:** [http://localhost:3000](http://localhost:3000)
- **Spatial Archive:** [http://localhost:3000/archive](http://localhost:3000/archive)
- **Design Studio:** [http://localhost:3000/studio](http://localhost:3000/studio)
- **About the Practice:** [http://localhost:3000/about](http://localhost:3000/about)

### Step 6: Production Build & Verification (Optional)
To run the automated acceptance test suite or build for production on Windows:

```powershell
# Run the Node.js acceptance test suite (music profile, soundtrack pipeline, brief export)
npm test

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
