<div align="center">
  <table border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" valign="middle">
        <a href="https://sonic-architecture.vercel.app/">
          <img src="./assets/branding/sonic-architecture-logo.svg" width="115" height="110" alt="Sonic Architecture Logo" />
        </a>
      </td>
      <td align="left" valign="middle">
        <h1 style="border-bottom: none; margin-bottom: 2px;">Sonic Architecture</h1>
        <p style="margin: 0 0 4px 0;"><strong>Qloo-Powered Cultural Intelligence for Generative 3D Architectural Design</strong></p>
        <p style="margin: 0; font-style: italic;">Where cultural taste becomes spatial experience.</p>
      </td>
    </tr>
  </table>

  <br>

  <p>
    <a href="https://sonic-architecture.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-sonic--architecture.vercel.app-black?style=flat-square&logo=vercel" alt="Live Demo" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-black.svg?style=flat-square" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat-square&logo=next.js" alt="Next.js 14" />
    <img src="https://img.shields.io/badge/TypeScript-5.4-blue.svg?style=flat-square&logo=typescript" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Three.js-0.164-black.svg?style=flat-square&logo=three.js" alt="Three.js" />
    <img src="https://img.shields.io/badge/Powered%20by-Qloo%20Taste%20API-orange.svg?style=flat-square" alt="Qloo Taste API" />
    <img src="https://img.shields.io/badge/Tests-43%2F43%20Passing-brightgreen.svg?style=flat-square" alt="Automated Tests" />
    <img src="https://img.shields.io/badge/E2E-58%2F58%20Passing-brightgreen.svg?style=flat-square" alt="Playwright E2E" />
  </p>

  <p>
    <a href="https://sonic-architecture.vercel.app/"><strong>Explore Live App »</strong></a> &nbsp;|&nbsp;
    <a href="#how-the-agent-works"><strong>Agent Architecture »</strong></a> &nbsp;|&nbsp;
    <a href="#what-makes-it-qloo-powered"><strong>Qloo Integration »</strong></a> &nbsp;|&nbsp;
    <a href="#application-screenshots"><strong>Interface Gallery »</strong></a> &nbsp;|&nbsp;
    <a href="#setup-and-installation"><strong>Quick Start »</strong></a>
  </p>

  <p>
    <em>🎥 Demo Video: Walkthrough recording in progress — link will be added upon final submission.</em>
  </p>
