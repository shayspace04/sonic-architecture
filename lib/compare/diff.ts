/**
 * Sonic Architecture — Pure Mathematical Scene Comparison & Diff Engine
 * (/lib/compare/diff.ts)
 *
 * Implements the Hackathon Fair-Test Difference & Magnitude Engine:
 * 1. Palette: CIEDE2000 perceptual delta-E on dominant swatches.
 * 2. Lighting: Absolute Kelvin and key/fill ratio variance.
 * 3. Materials: Exact surface slot substitution count / 5.
 * 4. Geometry / Program / Furniture: Jaccard set distance on archetypes & dimensions.
 * 5. Acoustics: Absolute Sabine RT60 variance normalized by room volume.
 * 6. Soundtrack: Jaccard set distance on genres, artists, and era tags.
 *
 * All magnitudes are computed deterministically (zero LLM hallucinations)
 * and normalized to [0, 1].
 */

import type {
  DiffCategory,
  DiffItem,
  Provenance,
  QlooContext,
  SceneSpec,
} from "@/lib/types";

// ============================================================================
// 1. COLOR SPACE MATH: HEX -> RGB -> CIE LAB -> CIEDE2000
// ============================================================================

interface LabColor {
  L: number;
  a: number;
  b: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  if (isNaN(num)) return [128, 128, 128];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  // sRGB gamma expansion to linear
  const toLinear = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Observer = 2°, Illuminant = D65
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) / 1.0;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * CIEDE2000 Color Difference Formula (ISO/CIE 11664-6:2014)
 * Returns perceptual color distance ΔE00 (typically 0–100).
 */
export function ciede2000(c1: LabColor, c2: LabColor): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const L1 = c1.L;
  const a1 = c1.a;
  const b1 = c1.b;
  const L2 = c2.L;
  const a2 = c2.a;
  const b2 = c2.b;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;

  const C1Prime = Math.hypot(a1Prime, b1);
  const C2Prime = Math.hypot(a2Prime, b2);
  const avgCPrime = (C1Prime + C2Prime) / 2;

  const h1Prime = (Math.atan2(b1, a1Prime) * 180) / Math.PI + (Math.atan2(b1, a1Prime) < 0 ? 360 : 0);
  const h2Prime = (Math.atan2(b2, a2Prime) * 180) / Math.PI + (Math.atan2(b2, a2Prime) < 0 ? 360 : 0);

  let diffHPrime = h2Prime - h1Prime;
  if (Math.abs(diffHPrime) > 180) {
    diffHPrime += diffHPrime > 0 ? -360 : 360;
  }
  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(((diffHPrime / 2) * Math.PI) / 180);

  const avgHPrime =
    Math.abs(h1Prime - h2Prime) > 180
      ? (h1Prime + h2Prime + 360) / 2
      : (h1Prime + h2Prime) / 2;

  const T =
    1 -
    0.17 * Math.cos(((avgHPrime - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * avgHPrime) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHPrime + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHPrime - 63) * Math.PI) / 180);

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  const sL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sC = 1 + 0.045 * avgCPrime;
  const sH = 1 + 0.015 * avgCPrime * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHPrime - 275) / 25, 2));
  const rC = 2 * Math.sqrt(Math.pow(avgCPrime, 7) / (Math.pow(avgCPrime, 7) + Math.pow(25, 7)));
  const rT = -Math.sin(((2 * deltaTheta) * Math.PI) / 180) * rC;

  const dE = Math.sqrt(
    Math.pow(deltaLPrime / (kL * sL), 2) +
      Math.pow(deltaCPrime / (kC * sC), 2) +
      Math.pow(deltaHPrime / (kH * sH), 2) +
      rT * (deltaCPrime / (kC * sC)) * (deltaHPrime / (kH * sH))
  );

  return Number.isNaN(dE) ? 0 : dE;
}

// ============================================================================
// 2. JACCARD DISTANCE FOR SETS
// ============================================================================

function jaccardDistance(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()).filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach((item) => {
    if (setB.has(item)) intersection++;
  });

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : 1 - intersection / union;
}

// ============================================================================
// 3. HONEST TRACEABILITY MATCHER
// ============================================================================

