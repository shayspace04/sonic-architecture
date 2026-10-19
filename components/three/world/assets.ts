import { useEffect } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Asset catalogue + loaders. All bundled assets are CC0 (see
 * `public/assets/ASSET_CREDITS.md`). Models are flattened to a single
 * vertex-coloured, instancing-friendly geometry per model.
 */

export const NATURE = {
  tree_default: "/assets/nature/tree_default.glb",
  tree_detailed: "/assets/nature/tree_detailed.glb",
  tree_oak: "/assets/nature/tree_oak.glb",
  tree_fat: "/assets/nature/tree_fat.glb",
  tree_thin: "/assets/nature/tree_thin.glb",
  tree_small: "/assets/nature/tree_small.glb",
  tree_pineRoundC: "/assets/nature/tree_pineRoundC.glb",
  tree_pineTallB_detailed: "/assets/nature/tree_pineTallB_detailed.glb",
  tree_blocks: "/assets/nature/tree_blocks.glb",
  plant_bush: "/assets/nature/plant_bush.glb",
  plant_bushDetailed: "/assets/nature/plant_bushDetailed.glb",
  plant_bushLarge: "/assets/nature/plant_bushLarge.glb",
  plant_flatTall: "/assets/nature/plant_flatTall.glb",
  plant_flatShort: "/assets/nature/plant_flatShort.glb",
  grass: "/assets/nature/grass.glb",
  grass_large: "/assets/nature/grass_large.glb",
  grass_leafs: "/assets/nature/grass_leafs.glb",
  grass_leafsLarge: "/assets/nature/grass_leafsLarge.glb",
  flower_purpleA: "/assets/nature/flower_purpleA.glb",
  flower_redA: "/assets/nature/flower_redA.glb",
  flower_yellowA: "/assets/nature/flower_yellowA.glb",
  flower_purpleC: "/assets/nature/flower_purpleC.glb",
  flower_redC: "/assets/nature/flower_redC.glb",
  rock_largeA: "/assets/nature/rock_largeA.glb",
  rock_largeB: "/assets/nature/rock_largeB.glb",
  rock_smallA: "/assets/nature/rock_smallA.glb",
  rock_smallB: "/assets/nature/rock_smallB.glb",
  rock_tallA: "/assets/nature/rock_tallA.glb",
  stone_smallA: "/assets/nature/stone_smallA.glb",
  stone_tallA: "/assets/nature/stone_tallA.glb",
  log: "/assets/nature/log.glb",
  log_large: "/assets/nature/log_large.glb",
  stump_round: "/assets/nature/stump_round.glb",
  mushroom_red: "/assets/nature/mushroom_red.glb",
  mushroom_tan: "/assets/nature/mushroom_tan.glb",
  statue_column: "/assets/nature/statue_column.glb",
  statue_ring: "/assets/nature/statue_ring.glb",
  statue_obelisk: "/assets/nature/statue_obelisk.glb",
  statue_block: "/assets/nature/statue_block.glb",
  bridge_wood: "/assets/nature/bridge_wood.glb",
  bridge_side_wood: "/assets/nature/bridge_side_wood.glb",
  platform_stone: "/assets/nature/platform_stone.glb",
  platform_grass: "/assets/nature/platform_grass.glb",
  cliff_block_rock: "/assets/nature/cliff_block_rock.glb",
  cliff_top_rock: "/assets/nature/cliff_top_rock.glb",
  cliff_waterfall_rock: "/assets/nature/cliff_waterfall_rock.glb",
  fence_simple: "/assets/nature/fence_simple.glb",
} as const;

export type NatureKey = keyof typeof NATURE;

export const NATURE_KEYS = Object.keys(NATURE) as NatureKey[];
export const NATURE_URLS = NATURE_KEYS.map((k) => NATURE[k]);

export const TREES: NatureKey[] = [
  "tree_default",
  "tree_detailed",
  "tree_oak",
  "tree_fat",
  "tree_thin",
  "tree_small",
  "tree_pineRoundC",
  "tree_pineTallB_detailed",
  "tree_blocks",
];
export const BUSHES: NatureKey[] = [
  "plant_bush",
  "plant_bushDetailed",
  "plant_bushLarge",
  "plant_flatTall",
  "plant_flatShort",
];
export const TUFTS: NatureKey[] = ["grass", "grass_large", "grass_leafs", "grass_leafsLarge"];
export const FLOWERS: NatureKey[] = [
  "flower_purpleA",
  "flower_redA",
  "flower_yellowA",
  "flower_purpleC",
  "flower_redC",
];
export const ROCKS: NatureKey[] = [
  "rock_largeA",
  "rock_largeB",
  "rock_smallA",
  "rock_smallB",
  "rock_tallA",
  "stone_smallA",
  "stone_tallA",
];
export const PROPS: NatureKey[] = ["log", "log_large", "stump_round", "mushroom_red", "mushroom_tan"];