</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How Sonic Architecture Works](#how-sonic-architecture-works)
- [What Makes It Qloo-Powered?](#what-makes-it-qloo-powered)
- [Agent Architecture: How the Agent Works](#agent-architecture-how-the-agent-works)
- [Core Features](#core-features)
- [Application Screenshots](#application-screenshots)
- [Technology Stack](#technology-stack)
- [Architecture & Source Code Structure](#architecture--source-code-structure)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Testing & Reliability](#testing--reliability)
- [Known Limitations & Disclosures](#known-limitations--disclosures)
- [GitHub Repository Metadata](#github-repository-metadata)
- [License](#license)

---

## The Problem

Human cultural taste is deeply felt, richly referenced, and intensely personal. We form profound emotional connections with musical genres, cinematic directors, literary movements, iconic subcultures, and design eras. 

Yet translating subjective cultural identity into coherent, physical, inhabitable space is notoriously difficult:

1. **The Translation Gap**: An architectural brief specifying *"a listening room that feels like Miles Davis' Kind of Blue combined with brutalist concrete"* or *"an A24 film cine-lounge with 1970s conversation pits"* relies on subjective human intuition. Traditional architects must guess how cinema palettes, musical frequencies, or literary moods should govern ceiling height, reverberation time ($RT_{60}$), lux levels, or seating layouts.
2. **Fragmented Workflows**: Spatial designers manually assemble disjointed Pinterest moodboards, acoustic spreadsheets, lighting calculators, and vendor catalogs. There is no unified system that programmatically connects cultural affinities to physical physics and procurement realities.
3. **Misaligned Physical Realities**: Spaces often look stylized in renderings but fail functionally: high-frequency flutter echoes ruin acoustic listening spaces, poor Kelvin lighting washes out atmospheric warmth, and custom architectural assemblies fail budget or local sourcing constraints.

---

## The Solution

**Sonic Architecture** is an evidence-informed spatial design platform that bridges human cultural taste and generative 3D architecture.

By combining the **Qloo Cultural Intelligence API** with procedural architectural reasoning, real-time WebGL rendering, ISO 3382 acoustic physics, and real-world procurement workflows, Sonic Architecture converts arbitrary natural-language briefs into fully realized spatial environments:

* **Cultural Intelligence to Spatial Form**: Queries Qloo's multi-domain taste graph (music, cinema, dining, fashion, literature, aesthetics) to derive grounded architectural palettes, material assemblies, lighting parameters, and spatial typologies.
* **ISO 3382 Sabine Acoustic Physics**: Automatically calculates room volume, surface absorption coefficients, and target reverberation times ($RT_{60}$) calibrated specifically to the acoustic demands of the cultural program (e.g., tight 0.44s for jazz listening vs. 0.65s for reverberant industrial techno).
* **Interactive Three.js Studio**: Procedurally synthesizes a 3D environment inside the browser with orbit controls, first-person walkthrough mode, floorplan projection, daytime/nighttime lighting switches, and live material manipulation.
* **Fair-Test Baseline Comparison**: Provides a dynamic, prompt-specific *"Without Qloo"* baseline scene alongside the *"With Qloo"* grounded scene, allowing users and evaluators to inspect the exact spatial, chromatic, acoustic, and material impact of cultural intelligence.
* **Real-World Procurement & BOQ**: Connects generated architectural objects directly to practical sourcing options (**BUY**, **RENT**, **CUSTOM**) across 5 global regions, delivering an exportable Project Bill of Quantities (BOQ) with multi-currency cost modeling.

---

## How Sonic Architecture Works

Sonic Architecture operates as a coordinated multi-module pipeline. It pairs deterministic engineering (physics calculations, 3D geometry generation, parametric budgets) with cultural entity resolution and taste graph retrieval:

```mermaid
flowchart TD
    A["User Natural-Language Brief<br/><i>(e.g., 'Intimate jazz listening room with brutalist concrete')</i>"] --> B["Intent & Typology Resolution<br/><i>(lib/enrichment.ts)</i>"]
    
    subgraph "Cultural Intelligence Layer"
        B --> C["Entity Extraction<br/><i>(Identify artists, films, aesthetics)</i>"]
        C --> D["Qloo Taste API<br/><i>(/v2/insights multi-domain queries)</i>"]
        D --> E["Cross-Domain Affinity Signals<br/><i>(Music, Dining, Cinema, Palette, Tags)</i>"]
    end

    subgraph "Synthesis & Physics Engine"
        B --> F["Prompt-Specific Baseline Generator<br/><i>(Dynamic 'Without Qloo' Reference)</i>"]
        E --> G["Evidence Mapping & Typology Synthesis<br/><i>(lib/scene-spec.ts)</i>"]
        G --> H["Sabine RT60 Acoustic Engine<br/><i>(ISO 3382 surface absorption calculations)</i>"]
        G --> I["Lighting & Material Engine<br/><i>(Kelvin, lux, procedural PBR shaders)</i>"]
        G --> J["Spatial Assembly Engine<br/><i>(Geometry, furniture, architectural fixtures)</i>"]
    end

    subgraph "Validation & Output Layer"
        H & I & J --> K["Provenance & Validation Gate<br/><i>(Link every decision to Qloo signal or honest fallback)</i>"]
        K --> L["Interactive 3D Three.js Studio<br/><i>(Orbit, First-Person, Floorplan, Shaders)</i>"]
        K --> M["Fair-Test Comparison Wipe<br/><i>(Baseline vs Grounded Diff Engine)</i>"]
        K --> N["Curated 4-Moment Soundtrack<br/><i>(Arrival, Build, Peak, Ambient Audio)</i>"]
        K --> O["Procurement & Project BOQ<br/><i>(BUY/RENT/CUSTOM, Multi-Currency, CSV/JSON/MD)</i>"]
    end
```

### Deterministic Rules vs. Agent-Orchestrated Retrieval

| Pipeline Component | Operation Type | Mechanism |
| :--- | :--- | :--- |
| **Cultural Entity Resolution** | Orchestrated API Retrieval | Parses input entities and queries Qloo `/v2/insights` across artists, movies, places, and brands. |
| **Aesthetic Tag Synthesis** | Cultural Intelligence | Aggregates high-affinity taste tags and cross-domain entities from Qloo. |
| **Acoustic Engineering** | Deterministic Physics | Calculates reverberation time using the classical Sabine equation: $RT_{60} = \frac{0.161 \cdot V}{A}$ across boundary surfaces. |
| **Spatial Geometry & Layout** | Parametric Procedural Rules | Generates 3D meshes, room bounds, clearances, and architectural fixtures based on structural typologies. |
| **Lighting Calculation** | Deterministic Photometrics | Translates derived Kelvin color temperatures and lux levels into Three.js point, spot, and ambient light matrices. |
| **Soundtrack Curation** | Dual-Tier Resolution | Queries live audio search APIs with structured fallback to validated cultural tracks. |
| **Procurement Estimation** | Parametric Cost Modeling | Computes unit costs, custom fabrication premiums, rental amortizations, and regional shipping multipliers. |

---

## What Makes It Qloo-Powered?

Qloo is the cultural intelligence engine powering Sonic Architecture's ability to interpret human taste. 

Rather than relying on generic large language model hallucinations or arbitrary random seeds, Sonic Architecture grounds architectural decisions in authoritative cultural affinity data.

```
+---------------------------------------------------------------------------------------+
|                                  QLOO TASTE GRAPH                                     |
|                                                                                       |
|   Cultural Input: "Miles Davis"                                                       |
|   Resolved Entity ID: 7E904879-87BC-4BA6-B4AB-6E380A4C250D                            |
|                                                                                       |
|   Cross-Domain Affinities:                                                            |
|   * Related Places: Historic jazz cellars, moody speakeasies, Greenwich Village venues|
|   * Aesthetic Tags: #warm-amber, #mid-century-brass, #intimate-acoustic, #smoke       |
|   * Cinema Affinities: French New Wave, film noir, moody atmospheric cinema           |
|                                                                                       |
+------------------------------------------+--------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                          SONIC ARCHITECTURE DESIGN ENGINE                             |
|                                                                                       |
|   Architectural Decision:                                                             |
|   * Spatial Typology: Listening Room (Low clearance 4.4m, acoustic intimacy)          |
|   * Acoustic Spec: RT60 target 0.44s (Dense absorption: acoustic felt + walnut timber)|
|   * Lighting Spec: 2400K ultra-warm amber incandescent, low lux (120 lux)             |
|   * Primary Palette: #1A2238 (Midnight Navy) with #DDA032 (Warm Brass)                |
|   * Furniture Assembly: Vintage lounge chairs, vinyl display wall, brass task lamps    |
+---------------------------------------------------------------------------------------+
```

### 1. Entity Resolution
When a user enters a prompt referencing cultural icons, bands, directors, or venues, the system queries Qloo's entity search endpoints to resolve canonical entity IDs (e.g., Miles Davis `7E904879-87BC-4BA6-B4AB-6E380A4C250D` or A24 `B2A56C42-12D9-4FF8-AE89-9A24C9E42A24`).

### 2. Multi-Domain Insight Retrieval
The system issues parallel queries to Qloo's `/v2/insights` endpoint across multiple cultural domains:
* **Places & Venues**: Real-world venues frequented by audiences sharing these affinities.
* **Music & Artists**: Related sonic profiles and harmonic structures.
* **Movies & Cinema**: Visual framing, art direction, and color harmonies.
* **Brands & Fashion**: Material textures, tactile finishes, and craft sensibilities.
* **Taste Tags**: Curated descriptor tags expressing mood, rhythm, and style.

### 3. Cultural Evidence Mapping
A dedicated enrichment engine (`lib/enrichment.ts`) parses the Qloo response into concrete architectural drivers:
* **Palette Derivation**: Analyzes entity tags and cinema affinities to synthesize harmonized hex palettes (e.g., *glacial cyan* for Björk vs. *saffron crimson* for Indian palatial themes).
* **Lighting Atmospheres**: Maps mood signals to precise Kelvin temperatures (1800K–6500K) and illuminance levels (lux).
* **Material Signatures**: Selects acoustic and structural materials (e.g., charred cedar, polished concrete, acoustic felt, brass mesh).

### 4. Full Provenance & Traceability
Sonic Architecture does not hide how decisions were made. In the **"Why Qloo?"** studio drawer, every single architectural decision is traceable:
* The exact Qloo entity query and returned taste tags.
* The explicit rationale explaining why a specific material, lighting Kelvin, or acoustic coefficient was chosen.
* Clear labeling distinguishing live Qloo data, cached data, and honest rule-based fallbacks.

> **Division of Responsibilities**: Qloo supplies cultural intelligence and affinity signals. Sonic Architecture's design engine translates those signals into 3D spatial geometry, acoustic physics, and procurement schedules. Qloo does not generate 3D vertices directly.

---

## Agent Architecture: How the Agent Works

Sonic Architecture uses an agentic request-to-render orchestration workflow implemented in `app/api/vibe/route.ts` and `lib/qloo/vibe-pipeline.ts`:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Web Client (Next.js)
    participant Orchestrator as Vibe API Orchestrator (Route)
    participant Qloo as Qloo Taste API (/v2/insights)
    participant Baseline as Baseline Engine (Without Qloo)
    participant Synthesis as SceneSpec & Acoustic Engine
    participant Renderer as Three.js Studio Viewport

    User->>Client: Enters creative brief & clicks "Synthesize"
    Client->>Orchestrator: POST /api/vibe { prompt, dimensions, location }
    
    activate Orchestrator
    Orchestrator->>Baseline: Generate independent prompt-specific baseline
    activate Baseline
    Baseline-->>Orchestrator: Baseline SceneSpec (Typology-matched, no cultural signals)
    deactivate Baseline

    Orchestrator->>Qloo: Query cultural entities & cross-domain insights
    activate Qloo
    Qloo-->>Orchestrator: Taste tags, related places, cinema, artist affinities
    deactivate Qloo

    Orchestrator->>Synthesis: Synthesize grounded SceneSpec with Qloo evidence
    activate Synthesis
    Synthesis->>Synthesis: Derive color palette & Kelvin lighting
    Synthesis->>Synthesis: Calculate Sabine RT60 acoustic coefficients
    Synthesis->>Synthesis: Assemble architectural 3D objects & spatial boundaries
    Synthesis-->>Orchestrator: Grounded SceneSpec + Provenance Rationales + Soundtrack
    deactivate Synthesis

    Orchestrator->>Orchestrator: Compute Fair-Test Diff (Baseline vs Grounded)
    Orchestrator-->>Client: Streaming JSON response (SceneSpec, Baseline, Diff, Provenance)
    deactivate Orchestrator

    Client->>Renderer: Hydrate Three.js Scene, Materials, Lights, & Audio
    Renderer-->>User: Interactive 3D Studio, Compare Slider, & Procurement BOQ
```

### Pipeline Execution Stages

1. **User Intent Interpretation**: Ingests natural-language briefs, detecting architectural scale, occupancy requirements, intended venue typology (e.g., listening lounge, exhibition gallery, nightclub, garden mandap), and named cultural references.
2. **Dynamic Baseline Generation**: Synthesizes an independent, typology-accurate architectural baseline using *only* architectural requirements, deliberately withholding Qloo cultural signals to guarantee an authentic benchmark.
3. **Qloo Query Orchestration**: Executes concurrent, timeout-bounded HTTP queries against Qloo endpoints with in-memory and serverless distributed caching.
4. **Evidence Evaluation & Fallback**: Evaluates Qloo response density. If Qloo returns sparse data or is unreachable, the system gracefully engages honest fallback rules and updates UI provenance badges accordingly.
5. **Architectural Synthesis (`SceneSpec`)**: Produces a comprehensive JSON specification defining room dimensions, boundary materials, light arrays, architectural furniture archetypes, and Sabine acoustic reverberation times.
6. **Fair-Test Diff Computation**: Performs a deep pairwise diff between the baseline scene and the grounded scene across 6 structural categories: Furniture, Soundtrack, Palette, Program, Lighting, and Geometry.
7. **Client-Side Procedural 3D Hydration**: Renders the complete environment using Three.js with realistic shadows, physically based materials, interactive camera modes, and synchronized 4-moment audio.

---

## Core Features

### 1. Cultural-to-Architecture Procedural Engine
Transforms arbitrary cultural prompts into habitable 3D architectural spaces. A brief referencing *"1970s conversation pits, warm walnut panelling, and A24 aesthetics"* automatically generates sunken seating risers, low-slung lounge furniture, warm ambient lighting, and bespoke wall finishes.

### 2. Qloo Evidence & Provenance Inspector
A dedicated slide-out provenance drawer displays the exact cultural evidence underpinning every architectural choice. Users can inspect resolved Qloo entities, taste tags, related venues, and itemized rationale sentences explaining lighting, materials, and acoustic selections.

### 3. Dynamic "Without Qloo" vs "With Qloo" Fair-Test Comparison
A side-by-side interactive split-screen wipe allowing users to slide between the dynamic baseline scene (generated without cultural data) and the Qloo-grounded scene. A category-by-category diff breakdown proves the exact spatial, aesthetic, and functional value added by Qloo.

### 4. Interactive Three.js Architectural Studio
A high-performance WebGL 3D viewport featuring:
* **Orbit Controls**: Pan, rotate, zoom with smooth inertial damping.
* **First-Person Walkthrough**: Inhabit the space at eye level using keyboard/touch navigation.
* **Orthographic Floorplan View**: Instant top-down architectural layout visualization.
* **Daylight / Nighttime Toggle**: Real-time lighting recalculation from daylight solar angles to dramatic nighttime fixtures.

### 5. Architectural Materials & Spatial Specifications
Procedural PBR materials with realistic roughness, metalness, and bump mapping. Finishes include board-formed concrete, charred shou sugi ban cedar, acoustic ribbed felt, terrazzo, polished brass, tatami matting, and obsidian stone.

### 6. Lighting Design & ISO 3382 Sabine RT60 Acoustic Simulation
* **Lighting**: Kelvin temperature calculations (1800K candlelight to 6500K daylight), lux level calibrations, and directional beam spreads.
* **Acoustics**: Real-time calculation of room volume, surface absorption areas, and target reverberation times ($RT_{60}$ in seconds), ensuring acoustic specifications match the venue's sonic program.

### 7. Verified 4-Moment Soundtrack Discovery
Curates a cohesive 4-phase audio soundtrack for the space: **Arrival**, **Build**, **Peak**, and **Ambient After-Hours**. Includes an in-browser audio player with synthesized preview streaming and track metadata.

### 8. Real-World Procurement & Location-Aware Sourcing
Bridges conceptual 3D design to actual construction reality. Select from 5 global locations (**New York**, **London**, **Tokyo**, **Berlin**, **Mumbai**) to update local supplier directories, regional delivery dispatch timelines, and live vendor catalog search queries.

### 9. BUY / RENT / CUSTOM Procurement Modes
Item-by-item procurement strategy toggles:
* **BUY**: Commercial off-the-shelf purchase with standard retail trade pricing.
* **RENT**: Event and temporary activation rentals with daily/weekly amortization rates.
* **CUSTOM**: Bespoke millwork and custom architectural fabrication with skilled artisan labor multipliers.

### 10. Multi-Currency Project Bill of Quantities (BOQ) & Exports
Live calculation of the total project procurement budget with interactive quantity adjustments, unit pricing, and custom fabrication surcharges. Supports 5 major currencies (**USD**, **EUR**, **GBP**, **JPY**, **INR**) and one-click exports to **CSV**, **JSON**, and formatted **Markdown** reports.

---

## Application Screenshots

### 1. Homepage & Natural-Language Brief Intake
*Clean editorial landing page where users craft custom architectural briefs or select curated cultural presets.*

![Sonic Architecture Homepage](./assets/screenshots/01-homepage-editorial-brief.png)

---

### 2. Interactive 3D Architectural Studio
*Real-time Three.js viewport rendering procedural spatial geometry, materials, lighting arrays, and architectural assemblies.*

![Interactive 3D Architectural Studio](./assets/screenshots/02-interactive-3d-studio.png)

---

### 3. Qloo Cultural Provenance & Evidence Panel
*Slide-out inspector showing resolved Qloo entities, cross-domain taste tags, and traceable architectural rationale sentences.*

![Qloo Cultural Provenance Panel](./assets/screenshots/03-qloo-provenance-and-evidence.png)

---

### 4. Baseline vs. Grounded Fair-Test Comparison Wipe
*Split-screen wipe comparing the prompt-specific dynamic baseline (Without Qloo) against the culturally grounded scene (With Qloo).*

![Baseline vs Grounded Fair-Test Comparison](./assets/screenshots/04-baseline-vs-grounded-compare.png)

---

### 5. Procurement Workspace & Project Bill of Quantities (BOQ)
*Location-aware sourcing panel supporting BUY / RENT / CUSTOM modes, regional vendor search links, multi-currency conversion, and BOQ export.*

![Procurement Workspace & Project BOQ](./assets/screenshots/05-procurement-and-project-boq.png)

---

### 6. Curated 4-Moment Soundtrack with Audio Player
*Programmed musical narrative across Arrival, Build, Peak, and Ambient moments with in-browser audio preview streaming.*

![Curated 4-Moment Soundtrack](./assets/screenshots/06-soundtrack-discovery-and-audio.png)

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Framework & Runtime** | [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [Node.js](https://nodejs.org/) | Server-side rendering, streaming HTTP endpoints, and application runtime. |
| **Language & Typing** | [TypeScript 5](https://www.typescriptlang.org/) | Strict static typing across all API payloads, SceneSpecs, and 3D data structures. |
| **3D & WebGL Graphics** | [Three.js 0.164](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/), [@react-three/drei](https://github.com/pmndrs/drei) | Procedural 3D mesh synthesis, PBR materials, orbit controls, and real-time lighting. |
| **UI & Animation** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Framer Motion 11](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) | Architectural editorial design system, smooth drawer transitions, and responsive controls. |
| **Cultural Intelligence** | [Qloo Taste API](https://qloo.com/) (`/v2/insights`) | Entity resolution, taste tag extraction, and cross-domain cultural affinity graphs. |
| **Acoustic Simulation** | Sabine Formula Engine (`lib/scene-spec.ts`) | ISO 3382 acoustic reverberation time calculations ($RT_{60}$) across surface materials. |
| **Audio Previews** | Web Audio API, Spotify Web API | Audio synthesis, harmonic frequency playback, and track streaming. |
| **Caching & Persistence** | In-Memory Serverless Cache, [Vercel KV / Upstash Redis](https://vercel.com/storage/kv) | Low-latency response caching and rate-limit protection. |
| **Testing & Quality** | Node.js Test Runner (`node --test`), [Playwright](https://playwright.dev/) | 43 automated unit/integration tests and 58-step end-to-end browser audits. |

---

## Architecture & Source Code Structure

```
sonic-architecture/
├── app/                                # Next.js 14 App Router
│   ├── api/
│   │   ├── vibe/route.ts               # Core streaming orchestration endpoint
│   │   ├── soundtrack/route.ts         # 4-moment soundtrack resolution & audio
│   │   └── feedback/route.ts           # User evaluation and telemetry logging
│   ├── about/page.tsx                  # Architectural methodology & Qloo thesis
│   ├── archive/page.tsx                # Saved architectural generations library
│   ├── studio/page.tsx                 # Fullscreen 3D architectural workspace
│   ├── globals.css                     # Editorial typography & theme variables
│   ├── layout.tsx                      # Root layout, fonts, and OpenGraph metadata
│   └── page.tsx                        # Editorial landing page & brief intake
├── assets/                             # Tracked repository assets
│   ├── branding/                       # Official SVG vector logo & brand marks
│   └── screenshots/                    # High-resolution application screenshots
├── components/                         # React UI & 3D Components
│   ├── brand/                          # <SonicMark /> vector component
│   ├── landing/                        # Hero section, brief intake, preset gallery
│   ├── studio/                         # Studio workspace, drawers, comparison controls
│   ├── three/
│   │   ├── Venue3D.tsx                 # Procedural Three.js 3D venue renderer
│   │   ├── FirstPersonControls.tsx     # Eye-level walkthrough camera system
│   │   └── LightingRig.tsx             # Parametric Kelvin/lux lighting arrays
│   └── ui/                             # Procurement panel, BOQ modal, audio player
├── lib/                                # Core Architectural & Intelligence Engines
│   ├── qloo/
│   │   ├── client.ts                   # Authoritative Qloo API client & caching
│   │   └── vibe-pipeline.ts            # Multi-domain cultural query orchestrator
│   ├── acoustics.ts                    # Sabine RT60 reverberation calculations
│   ├── enrichment.ts                   # Qloo signal mapping & baseline generator
│   ├── palette.ts                      # Color harmony synthesis & hex generators
│   ├── scene-spec.ts                   # 3D SceneSpec generator & object archetypes
│   └── types.ts                        # Complete TypeScript interfaces & schemas
├── tests/                              # Automated & E2E Test Suites
│   ├── acceptance.test.mjs             # 10 core architectural acceptance scenarios
│   ├── truthful-sentences.test.mjs     # 6 cultural generalization & honesty tests
│   ├── system-reliability.test.mjs     # 13 reliability, quota, & boundary tests
│   ├── qloo-visual-and-procurement.mjs # 6 procurement, BOQ, & visual diff tests
│   ├── release-readiness.test.mjs      # 4 cross-system consistency & grounding tests
│   ├── dynamic-baseline.test.mjs       # 4 prompt-specific baseline isolation tests
│   └── full-frontend-audit.e2e.mjs     # 58-step Playwright browser verification
├── package.json                        # Scripts, dependencies, and project metadata
└── README.md                           # Product documentation and evaluation guide
```

---

## Setup and Installation

### Prerequisites

* **Node.js**: LTS version recommended (`v18.18.0+`, `v20.x LTS`, or `v22.x LTS`).
* **npm**: Standard package manager (uses `package-lock.json`).
* **Modern Web Browser**: Chrome, Edge, Firefox, or Brave with WebGL 2.0 hardware acceleration enabled.

### Quick Start Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/thesaaddev/sonic-architecture.git
   cd sonic-architecture
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment template:
   * **Linux / macOS / PowerShell**:
     ```bash
     cp .env.example .env.local
     ```
   * **Windows Command Prompt (`cmd.exe`)**:
     ```cmd
     copy .env.example .env.local
     ```

4. **Add Your Qloo API Key**:
   Open `.env.local` in your editor and insert your hackathon key:
   ```env
   QLOO_API_KEY=your_qloo_hackathon_api_key_here
   ```
   > **Zero-Key Local Mode**: If `QLOO_API_KEY` is omitted, Sonic Architecture runs immediately in honest fallback mode with typed sample fixtures.

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```

6. **Open the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

> **Security Notice**: `QLOO_API_KEY` is strictly a server-side secret used in Next.js API routes (`app/api/vibe/route.ts`). It must **never** be prefixed with `NEXT_PUBLIC_` or exposed to the client bundle.

---

## Environment Variables

| Variable | Required | Scope | Description |
| :--- | :---: | :---: | :--- |
| `QLOO_API_KEY` | **Yes** *(for live Qloo)* | Server | Hackathon API key authenticating against `https://hackathon.api.qloo.com`. Runs in honest fallback mode if omitted. |
| `KV_REST_API_URL` | Optional | Server | Upstash Redis or Vercel KV REST endpoint URL for distributed multi-instance caching. |
| `KV_REST_API_TOKEN` | Optional | Server | Upstash Redis or Vercel KV REST bearer token. |
| `SPOTIFY_CLIENT_ID` | Optional | Server | Spotify Developer Client ID for live track metadata resolution. |
| `SPOTIFY_CLIENT_SECRET` | Optional | Server | Spotify Developer Client Secret for live track metadata resolution. |
| `SOUNDTRACK_CACHE_TTL_MS` | Optional | Server | Cache time-to-live for soundtrack API responses (Default: `86400000` ms / 24 hours). |
| `SOUNDTRACK_RATE_LIMIT_MAX` | Optional | Server | Maximum requests per rate-limiting window (Default: `60`). |
| `NEXT_PUBLIC_SITE_URL` | Optional | Client/Server | Canonical public URL used for OpenGraph cards and metadata (Default: `http://localhost:3000`). |
| `DEPLOYED_URL` | Optional | Server | Alternative production deployment URL override for cloud hosting environments. |

---

## Testing & Reliability

Sonic Architecture maintains a 100% passing automated test suite covering unit logic, cultural generalization, acoustic physics, edge-case resilience, procurement arithmetic, and real browser interactions.

Execute the test suites directly via `npm`:

```bash
# Run core acceptance test suite (10 scenarios)
npm test

# Run cultural generalization & truthful attribution audit (6 scenarios)
npm run test:judges

# Run edge-case resilience & quota boundary suite (13 scenarios)
npm run test:reliability

# Run procurement, BUY/RENT/CUSTOM, & BOQ test suite (6 scenarios)
npm run test:procurement

# Run release-readiness & cross-system consistency suite (4 scenarios)
npm run test:readiness

# Run dynamic prompt-specific baseline differentiation suite (4 scenarios)
npm run test:baseline

# Run full end-to-end browser audit with Playwright (58 verified steps)
node tests/full-frontend-audit.e2e.mjs
```

### Verified Test Results Summary

```
================================================================================
  SONIC ARCHITECTURE VERIFIED TEST SUITE SUMMARY (43 AUTOMATED TESTS)
================================================================================
  ✔ tests/acceptance.test.mjs                           10/10 PASS (1,258 ms)
  ✔ tests/truthful-sentences-and-generalisation.test.mjs  6/6 PASS (1,089 ms)
  ✔ tests/system-reliability.test.mjs                   13/13 PASS (4,495 ms)
  ✔ tests/qloo-visual-and-procurement.test.mjs           6/6 PASS (2,116 ms)
  ✔ tests/release-readiness-grounding.test.mjs            4/4 PASS (2,537 ms)
  ✔ tests/dynamic-baseline-differentiation.test.mjs       4/4 PASS   (775 ms)
--------------------------------------------------------------------------------
  TOTAL AUTOMATED UNIT & INTEGRATION TESTS:              43/43 PASS (100%)
  PLAYWRIGHT FULL-FRONTEND BROWSER AUDIT:                58/58 PASS (100%)
================================================================================
```

---

## Known Limitations & Disclosures

To ensure transparency and integrity, the following implementation boundaries should be noted:

1. **Vendor Search Queries vs. Live Inventory APIs**: The Procurement Workspace generates localized search links targeting verified trade suppliers (e.g., McMaster-Carr, Grainger, B&H Photo, Thomann, Ovolo, DWR) matching the selected city. It does not integrate proprietary supplier inventory APIs or guarantee warehouse stock availability.
2. **Indicative Procurement Pricing**: Procurement unit costs, custom artisan fabrication markups, and rental rates represent calibrated commercial architectural estimating baselines. They are not binding supplier price quotes.
3. **Currency Conversion Assumptions**: Currency conversions are computed using fixed application-defined baseline exchange benchmarks (Base: USD, October 2026 reference benchmarks: `EUR: 0.92`, `GBP: 0.77`, `JPY: 152.50`, `INR: 84.10`). They are labeled as application assumptions and do not stream live foreign exchange ticker data.
4. **Soundtrack Previews**: Soundtrack playback utilizes synthesized harmonic preview streaming and Spotify 30-second preview URLs where permitted by external content delivery networks. Track playback availability is subject to third-party rights and regional licensing.
5. **Procedural 3D WebGL vs. Production BIM**: The Three.js studio renders procedural, interactive 3D WebGL models optimized for 60fps in-browser exploration. It does not export structural Revit/IFC building information models or structural engineering load calculations.

---

## GitHub Repository Metadata

For repository maintainers and judges reviewing repository settings:

* **Repository Description**:
  > Qloo-powered cultural intelligence that transforms music, films, artists and cultural taste into interactive 3D architectural spaces.
* **Website URL**:
  > `https://sonic-architecture.vercel.app/`
* **Suggested Topics**:
  > `qloo`, `qloo-api`, `cultural-intelligence`, `agentic-ai`, `generative-design`, `architecture`, `spatial-design`, `threejs`, `3d-visualization`, `nextjs`, `typescript`, `ai-design`
* **Social Preview Image**:
  > Stored at `./assets/branding/social-preview.png` (1200×630, high-DPI OpenGraph card featuring the official vector glyph and product typography).

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for complete details.

Copyright (c) 2026 Sonic Architecture Contributors.
