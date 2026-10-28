/**
 * Sonic Architecture — Qloo Client Implementations & Cache Layer
 *
 * Implements:
 * 1. QlooClient interface
 * 2. FixtureQlooClient (typed sample data tagged "sample-fixture")
 * 3. RealQlooClient (stubbed integration against Qloo endpoints with explicit // QLOO-INTEGRATION comments)
 * 4. In-memory TTL cache with pre-warming for the 4 starter prompts
 */

import type {
  QlooClient,
  QlooDomain,
  ResolveEntitiesParams,
  ResolveEntitiesResult,
  ResolvedEntityItem,
  GetTasteSignalsParams,
  GetTasteSignalsResult,
  TasteSignalItem,
  GetCrossDomainLinksParams,
  GetCrossDomainLinksResult,
  CrossDomainLinkItem,
} from "./types";
import { QLOO_SAMPLE_FIXTURES, STARTER_PROMPTS } from "@/lib/fixtures/qlooSamples";

// ============================================================================
// IN-MEMORY TTL CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const GLOBAL_TOOL_CACHE = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function makeCacheKey(tool: string, args: Record<string, any>): string {
  const sorted = Object.keys(args)
    .sort()
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = args[key];
      return acc;
    }, {});
  return `${tool}:${JSON.stringify(sorted)}`;
}

export function clearQlooCache(): void {
  GLOBAL_TOOL_CACHE.clear();
}

export function getQlooCacheSize(): number {
  return GLOBAL_TOOL_CACHE.size;
}

// ============================================================================
// FIXTURE QLOO CLIENT (Typed sample data tagged strictly "sample-fixture")
// ============================================================================

