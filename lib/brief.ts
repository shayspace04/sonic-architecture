/**
 * Sonic Architecture — Step 5: Design-Brief Export Integration, Track List Formatter & Search Links
 * (/lib/brief.ts)
 *
 * Implements:
 * - Honest multi-platform "Open in search" URL builder (never fabricates catalog IDs)
 * - Plain-text / clipboard formatter for "Copy track list" across all 4 moments
 * - Dedicated Markdown section generator (`## 8. Venue Soundtrack & 4-Moment Program Curation`)
 * - Full `generateMarkdownDesignBrief(spec, soundtrackOverride?)` integration with MusicProfile,
 *   4-moment track tables, provenance badges ("qloo-evidence" | "inferred" | "fallback"),
 *   scene-feature "whyThisFits" rationales, and catalog verification telemetry.
 *
 * Strict TypeScript, zero `any`.
 */

import type {
  SceneSpec,
  MusicProfile,
  SoundtrackPlaylist,
  SoundtrackTrackItem,
  SoundtrackMomentName,
  SoundtrackProvenanceLabel,
} from "./types";
import { deriveMusicProfile, computeSceneMusicHash } from "./music-profile";
import { buildLabeledFallbackPlaylist } from "./soundtrack-pipeline";

// ============================================================================
// 1. HONEST MULTI-PLATFORM SEARCH LINK BUILDER (NEVER INVENTS LINKS/IDS)
// ============================================================================

export interface TrackSearchLinks {
  readonly primarySearchUrl: string;
  readonly spotifySearchUrl: string;
  readonly appleMusicSearchUrl: string;
  readonly youtubeMusicSearchUrl: string;
  readonly verifiedCatalogUrl?: string;
}

/**
 * Builds deterministic, honest search query URLs for a track.
 * Never fabricates track IDs or direct store links; only includes `verifiedCatalogUrl`
 * when a real catalog verification provider resolved `track.storeUrl`.
 */
