export type Provenance = 'qloo-evidence' | 'inferred' | 'fallback';

export type Field<T> = {
  value: T;
  provenance: Provenance;
  derivedFrom: string[];
  because: string;
};

export type SceneCategory =
  | 'typology' | 'massing' | 'enclosure' | 'materials' | 'palette'
  | 'lighting' | 'furniture' | 'props' | 'program-zones'
  | 'seating-circulation' | 'acoustic-treatment' | 'cultural-artifacts' | 'plants-outdoor';

export type SceneBrief = {
  prompt: string;
  seed: number;
  bundleHash?: string;
  fields: {
    typology: Field<string>;
    massing: Field<{ width: number; height: number; depth: number; ceiling: string }>;
    enclosure: Field<'indoor' | 'outdoor' | 'hybrid' | 'underground'>;
    materials: Field<{ floor: string; walls: string; ceiling: string; featureWall: string }>;
    palette: Field<{ primary: string; secondary: string; accent: string; emissive: string }>;
    lighting: Field<{ fixtureStyle: string; practicals: string[]; temperatureK: number; intensity: number }>;
    furniture: Field<{ kit: string[]; layout: string }>;
    props: Field<string[]>;
    programZones: Field<string[]>;
    seatingCirculation: Field<{ mode: 'seated' | 'standing' | 'lounge' | 'mixed'; capacity: number; flow: string }>;
    acousticTreatment: Field<string[]>;
    culturalArtifacts: Field<string[]>;
    plantsOutdoor: Field<string[]>;
  };
};

export type SceneElement = {
  id: string;
  category: SceneCategory;
  kind: string;
  transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] };
  sourceIds: string[];
  provenance: Provenance;
  because: string;
  rendererData?: Record<string, unknown>;
};

export type RenderableScene = {
  sceneId: string;
  prompt: string;
  mode: 'baseline' | 'grounded';
  elements: SceneElement[];
  metadata: { bundleHash?: string; qlooElementCount: number; inferredElementCount: number; fallbackElementCount: number };
};

export type QlooBundle = {
  bundleHash: string;
  entities: Array<{ id: string; name: string; type?: string; tags?: string[] }>;
  relatedVenues?: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }>;
  relatedArtists?: Array<{ id: string; name: string; tags?: string[] }>;
  relatedFilms?: Array<{ id: string; name: string; tags?: string[] }>;
  relatedBrands?: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }>;
  demographics?: Record<string, unknown>;
};
