import * as THREE from "three";

/**
 * Shared world maths, palette and geometry factories for the landing meadow.
 *
 * Everything here is deterministic (seeded) and free of React so it can be
 * unit-reasoned about and reused by every layer of the scene. Nothing in this
 * module touches the network or the Qloo API.
 *
 * The stylised blade / terrain / wildflower techniques are adapted from the
 * MIT-licensed "three-stylized" meadow by Steve245270533
 * (https://github.com/Steve245270533/three-stylized), re-implemented here on
 * top of the project's own lighting, fog and cursor-reactive wind pipeline.
 */

/** Bright, airy, cinematic palette. Natural greens, sky blue, warm sunlight. */
export const PALETTE = {
  skyTop: "#3f86c9",
  skyUpper: "#7bb6e4",
  skyMid: "#c3e2f2",
  horizon: "#eaf6f7",
  lowWarm: "#ffeccd",
  sun: "#fff6df",
  lavender: "#d6d3f2",
  fog: "#cfe6ef",
  grassDeep: "#3d5c21",
  grassBase: "#5d8a33",
  grassTip: "#c3dd6e",
  meadowTint: "#7fa14a",
  soil: "#8a6a3f",
  soilDeep: "#5f4a2c",
  ivory: "#f2ece0",
  concrete: "#d9d3c6",
  wood: "#a97c4e",
  ink: "#26364a",
  lime: "#d5ff3f",
  violet: "#8b5cf6",
  periwinkle: "#aaa9ef",
} as const;

/** Exponential fog density for the meadow; shared so shaders stay in sync. */
export const FOG_DENSITY = 0.0026;

/* ------------------------------------------------------------------ random -- */

/** Deterministic 32-bit PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

/* ------------------------------------------------------------------- noise -- */

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0,1]. */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Fractal (fBm) noise in [0,1]. */
export function fbm(x: number, y: number, octaves = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Domain-warped fBm — organic, non-repeating patches. */
function warpedFbm(x: number, y: number, seed: number, warp = 1.2): number {
  const wx = fbm(x + 11.3 + seed, y + 2.7 - seed, 3);
  const wy = fbm(x + 5.9 - seed, y + 17.1 + seed, 3);
  return fbm(x + (wx - 0.5) * warp, y + (wy - 0.5) * warp, 4);
}

/** Direction towards the sun (upper-right, slightly forward). */
export const SUN_DIR = new THREE.Vector3(0.62, 0.6, 0.5).normalize();

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ----------------------------------------------------------------- terrain -- */

/** The hero landmark sits on a raised knoll here. */
export const KNOLL = { x: 8, z: -40 };

/**
 * Height field for the meadow. Gentle rolling hills with a swell for the
 * landmark knoll; the immediate foreground is kept calm so the ground cover
 * stays readable.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const flatten = smoothstep(0, 34, d); // keep the foreground calmer
  const rolling = (fbm(x * 0.017 + 4.2, z * 0.017 - 1.7, 4) - 0.5) * 2 * 3.4;
  const mid = (fbm(x * 0.05 - 8.5, z * 0.05 + 6.1, 3) - 0.5) * 2 * 1.15;
  const detail = (fbm(x * 0.09 + 31, z * 0.09 - 17, 3) - 0.5) * 2 * 0.32;
  const swell = rolling * (0.35 + 0.65 * flatten) + mid * (0.4 + 0.6 * flatten) + detail * 0.7;
  const kx = x - KNOLL.x;
  const kz = z - KNOLL.z;
  const knoll = 6.2 * Math.exp(-(kx * kx + kz * kz) / (2 * 16 * 16));
  return swell + knoll;
}

export function terrainNormal(x: number, z: number, e = 0.6): THREE.Vector3 {
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
}

/**
 * 0 for meadow, 1 for irregular, exposed earth patches. Adapted from
 * three-stylized's terrain shader.
 */
export function terrainDirtAmount(x: number, z: number, seed = 17): number {
  const macro = warpedFbm(x * 0.16, z * 0.16, seed, 1.6);
  const edge = warpedFbm(x * 0.44 + 13.1, z * 0.44 - 8.7, seed + 31, 0.85);
  const overspray = fbm(x * 0.95 - 4.2 + seed, z * 0.95 + 19.6 - seed, 3);
  const paint = macro * 0.7 + edge * 0.22 + overspray * 0.08;
  return smoothstep(0.5, 0.72, paint);
}

/** How strongly ground cover grows at a point (denser in clear meadow). */
export function grassCoverage(x: number, z: number, seed = 17): number {
  const meadowVariation = 0.6 + fbm(x * 0.34, z * 0.34, 3) * 0.4;
  return (1 - terrainDirtAmount(x, z, seed)) * meadowVariation;
}

/* -------------------------------------------------------------------- path -- */

/** A winding path from the camera vantage up to the landmark knoll. */
export const pathCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(1.5, 0, 15),
    new THREE.Vector3(-4.5, 0, 6),
    new THREE.Vector3(-2.0, 0, -4),
    new THREE.Vector3(4.0, 0, -15),
    new THREE.Vector3(3.0, 0, -26),
    new THREE.Vector3(8, 0, -40),
  ].map((p) => new THREE.Vector3(p.x, terrainHeight(p.x, p.z), p.z)),
  false,
  "catmullrom",
  0.5
);

