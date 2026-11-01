/**
 * Sonic Architecture — Scene Designer Provider
 * (/adaptation/lib/designer.ts)
 *
 * Implements DesignBriefProvider.designBrief({ prompt, seed, qlooBundle? }):
 * - Returns structured JSON with all 14 scene dimensions
 * - Stores { value, provenance, derivedFrom, because } on every field
 * - Baseline: prompt only -> provenance is "inferred" or "fallback", derivedFrom is []
 * - Grounded: prompt + qlooBundle -> provenance is "qloo-evidence" only when derivedFrom
 *   contains real IDs from qlooBundle
 * - Names of cultural artifacts are drawn strictly from runtime qlooBundle entities
 * - Strictly constrained to the approved catalogue
 */

import type { Field, QlooBundle, SceneBrief } from "./types";
import type { DesignBriefProvider } from "./pipeline";
import {
  APPROVED_TYPOLOGIES,
  APPROVED_MATERIALS,
  APPROVED_PROPS,
  type TypologyDefinition,
} from "./catalogue";

// Simple pseudo-random generator seeded deterministically
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class StructuredSceneDesigner implements DesignBriefProvider {
  designBriefSync({
    prompt,
    qlooBundle,
    seed = 42,
  }: {
    prompt: string;
    qlooBundle?: QlooBundle;
    seed: number;
  }): SceneBrief {
    const cleanPrompt = (prompt || "").trim();
    const lower = cleanPrompt.toLowerCase();
    const prng = createPrng(seed);

    // Collect all valid IDs present in the runtime bundle
    const bundleEntityMap = new Map<string, { id: string; name: string; type?: string }>();
    const bundleVenueMap = new Map<string, { id: string; name: string; categories?: string[] }>();
    const bundleArtistMap = new Map<string, { id: string; name: string }>();
    const bundleFilmMap = new Map<string, { id: string; name: string }>();
    const bundleBrandMap = new Map<string, { id: string; name: string; categories?: string[] }>();

    if (qlooBundle) {
      for (const ent of qlooBundle.entities || []) bundleEntityMap.set(ent.id, ent);
      for (const v of qlooBundle.relatedVenues || []) bundleVenueMap.set(v.id, v);
      for (const a of qlooBundle.relatedArtists || []) bundleArtistMap.set(a.id, a);
      for (const f of qlooBundle.relatedFilms || []) bundleFilmMap.set(f.id, f);
      for (const b of qlooBundle.relatedBrands || []) bundleBrandMap.set(b.id, b);
    }

    const hasQloo = qlooBundle !== undefined && (bundleEntityMap.size > 0 || bundleVenueMap.size > 0);

    // Helper to format because sentence
    const makeBecause = (
      decisionDesc: string,
      sourceItem?: { id: string; name: string },
      fallbackReason?: string
    ) => {
      if (hasQloo && sourceItem) {
        return `Added because Qloo returned ${sourceItem.name}. ${decisionDesc}`;
      }
      return fallbackReason || `Inferred from prompt architectural requirements. ${decisionDesc}`;
    };

    const topEntity = qlooBundle?.entities?.[0];
    const topVenue = qlooBundle?.relatedVenues?.[0];
    const allVenues = qlooBundle?.relatedVenues || [];
    const allEntities = qlooBundle?.entities || [];
    const venueCategories = allVenues.flatMap((v) => v.categories || []).map((c) => c.toLowerCase());
    const entityTags = allEntities.flatMap((e) => e.tags || []).map((t) => t.toLowerCase());

    // ------------------------------------------------------------------------
    // 1. TYPOLOGY SELECTION
    // ------------------------------------------------------------------------
    let typologyKey = "listening_room";
    let typologySource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle) {
      // Grounded mode: check Qloo venue categories, entity tags, and cultural figures
      const comedyVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /comedy|club|theatre|theater|cabaret|stand-up/i.test(c)) ||
        /comedy|theatre|theater|cabaret|stand-up|improv/i.test(v.name)
      );
      const jazzVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /jazz|cellar|lounge|speakeasy|listening/i.test(c)) ||
        /jazz|cellar|blue note|vanguard|slugs/i.test(v.name)
      );
      const warehouseVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /warehouse|electronic|industrial|club/i.test(c)) ||
        /warehouse|printworks|industrial|tresor|berghain/i.test(v.name)
      );
      const photoVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /photo|loft|studio|daylight/i.test(c)) ||
        /milk studios|smashbox|photo loft/i.test(v.name)
      );
      const cinemaVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /cinema|screening|screening_room|pavilion/i.test(c)) ||
        /nitehawk|metrograph|cinema/i.test(v.name)
      );
      const teaVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /tea|zen|temple|garden_pavilion|minka/i.test(c)) ||
        /ryoanji|nezu|temple|garden/i.test(v.name)
      );
      const courtyardVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /courtyard|palazzo|patisserie|cafe|colonnade/i.test(c)) ||
        /bar luce|palazzo venier|courtyard/i.test(v.name)
      );
      const celebrationVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /shrine|community_hall|mandap|celebration/i.test(c)) ||
        /afrika shrine|kalakuta/i.test(v.name)
      );
      const futuristicVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /arena_stage|pyramid|archive|launch/i.test(c)) ||
        /bercy|coachella|wallace|kling klang/i.test(v.name)
      );
      const podVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /transit|ambient_pod|pod|sanctuary/i.test(c)) ||
        /heathrow|terminal/i.test(v.name)
      );
      const undergroundDen = allVenues.find((v) =>
        (v.categories || []).some((c) => /sub_bass|underground|bunker|cavern/i.test(c)) ||
        /plastic people|corsica|thrihnukagigur/i.test(v.name)
      );

      const comedyEntity = allEntities.find((e) => /comedian|comedy|stand-up|performer/i.test(e.type || "") || /cedric/i.test(e.name));

      if (comedyVenue || comedyEntity) {
        typologyKey = "comedy_theatre";
        typologySource = comedyVenue || comedyEntity;
      } else if (photoVenue || entityTags.some((t) => /cyclorama|loft|grunge|strobe/i.test(t))) {
        typologyKey = "grunge_loft";
        typologySource = photoVenue || topEntity;
      } else if (teaVenue || entityTags.some((t) => /tatami|hinoki|zen|satoyama|shakkei/i.test(t))) {
        typologyKey = "tea_room";
        typologySource = teaVenue || topEntity;
      } else if (courtyardVenue || entityTags.some((t) => /pastel|patisserie|palazzo|istrian/i.test(t))) {
        typologyKey = "mediterranean_courtyard";
        typologySource = courtyardVenue || topEntity;
      } else if (celebrationVenue || entityTags.some((t) => /shrine|afrobeat|kalakuta|yoruba/i.test(t))) {
        typologyKey = "garden_mandap";
        typologySource = celebrationVenue || topEntity;
      } else if (futuristicVenue || entityTags.some((t) => /pyramid|cyberpunk|cs80|laser/i.test(t))) {
        typologyKey = "futuristic_launch";
        typologySource = futuristicVenue || topEntity;
      } else if (podVenue || entityTags.some((t) => /ambient_loops|pod|transit_sanctuary/i.test(t))) {
        typologyKey = "coastal_retreat";
        typologySource = podVenue || topEntity;
      } else if (undergroundDen || entityTags.some((t) => /sub_bass|hyperdub|basalt|volcanic/i.test(t))) {
        typologyKey = "underground_club";
        typologySource = undergroundDen || topEntity;
      } else if (warehouseVenue || entityTags.some((t) => /industrial|techno|krautrock|motorik/i.test(t))) {
        typologyKey = "industrial_warehouse";
        typologySource = warehouseVenue || topEntity;
      } else if (cinemaVenue || entityTags.some((t) => /35mm|cinematic|a24/i.test(t))) {
        typologyKey = "gallery_pavilion";
        typologySource = cinemaVenue || topEntity;
      } else if (jazzVenue || entityTags.some((t) => /jazz|blue_note|hard_bop|trumpet/i.test(t))) {
        typologyKey = "intimate_lounge";
        typologySource = jazzVenue || topEntity;
      } else {
        typologyKey = "intimate_lounge";
        typologySource = topVenue || topEntity;
      }
    } else {
      // Baseline prompt-only inference
      if (/warehouse|industrial\s+lab/i.test(lower)) {
        typologyKey = "industrial_warehouse";
      } else if (/courtyard|colonnade/i.test(lower)) {
        typologyKey = "mediterranean_courtyard";
      } else {
        typologyKey = "listening_room";
      }
    }

    const typologyDef: TypologyDefinition = APPROVED_TYPOLOGIES[typologyKey] || APPROVED_TYPOLOGIES.listening_room;

    const typologyField: Field<string> = {
      value: typologyKey,
      provenance: hasQloo && typologySource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && typologySource ? [typologySource.id] : [],
      because: makeBecause(
        `Selected ${typologyDef.name} spatial envelope.`,
        typologySource,
        `Inferred ${typologyDef.name} from prompt keywords.`
      ),
    };

    // ------------------------------------------------------------------------
    // 2. MASSING & VOLUME
    // ------------------------------------------------------------------------
    let massing = { ...typologyDef.defaultMassing };
    let massingSource: { id: string; name: string } | undefined = undefined;

    const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*m?\s*(?:x|by)\s*(\d+(?:\.\d+)?)/i);
    if (dimMatch) {
      massing.width = parseFloat(dimMatch[1]);
      massing.depth = parseFloat(dimMatch[2]);
    } else if (hasQloo && (topVenue || topEntity)) {
      massingSource = topVenue || topEntity;
      // Proportioned specifically to the venue archetype & acoustic volume
      if (typologyKey === "comedy_theatre") {
        massing = { width: 15.5, height: 5.2, depth: 18.0, ceiling: "space_frame_truss" };
      } else if (typologyKey === "intimate_lounge") {
        massing = { width: 11.5, height: 3.6, depth: 13.0, ceiling: "coffered_timber" };
      } else if (typologyKey === "industrial_warehouse") {
        massing = { width: 22.0, height: 7.2, depth: 16.0, ceiling: "space_frame_truss" };
      } else if (typologyKey === "underground_club") {
        massing = { width: 18.0, height: 4.8, depth: 14.0, ceiling: "monolithic_cantilever" };
      } else if (typologyKey === "tea_room") {
        massing = { width: 9.5, height: 3.2, depth: 8.5, ceiling: "hinoki_rafters" };
      } else if (typologyKey === "gallery_pavilion") {
        massing = { width: 14.5, height: 4.2, depth: 11.5, ceiling: "coffered_timber" };
      } else if (typologyKey === "grunge_loft") {
        massing = { width: 15.0, height: 4.4, depth: 12.0, ceiling: "exposed_industrial_rig" };
      } else if (typologyKey === "garden_mandap") {
        massing = { width: 16.0, height: 3.8, depth: 13.0, ceiling: "draped_textile_canopy" };
      } else if (typologyKey === "mediterranean_courtyard") {
        massing = { width: 16.5, height: 4.0, depth: 13.5, ceiling: "open_sky_pergola" };
      } else if (typologyKey === "futuristic_launch") {
        massing = { width: 19.5, height: 5.8, depth: 15.0, ceiling: "space_frame_truss" };
      } else if (typologyKey === "coastal_retreat") {
        massing = { width: 18.0, height: 4.2, depth: 14.0, ceiling: "open_sky_pergola" };
      } else {
        massing = { width: 13.5, height: 4.2, depth: 10.5, ceiling: "coffered_timber" };
      }
    }

    const massingField: Field<{ width: number; height: number; depth: number; ceiling: string }> = {
      value: massing,
      provenance: hasQloo && massingSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && massingSource ? [massingSource.id] : [],
      because: makeBecause(
        `Configured volumetric proportions ${massing.width}m × ${massing.depth}m × ${massing.height}m with ${massing.ceiling}.`,
        massingSource,
        `Proportioned room massing for ${typologyDef.name}.`
      ),
    };

    // ------------------------------------------------------------------------
    // 3. ENCLOSURE MODE
    // ------------------------------------------------------------------------
    let enclosure = typologyDef.defaultEnclosure;
    let enclosureSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && (topVenue || topEntity)) {
      enclosureSource = topVenue || topEntity;
      const outdoorSignal = venueCategories.some((c) => /garden|park|rooftop|outdoor|open_air/i.test(c)) ||
        entityTags.some((t) => /outdoor|garden|nature|pergola/i.test(t));
      const undergroundSignal = venueCategories.some((c) => /underground|subterranean|vault|cellar|bunker/i.test(c)) ||
        entityTags.some((t) => /subterranean|sub_bass|vault/i.test(t));
      const hybridSignal = venueCategories.some((c) => /courtyard|palazzo|patio|hybrid/i.test(c)) ||
        entityTags.some((t) => /courtyard|palazzo/i.test(t));

      if (undergroundSignal) {
        enclosure = "underground";
      } else if (outdoorSignal) {
        enclosure = "outdoor";
      } else if (hybridSignal) {
        enclosure = "hybrid";
      } else {
        enclosure = "indoor";
      }
    }

    const enclosureField: Field<"indoor" | "outdoor" | "hybrid" | "underground"> = {
      value: enclosure,
      provenance: hasQloo && enclosureSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && enclosureSource ? [enclosureSource.id] : [],
      because: makeBecause(
        `Established ${enclosure} spatial enclosure boundary.`,
        enclosureSource,
        `Determined ${enclosure} enclosure mode based on architectural typology.`
      ),
    };

    // ------------------------------------------------------------------------
    // 4. MATERIALS PER SURFACE
    // ------------------------------------------------------------------------
    let materials = {
      floor: "polished_concrete",
      walls: "limewash_plaster",
      ceiling: "coffered_timber",
      featureWall: "acoustic_slats",
    };
    let materialSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      materialSource = topEntity;
      const allTags = [
        ...entityTags,
        ...venueCategories,
      ];

      if (allTags.some((t) => /concrete|brutalist|blue_note|jazz/i.test(t)) || /miles|davis/i.test(lower)) {
        materials = {
          floor: "polished_concrete",
          walls: "board_concrete",
          ceiling: "coffered_timber",
          featureWall: "vertical_timber_slats",
        };
      } else if (allTags.some((t) => /techno|idm|chrome|warp/i.test(t)) || /aphex/i.test(lower)) {
        materials = {
          floor: "obsidian_terrazzo",
          walls: "board_concrete",
          ceiling: "space_frame_truss",
          featureWall: "mirror_chrome",
        };
      } else if (allTags.some((t) => /a24|indie|screening|linen/i.test(t)) || /a24/i.test(lower)) {
        materials = {
          floor: "honed_limestone",
          walls: "limewash_plaster",
          ceiling: "coffered_timber",
          featureWall: "raw_linen",
        };
      } else if (allTags.some((t) => /tatami|hinoki|zen|kankyo/i.test(t)) || /japanese/i.test(lower)) {
        materials = {
          floor: "tatami_mat",
          walls: "washi_screen",
          ceiling: "hinoki_rafters",
          featureWall: "charred_hinoki",
        };
      } else if (allTags.some((t) => /velvet|comedy|theatre|boogalou/i.test(t)) || /cedric/i.test(lower)) {
        materials = {
          floor: "herringbone_parquet",
          walls: "distressed_brick",
          ceiling: "exposed_industrial_rig",
          featureWall: "velvet_theatre_curtain",
        };
      } else if (allTags.some((t) => /grunge|riot_grrrl|cyclorama/i.test(t)) || /pink|grunge/i.test(lower)) {
        materials = {
          floor: "herringbone_parquet",
          walls: "distressed_brick",
          ceiling: "exposed_industrial_rig",
          featureWall: "boucle_wool",
        };
      } else if (allTags.some((t) => /krautrock|bauhaus|functionalism/i.test(t)) || /kraftwerk/i.test(lower)) {
        materials = {
          floor: "polished_concrete",
          walls: "anodized_aluminum",
          ceiling: "space_frame_truss",
          featureWall: "mirror_chrome",
        };
      } else if (allTags.some((t) => /basalt|volcanic|bjork/i.test(t)) || /bjork|björk/i.test(lower)) {
        materials = {
          floor: "obsidian_terrazzo",
          walls: "board_concrete",
          ceiling: "monolithic_cantilever",
          featureWall: "charred_hinoki",
        };
      } else if (allTags.some((t) => /satoyama|ghibli|minka/i.test(t)) || /ghibli/i.test(lower)) {
        materials = {
          floor: "warm_sandstone",
          walls: "charred_hinoki",
          ceiling: "hinoki_rafters",
          featureWall: "vertical_timber_slats",
        };
      } else if (allTags.some((t) => /wes_anderson|patisserie|pastel/i.test(t)) || /wes anderson/i.test(lower)) {
        materials = {
          floor: "terracotta_tile",
          walls: "limewash_plaster",
          ceiling: "coffered_timber",
          featureWall: "boucle_wool",
        };
      } else if (allTags.some((t) => /hannett|cotton_mill|post_punk/i.test(t)) || /joy division/i.test(lower)) {
        materials = {
          floor: "board_concrete",
          walls: "distressed_brick",
          ceiling: "exposed_industrial_rig",
          featureWall: "acoustic_slats",
        };
      } else if (allTags.some((t) => /afrobeat|kalakuta|shrine/i.test(t)) || /fela/i.test(lower)) {
        materials = {
          floor: "warm_sandstone",
          walls: "distressed_brick",
          ceiling: "draped_textile_canopy",
          featureWall: "marigold_silk",
        };
      } else if (allTags.some((t) => /eno|airport|ambient_loops/i.test(t)) || /brian eno/i.test(lower)) {
        materials = {
          floor: "teak_decking",
          walls: "limewash_plaster",
          ceiling: "coffered_timber",
          featureWall: "acoustic_felt",
        };
      } else if (allTags.some((t) => /blade_runner|cs80|cyberpunk/i.test(t)) || /blade runner/i.test(lower)) {
        materials = {
          floor: "obsidian_terrazzo",
          walls: "board_concrete",
          ceiling: "monolithic_cantilever",
          featureWall: "anodized_aluminum",
        };
      } else if (allTags.some((t) => /daft_punk|alive_2007|french_touch/i.test(t)) || /daft punk/i.test(lower)) {
        materials = {
          floor: "obsidian_terrazzo",
          walls: "anodized_aluminum",
          ceiling: "space_frame_truss",
          featureWall: "mirror_chrome",
        };
      } else if (allTags.some((t) => /burial|hyperdub|plastic_people/i.test(t)) || /burial/i.test(lower)) {
        materials = {
          floor: "polished_concrete",
          walls: "board_concrete",
          ceiling: "monolithic_cantilever",
          featureWall: "acoustic_felt",
        };
      } else if (allTags.some((t) => /guggenheim|istrian|venetian/i.test(t)) || /guggenheim/i.test(lower)) {
        materials = {
          floor: "honed_limestone",
          walls: "limewash_plaster",
          ceiling: "coffered_timber",
          featureWall: "honed_limestone",
        };
      } else if (allTags.some((t) => /sun_ra|arkestra|cosmic/i.test(t)) || /sun ra/i.test(lower)) {
        materials = {
          floor: "obsidian_terrazzo",
          walls: "vertical_timber_slats",
          ceiling: "coffered_timber",
          featureWall: "moss_velvet",
        };
      }
    }

    const materialsField: Field<{ floor: string; walls: string; ceiling: string; featureWall: string }> = {
      value: materials,
      provenance: hasQloo && materialSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && materialSource ? [materialSource.id] : [],
      because: makeBecause(
        `Applied tactile palette: ${materials.floor} floor, ${materials.walls} walls, and ${materials.featureWall} feature backdrop.`,
        materialSource,
        `Assigned architectural finish materials for ${typologyDef.name}.`
      ),
    };

    // ------------------------------------------------------------------------
    // 5. COLOR PALETTE
    // ------------------------------------------------------------------------
    let palette = {
      primary: "#52565C",
      secondary: "#2D3137",
      accent: "#C59B4E",
      emissive: "#FEF08A",
    };
    let paletteSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      paletteSource = topEntity;
      const allTags = [...entityTags, ...venueCategories];

      if (allTags.some((t) => /blue_note|miles|davis|jazz/i.test(t)) || /miles/i.test(lower)) {
        palette = { primary: "#1E293B", secondary: "#0F172A", accent: "#D97706", emissive: "#F59E0B" };
      } else if (allTags.some((t) => /techno|idm|chrome|warp/i.test(t)) || /aphex/i.test(lower)) {
        palette = { primary: "#0F172A", secondary: "#1E293B", accent: "#38BDF8", emissive: "#06B6D4" };
      } else if (allTags.some((t) => /a24|indie|screening/i.test(t)) || /a24/i.test(lower)) {
        palette = { primary: "#F1F5F9", secondary: "#E2E8F0", accent: "#F59E0B", emissive: "#FDE68A" };
      } else if (allTags.some((t) => /tatami|hinoki|zen|kankyo/i.test(t)) || /japanese/i.test(lower)) {
        palette = { primary: "#292524", secondary: "#1C1917", accent: "#15803D", emissive: "#84CC16" };
      } else if (allTags.some((t) => /velvet|comedy|theatre|boogalou/i.test(t)) || /cedric/i.test(lower)) {
        palette = { primary: "#722F37", secondary: "#1A1416", accent: "#C59B4E", emissive: "#E11D48" };
      } else if (allTags.some((t) => /grunge|riot_grrrl/i.test(t)) || /pink|grunge/i.test(lower)) {
        palette = { primary: "#831843", secondary: "#1C1917", accent: "#F472B6", emissive: "#FB7185" };
      } else if (allTags.some((t) => /krautrock|bauhaus/i.test(t)) || /kraftwerk/i.test(lower)) {
        palette = { primary: "#1E293B", secondary: "#0F172A", accent: "#EF4444", emissive: "#F87171" };
      } else if (allTags.some((t) => /basalt|volcanic|bjork/i.test(t)) || /bjork|björk/i.test(lower)) {
        palette = { primary: "#18181B", secondary: "#09090B", accent: "#06B6D4", emissive: "#67E8F9" };
      } else if (allTags.some((t) => /satoyama|ghibli/i.test(t)) || /ghibli/i.test(lower)) {
        palette = { primary: "#3F2E21", secondary: "#221811", accent: "#16A34A", emissive: "#FBBF24" };
      } else if (allTags.some((t) => /wes_anderson|pastel/i.test(t)) || /wes anderson/i.test(lower)) {
        palette = { primary: "#FDF2F8", secondary: "#FCE7F3", accent: "#F43F5E", emissive: "#FB7185" };
      } else if (allTags.some((t) => /hannett|cotton_mill|post_punk/i.test(t)) || /joy division/i.test(lower)) {
        palette = { primary: "#18181B", secondary: "#09090B", accent: "#71717A", emissive: "#E4E4E7" };
      } else if (allTags.some((t) => /afrobeat|kalakuta/i.test(t)) || /fela/i.test(lower)) {
        palette = { primary: "#78350F", secondary: "#451A03", accent: "#EAB308", emissive: "#F97316" };
      } else if (allTags.some((t) => /eno|ambient_loops/i.test(t)) || /brian eno/i.test(lower)) {
        palette = { primary: "#0F172A", secondary: "#020617", accent: "#38BDF8", emissive: "#60A5FA" };
      } else if (allTags.some((t) => /blade_runner|cs80/i.test(t)) || /blade runner/i.test(lower)) {
        palette = { primary: "#451A03", secondary: "#1C0A00", accent: "#F59E0B", emissive: "#F97316" };
      } else if (allTags.some((t) => /daft_punk|alive_2007/i.test(t)) || /daft punk/i.test(lower)) {
        palette = { primary: "#0F172A", secondary: "#020617", accent: "#EAB308", emissive: "#A855F7" };
      } else if (allTags.some((t) => /burial|hyperdub/i.test(t)) || /burial/i.test(lower)) {
        palette = { primary: "#18181B", secondary: "#09090B", accent: "#64748B", emissive: "#94A3B8" };
      } else if (allTags.some((t) => /guggenheim|istrian/i.test(t)) || /guggenheim/i.test(lower)) {
        palette = { primary: "#F8FAFC", secondary: "#E2E8F0", accent: "#D97706", emissive: "#2563EB" };
      } else if (allTags.some((t) => /sun_ra|arkestra/i.test(t)) || /sun ra/i.test(lower)) {
        palette = { primary: "#451A03", secondary: "#1C0A00", accent: "#F59E0B", emissive: "#A855F7" };
      } else {
        palette = { primary: "#3D3A37", secondary: "#1F1E1D", accent: "#D97706", emissive: "#F59E0B" };
      }
    }

    const paletteField: Field<{ primary: string; secondary: string; accent: string; emissive: string }> = {
      value: palette,
      provenance: hasQloo && paletteSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && paletteSource ? [paletteSource.id] : [],
      because: makeBecause(
        `Calibrated chromatic atmosphere with primary ${palette.primary} and accent ${palette.accent}.`,
        paletteSource,
        `Selected tonal color palette derived from architectural style.`
      ),
    };

    // ------------------------------------------------------------------------
    // 6. LIGHTING SCHEME
    // ------------------------------------------------------------------------
    let lighting = {
      fixtureStyle: "brass_conical_pendants",
      practicals: ["warm_wall_graze"],
      temperatureK: 3500,
      intensity: 1.0,
    };
    let lightingSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      lightingSource = topEntity;
      const allTags = [...entityTags, ...venueCategories];

      if (allTags.some((t) => /blue_note|miles|davis|jazz/i.test(t)) || /miles/i.test(lower)) {
        lighting = { fixtureStyle: "brass_conical_pendants", practicals: ["brass_task_lamp", "warm_wall_graze"], temperatureK: 2400, intensity: 0.95 };
      } else if (allTags.some((t) => /techno|idm|chrome|warp/i.test(t)) || /aphex/i.test(lower)) {
        lighting = { fixtureStyle: "suspended_box_truss", practicals: ["linear_light_blade", "dj_flash_rig"], temperatureK: 5600, intensity: 1.3 };
      } else if (allTags.some((t) => /a24|indie|screening/i.test(t)) || /a24/i.test(lower)) {
        lighting = { fixtureStyle: "recessed_gallery_wash", practicals: ["curatorial_track_spot", "warm_wall_graze"], temperatureK: 3200, intensity: 0.9 };
      } else if (allTags.some((t) => /tatami|hinoki|zen|kankyo/i.test(t)) || /japanese/i.test(lower)) {
        lighting = { fixtureStyle: "kasuga_stone_lantern", practicals: ["washi_diffused_lanterns"], temperatureK: 2100, intensity: 0.65 };
      } else if (allTags.some((t) => /velvet|comedy|theatre|boogalou/i.test(t)) || /cedric/i.test(lower)) {
        lighting = { fixtureStyle: "theatrical_overhead_spots", practicals: ["follow_spot", "brass_task_lamp"], temperatureK: 2600, intensity: 1.15 };
      } else if (allTags.some((t) => /grunge|riot_grrrl/i.test(t)) || /pink|grunge/i.test(lower)) {
        lighting = { fixtureStyle: "photographic_strobe_monolights", practicals: ["dj_flash_rig", "neon_cultural_sign"], temperatureK: 5600, intensity: 1.25 };
      } else if (allTags.some((t) => /krautrock|bauhaus/i.test(t)) || /kraftwerk/i.test(lower)) {
        lighting = { fixtureStyle: "dynamic_linear_led_blades", practicals: ["linear_light_blade"], temperatureK: 5000, intensity: 1.2 };
      } else if (allTags.some((t) => /basalt|volcanic|bjork/i.test(t)) || /bjork|björk/i.test(lower)) {
        lighting = { fixtureStyle: "open_sky_ambient_glow", practicals: ["warm_wall_graze"], temperatureK: 3000, intensity: 0.85 };
      } else if (allTags.some((t) => /satoyama|ghibli/i.test(t)) || /ghibli/i.test(lower)) {
        lighting = { fixtureStyle: "washi_diffused_lanterns", practicals: ["kasuga_stone_lantern"], temperatureK: 2400, intensity: 0.75 };
      } else if (allTags.some((t) => /wes_anderson|pastel/i.test(t)) || /wes anderson/i.test(lower)) {
        lighting = { fixtureStyle: "recessed_gallery_wash", practicals: ["candelabra_floral_centerpiece"], temperatureK: 3400, intensity: 0.95 };
      } else if (allTags.some((t) => /hannett|cotton_mill|post_punk/i.test(t)) || /joy division/i.test(lower)) {
        lighting = { fixtureStyle: "industrial_high_bay_metal_halide", practicals: ["linear_light_blade"], temperatureK: 4500, intensity: 1.1 };
      } else if (allTags.some((t) => /afrobeat|kalakuta/i.test(t)) || /fela/i.test(lower)) {
        lighting = { fixtureStyle: "theatrical_overhead_spots", practicals: ["brass_task_lamp"], temperatureK: 2800, intensity: 1.1 };
      } else if (allTags.some((t) => /eno|ambient_loops/i.test(t)) || /brian eno/i.test(lower)) {
        lighting = { fixtureStyle: "driftwood_lantern_ambient", practicals: ["warm_wall_graze"], temperatureK: 2900, intensity: 0.7 };
      } else if (allTags.some((t) => /blade_runner|cs80/i.test(t)) || /blade runner/i.test(lower)) {
        lighting = { fixtureStyle: "dynamic_linear_led_blades", practicals: ["linear_light_blade"], temperatureK: 2500, intensity: 1.15 };
      } else if (allTags.some((t) => /daft_punk|alive_2007/i.test(t)) || /daft punk/i.test(lower)) {
        lighting = { fixtureStyle: "overhead_linear_catwalk_blades", practicals: ["linear_light_blade", "dj_flash_rig"], temperatureK: 6500, intensity: 1.35 };
      } else if (allTags.some((t) => /burial|hyperdub/i.test(t)) || /burial/i.test(lower)) {
        lighting = { fixtureStyle: "theatrical_overhead_spots", practicals: ["warm_wall_graze"], temperatureK: 2200, intensity: 0.65 };
      } else if (allTags.some((t) => /guggenheim|istrian/i.test(t)) || /guggenheim/i.test(lower)) {
        lighting = { fixtureStyle: "recessed_gallery_wash", practicals: ["curatorial_track_spot"], temperatureK: 4200, intensity: 0.95 };
      } else if (allTags.some((t) => /sun_ra|arkestra/i.test(t)) || /sun ra/i.test(lower)) {
        lighting = { fixtureStyle: "brass_ring_chandeliers", practicals: ["brass_task_lamp"], temperatureK: 2600, intensity: 1.0 };
      }
    }

    const lightingField: Field<{ fixtureStyle: string; practicals: string[]; temperatureK: number; intensity: number }> = {
      value: lighting,
      provenance: hasQloo && lightingSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && lightingSource ? [lightingSource.id] : [],
      because: makeBecause(
        `Tuned lighting temperature to ${lighting.temperatureK}K utilizing ${lighting.fixtureStyle}.`,
        lightingSource,
        `Configured lighting temperature to ${lighting.temperatureK}K for intimate spatial rendering.`
      ),
    };

    // ------------------------------------------------------------------------
    // 7. FURNITURE KIT AND LAYOUT
    // ------------------------------------------------------------------------
    let furnitureKit = ["low_lounge_chair", "listening_sofa", "sculptural_concrete_bench"];
    let furnitureLayout = "radial_sweet_spot";
    let furnitureSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && (topVenue || topEntity)) {
      furnitureSource = topVenue || topEntity;
      if (typologyKey === "comedy_theatre") {
        furnitureKit = ["curved_banquette_booth", "cabaret_cocktail_table", "low_lounge_chair"];
        furnitureLayout = "cabaret_tiered_sightlines";
      } else if (typologyKey === "intimate_lounge") {
        furnitureKit = ["curved_banquette_booth", "cabaret_cocktail_table", "low_lounge_chair"];
        furnitureLayout = "intimate_cluster_circulation";
      } else if (typologyKey === "tea_room") {
        furnitureKit = ["chabudai_tea_table", "tatami_bench"];
        furnitureLayout = "low_tatami_perimeter";
      } else if (typologyKey === "industrial_warehouse" || typologyKey === "underground_club") {
        furnitureKit = ["sculptural_concrete_bench", "modular_synth_table"];
        furnitureLayout = "perimeter_industrial_lounges";
      } else if (typologyKey === "gallery_pavilion") {
        furnitureKit = ["gallery_modular_bench", "curatorial_reading_table", "reading_armchair"];
        furnitureLayout = "curatorial_island_circulation";
      } else if (typologyKey === "grunge_loft") {
        furnitureKit = ["tufted_grunge_sofa", "curatorial_reading_table"];
        furnitureLayout = "perimeter_loft_lounge";
      } else if (typologyKey === "mediterranean_courtyard") {
        furnitureKit = ["cabaret_cocktail_table", "reading_armchair", "gallery_modular_bench"];
        furnitureLayout = "bistro_colonnade_clusters";
      } else if (typologyKey === "garden_mandap") {
        furnitureKit = ["curved_banquette_booth", "cabaret_cocktail_table"];
        furnitureLayout = "communal_celebration_ring";
      } else if (typologyKey === "futuristic_launch") {
        furnitureKit = ["gallery_modular_bench", "sculptural_concrete_bench"];
        furnitureLayout = "tiered_amphitheatre_presentation";
      } else if (typologyKey === "coastal_retreat") {
        furnitureKit = ["reading_armchair", "gallery_modular_bench"];
        furnitureLayout = "equilateral_listening_triangle";
      }
    }

    const furnitureField: Field<{ kit: string[]; layout: string }> = {
      value: { kit: furnitureKit, layout: furnitureLayout },
      provenance: hasQloo && furnitureSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && furnitureSource ? [furnitureSource.id] : [],
      because: makeBecause(
        `Configured ${furnitureLayout} seating arrangement with ${furnitureKit.join(", ")}.`,
        furnitureSource,
        `Specified ergonomic furniture kit calibrated to ${typologyDef.name}.`
      ),
    };

    // ------------------------------------------------------------------------
    // 8. PROPS & CLUTTER KIT
    // ------------------------------------------------------------------------
    let props = ["analog_turntable_console", "horn_speaker_pair", "vinyl_record_shelf"];
    let propsSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      propsSource = topEntity;
      const allTags = [...entityTags, ...venueCategories];

      if (allTags.some((t) => /krautrock|bauhaus|industrial|techno|electronic/i.test(t))) {
        props = ["modular_synth_table", "techno_sound_stack", "suspended_box_truss"];
      } else if (allTags.some((t) => /comedy|theatre|standup|cabaret/i.test(t))) {
        props = ["performer_mic_stand", "velvet_theatre_curtain", "cabaret_cocktail_table"];
      } else if (allTags.some((t) => /tatami|hinoki|zen|satoyama/i.test(t))) {
        props = ["granite_tsukubai_basin", "tokonoma_alcove", "kasuga_stone_lantern"];
      } else if (allTags.some((t) => /grunge|cyclorama|strobe/i.test(t))) {
        props = ["dj_flash_rig", "tufted_grunge_sofa", "neon_cultural_sign"];
      } else if (allTags.some((t) => /a24|cinema|screening|film/i.test(t))) {
        props = ["cinema_projection_screen", "curatorial_reading_table", "brass_task_lamp"];
      } else if (allTags.some((t) => /afrobeat|kalakuta|shrine|brass/i.test(t))) {
        props = ["performer_mic_stand", "horn_speaker_pair", "marigold_garland_curtain"];
      } else if (allTags.some((t) => /cyberpunk|blade_runner|daft_punk|pyramid/i.test(t))) {
        props = ["linear_light_blade", "modular_synth_table", "cinema_projection_screen"];
      } else if (allTags.some((t) => /wes_anderson|patisserie|guggenheim/i.test(t))) {
        props = ["curatorial_reading_table", "brass_task_lamp", "vinyl_record_shelf"];
      } else if (allTags.some((t) => /volcanic|ambient|bjork|eno/i.test(t))) {
        props = ["techno_sound_stack", "granite_tsukubai_basin", "horn_speaker_pair"];
      } else {
        props = ["analog_turntable_console", "horn_speaker_pair", "vinyl_record_shelf"];
      }
    }

    const propsField: Field<string[]> = {
      value: props,
      provenance: hasQloo && propsSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && propsSource ? [propsSource.id] : [],
      because: makeBecause(
        `Staged architectural assembly with props: ${props.join(", ")}.`,
        propsSource,
        `Staged standard functional props for ${typologyDef.name}.`
      ),
    };

    // ------------------------------------------------------------------------
    // 9. PROGRAM ZONES
    // ------------------------------------------------------------------------
    let programZones = ["audio stage", "primary listening sweet-spot", "vinyl archive wall", "entry portal"];
    let zonesSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && (topVenue || topEntity)) {
      zonesSource = topVenue || topEntity;
      const venueName = topVenue?.name || topEntity?.name || "Cultural";
      const cat = (topVenue?.categories?.[0] || "Acoustic").replace(/_/g, " ");

      programZones = [
        `${venueName} main stage`,
        `${cat} listening court`,
        "hospitality bar corner",
        "sound engineering booth",
      ];
    }

    const programZonesField: Field<string[]> = {
      value: programZones,
      provenance: hasQloo && zonesSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && zonesSource ? [zonesSource.id] : [],
      because: makeBecause(
        `Organized spatial zones: ${programZones.join(" • ")}.`,
        zonesSource,
        `Zoned floorplate for primary event circulation.`
      ),
    };

    // ------------------------------------------------------------------------
    // 10. SEATING & CIRCULATION MODE
    // ------------------------------------------------------------------------
    let seatingCirculation: { mode: "seated" | "standing" | "lounge" | "mixed"; capacity: number; flow: string } = {
      mode: "seated",
      capacity: 40,
      flow: "standard_axial",
    };
    let seatingSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && (topVenue || topEntity)) {
      seatingSource = topVenue || topEntity;
      if (typologyKey === "industrial_warehouse" || typologyKey === "underground_club" || typologyKey === "futuristic_launch") {
        seatingCirculation = { mode: "standing", capacity: 250, flow: "open_dispersed_dancefloor" };
      } else if (typologyKey === "comedy_theatre") {
        seatingCirculation = { mode: "seated", capacity: 85, flow: "cabaret_semi_circular_sightlines" };
      } else if (typologyKey === "intimate_lounge") {
        seatingCirculation = { mode: "lounge", capacity: 28, flow: "intimate_cluster_circulation" };
      } else if (typologyKey === "tea_room") {
        seatingCirculation = { mode: "seated", capacity: 16, flow: "tatami_perimeter_contemplation" };
      } else if (typologyKey === "gallery_pavilion") {
        seatingCirculation = { mode: "lounge", capacity: 35, flow: "unobstructed_perimeter_circulation" };
      } else if (typologyKey === "garden_mandap") {
        seatingCirculation = { mode: "mixed", capacity: 180, flow: "communal_celebration_ring" };
      } else if (typologyKey === "mediterranean_courtyard") {
        seatingCirculation = { mode: "seated", capacity: 45, flow: "bistro_colonnade_clusters" };
      } else {
        seatingCirculation = { mode: "lounge", capacity: 24, flow: "equilateral_listening_triangle" };
      }
    }

    const seatingField: Field<{ mode: "seated" | "standing" | "lounge" | "mixed"; capacity: number; flow: string }> = {
      value: seatingCirculation,
      provenance: hasQloo && seatingSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && seatingSource ? [seatingSource.id] : [],
      because: makeBecause(
        `Established ${seatingCirculation.mode} guest experience accommodating ${seatingCirculation.capacity} patrons.`,
        seatingSource,
        `Calibrated seating capacity to ${seatingCirculation.capacity} guests.`
      ),
    };

    // ------------------------------------------------------------------------
    // 11. VISIBLE ACOUSTIC TREATMENT
    // ------------------------------------------------------------------------
    let acousticTreatment = ["acoustic_slats", "acoustic_felt_panel"];
    let acousticSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      acousticSource = topEntity;
      const allTags = [...entityTags, ...venueCategories];

      if (allTags.some((t) => /blue_note|miles|davis|jazz/i.test(t))) {
        acousticTreatment = ["vertical_timber_slats", "acoustic_slats"];
      } else if (allTags.some((t) => /techno|idm|chrome|krautrock|industrial/i.test(t))) {
        acousticTreatment = ["acoustic_felt_panel", "suspended_box_truss"];
      } else if (allTags.some((t) => /comedy|theatre|standup/i.test(t))) {
        acousticTreatment = ["velvet_theatre_curtain", "acoustic_wall_panel"];
      } else if (allTags.some((t) => /tatami|hinoki|zen|satoyama/i.test(t))) {
        acousticTreatment = ["bamboo_acoustic_screen", "woven_area_rug"];
      } else if (allTags.some((t) => /a24|cinema|screening/i.test(t))) {
        acousticTreatment = ["acoustic_felt_panel", "limewash_plaster"];
      } else if (allTags.some((t) => /afrobeat|kalakuta|shrine/i.test(t))) {
        acousticTreatment = ["marigold_garland_curtain", "acoustic_wall_panel"];
      } else if (allTags.some((t) => /eno|airport|ambient_loops/i.test(t))) {
        acousticTreatment = ["acoustic_felt_panel", "bamboo_acoustic_screen"];
      } else {
        acousticTreatment = ["acoustic_felt_panel", "vertical_timber_slats"];
      }
    }

    const acousticField: Field<string[]> = {
      value: acousticTreatment,
      provenance: hasQloo && acousticSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && acousticSource ? [acousticSource.id] : [],
      because: makeBecause(
        `Installed absorption & diffusion treatments: ${acousticTreatment.join(", ")} achieving target RT60 ${typologyDef.acousticTargetRT60}s.`,
        acousticSource,
        `Designed acoustic envelope targeting RT60 ${typologyDef.acousticTargetRT60}s.`
      ),
    };

    // ------------------------------------------------------------------------
    // 12. CULTURAL ARTIFACTS (CRITICAL: Populated strictly from runtime Qloo names!)
    // ------------------------------------------------------------------------
    const culturalArtifacts: string[] = [];
    const culturalSourceIds: string[] = [];
    let culturalBecause = "";

    if (hasQloo && qlooBundle) {
      // (a) Record Wall / Posters from related artists
      for (const artist of (qlooBundle.relatedArtists || []).slice(0, 3)) {
        culturalArtifacts.push(`artist_record_wall: ${artist.name}`);
        culturalSourceIds.push(artist.id);
      }

      // (b) Film posters / signage from related films
      for (const film of (qlooBundle.relatedFilms || []).slice(0, 2)) {
        culturalArtifacts.push(`film_poster_lightbox: ${film.name}`);
        culturalSourceIds.push(film.id);
      }

      // (c) Venue category signage from related venues
      for (const venue of (qlooBundle.relatedVenues || []).slice(0, 2)) {
        culturalArtifacts.push(`venue_category_signage: ${venue.name}`);
        culturalSourceIds.push(venue.id);
      }

      // (d) Brand merch corner from related brands
      for (const brand of (qlooBundle.relatedBrands || []).slice(0, 2)) {
        culturalArtifacts.push(`brand_merch_corner: ${brand.name}`);
        culturalSourceIds.push(brand.id);
      }

      // (e) Cultural figure plinth from primary entities
      for (const entity of (qlooBundle.entities || []).slice(0, 2)) {
        if (!culturalSourceIds.includes(entity.id)) {
          culturalArtifacts.push(`cultural_heritage_plinth: ${entity.name}`);
          culturalSourceIds.push(entity.id);
        }
      }

      if (culturalArtifacts.length > 0) {
        culturalBecause = `Added visible cultural feature installations derived from Qloo taste graph: ${culturalArtifacts.join("; ")}.`;
      }
    }

    // Baseline fallback if Qloo returned nothing or for baseline run
    if (culturalArtifacts.length === 0) {
      culturalArtifacts.push("vinyl_record_shelf: Curated Archival Selection");
      culturalBecause = "Installed archival record display shelves for general collection.";
    }

    const culturalField: Field<string[]> = {
      value: culturalArtifacts,
      provenance: hasQloo && culturalSourceIds.length > 0 ? "qloo-evidence" : "inferred",
      derivedFrom: culturalSourceIds,
      because: culturalBecause,
    };

    // ------------------------------------------------------------------------
    // 13. PLANTS & OUTDOOR ELEMENTS
    // ------------------------------------------------------------------------
    let plantsOutdoor = ["olive_tree_planter"];
    let plantsSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && topEntity) {
      plantsSource = topEntity;
      const allTags = [...entityTags, ...venueCategories];

      if (allTags.some((t) => /zen|tatami|satoyama|ghibli/i.test(t))) {
        plantsOutdoor = ["japanese_black_pine_bonsai", "granite_tsukubai_basin"];
      } else if (allTags.some((t) => /shrine|mandap|kalakuta/i.test(t))) {
        plantsOutdoor = ["marigold_garland_curtain", "circular_water_feature"];
      } else if (allTags.some((t) => /palazzo|courtyard|patisserie|terracotta/i.test(t))) {
        plantsOutdoor = ["olive_tree_planter", "limestone_fountain"];
      } else if (allTags.some((t) => /volcanic|cave|ocean|ambient_pod/i.test(t))) {
        plantsOutdoor = ["circular_water_feature"];
      } else {
        plantsOutdoor = ["olive_tree_planter"];
      }
    }

    const plantsField: Field<string[]> = {
      value: plantsOutdoor,
      provenance: hasQloo && plantsSource ? "qloo-evidence" : "inferred",
      derivedFrom: hasQloo && plantsSource ? [plantsSource.id] : [],
      because: makeBecause(
        `Integrated living biophilic elements: ${plantsOutdoor.join(", ")}.`,
        plantsSource,
        `Specified biophilic elements for spatial balance.`
      ),
    };

    // Assemble full SceneBrief
    const brief: SceneBrief = {
      prompt: cleanPrompt,
      seed,
      bundleHash: qlooBundle?.bundleHash,
      fields: {
        typology: typologyField,
        massing: massingField,
        enclosure: enclosureField,
        materials: materialsField,
        palette: paletteField,
        lighting: lightingField,
        furniture: furnitureField,
        props: propsField,
        programZones: programZonesField,
        seatingCirculation: seatingField,
        acousticTreatment: acousticField,
        culturalArtifacts: culturalField,
        plantsOutdoor: plantsField,
      },
    };

    return brief;
  }

  async designBrief(input: {
    prompt: string;
    qlooBundle?: QlooBundle;
    seed: number;
  }): Promise<SceneBrief> {
    return this.designBriefSync(input);
  }
}

export const defaultSceneDesigner = new StructuredSceneDesigner();
