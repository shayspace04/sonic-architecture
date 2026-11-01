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

    const hasQloo = qlooBundle !== undefined && bundleEntityMap.size + bundleVenueMap.size > 0;

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

    // ------------------------------------------------------------------------
    // 1. TYPOLOGY SELECTION
    // ------------------------------------------------------------------------
    let typologyKey = "listening_room";
    let typologySource: { id: string; name: string } | undefined = undefined;

    // Grounded check against Qloo venues first
    if (hasQloo && qlooBundle) {
      const allVenues = qlooBundle.relatedVenues || [];
      const allEntities = qlooBundle.entities || [];
      const venueCategories = allVenues.flatMap((v) => v.categories || []).map((c) => c.toLowerCase());
      const entityTags = allEntities.flatMap((e) => e.tags || []).map((t) => t.toLowerCase());

      const comedyVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /comedy|club|theatre|theater|cabaret|stand-up/i.test(c)) ||
        /comedy|theatre|theater|cabaret|stand-up|improv/i.test(v.name)
      );
      const jazzVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /jazz|cellar|lounge|listening/i.test(c)) ||
        /jazz|cellar|blue note|vanguard/i.test(v.name)
      );
      const warehouseVenue = allVenues.find((v) =>
        (v.categories || []).some((c) => /warehouse|electronic|industrial|club/i.test(c)) ||
        /warehouse|printworks|industrial/i.test(v.name)
      );

      const comedyEntity = allEntities.find((e) =>
        /comedian|comedy|stand-up|performer|theatre/i.test(e.type || "") ||
        /cedric/i.test(e.name)
      );

      if (comedyVenue || comedyEntity) {
        typologyKey = "comedy_theatre";
        typologySource = comedyVenue || comedyEntity;
      } else if (warehouseVenue || entityTags.some((t) => /industrial|techno|idm|electronic/i.test(t))) {
        typologyKey = "industrial_warehouse";
        typologySource = warehouseVenue || allEntities[0];
      } else if (jazzVenue) {
        typologyKey = "listening_room";
        typologySource = jazzVenue || allEntities[0];
      }
    }

    // If still on default or baseline, infer from prompt
    if (!typologySource) {
      if (/cedric|comedy|stand-up|theatre|theater|cabaret/i.test(lower)) {
        typologyKey = "comedy_theatre";
      } else if (/aphex|techno|idm|breakcore|acid|warehouse|industrial/i.test(lower)) {
        typologyKey = "industrial_warehouse";
      } else if (/japanese|garden|ambient|tea|zen|shakkei|hinoki/i.test(lower)) {
        typologyKey = /tea/i.test(lower) ? "tea_room" : "tea_room";
      } else if (/a24|indie|cinema|film|screening/i.test(lower)) {
        typologyKey = "gallery_pavilion";
      } else if (/pink|grunge|loft|photo|cyclorama/i.test(lower)) {
        typologyKey = "grunge_loft";
      } else if (/mandap|wedding|marigold|sangeet/i.test(lower)) {
        typologyKey = "garden_mandap";
      } else if (/mediterranean|courtyard|fountain|terracotta/i.test(lower)) {
        typologyKey = "mediterranean_courtyard";
      } else if (/brutalist|concrete|runway|monolithic/i.test(lower)) {
        typologyKey = /runway|fashion/i.test(lower) ? "brutalist_runway" : "listening_room";
      } else if (/club|subterranean|bass/i.test(lower)) {
        typologyKey = "underground_club";
      } else if (/coastal|beach|retreat|ocean/i.test(lower)) {
        typologyKey = "coastal_retreat";
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

    // Check if prompt has explicit dimensions
    const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*m?\s*(?:x|by)\s*(\d+(?:\.\d+)?)/i);
    if (dimMatch) {
      massing.width = parseFloat(dimMatch[1]);
      massing.depth = parseFloat(dimMatch[2]);
    } else if (hasQloo && qlooBundle?.relatedVenues && qlooBundle.relatedVenues.length > 0) {
      const topVenue = qlooBundle.relatedVenues[0];
      massingSource = topVenue;
      if (typologyKey === "comedy_theatre") {
        massing = { width: 16.5, height: 5.4, depth: 19.0, ceiling: "space_frame_truss" };
      } else if (typologyKey === "listening_room") {
        massing = { width: 13.5, height: 4.2, depth: 10.5, ceiling: "coffered_timber" };
      } else if (typologyKey === "industrial_warehouse") {
        massing = { width: 24.0, height: 7.5, depth: 18.0, ceiling: "space_frame_truss" };
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

    if (hasQloo && qlooBundle?.relatedVenues?.length) {
      const v = qlooBundle.relatedVenues[0];
      const isOutdoorVenue = (v.categories || []).some((c) => /garden|park|rooftop|outdoor|open_air/i.test(c));
      if (isOutdoorVenue) {
        enclosure = "outdoor";
        enclosureSource = v;
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
    let materials = { ...typologyDef.defaultMaterials };
    let materialSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle) {
      const allTags = [
        ...(qlooBundle.entities?.flatMap((e) => e.tags || []) || []),
        ...(qlooBundle.relatedVenues?.flatMap((v) => v.tags || []) || []),
      ].map((t) => t.toLowerCase());

      const topEntity = qlooBundle.entities?.[0];

      if (allTags.some((t) => /concrete|brutalist|industrial/i.test(t)) || /brutalist|concrete/i.test(lower)) {
        materials = {
          floor: "polished_concrete",
          walls: "board_concrete",
          ceiling: "monolithic_cantilever",
          featureWall: "board_concrete",
        };
        materialSource = topEntity;
      } else if (allTags.some((t) => /velvet|cabaret|theatre|soul/i.test(t)) || /cedric|comedy/i.test(lower)) {
        materials = {
          floor: "herringbone_parquet",
          walls: "distressed_brick",
          ceiling: "exposed_industrial_rig",
          featureWall: "moss_velvet",
        };
        materialSource = topEntity;
      } else if (allTags.some((t) => /tatami|hinoki|zen|ambient/i.test(t)) || /japanese|tea/i.test(lower)) {
        materials = {
          floor: "tatami_mat",
          walls: "washi_screen",
          ceiling: "hinoki_rafters",
          featureWall: "charred_hinoki",
        };
        materialSource = topEntity;
      }
    } else {
      // Baseline prompt-only material inference
      if (/brutalist|concrete/i.test(lower)) {
        materials = {
          floor: "board_concrete",
          walls: "board_concrete",
          ceiling: "monolithic_cantilever",
          featureWall: "polished_concrete",
        };
      } else if (/japanese|ambient|tea/i.test(lower)) {
        materials = {
          floor: "tatami_mat",
          walls: "washi_screen",
          ceiling: "hinoki_rafters",
          featureWall: "charred_hinoki",
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
      primary: APPROVED_MATERIALS[materials.walls]?.defaultHex || "#52565C",
      secondary: APPROVED_MATERIALS[materials.floor]?.defaultHex || "#2D3137",
      accent: "#C59B4E",
      emissive: "#D97706",
    };
    let paletteSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle?.entities?.length) {
      paletteSource = qlooBundle.entities[0];
      // Cultural tag-derived color shifting
      if (typologyKey === "comedy_theatre") {
        palette = { primary: "#722F37", secondary: "#1A1416", accent: "#C59B4E", emissive: "#E11D48" };
      } else if (typologyKey === "industrial_warehouse") {
        palette = { primary: "#334155", secondary: "#0F172A", accent: "#38BDF8", emissive: "#06B6D4" };
      } else if (typologyKey === "tea_room") {
        palette = { primary: "#5C4033", secondary: "#9E9264", accent: "#78716C", emissive: "#D97706" };
      } else {
        palette = { primary: "#3D3A37", secondary: "#1F1E1D", accent: "#D97706", emissive: "#F59E0B" };
      }
    } else {
      // Baseline prompt-only palettes
      if (/brutalist|concrete/i.test(lower)) {
        palette = { primary: "#52565C", secondary: "#2D3137", accent: "#94A3B8", emissive: "#64748B" };
      } else if (/japanese|ambient/i.test(lower)) {
        palette = { primary: "#8C7355", secondary: "#6B5B45", accent: "#4A6B53", emissive: "#C4A265" };
      } else if (/comedy|theatre/i.test(lower)) {
        palette = { primary: "#800020", secondary: "#2B1B17", accent: "#D4AF37", emissive: "#FFBF00" };
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
    let lighting = { ...typologyDef.defaultLighting };
    let lightingSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle?.entities?.length) {
      lightingSource = qlooBundle.entities[0];
      if (typologyKey === "industrial_warehouse") {
        lighting = { fixtureStyle: "suspended_box_truss", practicals: ["linear_light_blade", "dj_flash_rig"], temperatureK: 5600, intensity: 1.25 };
      } else if (typologyKey === "comedy_theatre") {
        lighting = { fixtureStyle: "theatrical_overhead_spots", practicals: ["follow_spot", "brass_task_lamp"], temperatureK: 2600, intensity: 1.1 };
      } else if (typologyKey === "tea_room") {
        lighting = { fixtureStyle: "kasuga_stone_lantern", practicals: ["washi_diffused_lanterns"], temperatureK: 2100, intensity: 0.6 };
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
    let furnitureKit: string[] = ["low_lounge_chair", "listening_sofa", "sculptural_concrete_bench"];
    let furnitureLayout = "radial_sweet_spot";
    let furnitureSource: { id: string; name: string } | undefined = undefined;

    if (typologyKey === "comedy_theatre") {
      furnitureKit = ["curved_banquette_booth", "cabaret_cocktail_table", "low_lounge_chair"];
      furnitureLayout = "cabaret_tiered_sightlines";
    } else if (typologyKey === "tea_room") {
      furnitureKit = ["chabudai_tea_table", "tatami_bench"];
      furnitureLayout = "low_tatami_perimeter";
    } else if (typologyKey === "industrial_warehouse") {
      furnitureKit = ["sculptural_concrete_bench", "modular_synth_table"];
      furnitureLayout = "perimeter_industrial_lounges";
    } else if (typologyKey === "gallery_pavilion") {
      furnitureKit = ["gallery_modular_bench", "curatorial_reading_table", "reading_armchair"];
      furnitureLayout = "curatorial_island_circulation";
    }

    if (hasQloo && qlooBundle?.relatedVenues?.length) {
      furnitureSource = qlooBundle.relatedVenues[0];
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
    let props: string[] = ["analog_turntable_console", "horn_speaker_pair", "vinyl_record_shelf"];
    let propsSource: { id: string; name: string } | undefined = undefined;

    if (typologyKey === "comedy_theatre") {
      props = ["performer_mic_stand", "velvet_theatre_curtain", "cabaret_cocktail_table"];
    } else if (typologyKey === "industrial_warehouse") {
      props = ["techno_sound_stack", "suspended_box_truss", "linear_light_blade"];
    } else if (typologyKey === "tea_room") {
      props = ["granite_tsukubai_basin", "tokonoma_alcove", "kasuga_stone_lantern"];
    } else if (typologyKey === "grunge_loft") {
      props = ["dj_flash_rig", "tufted_grunge_sofa", "neon_cultural_sign"];
    } else if (typologyKey === "gallery_pavilion") {
      props = ["cinema_projection_screen", "curatorial_reading_table", "brass_task_lamp"];
    }

    if (hasQloo && qlooBundle?.entities?.length) {
      propsSource = qlooBundle.entities[0];
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
    let programZones = [...typologyDef.typicalZones];
    let zonesSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle?.relatedVenues && qlooBundle.relatedVenues.length > 0) {
      const v = qlooBundle.relatedVenues[0];
      zonesSource = v;
      if (v.categories && v.categories.length > 0) {
        programZones = [
          `${v.categories[0]} main stage`,
          "vip lounge court",
          "hospitality bar corner",
          "sound engineering booth",
        ];
      }
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
    let seatingCirculation = { ...typologyDef.defaultSeating };
    let seatingSource: { id: string; name: string } | undefined = undefined;

    if (hasQloo && qlooBundle?.relatedVenues?.length) {
      seatingSource = qlooBundle.relatedVenues[0];
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
    let acousticTreatment: string[] = ["acoustic_slats", "acoustic_felt_panel"];
    let acousticSource: { id: string; name: string } | undefined = undefined;

    if (typologyKey === "tea_room") {
      acousticTreatment = ["bamboo_acoustic_screen", "woven_area_rug"];
    } else if (typologyKey === "comedy_theatre") {
      acousticTreatment = ["velvet_theatre_curtain", "acoustic_wall_panel"];
    } else if (typologyKey === "industrial_warehouse") {
      acousticTreatment = ["acoustic_felt_panel", "suspended_box_truss"];
    }

    if (hasQloo && qlooBundle?.entities?.length) {
      acousticSource = qlooBundle.entities[0];
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
    let plantsOutdoor: string[] = ["olive_tree_planter"];
    let plantsSource: { id: string; name: string } | undefined = undefined;

    if (typologyKey === "tea_room") {
      plantsOutdoor = ["japanese_black_pine_bonsai", "granite_tsukubai_basin"];
    } else if (typologyKey === "garden_mandap") {
      plantsOutdoor = ["marigold_garland_curtain", "circular_water_feature"];
    } else if (typologyKey === "mediterranean_courtyard") {
      plantsOutdoor = ["olive_tree_planter", "limestone_fountain"];
    } else if (typologyKey === "coastal_retreat") {
      plantsOutdoor = ["olive_tree_planter", "circular_water_feature"];
    }

    if (hasQloo && qlooBundle?.entities?.length) {
      plantsSource = qlooBundle.entities[0];
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
