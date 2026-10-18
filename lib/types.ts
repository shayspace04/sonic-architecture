export interface Track {
  title: string;
  artist: string;
}

export interface DesignReasoning {
  source: "qloo" | "qloo-partial" | "local-fallback";
  evidence: string[];
  rules: Record<string, string>;
}

export interface ResolvedEntity {
  id: string;
  name: string;
  type: string;
  searchTerm: string;
}

export interface ArtistRec {
  id: string;
  name: string;
  sourceEntity: string;
}

export interface CulturalEvidence {
  genreTags: string[];
  styleTags: string[];
  themeTags: string[];
  adjectives: string[];
  characteristics: string[];
}

export interface DesignConcept {
  title: string;
  thesis: string;
  atmosphere: string;
  spatialComposition: string;
  lightingDirection: string;
}

export interface VibePayload {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
  tracks: Track[];
  menu: string;
  fallback: boolean;
  reasoning: DesignReasoning;

  partial: boolean;
  submittedTerms: string[];
  entities: ResolvedEntity[];
  unresolvedTerms: string[];
  evidence: CulturalEvidence;
  artists: ArtistRec[];
  concept: DesignConcept;
  limitations: string[];
  errors: string[];
}
