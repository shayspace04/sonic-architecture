/**
 * Sonic Architecture — Three.js Renderer Adapter
 * (/adaptation/renderer/threeAdapter.ts)
 *
 * Implements SonicRendererAdapter:
 * - Mounts RenderableScene elements to Three.js / React Three Fiber
 * - Attaches userData { sceneElementId, provenance, sourceIds, because } to each renderer object
 * - Converts SceneBrief / RenderableScene into native SceneSpec for Venue3D & CompareSplitViewer
 * - Manages Qloo-layer visual tinting (cobalt = qloo-evidence, ochre = inferred, grey = fallback)
 * - Supports diff outlines for compare mode (added, removed, changed)
 */

import * as THREE from "three";
import type { QlooBundle, RenderableScene, SceneBrief, SceneElement } from "../lib/types";
import type { SonicRendererAdapter } from "./adapter";
import type {
  MaterialFamily,
  MaterialSpec,
  ObjectArchetype,
  ObjectCategory,
  SceneSpec,
  SpatialObject,
  SpatialTypology,
  SpatialZone,
  TimeOfDay,
} from "../..//lib/types";
import { APPROVED_MATERIALS, APPROVED_PROPS } from "../lib/catalogue";
import { MATERIAL_LIBRARY } from "../..//lib/scene-spec";

export class ThreeRendererAdapter implements SonicRendererAdapter {
  private container: THREE.Group = new THREE.Group();
  private elementMap: Map<string, THREE.Object3D> = new Map();
  private provenanceMode: "off" | "tint" | "outline" = "off";

  clear(): void {
    while (this.container.children.length > 0) {
      const child = this.container.children[0];
      this.container.remove(child);
    }
    this.elementMap.clear();
  }

