/**
 * Exact TypeScript definitions derived directly from live Qloo API responses (.qloo-samples/)
 * against https://hackathon.api.qloo.com
 */

export interface QlooTagReference {
  id: string;
  name: string;
  type: string;
}

export interface QlooSearchEntity {
  entity_id: string;
  name: string;
  types?: string[];
  type?: string;
  popularity?: number;
  disambiguation?: string;
  properties?: {
    image?: { url?: string };
    description?: string;
    [key: string]: unknown;
  };
  tags?: QlooTagReference[];
}

export interface QlooSearchResponse {
  results: QlooSearchEntity[];
  success?: boolean;
}

export interface QlooExplainabilityItem {
  entity_id: string;
  score: number;
}

export interface QlooInsightQuery {
  affinity?: number;
  affinity_rank?: number;
  popularity?: number;
  measurements?: {
    audience_growth?: number;
  };
  explainability?: {
    "signal.interests.entities"?: QlooExplainabilityItem[];
  };
}

export interface QlooInsightEntity {
  entity_id: string;
  name: string;
  type?: string;
  subtype?: string;
  popularity?: number;
  disambiguation?: string;
  location?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
  };
  properties?: {
    description?: string;
    image?: { url?: string };
    release_year?: number;
    [key: string]: unknown;
  };
  tags?: QlooTagReference[];
  query?: QlooInsightQuery;
  external?: Record<string, unknown>;
}

export interface QlooInsightsResponse {
  success: boolean;
  results: {
    entities: QlooInsightEntity[];
  };
  query?: {
    explainability?: {
      "signal.interests.entities"?: {
        effect_on_top3_recs?: unknown[];
        effect_on_top5_recs?: unknown[];
        effect_on_top10_recs?: unknown[];
        effect_on_all_recs?: unknown[];
      };
    };
  };
  duration?: number;
}

export interface QlooTasteTag {
  tag_id: string;
  name: string;
  types?: string[];
  subtype?: string;
  tag_value?: string;
  popularity?: number;
  query?: {
    affinity?: number;
  };
}

export interface QlooTasteTagsResponse {
  success: boolean;
  results: {
    tags: QlooTasteTag[];
  };
  duration?: number;
}

export interface QlooDemographic {
  entity_id: string;
  query: {
    age?: Record<string, number>;
    gender?: Record<string, number>;
  };
}

export interface QlooDemographicsResponse {
  success: boolean;
  results: {
    demographics: QlooDemographic[];
  };
  duration?: number;
}

export interface QlooTagSearchResult {
  id: string;
  name: string;
  type: string;
  popularity?: number;
  properties?: Record<string, unknown>;
  tags?: QlooTagReference[];
}

export interface QlooTagsSearchResponse {
  success: boolean;
  results: {
    tags: QlooTagSearchResult[];
  };
}

/**
 * Consolidated cross-domain intelligence bundle verified against live Qloo
 */
export interface ExtractedNamedEntity {
  name: string;
  type: "artist" | "movie" | "tv_show" | "place" | "brand" | "person";
}

export interface ExtractedConcept {
  term: string;
  kind: "genre" | "style" | "mood" | "material" | "era";
}

export interface ExtractionOutput {
  namedEntities: ExtractedNamedEntity[];
  concepts: ExtractedConcept[];
  extractorUsed: "llm" | "rules";
}

export interface ResolvedTagEvidence {
  id: string;
  name: string;
  type: string;
  conceptTerm: string;
  popularity?: number;
  provenance: "qloo-evidence" | "sample-fixture";
}

export interface UnmatchedConcept {
  term: string;
  reason: "no Qloo tag";
}

export interface SurfaceExplainability {
  contributorId: string;
  contributorName: string;
  contributorType: "entity" | "tag";
  score: number;
}

export interface TraceStep {
  endpoint: string;
  count: number;
  latencyMs: number;
  status: number;
  domain?: string;
  error?: string;
}

export interface RealQlooEvidenceBundle {
  source: "live" | "cache" | "fixture" | "fallback";
  inputParsed: string;
  resolvedEntity: QlooSearchEntity | null;
  resolvedEntities: QlooSearchEntity[];
  resolvedTags: ResolvedTagEvidence[];
  unmatchedConcepts: UnmatchedConcept[];
  unresolved: { name: string; reason: string }[];
  places: QlooInsightEntity[];
  relatedArtists: QlooInsightEntity[];
  movies: QlooInsightEntity[];
  brands: QlooInsightEntity[];
  tasteTags: QlooTasteTag[];
  demographics: QlooDemographic | null;
  explainabilityScores: Record<string, number>; // entity_id / tag_id -> score (0-1)
  surfaceExplainability: Record<string, SurfaceExplainability>; // entity_id -> top driver
  venueSource?: "insights" | "name_search";
  venueSearchTerm?: string;
  domainStatus?: Record<string, "ok" | "empty" | "timed out">;
  latencyMs: number;
  timestamp: number;
  traceMetrics?: Array<{ endpoint: string; count: number; latencyMs: number; status: number }>;
}