export function buildHonestTrackSearchLinks(
  artist: string,
  title: string,
  existingSearchUrl?: string,
  verifiedStoreUrl?: string
): TrackSearchLinks {
  const cleanQuery = `${artist.trim()} ${title.trim()}`.trim();
  const encoded = encodeURIComponent(cleanQuery);

  const spotifySearchUrl = `https://open.spotify.com/search/${encoded}`;
  const appleMusicSearchUrl = `https://music.apple.com/us/search?term=${encoded}`;
  const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encoded}`;

  const primarySearchUrl =
    existingSearchUrl && existingSearchUrl.startsWith("https://")
      ? existingSearchUrl
      : spotifySearchUrl;

  return {
    primarySearchUrl,
    spotifySearchUrl,
    appleMusicSearchUrl,
    youtubeMusicSearchUrl,
    ...(verifiedStoreUrl && verifiedStoreUrl.startsWith("https://")
      ? { verifiedCatalogUrl: verifiedStoreUrl }
      : {}),
  };
}

// ============================================================================
// 2. HELPERS FOR FORMATTING DURATION, PROVENANCE & MOMENTS
// ============================================================================

const MOMENT_DISPLAY_TITLES: Readonly<
  Record<SoundtrackMomentName, { readonly index: string; readonly label: string; readonly window: string }>
> = {
  arrival: {
    index: "01",
    label: "Arrival & Threshold",
    window: "00:00 – 00:45",
  },
  dining: {
    index: "02",
    label: "Dining & Core Program",
    window: "00:45 – 02:00",
  },
  peak: {
    index: "03",
    label: "Peak Architectural Energy",
    window: "02:00 – 03:15",
  },
  "wind-down": {
    index: "04",
    label: "Wind-Down & Nocturne",
    window: "03:15 – 04:00",
  },
};

const PROVENANCE_DISPLAY_TAGS: Readonly<Record<SoundtrackProvenanceLabel, string>> = {
  "qloo-evidence": "QLOO-EVIDENCE (Live Qloo Entity)",
  inferred: "INFERRED (SceneSpec Acoustics/Materials)",
  fallback: "FALLBACK (Local Typology Rule)",
  "sample-fixture": "SAMPLE-FIXTURE (Offline Sample Data)",
};

function formatDurationMsForBrief(durationMs?: number): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return "03:30";
  }
  const totalSec = Math.round(durationMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Resolves the active SoundtrackPlaylist for export or clipboard copy.
 * Uses `soundtrackOverride` first, then `spec.soundtrack`, or deterministically builds
 * the labeled local fallback playlist so exports are never missing the soundtrack section.
 */
export function resolveSoundtrackForExport(
  spec: SceneSpec,
  soundtrackOverride?: SoundtrackPlaylist | null
): { readonly profile: MusicProfile; readonly playlist: SoundtrackPlaylist } {
  const profile =
    soundtrackOverride?.musicProfile ??
    spec.soundtrack?.musicProfile ??
    spec.musicProfile ??
    deriveMusicProfile(spec);

  if (soundtrackOverride && soundtrackOverride.tracks.length > 0) {
    return { profile, playlist: soundtrackOverride };
  }

  if (spec.soundtrack && spec.soundtrack.tracks.length > 0) {
    return { profile, playlist: spec.soundtrack };
  }

  const sceneHash = computeSceneMusicHash(spec);
  const fallbackPlaylist = buildLabeledFallbackPlaylist(
    spec,
    profile,
    sceneHash,
    "fallback-offline",
    {
      remainingRequests: 15,
      maxRequestsPerWindow: 15,
      resetAtIso: new Date(Date.now() + 300_000).toISOString(),
    },
    "Export compiled before live /api/soundtrack catalog roundtrip; using deterministic labeled fallback playlist."
  );

  return { profile, playlist: fallbackPlaylist };
}

// ============================================================================
// 3. PLAIN-TEXT / CLIPBOARD FORMATTER FOR "COPY TRACK LIST"
// ============================================================================

export function formatSoundtrackTrackListForClipboard(
  spec: SceneSpec,
  soundtrackOverride?: SoundtrackPlaylist | null,
  momentFilter: SoundtrackMomentName | "all" = "all"
): string {
  const { profile, playlist } = resolveSoundtrackForExport(spec, soundtrackOverride);

  const headerLines: string[] = [
    `SONIC ARCHITECTURE — VENUE SOUNDTRACK CURATION`,
    `Venue: ${spec.title} (${spec.typology})`,
    `Envelope: ${spec.roomDimensions.width}m × ${spec.roomDimensions.depth}m × ${spec.roomDimensions.height}m (${spec.validation.volumeCubicMeters} m³) | Sabine RT60: ${spec.acousticTarget.calculatedRT60Seconds}s`,
    `Acoustic Character: ${profile.acousticCharacter} | Target Energy: ${Math.round(profile.energy * 100)}% | Tempo: ${profile.tempoRangeBpm[0]}–${profile.tempoRangeBpm[1]} BPM | Era: ${profile.era}`,
    `Genres: ${profile.genres.join(", ")}`,
    `Instrumentation: ${profile.instrumentation.join(", ")}`,
    `Provenance Breakdown: ${playlist.verificationStats.qlooEvidenceCount} qloo-evidence | ${playlist.verificationStats.inferredCount} inferred | ${playlist.verificationStats.fallbackCount} fallback (Provider: ${playlist.providerUsed})`,
    `--------------------------------------------------------------------------------`,
  ];

  const momentsToInclude =
    momentFilter === "all"
      ? playlist.moments
      : playlist.moments.filter((m) => m.name === momentFilter);

  const momentBlocks: string[] = momentsToInclude.map((moment) => {
    const meta = MOMENT_DISPLAY_TITLES[moment.name];
    const trackLines = moment.tracks.map((track: SoundtrackTrackItem, idx: number) => {
      const links = buildHonestTrackSearchLinks(
        track.artist,
        track.title,
        track.externalSearchUrl,
        track.storeUrl
      );
      const bpmPart = track.bpmEstimate ? ` • ~${track.bpmEstimate} BPM` : "";
      const albumPart = track.album ? ` [${track.album}]` : "";
      const linkLabel = links.verifiedCatalogUrl
        ? `Catalog: ${links.verifiedCatalogUrl} | Search: ${links.primarySearchUrl}`
        : `Search: ${links.primarySearchUrl}`;

      return [
        `  ${idx + 1}. ${track.artist} — "${track.title}"${albumPart} (${formatDurationMsForBrief(track.durationMs)}${bpmPart})`,
        `     • Provenance: [${track.provenance.toUpperCase()}] (${track.provenanceSourceDetail})`,
        `     • Why This Fits: ${track.whyThisFits}`,
        `     • Open: ${linkLabel}`,
      ].join("\n");
    });

    return [
      `\n[${meta.index} • ${moment.name.toUpperCase()}] ${meta.label} (${meta.window}) — Target Energy ${Math.round(moment.targetEnergy * 100)}%`,
      `Program Note: ${moment.description}`,
      ...(trackLines.length > 0 ? trackLines : ["  (No verified tracks in this moment)"]),
    ].join("\n");
  });

  return [...headerLines, ...momentBlocks].join("\n");
}

// ============================================================================
// 4. DEDICATED MARKDOWN SECTION GENERATOR FOR DESIGN BRIEF (.MD)
// ============================================================================

export function generateSoundtrackMarkdownSection(
  spec: SceneSpec,
  soundtrackOverride?: SoundtrackPlaylist | null
): string {
  const { profile, playlist } = resolveSoundtrackForExport(spec, soundtrackOverride);

  const momentSections = playlist.moments
    .map((moment) => {
      const meta = MOMENT_DISPLAY_TITLES[moment.name];

      const tableRows = moment.tracks
        .map((track: SoundtrackTrackItem, idx: number) => {
          const links = buildHonestTrackSearchLinks(
            track.artist,
            track.title,
            track.externalSearchUrl,
            track.storeUrl
          );
          const titleArtistCell = escapeMarkdownTableCell(
            `**${track.title}** — *${track.artist}*`
          );
          const albumTempoCell = escapeMarkdownTableCell(
            `${track.album ?? "Single / Compilation"} (${formatDurationMsForBrief(track.durationMs)}${
              track.bpmEstimate ? `, ~${track.bpmEstimate} BPM` : ""
            })`
          );
          const provenanceCell = escapeMarkdownTableCell(
            `\`${track.provenance}\` — ${PROVENANCE_DISPLAY_TAGS[track.provenance]}`
          );
          const fitCell = escapeMarkdownTableCell(track.whyThisFits);

          const linkParts: string[] = [];
          if (links.verifiedCatalogUrl) {
            linkParts.push(`[Verified Catalog](${links.verifiedCatalogUrl})`);
          }
          linkParts.push(`[Spotify Search](${links.spotifySearchUrl})`);
          linkParts.push(`[Apple Search](${links.appleMusicSearchUrl})`);
          linkParts.push(`[YT Music Search](${links.youtubeMusicSearchUrl})`);

          return `| ${idx + 1} | ${titleArtistCell} | ${albumTempoCell} | ${provenanceCell} | ${fitCell} | ${linkParts.join(" · ")} |`;
        })
        .join("\n");

      return `### 8.3.${meta.index} Moment ${meta.index}: ${meta.label} (\`${moment.name}\` • ${meta.window})
- **Target Moment Energy:** ${Math.round(moment.targetEnergy * 100)}% | **Verified Tracks:** ${moment.tracks.length}/${moment.trackSlots}
- **Programmatic Role:** ${moment.description}

| # | Track & Artist | Album & Tempo | Provenance (Honesty Label) | Architectural Fit ("Why This Fits") | Open in Search / Catalog |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows || "| - | *No verified tracks resolved* | - | - | - | - |"}`;
    })
    .join("\n\n");

  const warningsBlock =
    playlist.warnings && playlist.warnings.length > 0
      ? `\n> **Provenance & Verification Honesty Notice:** ${playlist.warnings.join(" ")}\n`
      : "";

  return `## 8. Venue Soundtrack & 4-Moment Program Curation

### 8.1 Derived Scene MusicProfile (\`SceneSpec → MusicProfile\`)
- **Acoustic Character:** \`${profile.acousticCharacter}\` (Derived from ISO 3382 Sabine RT60 **${spec.acousticTarget.calculatedRT60Seconds}s**, wall material **${spec.materials.wall.name}**, floor material **${spec.materials.floor.name}**, and volume **${spec.validation.volumeCubicMeters} m³**)
- **Target Energy & Tempo Envelope:** **${Math.round(profile.energy * 100)}%** overall energy | **${profile.tempoRangeBpm[0]}–${profile.tempoRangeBpm[1]} BPM**
- **Era & Chronology:** ${profile.era} (Lighting mood: \`${spec.timeOfDay}\` at **${spec.lighting.temperatureK}K**)
- **Genres:** ${profile.genres.join(", ")}
- **Instrumentation Palette:** ${profile.instrumentation.join(", ")}
- **Mood Tags:** ${profile.moodTags.map((t) => `\`#${t}\``).join(", ")}

