import type { QlooBundle, RenderableScene, SceneBrief, SceneElement } from '../lib/types';
import { elementCounts } from '../lib/provenance';

export type RendererObjectHandle = unknown;

export interface SonicRendererAdapter {
  clear(): void;
  addElement(element: SceneElement, context: { bundle?: QlooBundle }): RendererObjectHandle;
  updateElement?(element: SceneElement, context: { bundle?: QlooBundle }): void;
  setProvenanceMode?(mode: 'off' | 'tint' | 'outline'): void;
  setDiffMode?(ids: { added: string[]; removed: string[]; changed: string[] }): void;
  capture?(cameraId: string, filename: string): Promise<string>;
}

export function mountScene(adapter: SonicRendererAdapter, scene: RenderableScene, bundle?: QlooBundle) {
  adapter.clear();
  for (const element of scene.elements) adapter.addElement(element, { bundle });
  return { sceneId: scene.sceneId, counts: elementCounts(scene.elements) };
}

export function briefToSceneElements(brief: SceneBrief, mode: RenderableScene['mode']): SceneElement[] {
  const f = brief.fields;
  const make = (
    id: string,
    category: SceneElement['category'],
    kind: string,
    sourceIds: string[],
    provenance: SceneElement['provenance'],
    because: string,
    position: [number, number, number],
    scale: [number, number, number],
    rendererData?: Record<string, unknown>
  ): SceneElement => ({
    id: `${mode}-${id}`,
    category,
    kind,
    sourceIds,
    provenance,
    because,
    transform: { position, rotation: [0, 0, 0], scale },
    rendererData,
  });

  const width = f.massing.value.width;
  const height = f.massing.value.height;
  const depth = f.massing.value.depth;

  const items: SceneElement[] = [
    // 1. Massing & Room Shell
    make('room-shell', 'massing', f.typology.value, f.typology.derivedFrom, f.typology.provenance, f.typology.because, [0, 0, 0], [width, height, depth]),

    // 2. Surface Materials
    make('floor-surface', 'materials', f.materials.value.floor, f.materials.derivedFrom, f.materials.provenance, f.materials.because, [0, 0, 0], [width, 0.05, depth]),
    make('wall-surface', 'materials', f.materials.value.walls, f.materials.derivedFrom, f.materials.provenance, f.materials.because, [0, height / 2, 0], [width, height, depth]),
    make('ceiling-surface', 'materials', f.materials.value.ceiling, f.materials.derivedFrom, f.materials.provenance, f.materials.because, [0, height, 0], [width, 0.15, depth]),
    make('feature-wall', 'materials', f.materials.value.featureWall, f.materials.derivedFrom, f.materials.provenance, f.materials.because, [0, height / 2, -depth / 2], [width, height, 0.12]),

    // 3. Color Palette Anchor
    make('palette-anchor', 'palette', `${f.palette.value.primary}_${f.palette.value.accent}`, f.palette.derivedFrom, f.palette.provenance, f.palette.because, [0, 0, 0], [1, 1, 1], {
      primary: f.palette.value.primary,
      secondary: f.palette.value.secondary,
      accent: f.palette.value.accent,
      emissive: f.palette.value.emissive,
    }),

    // 4. Lighting Scheme
    make('primary-light', 'lighting', f.lighting.value.fixtureStyle, f.lighting.derivedFrom, f.lighting.provenance, f.lighting.because, [0, height * 0.9, 0], [1, 1, 1], {
      temperatureK: f.lighting.value.temperatureK,
      intensity: f.lighting.value.intensity,
      practicals: f.lighting.value.practicals,
    }),

    // 5. Seating & Circulation
    make('seating-circulation', 'seating-circulation', f.seatingCirculation.value.mode, f.seatingCirculation.derivedFrom, f.seatingCirculation.provenance, f.seatingCirculation.because, [0, 0.2, depth * 0.1], [width * 0.6, 0.8, depth * 0.5], {
      capacity: f.seatingCirculation.value.capacity,
      flow: f.seatingCirculation.value.flow,
    }),
  ];

  // 6. Program Zones
  f.programZones.value.forEach((zone, index) => {
    const xPos = -width / 3 + (index * width) / Math.max(f.programZones.value.length, 1);
    const zPos = (index % 2 === 0 ? 1 : -1) * (depth * 0.25);
    items.push(make(`zone-${index}`, 'program-zones', zone, f.programZones.derivedFrom, f.programZones.provenance, f.programZones.because, [xPos, 0.02, zPos], [width * 0.25, 0.05, depth * 0.25]));
  });

  // 7. Furniture Items
  f.furniture.value.kit.forEach((furn, index) => {
    const xPos = (index - (f.furniture.value.kit.length - 1) / 2) * 1.8;
    const zPos = depth * 0.12;
    items.push(make(`furn-${index}`, 'furniture', furn, f.furniture.derivedFrom, f.furniture.provenance, f.furniture.because, [xPos, 0.45, zPos], [1.2, 0.85, 0.9]));
  });

  // 8. Props
  f.props.value.forEach((prop, index) => {
    const xPos = (index - (f.props.value.length - 1) / 2) * 1.4;
    const zPos = -depth * 0.28;
    items.push(make(`prop-${index}`, 'props', prop, f.props.derivedFrom, f.props.provenance, f.props.because, [xPos, 0.75, zPos], [0.8, 1.2, 0.7]));
  });

  // 9. Acoustic Treatment
  f.acousticTreatment.value.forEach((treatment, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const xPos = side * (width / 2 - 0.1);
    const zPos = ((Math.floor(index / 2) - 1) * depth) / 4;
    items.push(make(`acoustic-${index}`, 'acoustic-treatment', treatment, f.acousticTreatment.derivedFrom, f.acousticTreatment.provenance, f.acousticTreatment.because, [xPos, height / 2, zPos], [0.12, 1.8, 1.8]));
  });

  // 10. Cultural Artifacts (Runtime Qloo Names)
  f.culturalArtifacts.value.forEach((artifact, index) => {
    const xPos = (index - (f.culturalArtifacts.value.length - 1) / 2) * 2.0;
    const zPos = -depth / 2 + 0.15;
    items.push(make(`artifact-${index}`, 'cultural-artifacts', artifact, f.culturalArtifacts.derivedFrom, f.culturalArtifacts.provenance, f.culturalArtifacts.because, [xPos, 1.8, zPos], [1.6, 1.2, 0.08], {
      label: artifact,
    }));
  });

  // 11. Plants & Outdoor Elements
  f.plantsOutdoor.value.forEach((plant, index) => {
    const xPos = (index % 2 === 0 ? -1 : 1) * (width * 0.4);
    const zPos = depth * 0.35;
    items.push(make(`plant-${index}`, 'plants-outdoor', plant, f.plantsOutdoor.derivedFrom, f.plantsOutdoor.provenance, f.plantsOutdoor.because, [xPos, 0.8, zPos], [0.9, 1.8, 0.9]));
  });

  return items;
}