/* ------------------------------------------------------------- surfaces ---- */

export const SURFACE_URLS = {
  grassColor: "/assets/textures/grass/grass_Color.jpg",
  grassNormal: "/assets/textures/grass/grass_NormalGL.jpg",
  grassRough: "/assets/textures/grass/grass_Roughness.jpg",
  groundColor: "/assets/textures/ground/ground_Color.jpg",
  groundNormal: "/assets/textures/ground/ground_NormalGL.jpg",
  groundRough: "/assets/textures/ground/ground_Roughness.jpg",
  concreteColor: "/assets/textures/concrete/concrete_Color.jpg",
  concreteNormal: "/assets/textures/concrete/concrete_NormalGL.jpg",
  concreteRough: "/assets/textures/concrete/concrete_Roughness.jpg",
  woodColor: "/assets/textures/wood/wood_Color.jpg",
  woodNormal: "/assets/textures/wood/wood_NormalGL.jpg",
  woodRough: "/assets/textures/wood/wood_Roughness.jpg",
} as const;

export type SurfaceKey = keyof typeof SURFACE_URLS;
export type Surfaces = Record<SurfaceKey, THREE.Texture>;

function configure(source: THREE.Texture, srgb: boolean, repeat: number): THREE.Texture {
  // Clone so each consumer can set its own repeat/wrap without clobbering others.
  const t = source.clone();
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const SRGB_KEYS: SurfaceKey[] = ["grassColor", "groundColor", "concreteColor", "woodColor"];

/** Loads + configures the PBR surface maps (colour maps in sRGB). */
export function useSurfaces(repeat = 1): Surfaces {
  const urls = Object.values(SURFACE_URLS) as string[];
  const loaded = useLoader(THREE.TextureLoader, urls) as THREE.Texture[];
  const keys = Object.keys(SURFACE_URLS) as SurfaceKey[];
  const out = {} as Surfaces;
  keys.forEach((k, i) => {
    out[k] = configure(loaded[i], SRGB_KEYS.includes(k), repeat);
  });
  return out;
}

/* ------------------------------------------------------------------ sky ---- */

/** Loads the sky HDRI and installs it as the scene environment (IBL). */
export function useSkyEnvironment(url = "/assets/env/sky_1k.hdr"): THREE.Texture {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const hdr = useLoader(HDRLoader, url) as THREE.DataTexture;
  useEffect(() => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(hdr);
    const env = rt.texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, hdr]);
  return hdr;
}

/* --------------------------------------------------------------- models ---- */

export interface ModelGeo {
  geometry: THREE.BufferGeometry;
  height: number;
}

/**
 * Loads every nature model and returns one merged, vertex-coloured,
 * ground-centred geometry per model (ready for `InstancedMesh`).
 */
export function useNatureModels(): Record<string, ModelGeo> {
  const gltfs = useLoader(GLTFLoader, NATURE_URLS) as GLTF[];
  const out: Record<string, ModelGeo> = {};
  NATURE_KEYS.forEach((key, i) => {
    out[key] = flatten(gltfs[i]);
  });
  return out;
}

function flatten(gltf: GLTF): ModelGeo {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const src = mesh.geometry as THREE.BufferGeometry;
    const g = src.clone();
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    g.applyMatrix4(mesh.matrixWorld);
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const col = (mat as THREE.MeshStandardMaterial | undefined)?.color ?? new THREE.Color(0xbfc4c0);
    const count = g.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // drop everything we do not need, so the geometries merge cleanly
    for (const name of Object.keys(g.attributes)) {
      if (!["position", "normal", "color"].includes(name)) g.deleteAttribute(name);
    }
    geos.push(g);
  });

  let merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (!merged) merged = new THREE.BufferGeometry();
  merged.computeBoundingBox();
  const box = merged.boundingBox ?? new THREE.Box3();
  const center = new THREE.Vector3();
  box.getCenter(center);
  merged.translate(-center.x, -box.min.y, -center.z);
  merged.computeBoundingBox();
  const height = Math.max(0.2, (merged.boundingBox?.max.y ?? 1));
  return { geometry: merged, height };
}
