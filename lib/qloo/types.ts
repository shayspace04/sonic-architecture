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
export interface RealQlooEvidenceBundle {
  source: "live" | "cache" | "fixture" | "fallback";
  inputParsed: string;
  resolvedEntity: QlooSearchEntity;
  places: QlooInsightEntity[];
  relatedArtists: QlooInsightEntity[];
  movies: QlooInsightEntity[];
  brands: QlooInsightEntity[];
  tasteTags: QlooTasteTag[];
  demographics: QlooDemographic | null;
  explainabilityScores: Record<string, number>; // entity_id -> score (0-1)
  latencyMs: number;
  timestamp: number;
}
