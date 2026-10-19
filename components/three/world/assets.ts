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

/* ------------------------------------------------------------------ meadow -- */

/** Curated CC0 low-poly nature from the Gobkit free-assets kit. */
export const MEADOW = {
  tree_high: "/assets/meadow/TreeHigh001.glb",
  tree_med: "/assets/meadow/TreeMed001.glb",
  tree_low: "/assets/meadow/TreeLow001.glb",
  bush_a: "/assets/meadow/Bush001.glb",
  bush_b: "/assets/meadow/Bush002.glb",
  reed: "/assets/meadow/Reed001.glb",
  rock: "/assets/meadow/Rock001.glb",
  hill: "/assets/meadow/Hill001.glb",
  mountain: "/assets/meadow/Mountain001.glb",
  mountain_far: "/assets/meadow/MountainFar001.glb",
} as const;

export type MeadowKey = keyof typeof MEADOW;

export const MEADOW_KEYS = Object.keys(MEADOW) as MeadowKey[];
export const MEADOW_URLS = MEADOW_KEYS.map((k) => MEADOW[k]);

export const TREES: MeadowKey[] = ["tree_high", "tree_med", "tree_low"];
export const BUSHES: MeadowKey[] = ["bush_a", "bush_b"];
export const REEDS: MeadowKey[] = ["reed"];
export const ROCKS: MeadowKey[] = ["rock"];
export const HILLS: MeadowKey[] = ["hill", "mountain", "mountain_far"];

/** The hero landmark tree — a large, warm-lit tree on the knoll. */
export const HERO_TREE_URL = "/assets/meadow/TreeHigh001.glb";

/* --------------------------------------------------------------- character -- */

/** Quaternius "Animated Fox" (CC0) — the tiny orange protagonist. */
export const FOX_URL = "/assets/char/fox.glb";

/* ------------------------------------------------------------- surfaces ---- */

export const SURFACE_URLS = {
  grassColor: "/assets/textures/grass/grass_Color.jpg",
  grassNormal: "/assets/textures/grass/grass_NormalGL.jpg",
  grassRough: "/assets/textures/grass/grass_Roughness.jpg",
  groundColor: "/assets/textures/ground/ground_Color.jpg",
  groundNormal: "/assets/textures/ground/ground_NormalGL.jpg",
  groundRough: "/assets/textures/ground/ground_Roughness.jpg",
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

const SRGB_KEYS: SurfaceKey[] = ["grassColor", "groundColor", "woodColor"];

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
    scene.environmentIntensity = 0.6;
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
 * Loads every meadow model and returns one merged, vertex-coloured,
 * ground-centred geometry per model (ready for `InstancedMesh`).
 */
export function useMeadowModels(): Record<string, ModelGeo> {
  const gltfs = useLoader(GLTFLoader, MEADOW_URLS) as GLTF[];
  const out: Record<string, ModelGeo> = {};
  MEADOW_KEYS.forEach((key, i) => {
    out[key] = flatten(gltfs[i]);
  });
  return out;
}

/** Loads a single flattened model geometry (used for the hero landmark). */
export function useModel(url: string): ModelGeo {
  const gltf = useLoader(GLTFLoader, url) as GLTF;
  return flatten(gltf);
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
    if (!g.getAttribute("color")) {
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
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

  // The Gobkit kit is authored in centimetres; convert to metres (uniform, so
  // relative proportions between models are preserved).
  const UNIT = 0.01;
  merged.scale(UNIT, UNIT, UNIT);
  merged.computeBoundingBox();
  const height = Math.max(0.05, merged.boundingBox?.max.y ?? 1);
  return { geometry: merged, height };
}