const PATH_SAMPLES = 96;
const pathPoints: THREE.Vector3[] = (() => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= PATH_SAMPLES; i++) pts.push(pathCurve.getPoint(i / PATH_SAMPLES));
  return pts;
})();

/** Approximate distance from (x,z) to the centre line of the path. */
export function distanceToPath(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < pathPoints.length; i++) {
    const p = pathPoints[i];
    const dx = p.x - x;
    const dz = p.z - z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/* -------------------------------------------------------------- geometry ---- */

/**
 * A single tapered grass blade: unit width, unit height (y in [0,1]), with a
 * natural taper across four segments. `uv.y` carries the blade height so the
 * shader can grow colour and wind bend towards the tip.
 */
export function makeBladeGeometry(): THREE.BufferGeometry {
  const rows = [
    { y: 0.0, w: 0.5 },
    { y: 0.26, w: 0.44 },
    { y: 0.53, w: 0.33 },
    { y: 0.79, w: 0.19 },
    { y: 1.0, w: 0.0 },
  ];
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const { y, w } = rows[i];
    pos.push(-w, y, 0, w, y, 0);
    nor.push(0, 0, 1, 0, 0, 1);
    uv.push(0, y, 1, y);
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/** A tiny wildflower: a green stem and a small petal head. Vertex-coloured. */
export function makeFlowerGeometry(petals = 5): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stem = new THREE.PlaneGeometry(0.05, 1, 1, 1);
  stem.translate(0, 0.5, 0);
  stem.userData.tint = [0.42, 0.6, 0.3];
  parts.push(stem);

  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const petal = new THREE.PlaneGeometry(0.34, 0.5, 1, 1);
    petal.translate(0, 0.22, 0);
    petal.rotateX(-Math.PI / 2.4);
    petal.rotateZ(a);
    petal.translate(0, 1.0, 0);
    petal.userData.tint = [1.0, 1.0, 1.0];
    parts.push(petal);
  }
  const head = new THREE.CircleGeometry(0.1, petals);
  head.rotateX(-Math.PI / 2);
  head.translate(0, 1.0, 0);
  head.userData.tint = [1.0, 0.82, 0.32];
  parts.push(head);

  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  for (const g of parts) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const u = g.getAttribute("uv");
    const t = (g.userData.tint as number[]) ?? [1, 1, 1];
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(t[0], t[1], t[2]);
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** A soft tiling cloud/pollen sprite (alpha in the colour channels). */
export function makeSprinkleTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      const r = Math.sqrt(nx * nx + ny * ny) * 2;
      const a = Math.max(0, 1 - r);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(a * a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------------------------------------- shared frame ---- */

export type WorldPhase = "idle" | "charging" | "travelling";

/**
 * Mutable per-frame state shared between sibling components (single canvas).
 * Written once per frame by `<WorldClock>` / `<CameraRig>`, read by everything
 * else. Avoids threading refs through many layers.
 */
export const world = {
  phase: "idle" as WorldPhase,
  /** 0 = landing, 1 = fully inside the venue journey. */
  travel: 0,
  time: 0,
  wind: 0.35,
  warmth: 0,
  /** Smoothed pointer in normalised device coords (-1..1). */
  pointer: new THREE.Vector2(0, 0),
  /** Pointer projected onto the ground plane (world XZ). */
  pointerGround: new THREE.Vector3(0, 0, 0),
  pointerActive: 0,
  reducedMotion: false,
};

/** Shared uniform objects so one clock drives every windified material. */
export const windUniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0 },
  uWind: { value: 0.35 },
  uPointer: { value: new THREE.Vector3(0, 0, 0) },
  uPointerActive: { value: 0 },
};