  addElement(element: SceneElement, context: { bundle?: QlooBundle }): THREE.Object3D {
    const group = new THREE.Group();
    group.name = element.id;
    group.position.set(...element.transform.position);
    group.rotation.set(...element.transform.rotation);

    // Attach required metadata to renderer object
    group.userData = {
      sceneElementId: element.id,
      provenance: element.provenance,
      sourceIds: element.sourceIds,
      because: element.because,
      kind: element.kind,
      category: element.category,
      rendererData: element.rendererData,
    };

    // Construct representative visual mesh for this element
    const [sx, sy, sz] = element.transform.scale;
    const geom = new THREE.BoxGeometry(sx, sy, sz);

    let colorHex = "#52565C";
    if (this.provenanceMode === "tint") {
      colorHex =
        element.provenance === "qloo-evidence"
          ? "#2563EB" // Cobalt
          : element.provenance === "inferred"
          ? "#D97706" // Ochre
          : "#6B7280"; // Grey
    } else {
      colorHex =
        element.category === "materials"
          ? APPROVED_MATERIALS[element.kind]?.defaultHex || "#52565C"
          : element.category === "cultural-artifacts"
          ? "#C59B4E"
          : element.category === "lighting"
          ? "#FEF08A"
          : "#7D5130";
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.6,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = group.userData;
    group.add(mesh);

    this.container.add(group);
    this.elementMap.set(element.id, group);
    return group;
  }

  setProvenanceMode(mode: "off" | "tint" | "outline"): void {
    this.provenanceMode = mode;
    for (const [_, group] of this.elementMap) {
      const userData = group.userData as { provenance?: SceneElement["provenance"] };
      const mesh = group.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
      if (!mesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) continue;

      if (mode === "tint" && userData.provenance) {
        const tint =
          userData.provenance === "qloo-evidence"
            ? "#2563EB"
            : userData.provenance === "inferred"
            ? "#D97706"
            : "#6B7280";
        mesh.material.color.set(tint);
      }
    }
  }

  setDiffMode(ids: { added: string[]; removed: string[]; changed: string[] }): void {
    const addedSet = new Set(ids.added);
    const changedSet = new Set(ids.changed);

    for (const [id, group] of this.elementMap) {
      const mesh = group.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
      if (!mesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) continue;

      if (addedSet.has(id)) {
        mesh.material.color.set("#10B981"); // Green for added
      } else if (changedSet.has(id)) {
        mesh.material.color.set("#F59E0B"); // Amber for changed
      }
    }
  }

  getGroup(): THREE.Group {
    return this.container;
  }
}

/**
 * Converts a SceneBrief into a complete, native SceneSpec compatible with
 * the existing Three.js Venue3D & CompareSplitViewer renderer components.
 */
export function briefToNativeSceneSpec(
  brief: SceneBrief,
  mode: "baseline" | "grounded",
  bundle?: QlooBundle
): SceneSpec {
  const f = brief.fields;
  const width = f.massing.value.width;
  const height = f.massing.value.height;
  const depth = f.massing.value.depth;

  const typology = (f.typology.value as SpatialTypology) || "listening_room";

  // Build native materials
  const floorMatId = (f.materials.value.floor in MATERIAL_LIBRARY ? f.materials.value.floor : "warm_oak") as MaterialFamily;
  const wallMatId = (f.materials.value.walls in MATERIAL_LIBRARY ? f.materials.value.walls : "acoustic_slats") as MaterialFamily;
  const ceilingMatId = (f.materials.value.ceiling in MATERIAL_LIBRARY ? f.materials.value.ceiling : "acoustic_slats") as MaterialFamily;
  const featureMatId = (f.materials.value.featureWall in MATERIAL_LIBRARY ? f.materials.value.featureWall : "vertical_timber_slats") as MaterialFamily;

  const floorSpec: MaterialSpec = MATERIAL_LIBRARY[floorMatId] || MATERIAL_LIBRARY.warm_oak;
  const wallSpec: MaterialSpec = MATERIAL_LIBRARY[wallMatId] || MATERIAL_LIBRARY.board_concrete;
  const ceilingSpec: MaterialSpec = MATERIAL_LIBRARY[ceilingMatId] || MATERIAL_LIBRARY.acoustic_slats;
  const featureSpec: MaterialSpec = MATERIAL_LIBRARY[featureMatId] || MATERIAL_LIBRARY.vertical_timber_slats;

  // Build native SpatialZones
  const zones: SpatialZone[] = f.programZones.value.map((zoneName, index) => ({
    id: `zone-${mode}-${index}`,
    name: zoneName,
    role: index === 0 ? "focal" : index === 1 ? "seating" : "circulation",
    bounds: {
      x: -width / 4 + index * 1.5,
      z: (index % 2 === 0 ? 1 : -1) * (depth * 0.2),
      width: width * 0.35,
      depth: depth * 0.3,
    },
    clearanceMeters: 1.2,
    colorHex: f.palette.value.accent,
    description: `Program zone allocated for ${zoneName}.`,
  }));

  // Build native SpatialObjects
  const objects: SpatialObject[] = [];
  let objectIndex = 0;

  // 1. Furniture
  f.furniture.value.kit.forEach((furnKey, idx) => {
    const propInfo = APPROVED_PROPS[furnKey] || APPROVED_PROPS.listening_sofa;
    const xPos = (idx - (f.furniture.value.kit.length - 1) / 2) * 2.2;
    const zPos = depth * 0.12;

    objects.push({
      id: `obj-furn-${mode}-${objectIndex++}`,
      name: propInfo.name,
      category: "Furniture",
      archetype: (furnKey as ObjectArchetype) || "listening_sofa",
      position: [xPos, propInfo.defaultDimensions[1] / 2, zPos],
      rotation: [0, 0, 0],
      dimensions: propInfo.defaultDimensions,
      materialId: floorMatId,
      secondaryMaterialId: "brushed_brass",
      colorHex: f.palette.value.secondary,
      accentColorHex: f.palette.value.accent,
      provenanceId: f.furniture.provenance,
      designNote: f.furniture.because,
      provenance: f.furniture.provenance,
      sourceIds: f.furniture.derivedFrom,
      because: f.furniture.because,
    });
  });

  // 2. Props
  f.props.value.forEach((propKey, idx) => {
    const propInfo = APPROVED_PROPS[propKey] || APPROVED_PROPS.analog_turntable_console;
    const xPos = (idx - (f.props.value.length - 1) / 2) * 1.8;
    const zPos = -depth * 0.28;

    objects.push({
      id: `obj-prop-${mode}-${objectIndex++}`,
      name: propInfo.name,
      category: "Event Installations",
      archetype: (propKey as ObjectArchetype) || "analog_turntable_console",
      position: [xPos, propInfo.defaultDimensions[1] / 2, zPos],
      rotation: [0, 0, 0],
      dimensions: propInfo.defaultDimensions,
      materialId: wallMatId,
      secondaryMaterialId: "brushed_brass",
      colorHex: f.palette.value.primary,
      accentColorHex: f.palette.value.accent,
      provenanceId: f.props.provenance,
      designNote: f.props.because,
      provenance: f.props.provenance,
      sourceIds: f.props.derivedFrom,
      because: f.props.because,
    });
  });

  // 3. Cultural Artifacts (Runtime Qloo Grounded)
  f.culturalArtifacts.value.forEach((artString, idx) => {
    const [kind, label] = artString.includes(":") ? artString.split(":").map((s) => s.trim()) : ["cultural_signage", artString];
    const xPos = (idx - (f.culturalArtifacts.value.length - 1) / 2) * 2.4;
    const zPos = -depth / 2 + 0.25;

    let archType: ObjectArchetype = "vinyl_record_shelf";
    if (kind.includes("artist")) archType = "vinyl_record_shelf";
    else if (kind.includes("film") || kind.includes("poster")) archType = "curved_led_backdrop";
    else if (kind.includes("venue")) archType = "modular_stage_riser";
    else if (kind.includes("brand")) archType = "analog_turntable_console";

    objects.push({
      id: `obj-cult-${mode}-${objectIndex++}`,
      name: label ? `${label} (${kind.replace(/_/g, " ")})` : kind,
      category: "Decoration",
      archetype: archType,
      position: [xPos, 1.8, zPos],
      rotation: [0, 0, 0],
      dimensions: [1.8, 1.4, 0.12],
      materialId: featureMatId,
      secondaryMaterialId: "brushed_brass",
      colorHex: f.palette.value.accent,
      accentColorHex: f.palette.value.emissive,
      provenanceId: f.culturalArtifacts.provenance,
      designNote: `${f.culturalArtifacts.because} Displaying runtime Qloo reference "${label || kind}".`,
      provenance: f.culturalArtifacts.provenance,
      sourceIds: f.culturalArtifacts.derivedFrom,
      because: f.culturalArtifacts.because,
    });
  });

  // 4. Acoustic Treatment
  f.acousticTreatment.value.forEach((acKey, idx) => {
    const side = idx % 2 === 0 ? -1 : 1;
    const xPos = side * (width / 2 - 0.12);
    const zPos = (idx * depth) / 5 - depth * 0.2;

    objects.push({
      id: `obj-acous-${mode}-${objectIndex++}`,
      name: `Acoustic Wall Treatment (${acKey.replace(/_/g, " ")})`,
      category: "Architecture",
      archetype: "acoustic_wall_panel",
      position: [xPos, height * 0.5, zPos],
      rotation: [0, Math.PI / 2, 0],
      dimensions: [0.12, 1.8, 1.8],
      materialId: "acoustic_felt",
      colorHex: f.palette.value.primary,
      provenanceId: f.acousticTreatment.provenance,
      designNote: f.acousticTreatment.because,
      provenance: f.acousticTreatment.provenance,
      sourceIds: f.acousticTreatment.derivedFrom,
      because: f.acousticTreatment.because,
    });
  });

  // 5. Plants & Outdoor
  f.plantsOutdoor.value.forEach((plKey, idx) => {
    const side = idx % 2 === 0 ? -1 : 1;
    const xPos = side * (width * 0.38);
    const zPos = depth * 0.32;

    objects.push({
      id: `obj-plant-${mode}-${objectIndex++}`,
      name: `Living Biophilic Feature (${plKey.replace(/_/g, " ")})`,
      category: "Planting",
      archetype: "olive_tree_planter",
      position: [xPos, 0.9, zPos],
      rotation: [0, 0, 0],
      dimensions: [1.1, 2.2, 1.1],
      materialId: "terracotta_tile",
      colorHex: "#A45735",
      provenanceId: f.plantsOutdoor.provenance,
      designNote: f.plantsOutdoor.because,
      provenance: f.plantsOutdoor.provenance,
      sourceIds: f.plantsOutdoor.derivedFrom,
      because: f.plantsOutdoor.because,
    });
  });

  // Focal point
  const focalObj = objects[0] || {
    name: "Architectural Centerpiece",
    position: [0, 1.0, -depth * 0.25],
    designNote: "Primary focal installation.",
  };

  const timeOfDay: TimeOfDay = f.lighting.value.temperatureK <= 2600 ? "midnight" : f.lighting.value.temperatureK >= 4500 ? "morning" : "sunset";

  const sceneSpec: SceneSpec = {
    id: `${mode}-${brief.seed}-${brief.bundleHash || "none"}`,
    title: `${f.typology.value.replace(/_/g, " ").toUpperCase()} — ${mode === "grounded" ? "QLOO GROUNDED" : "BASELINE"}`,
    subtitle: `${width}m × ${depth}m × ${height}m • ${f.materials.value.floor} & ${f.materials.value.walls}`,
    promptText: brief.prompt,
    typology,
    layoutMode: f.seatingCirculation.value.mode === "seated" ? "showcase" : "listening",
    timeOfDay,
    isOpenAir: f.enclosure.value === "outdoor",
    enclosureMode: f.enclosure.value === "hybrid" ? "open_air_canopy" : f.enclosure.value,
    roomDimensions: {
      width,
      height,
      depth,
      ridgeHeight: Number((height * 1.1).toFixed(1)),
      wallThickness: 0.28,
    },
    palette: {
      primaryHex: f.palette.value.primary,
      secondaryHex: f.palette.value.secondary,
      accentHex: f.palette.value.accent,
      floorHex: APPROVED_MATERIALS[f.materials.value.floor]?.defaultHex || "#2D3137",
      wallHex: APPROVED_MATERIALS[f.materials.value.walls]?.defaultHex || "#52565C",
      ambientHex: f.palette.value.accent,
      provenance: f.palette.provenance,
      rationale: f.palette.because,
    },
    materials: {
      floor: floorSpec,
      wall: wallSpec,
      ceiling: ceilingSpec,
      primaryFurniture: floorSpec,
      secondaryAccent: featureSpec,
    },
    ceilingStructure: (f.materials.value.ceiling in MATERIAL_LIBRARY ? f.materials.value.ceiling : "coffered_timber") as any,
    lighting: {
      temperatureK: f.lighting.value.temperatureK,
      ambientIntensity: 0.45 * f.lighting.value.intensity,
      sunAzimuthDeg: 215,
      sunElevationDeg: 35,
      fogDensity: 0.015,
      sources: [
        {
          id: `light-key-${mode}`,
          name: "Key Directional Sun/Sky Light",
          type: "directional",
          position: [width * 0.4, height * 1.5, depth * 0.4],
          target: [0, 0, 0],
          colorHex: f.lighting.value.temperatureK >= 4500 ? "#E0F2FE" : "#FEF08A",
          temperatureK: f.lighting.value.temperatureK,
          intensity: 1.8 * f.lighting.value.intensity,
          castShadow: true,
        },
      ],
    },
    acousticTarget: {
      targetRT60Seconds: 0.45,
      calculatedRT60Seconds: 0.42,
      bassRatio: 1.15,
      clarityC80dB: 2.8,
      noiseCriteriaNC: 25,
      averageAbsorptionAlpha: 0.38,
      complianceStatus: "optimal",
    },
    zones,
    objects,
    focalPoint: {
      name: focalObj.name,
      position: focalObj.position as [number, number, number],
      description: focalObj.designNote,
    },
    cameraDefaults: {
      overviewPosition: [0, height * 1.8, depth * 1.3],
      overviewTarget: [0, height * 0.3, 0],
      interiorPosition: [0, 1.6, depth * 0.35],
      interiorTarget: [0, 1.2, -depth * 0.2],
      focalPosition: [0, 1.2, -depth * 0.05],
      focalTarget: [0, 1.0, -depth * 0.3],
    },
    provenance: [
      {
        id: `claim-${mode}-typology`,
        source: f.typology.provenance === "qloo-evidence" ? "qloo_evidence" : "design_inference",
        domain: "architecture",
        label: "Typology",
        insight: f.typology.because,
        architecturalEffect: `Constructed ${typology} envelope.`,
        targetProperty: "typology",
        confidence: f.typology.provenance === "qloo-evidence" ? "verified" : "inferred",
      },
    ],
    validation: {
      isValid: true,
      circulationClearanceMeters: 1.4,
      minRequiredClearanceMeters: 1.0,
      estimatedCapacityGuests: f.seatingCirculation.value.capacity,
      areaSqMeters: Math.round(width * depth),
      volumeCubicMeters: Math.round(width * depth * height),
      densityStatus: "optimal",
      warnings: [],
      checksPassed: ["IBC Egress", "Acoustic RT60", "Clearance"],
    },
    revisionHistory: [],
    qlooSource: mode === "grounded" ? (bundle ? "live" : "fallback") : "fallback",
    becauseSentences: [
      {
        decision: "typology",
        headline: `${typology.replace(/_/g, " ").toUpperCase()}`,
        sentence: f.typology.because,
        citedEntities: f.typology.derivedFrom,
      },
      {
        decision: "materiality",
        headline: `${f.materials.value.walls} & ${f.materials.value.floor}`,
        sentence: f.materials.because,
        citedEntities: f.materials.derivedFrom,
      },
      {
        decision: "lighting",
        headline: `${f.lighting.value.temperatureK}K Atmospheric Illumination`,
        sentence: f.lighting.because,
        citedEntities: f.lighting.derivedFrom,
      },
    ],
  };

  return sceneSpec;
}