export class FixtureQlooClient implements QlooClient {
  async resolveEntities(params: ResolveEntitiesParams): Promise<ResolveEntitiesResult> {
    const start = Date.now();
    const cacheKey = makeCacheKey("resolveEntities", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    const text = (params.text || "").toLowerCase().trim();
    const entities: ResolvedEntityItem[] = [];

    // Check for ambiguity trigger to test clarification UI & fallback
    if (
      text.includes("tokyo listening") ||
      text.includes("ambiguous") ||
      text.includes("hybrid lounge") ||
      text.includes("clarification-test")
    ) {
      entities.push({
        id: "place:tokyo-audiophile-bar",
        name: "Tokyo Audiophile Bar (Ginza/Shibuya)",
        type: "venue_typology",
        confidence: 0.58, // Low confidence to trigger clarification event
        candidates: [
          {
            id: "place:tokyo-bar-lion",
            name: "Meikyoku Kissa Lion (Shibuya)",
            type: "historical_kissa",
            confidence: 0.88,
            description: "Cathedral-scale acoustic horn speakers, solemn classical listening policy, dark timber.",
          },
          {
            id: "place:tokyo-bar-dhyana",
            name: "Bar Dhyana (Aoyama)",
            type: "modern_audiophile_lounge",
            confidence: 0.76,
            description: "Mid-century Danish teak, curated low-intervention wine, rotary tube amplifiers.",
          },
          {
            id: "place:tokyo-vent",
            name: "Vent Tokyo (Omotesando)",
            type: "underground_techno_room",
            confidence: 0.62,
            description: "Custom SRX acoustic architecture, minimal brutalist concrete, focused dance acoustics.",
          },
        ],
      });
    }

    // Match Starter 1: Jazz + Brutalist Architecture
    if (text.includes("jazz") || text.includes("brutalism") || text.includes("brutalist") || text.includes("miles")) {
      entities.push(
        {
          id: "artist:miles-davis",
          name: "Miles Davis",
          type: "musician",
          confidence: 0.94,
        },
        {
          id: "style:brutalism",
          name: "Brutalist Architecture",
          type: "architectural_style",
          confidence: 0.96,
        },
        {
          id: "record_label:blue-note",
          name: "Blue Note Records",
          type: "record_label",
          confidence: 0.89,
        }
      );
    }

    // Match Starter 2: A24 Films + Indie Music
    else if (text.includes("a24") || text.includes("indie") || text.includes("cinema") || text.includes("film")) {
      entities.push(
        {
          id: "studio:a24",
          name: "A24 Films",
          type: "film_studio",
          confidence: 0.95,
        },
        {
          id: "artist:daniel-lopatin",
          name: "Daniel Lopatin (Oneohtrix Point Never)",
          type: "musician",
          confidence: 0.91,
        },
        {
          id: "movement:american-indie-cinema",
          name: "American Independent Cinema",
          type: "cultural_movement",
          confidence: 0.88,
        }
      );
    }

    // Match Starter 3: Japanese Gardens + Ambient
    else if (text.includes("japanese") || text.includes("ambient") || text.includes("garden") || text.includes("zen")) {
      entities.push(
        {
          id: "artist:brian-eno",
          name: "Brian Eno",
          type: "musician",
          confidence: 0.96,
        },
        {
          id: "style:karesansui",
          name: "Japanese Dry Garden (Karesansui)",
          type: "landscape_typology",
          confidence: 0.92,
        },
        {
          id: "genre:japanese-environmental-ambient",
          name: "Japanese Environmental Ambient (Kankyo Ongaku)",
          type: "musical_movement",
          confidence: 0.9,
        }
      );
    }

    // Match Starter 4: Chrome + Club Culture
    else if (text.includes("chrome") || text.includes("club") || text.includes("techno") || text.includes("industrial")) {
      entities.push(
        {
          id: "movement:berlin-techno-culture",
          name: "Berlin Club & Sound-System Culture",
          type: "cultural_movement",
          confidence: 0.95,
        },
        {
          id: "style:industrial-chrome",
          name: "High-Tech Industrial Chrome",
          type: "design_aesthetic",
          confidence: 0.93,
        },
        {
          id: "collective:underground-resistance",
          name: "Underground Resistance",
          type: "music_collective",
          confidence: 0.87,
        }
      );
    }

    // Match fashion / runway prompt
    else if (text.includes("fashion") || text.includes("runway") || text.includes("luxury")) {
      entities.push(
        {
          id: "house:maison-margiela",
          name: "Maison Margiela Artisanal",
          type: "fashion_house",
          confidence: 0.93,
        },
        {
          id: "style:deconstructivism",
          name: "Deconstructivist Fashion & Architecture",
          type: "cultural_movement",
          confidence: 0.91,
        },
        {
          id: "sound:industrial-percussion",
          name: "Industrial Minimal Soundscape",
          type: "sound_aesthetic",
          confidence: 0.86,
        }
      );
    }

    // Fallback cultural extraction
    else {
      entities.push(
        {
          id: "entity:spatial-curation",
          name: `Spatial Concept: ${params.text.slice(0, 32)}`,
          type: "spatial_concept",
          confidence: 0.85,
        },
        {
          id: "style:contemporary-acoustic",
          name: "Contemporary Acoustic Architecture",
          type: "architectural_style",
          confidence: 0.88,
        }
      );
    }

    const latencyMs = Math.floor(Math.random() * 20 + 25);
    const result: ResolveEntitiesResult = {
      entities,
      source: "fixture",
      latencyMs,
      provenance: "sample-fixture",
    };

    GLOBAL_TOOL_CACHE.set(cacheKey, {
      data: result,
      cachedAt: Date.now(),
      ttlMs: DEFAULT_CACHE_TTL_MS,
    });

    return result;
  }

  async getTasteSignals(params: GetTasteSignalsParams): Promise<GetTasteSignalsResult> {
    const start = Date.now();
    const cacheKey = makeCacheKey("getTasteSignals", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    const signals: TasteSignalItem[] = [];
    const domain = params.domain;

    for (const entityId of params.entityIds) {
      if (entityId.includes("miles") || entityId.includes("jazz") || entityId.includes("blue-note")) {
        if (domain === "music") {
          signals.push({
            entityId,
            entityName: "Miles Davis & Blue Note Era",
            domain: "music",
            signals: ["harmonic_warmth", "modal_improvisation", "muted_trumpet_timbre", "late_night_intimacy"],
            relatedEntities: [
              { id: "artist:john-coltrane", name: "John Coltrane", affinity: 0.94 },
              { id: "artist:bill-evans", name: "Bill Evans", affinity: 0.91 },
              { id: "artist:thelonious-monk", name: "Thelonious Monk", affinity: 0.89 },
            ],
          });
        } else if (domain === "places") {
          signals.push({
            entityId,
            entityName: "Audiophile Venues",
            domain: "places",
            signals: ["intimate_kissa_booth", "felt_lined_listening_alcove", "subdued_pinspot_focus"],
            relatedEntities: [
              { id: "place:village-vanguard", name: "Village Vanguard (NYC)", affinity: 0.96 },
              { id: "place:lion-kissa", name: "Lion Kissaten (Tokyo)", affinity: 0.92 },
            ],
          });
        } else if (domain === "dining") {
          signals.push({
            entityId,
            entityName: "Late-Night Tasting & Cocktails",
            domain: "dining",
            signals: ["single_malt_whisky_flights", "omakase_small_plates", "low_intervention_natural_wine"],
            relatedEntities: [
              { id: "dining:japanese-whisky-bar", name: "Japanese Whisky Bar", affinity: 0.91 },
            ],
          });
        } else {
          signals.push({
            entityId,
            entityName: "Miles Davis Cultural Affinity",
            domain,
            signals: ["chiaroscuro_aesthetic", "understated_luxury", "tactile_intimacy"],
            relatedEntities: [],
          });
        }
      } else if (entityId.includes("brutalism") || entityId.includes("concrete")) {
        if (domain === "places") {
          signals.push({
            entityId,
            entityName: "Brutalist Architectural Forms",
            domain: "places",
            signals: ["raw_board_concrete", "monolithic_portal_piers", "coffered_slab_acoustics", "austere_permanence"],
            relatedEntities: [
              { id: "place:barbican-estate", name: "Barbican Centre (London)", affinity: 0.95 },
              { id: "place:habitat-67", name: "Habitat 67 (Montreal)", affinity: 0.88 },
            ],
          });
        } else if (domain === "fashion") {
          signals.push({
            entityId,
            entityName: "Brutalist Material Affinity in Fashion",
            domain: "fashion",
            signals: ["monochrome_heavy_wool", "structured_raw_denim", "matte_slate_drape"],
            relatedEntities: [
              { id: "brand:rick-owens", name: "Rick Owens", affinity: 0.93 },
            ],
          });
        } else {
          signals.push({
            entityId,
            entityName: "Brutalist Spatial Signals",
            domain,
            signals: ["acoustic_resonance", "heavy_mass_containment", "raking_light_texture"],
            relatedEntities: [],
          });
        }
      } else if (entityId.includes("fashion") || entityId.includes("margiela")) {
        signals.push({
          entityId,
          entityName: "Artisanal Fashion & Runway",
          domain,
          signals: ["deconstructed_textiles", "unbleached_cotton_calico", "monochrome_catwalk_run", "sharp_axial_lighting"],
          relatedEntities: [
            { id: "brand:helmut-lang", name: "Helmut Lang Archive", affinity: 0.9 },
          ],
        });
      } else {
        signals.push({
          entityId,
          entityName: `Cultural Affinity for ${entityId}`,
          domain,
          signals: ["cultural_grounding", "spatial_specificity", "refined_material_selection"],
          relatedEntities: [],
        });
      }
    }

    const latencyMs = Math.floor(Math.random() * 25 + 30);
    const result: GetTasteSignalsResult = {
      signals,
      source: "fixture",
      latencyMs,
      provenance: "sample-fixture",
    };

    GLOBAL_TOOL_CACHE.set(cacheKey, {
      data: result,
      cachedAt: Date.now(),
      ttlMs: DEFAULT_CACHE_TTL_MS,
    });

    return result;
  }

  async getCrossDomainLinks(params: GetCrossDomainLinksParams): Promise<GetCrossDomainLinksResult> {
    const start = Date.now();
    const cacheKey = makeCacheKey("getCrossDomainLinks", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    const links: CrossDomainLinkItem[] = [];

    for (const entityId of params.entityIds) {
      for (const targetDomain of params.targetDomains) {
        if (targetDomain === "dining") {
          links.push({
            sourceEntityId: entityId,
            sourceEntityName: entityId.replace(/^[a-z_]+:/, ""),
            targetDomain: "dining",
            signals: ["single_malt_whisky_service", "small_plate_omakase", "silent_service_etiquette"],
            spatialTranslations: [
              "Concealed back-bar service vestibule with acoustic gasket seals to prevent dishware clatter.",
              "Low-profile counter bar clad in honed slate with recessed amber glassware well.",
            ],
            programImplications: {
              cateringLayout: "Acoustically isolated back-of-house plating gallery with soft-close cabinetry.",
              serviceFlow: "Low-frequency perimeter circulation allowing continuous audio playback uninterrupted by service staff.",
              hospitality: "Single-pour Japanese whisky flights and sencha tea pairings matched to music chapters.",
            },
          });
        } else if (targetDomain === "fashion") {
          links.push({
            sourceEntityId: entityId,
            sourceEntityName: entityId.replace(/^[a-z_]+:/, ""),
            targetDomain: "fashion",
            signals: ["monochrome_matte_palette", "sculptural_wool_tailoring", "unadorned_industrial_silhouette"],
            spatialTranslations: [
              "Uniform staff dress integrated with architectural wall tones (#2D3137 / #52565C).",
              "Tactile Boucle and raw linen upholstery providing secondary mid-frequency sound absorption.",
            ],
            programImplications: {
              dressCode: "Understated architectural monochrome (matte black, charcoal slate, textured wool).",
            },
          });
        } else if (targetDomain === "places") {
          links.push({
            sourceEntityId: entityId,
            sourceEntityName: entityId.replace(/^[a-z_]+:/, ""),
            targetDomain: "places",
            signals: ["sanctuary_acoustics", "focused_listening_kissa", "sheltered_threshold"],
            spatialTranslations: [
              "Dual heavy vestibule doors creating a 35dB sound-lock air chamber at the entrance.",
            ],
            programImplications: {
              hospitality: "Acoustic arrival decompression sequence with lowered 150-lux lighting.",
            },
          });
        } else {
          links.push({
            sourceEntityId: entityId,
            sourceEntityName: entityId.replace(/^[a-z_]+:/, ""),
            targetDomain,
            signals: ["cross_cultural_affinity", "material_alignment"],
            spatialTranslations: ["Integrated spatial coherence between sensory domains."],
          });
        }
      }
    }

    const latencyMs = Math.floor(Math.random() * 30 + 35);
    const result: GetCrossDomainLinksResult = {
      links,
      source: "fixture",
      latencyMs,
      provenance: "sample-fixture",
    };

    GLOBAL_TOOL_CACHE.set(cacheKey, {
      data: result,
      cachedAt: Date.now(),
      ttlMs: DEFAULT_CACHE_TTL_MS,
    });

    return result;
  }
}

// ============================================================================
// REAL QLOO CLIENT (Live endpoint client with explicit // QLOO-INTEGRATION markers)
// ============================================================================

export class RealQlooClient implements QlooClient {
  private apiKey: string;
  private fixtureFallback: FixtureQlooClient;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fixtureFallback = new FixtureQlooClient();
  }

  async resolveEntities(params: ResolveEntitiesParams): Promise<ResolveEntitiesResult> {
    const start = Date.now();
    // QLOO-INTEGRATION: Cache lookup before live API call
    const cacheKey = makeCacheKey("resolveEntities", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    try {
      // QLOO-INTEGRATION: Endpoint: https://hackathon.api.qloo.com/search or https://api.qloo.com/v1/search
      // Required headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' }
      const searchUrl = `https://hackathon.api.qloo.com/search?query=${encodeURIComponent(
        params.text.slice(0, 80)
      )}&take=4`;

      const resp = await fetch(searchUrl, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000), // Hard per-call limit: 8s
      });

      // QLOO-INTEGRATION: Check rate-limit & quota headers
      if (resp.status === 429) {
        console.warn("[RealQlooClient] Quota exhausted (HTTP 429). Falling back to FixtureQlooClient.");
        const fallback = await this.fixtureFallback.resolveEntities(params);
        return { ...fallback, source: "fixture", provenance: "sample-fixture" };
      }

      if (!resp.ok) {
        throw new Error(`Qloo API HTTP error: ${resp.status}`);
      }

      const data = await resp.json();
      // QLOO-INTEGRATION: Parse results array from Qloo response shape
      const results = Array.isArray(data?.results) ? data.results : [];
      const entities: ResolvedEntityItem[] = results.slice(0, 4).map((item: any) => ({
        id: String(item.entity_id || item.id),
        name: String(item.name || item.title),
        type: String(item.type || item.category || "cultural_entity"),
        confidence: typeof item.confidence === "number" ? item.confidence : 0.95,
      }));

      if (entities.length === 0) {
        // Fall back gracefully to fixture if live search returned empty
        const fallback = await this.fixtureFallback.resolveEntities(params);
        return { ...fallback, source: "fixture", provenance: "sample-fixture" };
      }

      const latencyMs = Date.now() - start;
      const res: ResolveEntitiesResult = {
        entities,
        source: "live",
        latencyMs,
        provenance: "qloo-evidence", // Only real Qloo response gets qloo-evidence
      };

      GLOBAL_TOOL_CACHE.set(cacheKey, {
        data: res,
        cachedAt: Date.now(),
        ttlMs: DEFAULT_CACHE_TTL_MS,
      });

      return res;
    } catch (err: unknown) {
      console.warn("[RealQlooClient] resolveEntities network/auth error. Falling back to fixture:", err);
      const fallback = await this.fixtureFallback.resolveEntities(params);
      return { ...fallback, source: "fixture", provenance: "sample-fixture" };
    }
  }

  async getTasteSignals(params: GetTasteSignalsParams): Promise<GetTasteSignalsResult> {
    const start = Date.now();
    // QLOO-INTEGRATION: Cache lookup
    const cacheKey = makeCacheKey("getTasteSignals", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    try {
      // QLOO-INTEGRATION: Endpoint: https://hackathon.api.qloo.com/v1/taste/signals or /insights
      // Parameters: entity_ids, domain
      // If live endpoint is under construction in local sandbox, delegate to fixture
      // and label as sample-fixture or live once connected:
      const fallback = await this.fixtureFallback.getTasteSignals(params);
      return fallback;
    } catch (err: unknown) {
      console.warn("[RealQlooClient] getTasteSignals error. Falling back to fixture:", err);
      return this.fixtureFallback.getTasteSignals(params);
    }
  }

  async getCrossDomainLinks(params: GetCrossDomainLinksParams): Promise<GetCrossDomainLinksResult> {
    const start = Date.now();
    // QLOO-INTEGRATION: Cache lookup
    const cacheKey = makeCacheKey("getCrossDomainLinks", params);
    const cached = GLOBAL_TOOL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return {
        ...cached.data,
        source: "cache",
        latencyMs: Math.max(1, Date.now() - start),
      };
    }

    try {
      // QLOO-INTEGRATION: Endpoint: https://hackathon.api.qloo.com/v1/taste/cross-domain
      // Parameters: entity_ids, target_domains
      const fallback = await this.fixtureFallback.getCrossDomainLinks(params);
      return fallback;
    } catch (err: unknown) {
      console.warn("[RealQlooClient] getCrossDomainLinks error. Falling back to fixture:", err);
      return this.fixtureFallback.getCrossDomainLinks(params);
    }
  }
}

// ============================================================================
// FACTORY & PREWARM HELPERS
// ============================================================================

export function getQlooClient(forceFixture = false): QlooClient {
  const apiKey = process.env.QLOO_API_KEY;
  if (!forceFixture && apiKey && apiKey.trim().length > 0) {
    return new RealQlooClient(apiKey.trim());
  }
  return new FixtureQlooClient();
}

/** Pre-warms the cache for the four starter prompts */
export async function prewarmStarterPromptCache(client?: QlooClient): Promise<void> {
  const qloo = client || new FixtureQlooClient();
  for (const starter of STARTER_PROMPTS) {
    try {
      const res = await qloo.resolveEntities({ text: starter });
      const ids = res.entities.map((e) => e.id);
      if (ids.length > 0) {
        await Promise.all([
          qloo.getTasteSignals({ entityIds: ids, domain: "music" }),
          qloo.getCrossDomainLinks({ entityIds: ids, targetDomains: ["dining", "fashion", "places"] }),
        ]);
      }
    } catch {
      // Prewarm errors are non-fatal
    }
  }
}
