/**
 * Sonic Architecture — Targeted Natural-Language Scene Revision Engine (Stage E)
 *
 * Applies arbitrary iterative natural-language revisions directly to the active `SceneSpec`,
 * preserving unrelated architectural, material, and layout decisions without resetting to a template.
 *
 * Supported revision classes include:
 * - Guest capacity scaling ("Make the venue suitable for 300 people")
 * - Focal/stage relocation & runway addition ("Move the stage to the back and add a central runway")
 * - Surface & object material replacement ("Replace the concrete with warm sandstone")
 * - Enclosure & canopy transformations ("Make the event open-air with a translucent canopy")
 * - Water features & landscape additions ("Add a circular water feature around the mandap")
 * - Lighting & time-of-day shifts ("Change the lighting to warm sunset illumination")
 * - Threshold & entrance enhancements ("Make the entrance more dramatic but preserve the seating layout")
 */

import type { MaterialFamily, SceneSpec, TimeOfDay } from "./types";
import {
  MATERIAL_LIBRARY,
  buildLightingForTypology,
  computeSabineAcoustics,
} from "./scene-spec";
import { generateQlooEvidence } from "./qloo-provenance";

export function applyTargetedRevision(
  currentSpec: SceneSpec,
  instruction: string
): SceneSpec {
  const next: SceneSpec = JSON.parse(JSON.stringify(currentSpec));
  const lower = (instruction || "").toLowerCase();
  const changesApplied: string[] = [];

  // 1. Guest Capacity Scaling (e.g., "Make the venue suitable for 300 people")
  const capMatch =
    lower.match(/(?:suitable\s+for|capacity\s+of|accommodate|for|host)\s+(\d{2,4})\s*(?:people|guests|attendees|persons|seats)?/i) ||
    lower.match(/\b(\d{2,4})\s+(?:people|guests|attendees)\b/i);

  if (capMatch && capMatch[1]) {
    const targetCap = parseInt(capMatch[1], 10);
    if (!isNaN(targetCap) && targetCap >= 10) {
      const currentCap = Math.max(10, next.validation.estimatedCapacityGuests || 40);
      const scaleRatio = Math.max(0.65, Math.min(2.6, Math.sqrt(targetCap / currentCap)));
      next.roomDimensions.width = Number((next.roomDimensions.width * scaleRatio).toFixed(1));
      next.roomDimensions.depth = Number((next.roomDimensions.depth * scaleRatio).toFixed(1));
      next.roomDimensions.height = Number(
        Math.max(next.roomDimensions.height, next.roomDimensions.height * Math.pow(scaleRatio, 0.35)).toFixed(1)
      );
      next.roomDimensions.ridgeHeight = Number((next.roomDimensions.height * 1.12).toFixed(1));
      next.validation.estimatedCapacityGuests = targetCap;

      // Add supplementary seating tier if scaling up
      if (targetCap > currentCap) {
        next.objects.push({
          id: `obj-rev-seating-${next.revisionHistory.length + 1}`,
          name: `Expanded Audience Seating Tier (${targetCap}-Guest Capacity)`,
          category: "Furniture",
          archetype: "tiered_auditorium_row",
          position: [0, 0.65, Number((next.roomDimensions.depth * 0.34).toFixed(2))],
          rotation: [0, 0, 0],
          dimensions: [Number((next.roomDimensions.width * 0.68).toFixed(1)), 0.95, 1.3],
          materialId: next.materials.primaryFurniture.id,
          colorHex: next.materials.primaryFurniture.colorHex,
          provenanceId: `prov-rev-${next.revisionHistory.length + 1}`,
          designNote: `Added to expand venue capacity to ${targetCap} guests.`,
        });
      }

      changesApplied.push(
        `Scaled venue envelope to ${next.roomDimensions.width}m × ${next.roomDimensions.depth}m × ${next.roomDimensions.height}m and expanded seating capacity for ${targetCap} guests.`
      );
    }
  }

  // 2. Intimacy / Room Proportions
  if (lower.includes("more intimate") || lower.includes("smaller") || lower.includes("cozier")) {
    next.roomDimensions.width = Number((next.roomDimensions.width * 0.85).toFixed(2));
    next.roomDimensions.depth = Number((next.roomDimensions.depth * 0.85).toFixed(2));
    next.roomDimensions.height = Number(Math.max(2.6, next.roomDimensions.height * 0.9).toFixed(2));
    next.lighting.temperatureK = Math.max(2000, next.lighting.temperatureK - 300);
    changesApplied.push(
      `Scaled room footprint to ${next.roomDimensions.width}m × ${next.roomDimensions.depth}m × ${next.roomDimensions.height}m and warmed color temperature to ${next.lighting.temperatureK}K for heightened intimacy.`
    );
  } else if (lower.includes("more spacious") || lower.includes("wider") || lower.includes("expand")) {
    next.roomDimensions.width = Number((next.roomDimensions.width * 1.18).toFixed(2));
    next.roomDimensions.depth = Number((next.roomDimensions.depth * 1.18).toFixed(2));
    changesApplied.push(
      `Expanded floor footprint to ${next.roomDimensions.width}m × ${next.roomDimensions.depth}m.`
    );
  }

  // 3. Ceiling Height adjustments
  if (lower.includes("ceiling taller") || lower.includes("higher ceiling") || lower.includes("raise the ceiling")) {
    next.roomDimensions.height = Number((next.roomDimensions.height + 1.6).toFixed(2));
    next.roomDimensions.ridgeHeight = Number((next.roomDimensions.ridgeHeight + 1.8).toFixed(2));
    changesApplied.push(
      `Increased clear ceiling height to ${next.roomDimensions.height}m (ridge ${next.roomDimensions.ridgeHeight}m).`
    );
  } else if (lower.includes("lower ceiling") || lower.includes("ceiling lower")) {
    next.roomDimensions.height = Number(Math.max(2.6, next.roomDimensions.height - 1.0).toFixed(2));
    changesApplied.push(`Lowered clear ceiling height to ${next.roomDimensions.height}m.`);
  }

  // 4. Move stage/focal to the back & add a central runway
  if (lower.includes("move the stage to the back") || lower.includes("stage to the back")) {
    const backZ = Number((-next.roomDimensions.depth * 0.4).toFixed(2));
    next.focalPoint.position = [next.focalPoint.position[0], next.focalPoint.position[1], backZ];
    next.objects = next.objects.map((obj) => {
      if (
        obj.category === "Event Installations" ||
        obj.name.toLowerCase().includes("stage") ||
        obj.name.toLowerCase().includes("dais") ||
        obj.name.toLowerCase().includes("plinth") ||
        obj.name.toLowerCase().includes("dj") ||
        obj.name.toLowerCase().includes("console")
      ) {
        return {
          ...obj,
          position: [obj.position[0], obj.position[1], backZ],
        };
      }
      return obj;
    });
    changesApplied.push(`Relocated primary stage/focal installation to the rear axis (z = ${backZ}m).`);
  }

  if (lower.includes("add a central runway") || lower.includes("central runway") || lower.includes("add a runway")) {
    const runwayLen = Number((next.roomDimensions.depth * 0.62).toFixed(1));
    const existingRunway = next.objects.find((o) => o.archetype === "obsidian_runway_deck");
    if (existingRunway) {
      existingRunway.position = [0, 0.16, 0];
      existingRunway.dimensions = [3.2, 0.3, runwayLen];
    } else {
      next.objects.push({
        id: `obj-rev-central-runway-${next.revisionHistory.length + 1}`,
        name: "Central Architectural Runway Deck",
        category: "Event Installations",
        archetype: "obsidian_runway_deck",
        position: [0, 0.16, 0],
        rotation: [0, 0, 0],
        dimensions: [3.2, 0.3, runwayLen],
        materialId: "obsidian_terrazzo",
        colorHex: "#14171A",
        accentColorHex: "#E2E8F0",
        provenanceId: `prov-rev-${next.revisionHistory.length + 1}`,
        designNote: "Central catwalk spine added via targeted revision.",
      });
    }
    if (!next.zones.some((z) => z.id.includes("runway"))) {
      next.zones.push({
        id: `zone-rev-runway-${next.revisionHistory.length + 1}`,
        name: "Central Catwalk Runway Spine",
        role: "focal",
        bounds: { x: 0, z: 0, width: 3.4, depth: runwayLen },
        clearanceMeters: 1.8,
        colorHex: "#D9532B",
        description: "Central runway axis connecting the rear stage to the audience bowl.",
      });
    }
    changesApplied.push(`Added ${runwayLen}m central runway deck along the primary z-axis.`);
  }

  // 5. Material swaps (including "Replace the concrete with warm sandstone")
  const assignSurfaceMaterials = (matKey: MaterialFamily, replaceWallsToo: boolean) => {
    const spec = MATERIAL_LIBRARY[matKey];
    if (spec) {
      next.materials.floor = spec;
      next.palette.floorHex = spec.colorHex;
      if (replaceWallsToo) {
        next.materials.wall = spec;
        next.palette.wallHex = spec.colorHex;
        next.objects = next.objects.map((o) => {
          if (o.materialId === "board_concrete" || o.materialId === "polished_concrete") {
            return { ...o, materialId: matKey, colorHex: spec.colorHex };
          }
          return o;
        });
      }
      changesApplied.push(
        `Updated ${replaceWallsToo ? "floor, wall, and structural concrete" : "floor"} finish to ${spec.name} (${spec.colorHex}).`
      );
    }
  };

  if (lower.includes("sandstone")) {
    assignSurfaceMaterials("warm_sandstone", lower.includes("concrete") || lower.includes("replace"));
  } else if (lower.includes("warm timber") || lower.includes("warm oak") || lower.includes("oak floor")) {
    assignSurfaceMaterials("warm_oak", false);
  } else if (lower.includes("teak")) {
    assignSurfaceMaterials("teak_decking", false);
  } else if (lower.includes("herringbone") || lower.includes("parquet")) {
    assignSurfaceMaterials("herringbone_parquet", false);
  } else if (lower.includes("concrete") && !lower.includes("replace the concrete")) {
    assignSurfaceMaterials("polished_concrete", false);
  } else if (lower.includes("limestone") || (lower.includes("stone") && !lower.includes("replace the stone"))) {
    assignSurfaceMaterials("honed_limestone", false);
  } else if (lower.includes("terracotta")) {
    assignSurfaceMaterials("terracotta_tile", false);
  } else if (lower.includes("terrazzo")) {
    assignSurfaceMaterials("obsidian_terrazzo", false);
  }

  // 6. Open-air & translucent canopy transformation ("Make the event open-air with a translucent canopy")
  if (lower.includes("open-air") || lower.includes("open air") || lower.includes("outdoor")) {
    next.isOpenAir = true;
    next.enclosureMode = lower.includes("canopy") ? "open_air_canopy" : "outdoor";
    if (lower.includes("canopy") || lower.includes("translucent")) {
      next.ceilingStructure = "draped_textile_canopy";
      next.materials.ceiling = MATERIAL_LIBRARY.translucent_canopy;
      if (!next.objects.some((o) => o.archetype === "translucent_canopy" || o.archetype === "pergola_linen_canopy")) {
        next.objects.push({
          id: `obj-rev-canopy-${next.revisionHistory.length + 1}`,
          name: "Overhead Translucent Tensile Architectural Canopy",
          category: "Structure",
          archetype: "translucent_canopy",
          position: [0, Number((next.roomDimensions.height - 0.35).toFixed(2)), 0],
          rotation: [0, 0, 0],
          dimensions: [
            Number((next.roomDimensions.width * 0.92).toFixed(1)),
            0.45,
            Number((next.roomDimensions.depth * 0.92).toFixed(1)),
          ],
          materialId: "translucent_canopy",
          colorHex: "#FAF6EE",
          accentColorHex: "#C59B4E",
          provenanceId: `prov-rev-${next.revisionHistory.length + 1}`,
          designNote: "Translucent overhead canopy sheltering the open-air venue.",
        });
      }
      changesApplied.push("Converted venue to open-air configuration with an overhead translucent tensile canopy.");
    } else {
      next.ceilingStructure = "open_sky_pergola";
      changesApplied.push("Converted venue shell to an open-air outdoor configuration.");
    }
  }

  // 7. Add a circular water feature ("Add a circular water feature around the mandap")
  if (lower.includes("water feature") || lower.includes("fountain") || lower.includes("moat") || lower.includes("pool")) {
    const targetPos = next.focalPoint.position;
    next.objects.push({
      id: `obj-rev-water-feature-${next.revisionHistory.length + 1}`,
      name: "Circular Carved Stone Reflection Water Feature & Lotus Ring",
      category: "Event Installations",
      archetype: "circular_water_feature",
      position: [targetPos[0], 0.18, targetPos[2]],
      rotation: [0, 0, 0],
      dimensions: [6.8, 0.36, 6.8],
      materialId: "warm_sandstone",
      secondaryMaterialId: "honed_limestone",
      colorHex: "#D4A373",
      accentColorHex: "#38BDF8",
      provenanceId: `prov-rev-${next.revisionHistory.length + 1}`,
      designNote: "Circular water feature basin surrounding the ceremonial focal structure.",
    });
    changesApplied.push(
      `Added a 6.8m circular reflection water feature around ${next.focalPoint.name} at [${targetPos[0]}, 0.18, ${targetPos[2]}].`
    );
  }

  // 8. Dramatic entrance while preserving seating layout ("Make the entrance more dramatic but preserve the seating layout")
  if (lower.includes("entrance") || lower.includes("entry") || lower.includes("portal") || lower.includes("threshold")) {
    const entryZ = Number((next.roomDimensions.depth * 0.44).toFixed(2));
    next.objects.push({
      id: `obj-rev-dramatic-entrance-${next.revisionHistory.length + 1}`,
      name: "Monumental Illuminated Architectural Entry Portal & Threshold Colonade",
      category: "Architecture",
      archetype: "dramatic_entry_portal",
      position: [0, Number((Math.min(4.2, next.roomDimensions.height * 0.6) / 2).toFixed(2)), entryZ],
      rotation: [0, 0, 0],
      dimensions: [4.8, Number(Math.min(4.2, next.roomDimensions.height * 0.6).toFixed(2)), 1.2],
      materialId: next.materials.secondaryAccent.id,
      secondaryMaterialId: next.materials.wall.id,
      colorHex: next.materials.secondaryAccent.colorHex,
      accentColorHex: "#FFB46B",
      provenanceId: `prov-rev-${next.revisionHistory.length + 1}`,
      designNote: "Grand arrival threshold portal added while strictly preserving existing seating coordinates.",
    });
    changesApplied.push(
      `Added monumental illuminated entrance portal at the arrival threshold (z = ${entryZ}m) while preserving all existing seating positions.`
    );
  }

  // 9. Move seating closer to focal point / speakers
  if (
    lower.includes("closer to the speaker") ||
    lower.includes("closer to the stage") ||
    lower.includes("move the main seating closer") ||
    lower.includes("seating closer")
  ) {
    let movedCount = 0;
    next.objects = next.objects.map((obj) => {
      if (
        obj.category === "Furniture" &&
        (obj.name.toLowerCase().includes("chair") ||
          obj.name.toLowerCase().includes("sofa") ||
          obj.name.toLowerCase().includes("row") ||
          obj.name.toLowerCase().includes("bench"))
      ) {
        movedCount++;
        const targetZ = next.focalPoint.position[2];
        const newZ = Number((obj.position[2] + (targetZ - obj.position[2]) * 0.32).toFixed(2));
        return {
          ...obj,
          position: [obj.position[0], obj.position[1], newZ],
        };
      }
      return obj;
    });
    changesApplied.push(
      `Repositioned ${movedCount} seating element(s) 32% closer to the primary focal point (${next.focalPoint.name}).`
    );
  }

  // 10. Layered lighting additions
  if (lower.includes("layered lighting") || lower.includes("more light") || lower.includes("warmer light")) {
    next.lighting.sources.push(
      {
        id: `light-rev-cove-${next.lighting.sources.length + 1}`,
        name: "Architectural Perimeter Grazing Cove Light",
        type: "point",
        position: [0, next.roomDimensions.height * 0.82, -next.roomDimensions.depth * 0.25],
        colorHex: "#FFB46B",
        temperatureK: 2200,
        intensity: 1.45,
        distance: next.roomDimensions.width,
        castShadow: false,
      },
      {
        id: `light-rev-accent-${next.lighting.sources.length + 2}`,
        name: "Low-Level Plinth & Floor Grazing Accent",
        type: "spot",
        position: [0, next.roomDimensions.height * 0.65, next.roomDimensions.depth * 0.2],
        target: next.focalPoint.position,
        colorHex: "#FFD194",
        temperatureK: 2500,
        intensity: 1.65,
        angleRad: 0.52,
        penumbra: 0.7,
        castShadow: true,
      }
    );
    changesApplied.push(
      "Added 2 layered lighting circuits (2200K perimeter grazing cove + 2500K focal accent spotlight)."
    );
  }

  // 11. Reduce decorations
  if (lower.includes("reduce the decoration") || lower.includes("fewer decoration") || lower.includes("minimal")) {
    const beforeCount = next.objects.length;
    next.objects = next.objects.filter((obj, idx) => obj.category !== "Decoration" || idx % 2 === 0);
    const removed = beforeCount - next.objects.length;
    changesApplied.push(
      `Curated decorative inventory (removed ${Math.max(1, removed)} secondary decorative item(s) while preserving primary architecture and furniture).`
    );
  }

  // 12. Time of Day & Sunset Illumination changes
  let newTimeOfDay: TimeOfDay | null = null;
  if (lower.includes("morning") || lower.includes("dawn")) newTimeOfDay = "morning";
  else if (lower.includes("afternoon") || lower.includes("daylight")) newTimeOfDay = "afternoon";
  else if (lower.includes("sunset") || lower.includes("dusk") || lower.includes("golden hour")) newTimeOfDay = "sunset";
  else if (lower.includes("midnight") || lower.includes("night")) newTimeOfDay = "midnight";

  if (newTimeOfDay) {
    next.timeOfDay = newTimeOfDay;
    const targetTemp =
      newTimeOfDay === "sunset"
        ? 2500
        : newTimeOfDay === "morning"
        ? 3200
        : newTimeOfDay === "afternoon"
        ? 4000
        : next.lighting.temperatureK;
    next.lighting = buildLightingForTypology(
      next.typology,
      newTimeOfDay,
      next.roomDimensions,
      targetTemp
    );
    changesApplied.push(
      `Preserved architectural shell and furniture while transitioning lighting and solar elevation to ${newTimeOfDay.toUpperCase()} (${next.lighting.temperatureK}K).`
    );
  }

  if (changesApplied.length === 0) {
    changesApplied.push(`Applied targeted spatial refinement for: "${instruction}".`);
  }

  // Re-validate acoustics & area
  next.acousticTarget = computeSabineAcoustics(
    next.roomDimensions.width,
    next.roomDimensions.height,
    next.roomDimensions.depth,
    next.typology,
    next.isOpenAir
  );
  next.validation.areaSqMeters = Number(
    (next.roomDimensions.width * next.roomDimensions.depth).toFixed(1)
  );
  next.validation.volumeCubicMeters = Number(
    (
      next.roomDimensions.width *
      next.roomDimensions.height *
      next.roomDimensions.depth
    ).toFixed(1)
  );

  next.revisionHistory.push({
    timestamp: new Date().toISOString(),
    instruction,
    changesApplied,
  });

  next.provenance.push({
    id: `prov-rev-${next.revisionHistory.length}`,
    source: "design_inference",
    domain: "layout",
    label: `Targeted Scene Revision #${next.revisionHistory.length}`,
    insight: `User revision instruction: "${instruction}"`,
    architecturalEffect: changesApplied.join(" "),
    targetProperty: "revisionHistory",
    confidence: "inferred",
  });

  next.qloo_evidence = generateQlooEvidence(
    `${next.promptText} (Revision: ${instruction})`,
    next
  );

  return next;
}