/* ---------------------------------------------------------- wind material -- */

const windVertexHeader = /* glsl */ `
  attribute float aPhase;
  attribute float aTint;
  uniform float uTime;
  uniform float uWind;
  uniform float uSway;
  uniform float uHeight;
  uniform float uGradient;
  uniform vec3 uPointer;
  uniform float uPointerActive;
  varying float vTint;
  varying float vH;

  vec2 worldBend(vec3 baseW, float h) {
    vec2 windDir = normalize(vec2(0.86, 0.5));
    float wave = sin(uTime * 1.5 + baseW.x * 0.13 + baseW.z * 0.17 + aPhase * 6.2831853);
    float wave2 = sin(uTime * 0.7 + baseW.x * 0.05 - baseW.z * 0.04 + aPhase * 2.1);
    float gust = uWind * (0.55 + 0.45 * wave) * (0.8 + 0.4 * wave2);
    vec2 toP = baseW.xz - uPointer.xz;
    float pd = length(toP);
    float pin = smoothstep(3.2, 0.0, pd) * uPointerActive;
    vec2 pinDir = pd > 0.001 ? toP / pd : vec2(0.0);
    float bend = pow(h, 1.6);
    return (windDir * gust * uSway + pinDir * pin * uSway * 2.6) * bend;
  }
`;

/**
 * Inject a shared wind + cursor-response displacement into a standard
 * material, so the foliage keeps correct lighting, shadows, fog and tone
 * mapping. `uHeight` normalises the local y of the source geometry.
 */
export function windify(
  material: THREE.Material,
  opts: { height: number; sway?: number; gradient?: number; uniforms?: Record<string, THREE.IUniform> }
): THREE.Material {
  const mat = material as THREE.MeshStandardMaterial;
  const sway = opts.sway ?? 1;
  const gradient = opts.gradient ?? 1;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = opts.uniforms?.uTime ?? { value: 0 };
    shader.uniforms.uWind = opts.uniforms?.uWind ?? { value: 0.35 };
    shader.uniforms.uPointer = opts.uniforms?.uPointer ?? { value: new THREE.Vector3() };
    shader.uniforms.uPointerActive = opts.uniforms?.uPointerActive ?? { value: 0 };
    shader.uniforms.uSway = { value: sway };
    shader.uniforms.uHeight = { value: opts.height };
    shader.uniforms.uGradient = { value: gradient };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${windVertexHeader}`)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vec3 baseWorld = (instanceMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float hNorm = clamp(transformed.y / uHeight, 0.0, 1.0);
        vec2 localBend = worldBend(baseWorld, hNorm);
        // rotate the world-space bend into the instance's local frame
        vec2 bx = normalize(vec2(instanceMatrix[0].x, instanceMatrix[0].z) + 1e-4);
        vec2 bz = normalize(vec2(instanceMatrix[2].x, instanceMatrix[2].z) + 1e-4);
        transformed.x += dot(localBend, bx);
        transformed.z += dot(localBend, bz);
        transformed.y -= length(localBend) * 0.3;
        vTint = aTint;
        vH = hNorm;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform float uGradient;\nvarying float vTint;\nvarying float vH;`
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
        vec3 tintLo = mix(vec3(1.0), vec3(0.28, 0.42, 0.16), uGradient);
        diffuseColor.rgb *= mix(tintLo, vec3(1.0, 1.16, 0.66), vH);
        diffuseColor.rgb *= (0.78 + 0.4 * vTint);`
      );
  };
  // All windified materials share one compiled program (variation is via uniforms).
  mat.customProgramCacheKey = () => "sonic-wind";
  return mat;
}
