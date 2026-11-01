/**
 * Sonic Architecture — Qloo Runtime Adapter
 * (/adaptation/lib/qlooAdapter.ts)
 *
 * Implements QlooRuntimeAdapter.resolve(prompt):
 * - Server-side only; never exposes Qloo API keys to browser code
 * - Normalizes runtime results into the typed QlooBundle contract
 * - Generates stable bundleHash
 * - Includes stable IDs, names, tags, venue categories, artists, films, brands, and demographics
 * - Returns undefined when Qloo has no useful result
 * - Never commits or logs raw Qloo responses, images, or credentials
 */

import { contextToBundle, stableHash } from "./bundleUtils";
import type { QlooBundle } from "./types";
import type { QlooRuntimeAdapter } from "./pipeline";
import { getCrossDomainEvidenceForPrompt } from "../..//lib/qloo/pipeline";
import { getQlooFixture } from "../..//lib/fixtures/qlooSamples";
import type { QlooContext } from "../..//lib/types";

export class ServerQlooRuntimeAdapter implements QlooRuntimeAdapter {
  private cache = new Map<string, QlooBundle>();

  resolveSync(prompt: string, forcedContext?: QlooContext): QlooBundle | undefined {
    const cleanPrompt = (prompt || "").trim().toLowerCase();
    if (!cleanPrompt) return undefined;

    if (this.cache.has(cleanPrompt)) {
      return this.cache.get(cleanPrompt);
    }

    if (forcedContext) {
      const b = contextToBundle(forcedContext);
      if (b) {
        this.cache.set(cleanPrompt, b);
        return b;
      }
    }

    const fixture = getQlooFixture(prompt);
    if (fixture) {
      const b = contextToBundle(fixture);
      if (b) {
        this.cache.set(cleanPrompt, b);
        return b;
      }
    }

    return undefined;
  }

  async resolve(prompt: string, forcedContext?: QlooContext): Promise<QlooBundle | undefined> {
    const cleanPrompt = (prompt || "").trim();
    if (!cleanPrompt) return undefined;

    const syncBundle = this.resolveSync(cleanPrompt, forcedContext);
    if (syncBundle && syncBundle.entities.length > 0) {
      return syncBundle;
    }

    try {
      const { resolution, bundle } = await getCrossDomainEvidenceForPrompt(cleanPrompt);

      const entities: Array<{ id: string; name: string; type?: string; tags?: string[] }> = [];
      const seenIds = new Set<string>();

      // 1. Direct resolved search entities
      for (const ent of resolution.resolved) {
        if (!ent.entity_id || seenIds.has(ent.entity_id)) continue;
        seenIds.add(ent.entity_id);
        entities.push({
          id: ent.entity_id,
          name: ent.name,
          type: ent.types?.[0] || ent.type || "cultural_entity",
          tags: ent.tags?.map((t) => t.name) || [],
        });
      }

      // 2. Resolved concept taste tags as entities if not already present
      if (resolution.matchedTags) {
        for (const tag of resolution.matchedTags) {
          if (!tag.id || seenIds.has(tag.id)) continue;
          seenIds.add(tag.id);
          entities.push({
            id: tag.id,
            name: tag.name,
            type: "taste_tag",
            tags: [tag.conceptTerm, tag.type].filter(Boolean),
          });
        }
      }

      const relatedVenues: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }> = [];
      const relatedArtists: Array<{ id: string; name: string; tags?: string[] }> = [];
      const relatedFilms: Array<{ id: string; name: string; tags?: string[] }> = [];
      const relatedBrands: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }> = [];
      let demographics: Record<string, unknown> | undefined = undefined;

      if (bundle) {
        // Related Venues
        for (const place of bundle.places || []) {
          if (!place.entity_id) continue;
          const categories = [
            place.subtype,
            place.type,
            ...(place.tags?.map((t) => t.name) || []),
          ].filter(Boolean) as string[];

          relatedVenues.push({
            id: place.entity_id,
            name: place.name,
            categories,
            tags: place.tags?.map((t) => t.name) || [],
          });
        }

        // Related Artists
        for (const artist of bundle.relatedArtists || []) {
          if (!artist.entity_id) continue;
          relatedArtists.push({
            id: artist.entity_id,
            name: artist.name,
            tags: artist.tags?.map((t) => t.name) || [],
          });
        }

        // Related Films
        for (const movie of bundle.movies || []) {
          if (!movie.entity_id) continue;
          relatedFilms.push({
            id: movie.entity_id,
            name: movie.name,
            tags: movie.tags?.map((t) => t.name) || [],
          });
        }

        // Related Brands
        for (const brand of bundle.brands || []) {
          if (!brand.entity_id) continue;
          const categories = [
            brand.subtype,
            brand.type,
            ...(brand.tags?.map((t) => t.name) || []),
          ].filter(Boolean) as string[];

          relatedBrands.push({
            id: brand.entity_id,
            name: brand.name,
            categories,
            tags: brand.tags?.map((t) => t.name) || [],
          });
        }

        // Demographics
        if (bundle.demographics) {
          demographics = bundle.demographics as unknown as Record<string, unknown>;
        }
      }

      // Check if we actually obtained any cultural data
      const totalSignals =
        entities.length +
        relatedVenues.length +
        relatedArtists.length +
        relatedFilms.length +
        relatedBrands.length;

      if (totalSignals === 0) {
        return undefined;
      }

      // Compute stable deterministic SHA-256 hash of the bundle contents
      const hashPayload = JSON.stringify({
        entities: entities.map((e) => `${e.id}:${e.name}`).sort(),
        venues: relatedVenues.map((v) => `${v.id}:${v.name}`).sort(),
        artists: relatedArtists.map((a) => `${a.id}:${a.name}`).sort(),
        films: relatedFilms.map((f) => `${f.id}:${f.name}`).sort(),
        brands: relatedBrands.map((b) => `${b.id}:${b.name}`).sort(),
      });
      const bundleHash = stableHash(hashPayload);

      const qlooBundle: QlooBundle = {
        bundleHash,
        entities,
        relatedVenues: relatedVenues.length > 0 ? relatedVenues : undefined,
        relatedArtists: relatedArtists.length > 0 ? relatedArtists : undefined,
        relatedFilms: relatedFilms.length > 0 ? relatedFilms : undefined,
        relatedBrands: relatedBrands.length > 0 ? relatedBrands : undefined,
        demographics,
      };

      this.cache.set(cleanPrompt.toLowerCase(), qlooBundle);
      return qlooBundle;
    } catch (err) {
      console.error("[QlooRuntimeAdapter] Resolution failed:", err);
      return undefined;
    }
  }
}

export const defaultQlooAdapter = new ServerQlooRuntimeAdapter();