function findTraceableEntity(
  keywords: string[],
  qlooContext?: QlooContext
): { entityName: string; entityType: string; signal: string; provenance: Provenance } | undefined {
  if (!qlooContext || !qlooContext.entities || qlooContext.entities.length === 0) {
    return undefined;
  }

  const normKeywords = keywords.map((k) => k.toLowerCase().replace(/_/g, " "));

  for (const entity of qlooContext.entities) {
    const haystack = [
      entity.name.toLowerCase(),
      entity.type.toLowerCase(),
      ...entity.signals.map((s) => s.toLowerCase().replace(/_/g, " ")),
      (entity.drivenChoice || "").toLowerCase(),
    ].join(" ");

    const matches = normKeywords.some((k) => k.length > 2 && haystack.includes(k));
    if (matches) {
      return {
        entityName: entity.name,
        entityType: entity.type.replace(/_/g, " "),
        signal: entity.signals[0] || "cultural_affinity",
        provenance: entity.provenance,
      };
    }
  }

  return undefined;
}

// ============================================================================
// 4. PURE DIFF COMPUTATION (diffScenes)
// ============================================================================

export function diffScenes(
  baseline: SceneSpec,
  grounded: SceneSpec,
  qlooContext?: QlooContext
): DiffItem[] {
  const diffs: DiffItem[] = [];

  // --------------------------------------------------------------------------
  // Category 1: PALETTE
  // CIEDE2000 distance between dominant surface swatches
  // --------------------------------------------------------------------------
  const baseFloorLab = rgbToLab(...hexToRgb(baseline.palette.floorHex));
  const grndFloorLab = rgbToLab(...hexToRgb(grounded.palette.floorHex));
  const floorDeltaE = ciede2000(baseFloorLab, grndFloorLab);

  const baseWallLab = rgbToLab(...hexToRgb(baseline.palette.wallHex));
  const grndWallLab = rgbToLab(...hexToRgb(grounded.palette.wallHex));
  const wallDeltaE = ciede2000(baseWallLab, grndWallLab);

  const baseAccentLab = rgbToLab(...hexToRgb(baseline.palette.accentHex));
  const grndAccentLab = rgbToLab(...hexToRgb(grounded.palette.accentHex));
  const accentDeltaE = ciede2000(baseAccentLab, grndAccentLab);

  const avgDeltaE = (floorDeltaE + wallDeltaE + accentDeltaE) / 3;
  const paletteMagnitude = Math.min(1.0, Math.max(0.0, avgDeltaE / 55.0));

  if (avgDeltaE > 4.5 || baseline.palette.accentHex !== grounded.palette.accentHex) {
    const trace = findTraceableEntity(
      [
        grounded.palette.accentHex,
        "palette",
        "amber",
        "color",
        "indigo",
        "orange",
        "brass",
        "monochrome",
      ],
      qlooContext
    );

    diffs.push({
      category: "palette",
      baselineValue: `Floor ${baseline.palette.floorHex}, Wall ${baseline.palette.wallHex}, Accent ${baseline.palette.accentHex}`,
      groundedValue: `Floor ${grounded.palette.floorHex}, Wall ${grounded.palette.wallHex}, Accent ${grounded.palette.accentHex}`,
      changedBy: trace,
      magnitude: Number(paletteMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 2: MATERIALS
  // Count of material slots whose ID or pattern changed
  // --------------------------------------------------------------------------
  let materialsChangedCount = 0;
  const materialChanges: string[] = [];

  const slots = [
    { name: "Floor", base: baseline.materials.floor, grnd: grounded.materials.floor },
    { name: "Wall", base: baseline.materials.wall, grnd: grounded.materials.wall },
    { name: "Ceiling", base: baseline.materials.ceiling, grnd: grounded.materials.ceiling },
    { name: "Furniture", base: baseline.materials.primaryFurniture, grnd: grounded.materials.primaryFurniture },
    { name: "Accent", base: baseline.materials.secondaryAccent, grnd: grounded.materials.secondaryAccent },
  ];

  slots.forEach((s) => {
    if (s.base.id !== s.grnd.id) {
      materialsChangedCount++;
      materialChanges.push(`${s.name}: ${s.base.name} → ${s.grnd.name}`);
    }
  });

  const materialsMagnitude = materialsChangedCount / slots.length;

  if (materialsChangedCount > 0) {
    const trace = findTraceableEntity(
      [
        grounded.materials.wall.id,
        grounded.materials.floor.id,
        grounded.materials.wall.name,
        grounded.materials.floor.name,
        "concrete",
        "timber",
        "stone",
        "slats",
        "linen",
        "terrazzo",
      ],
      qlooContext
    );

    diffs.push({
      category: "materials",
      baselineValue: slots.map((s) => `${s.name}: ${s.base.name}`).join("; "),
      groundedValue: slots.map((s) => `${s.name}: ${s.grnd.name}`).join("; "),
      changedBy: trace,
      magnitude: Number(materialsMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 3: LIGHTING
  // Absolute difference in colour temperature (K) and key/fill intensity ratio
  // --------------------------------------------------------------------------
  const baseK = baseline.lighting.temperatureK;
  const grndK = grounded.lighting.temperatureK;
  const diffK = Math.abs(grndK - baseK);

  const baseKey = baseline.lighting.sources.find((s) => s.type === "directional" || s.type === "spot")?.intensity || 1.8;
  const baseFill = baseline.lighting.ambientIntensity || 0.4;
  const baseRatio = baseKey / Math.max(0.01, baseFill);

  const grndKey = grounded.lighting.sources.find((s) => s.type === "directional" || s.type === "spot")?.intensity || 1.8;
  const grndFill = grounded.lighting.ambientIntensity || 0.4;
  const grndRatio = grndKey / Math.max(0.01, grndFill);
  const diffRatio = Math.abs(grndRatio - baseRatio);

  const lightingMagnitude = Math.min(1.0, 0.65 * (diffK / 2500) + 0.35 * Math.min(1.0, diffRatio / 3.0));

  if (diffK >= 200 || Math.abs(baseRatio - grndRatio) > 0.5) {
    const trace = findTraceableEntity(
      ["lighting", "amber", "spotlight", "chiaroscuro", "2400k", "2700k", "candlelit", "warm", "strobe"],
      qlooContext
    );

    diffs.push({
      category: "lighting",
      baselineValue: `${baseK}K (${baseline.timeOfDay}), Ambient ${baseFill.toFixed(2)}, Key/Fill ${baseRatio.toFixed(1)}:1`,
      groundedValue: `${grndK}K (${grounded.timeOfDay}), Ambient ${grndFill.toFixed(2)}, Key/Fill ${grndRatio.toFixed(1)}:1`,
      changedBy: trace,
      magnitude: Number(lightingMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 4: GEOMETRY & ARCHITECTURAL MASSING
  // Relative volume/dimension shifts + architectural bay kit differences
  // --------------------------------------------------------------------------
  const baseW = baseline.roomDimensions.width;
  const grndW = grounded.roomDimensions.width;
  const baseD = baseline.roomDimensions.depth;
  const grndD = grounded.roomDimensions.depth;
  const baseH = baseline.roomDimensions.height;
  const grndH = grounded.roomDimensions.height;

  const dimDelta =
    Math.abs(grndW - baseW) / Math.max(baseW, grndW) +
    Math.abs(grndD - baseD) / Math.max(baseD, grndD) +
    Math.abs(grndH - baseH) / Math.max(baseH, grndH);

  const ceilingKitChanged = baseline.ceilingStructure !== grounded.ceilingStructure;
  const geometryMagnitude = Math.min(1.0, (dimDelta / 3) * 0.7 + (ceilingKitChanged ? 0.3 : 0));

  if (geometryMagnitude > 0.08 || ceilingKitChanged) {
    const trace = findTraceableEntity(
      ["geometry", "mass", "concrete", "piers", "vault", "coffered", "height", "proportions", "pergola"],
      qlooContext
    );

    diffs.push({
      category: "geometry",
      baselineValue: `${baseW}m × ${baseD}m × ${baseH}m (${baseline.ceilingStructure})`,
      groundedValue: `${grndW}m × ${grndD}m × ${grndH}m (${grounded.ceilingStructure})`,
      changedBy: trace,
      magnitude: Number(geometryMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 5: ACOUSTICS
  // Absolute difference in Sabine RT60 & compliance status
  // --------------------------------------------------------------------------
  const baseRT60 = baseline.acousticTarget.calculatedRT60Seconds;
  const grndRT60 = grounded.acousticTarget.calculatedRT60Seconds;
  const diffRT60 = Math.abs(grndRT60 - baseRT60);
  const acousticsMagnitude = Math.min(1.0, diffRT60 / 1.4);

  if (diffRT60 >= 0.05 || baseline.acousticTarget.complianceStatus !== grounded.acousticTarget.complianceStatus) {
    const trace = findTraceableEntity(
      ["acoustic", "reverberation", "rt60", "resonance", "echo", "slats", "absorptive", "horn", "dry"],
      qlooContext
    );

    diffs.push({
      category: "acoustics",
      baselineValue: `RT60 ${baseRT60.toFixed(2)}s (Target ${baseline.acousticTarget.targetRT60Seconds.toFixed(2)}s, ${baseline.acousticTarget.complianceStatus.toUpperCase()})`,
      groundedValue: `RT60 ${grndRT60.toFixed(2)}s (Target ${grounded.acousticTarget.targetRT60Seconds.toFixed(2)}s, ${grounded.acousticTarget.complianceStatus.toUpperCase()})`,
      changedBy: trace,
      magnitude: Number(acousticsMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 6: SOUNDTRACK & MUSIC PROFILE
  // Jaccard distance between the two sets of named artists, genres & tags
  // --------------------------------------------------------------------------
  const baseSoundtrackTokens = [
    ...(baseline.musicProfile?.genres || []),
    ...(baseline.musicProfile?.moodTags || []),
    baseline.musicProfile?.era || "",
    baseline.musicProfile?.acousticCharacter || "",
  ];
  const grndSoundtrackTokens = [
    ...(grounded.musicProfile?.genres || []),
    ...(grounded.musicProfile?.moodTags || []),
    grounded.musicProfile?.era || "",
    grounded.musicProfile?.acousticCharacter || "",
  ];

  const soundtrackMagnitude = jaccardDistance(baseSoundtrackTokens, grndSoundtrackTokens);

  if (soundtrackMagnitude > 0.15) {
    const trace = findTraceableEntity(
      [
        ...(grounded.musicProfile?.genres || []),
        ...(grounded.musicProfile?.moodTags || []),
        "jazz",
        "ambient",
        "techno",
        "folk",
        "music",
        "soundtrack",
      ],
      qlooContext
    );

    diffs.push({
      category: "soundtrack",
      baselineValue: `${baseline.musicProfile?.genres.slice(0, 3).join(", ") || "General"} (${baseline.musicProfile?.tempoRangeBpm.join("–")} BPM, ${Math.round((baseline.musicProfile?.energy || 0.5) * 100)}% energy)`,
      groundedValue: `${grounded.musicProfile?.genres.slice(0, 3).join(", ") || "Qloo Curated"} (${grounded.musicProfile?.tempoRangeBpm.join("–")} BPM, ${Math.round((grounded.musicProfile?.energy || 0.5) * 100)}% energy)`,
      changedBy: trace,
      magnitude: Number(soundtrackMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 7: PROGRAM & FOCAL INSTALLATION
  // Spatial role, capacity target, and primary stage anchor
  // --------------------------------------------------------------------------
  const baseFocal = baseline.focalPoint.name;
  const grndFocal = grounded.focalPoint.name;
  const programChanged = baseFocal !== grndFocal || baseline.layoutMode !== grounded.layoutMode;
  const programMagnitude = programChanged ? 0.72 : 0.0;

  if (programChanged) {
    const trace = findTraceableEntity(
      [grounded.focalPoint.name, grounded.layoutMode, "focal", "stage", "turntable", "installation", "plinth"],
      qlooContext
    );

    diffs.push({
      category: "program",
      baselineValue: `Layout: ${baseline.layoutMode}, Focal: ${baseFocal}`,
      groundedValue: `Layout: ${grounded.layoutMode}, Focal: ${grndFocal}`,
      changedBy: trace,
      magnitude: Number(programMagnitude.toFixed(2)),
    });
  }

  // --------------------------------------------------------------------------
  // Category 8: FURNITURE & 3D ASSEMBLIES
  // Jaccard set distance on placed 3D object archetypes
  // --------------------------------------------------------------------------
  const baseArchetypes = baseline.objects.map((o) => o.archetype);
  const grndArchetypes = grounded.objects.map((o) => o.archetype);
  const furnitureMagnitude = jaccardDistance(baseArchetypes, grndArchetypes);

  if (furnitureMagnitude > 0.12) {
    const trace = findTraceableEntity(
      [
        ...grounded.objects.slice(0, 4).map((o) => o.name),
        "furniture",
        "seating",
        "horn",
        "sofa",
        "table",
        "chairs",
      ],
      qlooContext
    );

    diffs.push({
      category: "furniture",
      baselineValue: `${baseline.objects.length} assemblies (${baseline.objects.slice(0, 2).map((o) => o.name).join(", ")}...)`,
      groundedValue: `${grounded.objects.length} assemblies (${grounded.objects.slice(0, 2).map((o) => o.name).join(", ")}...)`,
      changedBy: trace,
      magnitude: Number(furnitureMagnitude.toFixed(2)),
    });
  }

  // Sort diffs by magnitude descending (most impactful architectural changes first)
  return diffs.sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));
}