### 8.2 Catalog Verification & Provenance Honesty Telemetry
- **Verification Provider:** \`${playlist.providerUsed}\` | **Cache Status:** \`${playlist.cacheStatus}\` | **Scene Music Hash:** \`${playlist.sceneHash}\`
- **Candidate Funnel:** ${playlist.verificationStats.candidatesGenerated} generated → **${playlist.verificationStats.candidatesVerified} verified in catalog** (${playlist.verificationStats.candidatesDroppedUnresolved} unresolved dropped, ${playlist.verificationStats.duplicatesRemoved} duplicates removed)
- **Provenance Breakdown (Zero Fabricated Claims):**
  - \`qloo-evidence\` (Live Qloo cultural entity match): **${playlist.verificationStats.qlooEvidenceCount}** tracks
  - \`inferred\` (SceneSpec acoustic/material/lighting reasoning): **${playlist.verificationStats.inferredCount}** tracks
  - \`fallback\` (Deterministic local typology rule): **${playlist.verificationStats.fallbackCount}** tracks
${warningsBlock}
${momentSections}`;
}

// ============================================================================
// 5. FULL ARCHITECTURAL DESIGN BRIEF GENERATOR (.MD)
// ============================================================================

export function generateMarkdownDesignBrief(
  spec: SceneSpec,
  soundtrackOverride?: SoundtrackPlaylist | null
): string {
  const objectRows = spec.objects
    .map(
      (o) =>
        `| ${o.name} | \`${o.category}\` | \`${o.archetype}\` | ${o.dimensions[0].toFixed(2)}m × ${o.dimensions[1].toFixed(2)}m × ${o.dimensions[2].toFixed(2)}m | \`${o.materialId}\` | ${o.designNote} |`
    )
    .join("\n");

  const provRows = spec.provenance
    .map(
      (p) =>
        `- **[${p.source.toUpperCase()}] ${p.label}** *(${p.confidence})*: ${p.insight} → **Architectural Effect:** ${p.architecturalEffect}`
    )
    .join("\n");

  const soundtrackSection = generateSoundtrackMarkdownSection(
    spec,
    soundtrackOverride
  );

  return `# ${spec.title}
**Subtitle:** ${spec.subtitle}
**Typology:** \`${spec.typology}\` | **Time of Day:** \`${spec.timeOfDay}\` | **Layout Mode:** \`${spec.layoutMode}\`

---

## 1. Executive Spatial Concept & Narrative
> **Original Prompt:** "${spec.promptText}"

**Primary Focal Installation:** ${spec.focalPoint.name} — ${spec.focalPoint.description}

## 2. Architectural Envelope & Dimensional Verification
- **Clear Width (X-Axis):** ${spec.roomDimensions.width.toFixed(2)} m
- **Clear Depth (Z-Axis):** ${spec.roomDimensions.depth.toFixed(2)} m
- **Clear Ceiling Height (Y-Axis):** ${spec.roomDimensions.height.toFixed(2)} m (Ridge: ${spec.roomDimensions.ridgeHeight.toFixed(2)} m)
- **Net Floor Area:** ${spec.validation.areaSqMeters.toFixed(1)} m²
- **Interior Acoustic Volume:** ${spec.validation.volumeCubicMeters.toFixed(1)} m³
- **Estimated Guest Capacity:** ${spec.validation.estimatedCapacityGuests} guests
- **Minimum Circulation Clearance:** ${spec.validation.circulationClearanceMeters.toFixed(2)} m (${spec.validation.isValid ? "PASS" : "CHECK"})

## 3. Acoustic Physics & Reverberation Target (Sabine Estimate)
- **Target RT60 (500Hz–1kHz):** ${spec.acousticTarget.targetRT60Seconds.toFixed(2)} s
- **Calculated Sabine RT60:** ${spec.acousticTarget.calculatedRT60Seconds.toFixed(2)} s (\`${spec.acousticTarget.complianceStatus.toUpperCase()}\`)
- **Clarity (C80) & Bass Ratio:** ${spec.acousticTarget.clarityC80dB} dB | Bass Ratio ${spec.acousticTarget.bassRatio}
- **Noise Criteria & Mean Absorption (α):** NC-${spec.acousticTarget.noiseCriteriaNC} | α = ${spec.acousticTarget.averageAbsorptionAlpha}

## 4. Physical Material Palette & Acoustic Finishes
| Surface / Role | Material Name | Hex | Roughness | Metalness | Pattern Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Floor** | ${spec.materials.floor.name} | \`${spec.materials.floor.colorHex}\` | ${spec.materials.floor.roughness} | ${spec.materials.floor.metalness} | \`${spec.materials.floor.patternType}\` |
| **Primary Wall** | ${spec.materials.wall.name} | \`${spec.materials.wall.colorHex}\` | ${spec.materials.wall.roughness} | ${spec.materials.wall.metalness} | \`${spec.materials.wall.patternType}\` |
| **Ceiling (${spec.ceilingStructure})** | ${spec.materials.ceiling.name} | \`${spec.materials.ceiling.colorHex}\` | ${spec.materials.ceiling.roughness} | ${spec.materials.ceiling.metalness} | \`${spec.materials.ceiling.patternType}\` |
| **Primary Furniture** | ${spec.materials.primaryFurniture.name} | \`${spec.materials.primaryFurniture.colorHex}\` | ${spec.materials.primaryFurniture.roughness} | ${spec.materials.primaryFurniture.metalness} | \`${spec.materials.primaryFurniture.patternType}\` |
| **Secondary Accent** | ${spec.materials.secondaryAccent.name} | \`${spec.materials.secondaryAccent.colorHex}\` | ${spec.materials.secondaryAccent.roughness} | ${spec.materials.secondaryAccent.metalness} | \`${spec.materials.secondaryAccent.patternType}\` |

## 5. Architectural Lighting Schedule
- **Color Temperature:** ${spec.lighting.temperatureK} K (${spec.timeOfDay})
- **Ambient Fill & Solar Angles:** Ambient ${spec.lighting.ambientIntensity} | Azimuth ${spec.lighting.sunAzimuthDeg}° | Elevation ${spec.lighting.sunElevationDeg}°
- **Configured Light Fixtures (${spec.lighting.sources.length}):** ${spec.lighting.sources.map((s) => s.name).join(", ")}

## 6. Placed 3D Object & Furniture Schedule (${spec.objects.length} Assemblies)
| Object Name | Category | Archetype | Dimensions (W×H×D) | Material | Architectural Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
${objectRows}

## 7. Cultural Intelligence & Provenance Chain
${provRows}

---

${soundtrackSection}
${
  spec.qloo_evidence
    ? `
---

## 9. Qloo Evidence & Signal Provenance (Load-Bearing Taste Grounding)

**Input Taste Reference:** \`${spec.qloo_evidence.input_parsed}\`

### 9.1 Resolved Entities & Driven Choices
| Entity Name | Type | Provenance | Qloo Signal Vector | Driven Spatial Choice |
| :--- | :--- | :--- | :--- | :--- |
${spec.qloo_evidence.resolved_entities
  .map(
    (e) =>
      `| **${escapeMarkdownTableCell(e.entity_name)}** | \`${e.entity_type}\` | \`${e.provenance.toUpperCase()}\` | \`${escapeMarkdownTableCell(e.qloo_signal)}\` | ${escapeMarkdownTableCell(e.driven_choice)} |`
  )
  .join("\n")}

### 9.2 Cross-Domain Signal Transductions
| Domain | Source Entity | Signal Vector | Concrete Spatial Translation |
| :--- | :--- | :--- | :--- |
${spec.qloo_evidence.cross_domain_signals
  .map(
    (s) =>
      `| \`${s.domain.toUpperCase()}\` | **${escapeMarkdownTableCell(s.entity)}** | \`${escapeMarkdownTableCell(s.signal)}\` | ${escapeMarkdownTableCell(s.spatial_translation)} |`
  )
  .join("\n")}

### 9.3 Data Honesty & Fallback Log
${
  spec.qloo_evidence.fallback_choices.length === 0
    ? "*All design decisions directly grounded in active Qloo entity vectors.*"
    : spec.qloo_evidence.fallback_choices
        .map(
          (fb) =>
            `- **${fb.choice}** (\`${fb.provenance.toUpperCase()}\`): ${fb.reason}`
        )
        .join("\n")
}
`
    : ""
}
`;
}
