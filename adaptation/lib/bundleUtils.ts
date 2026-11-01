/**
 * Sonic Architecture — Qloo Bundle Utilities
 * (/adaptation/lib/bundleUtils.ts)
 *
 * Universal (browser + server) conversion from QlooContext to typed QlooBundle.
 * Uses deterministic FNV-1a hash (no Node.js crypto requirement in client code).
 */

import type { QlooBundle } from "./types";
import type { QlooContext } from "../../lib/types";

export function stableHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function contextToBundle(context?: QlooContext): QlooBundle | undefined {
  if (!context || !context.entities || context.entities.length === 0) {
    return undefined;
  }

  const entities = context.entities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    tags: e.signals || [],
  }));

  const bundle = context.crossDomainBundle;
  const relatedVenues: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }> = [];
  const relatedArtists: Array<{ id: string; name: string; tags?: string[] }> = [];
  const relatedFilms: Array<{ id: string; name: string; tags?: string[] }> = [];
  const relatedBrands: Array<{ id: string; name: string; categories?: string[]; tags?: string[] }> = [];

  if (bundle) {
    for (const p of bundle.places || []) {
      const pid = (p as any).entity_id || p.id;
      if (pid) {
        relatedVenues.push({
          id: pid,
          name: p.name,
          categories: [p.subtype, p.type].filter(Boolean) as string[],
          tags: p.tags?.map((t: any) => t.name) || [],
        });
      }
    }
    for (const a of bundle.relatedArtists || []) {
      const aid = (a as any).entity_id || a.id;
      if (aid) {
        relatedArtists.push({
          id: aid,
          name: a.name,
          tags: a.tags?.map((t: any) => t.name) || [],
        });
      }
    }
    for (const m of bundle.movies || []) {
      const mid = (m as any).entity_id || m.id;
      if (mid) {
        relatedFilms.push({
          id: mid,
          name: m.name,
          tags: m.tags?.map((t: any) => t.name) || [],
        });
      }
    }
    for (const b of bundle.brands || []) {
      const bid = (b as any).entity_id || b.id;
      if (bid) {
        relatedBrands.push({
          id: bid,
          name: b.name,
          categories: [b.subtype, b.type].filter(Boolean) as string[],
          tags: b.tags?.map((t: any) => t.name) || [],
        });
      }
    }
  }

  const hashPayload = JSON.stringify({
    entities: entities.map((e) => `${e.id}:${e.name}`).sort(),
    venues: relatedVenues.map((v) => `${v.id}:${v.name}`).sort(),
    artists: relatedArtists.map((a) => `${a.id}:${a.name}`).sort(),
    films: relatedFilms.map((f) => `${f.id}:${f.name}`).sort(),
    brands: relatedBrands.map((b) => `${b.id}:${b.name}`).sort(),
  });
  const bundleHash = stableHash(hashPayload);

  return {
    bundleHash,
    entities,
    relatedVenues: relatedVenues.length > 0 ? relatedVenues : undefined,
    relatedArtists: relatedArtists.length > 0 ? relatedArtists : undefined,
    relatedFilms: relatedFilms.length > 0 ? relatedFilms : undefined,
    relatedBrands: relatedBrands.length > 0 ? relatedBrands : undefined,
    demographics: bundle?.demographics as any,
  };
}
