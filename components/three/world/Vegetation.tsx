import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  BUSHES,
  REEDS,
  ROCKS,
  TREES,
  useMeadowModels,
  type MeadowKey,
  type ModelGeo,
} from "./assets";
import {
  FOG_DENSITY,
  KNOLL,
  PALETTE,
  distanceToPath,
  grassCoverage,
  makeBladeGeometry,
  mulberry32,
  range,
  terrainHeight,
  windUniforms,
  windify,
  world,
} from "./scene";
import { FLOWER_PALETTES, MASK_VARIANTS, makeFlowerMaskTexture } from "./flowerMask";

/* ------------------------------------------------------------------ utils -- */

interface Placement {
  x: number;
  z: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  tint: number;
  phase: number;
  /** small lean so blades/plants are not perfectly vertical */
  tiltX: number;
  tiltZ: number;
}

function buildInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: Placement[],
  opts: { castShadow?: boolean; receiveShadow?: boolean } = {}
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const phases = new Float32Array(Math.max(1, placements.length));
  const tints = new Float32Array(Math.max(1, placements.length));
  placements.forEach((p, i) => {
    e.set(p.tiltX, p.rot, p.tiltZ);
    q.setFromEuler(e);
    v.set(p.x, p.y, p.z);
    s.set(p.sx, p.sy, p.sx);
    m.compose(v, q, s);
    mesh.setMatrixAt(i, m);
    phases[i] = p.phase;
    tints[i] = p.tint;
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = placements.length;
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 1));
  mesh.castShadow = Boolean(opts.castShadow);
  mesh.receiveShadow = Boolean(opts.receiveShadow);
  mesh.frustumCulled = false;
  return mesh;
}

function useMobile(): boolean {
  return useMemo(() => (typeof window === "undefined" ? false : window.innerWidth < 768), []);
}

/* ----------------------------------------------------------------- grass ---- */

const GRASS_FOCUS = { x: 1, z: -6 };
const GRASS_RADIUS = 36;

export function GrassField() {
  const mobile = useMobile();

  const mesh = useMemo(() => {
    const rng = mulberry32(20260120);
    const count = mobile ? 26000 : 82000;
    const placements: Placement[] = [];
    for (let i = 0; i < count * 2 && placements.length < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * GRASS_RADIUS;
      const x = GRASS_FOCUS.x + Math.cos(a) * r;
      const z = GRASS_FOCUS.z + Math.sin(a) * r;
      if (distanceToPath(x, z) < 1.0) continue;
      const dk = Math.hypot(x - KNOLL.x, z - KNOLL.z);
      if (dk < 6 && rng() < 0.75) continue;
      // denser in open meadow, thinner over exposed earth
      if (rng() > 0.42 + grassCoverage(x, z) * 0.72) continue;
      const y = terrainHeight(x, z) - 0.04;
      const lean = range(rng, 0, 0.36);
      const la = rng() * Math.PI * 2;
      placements.push({
        x,
        z,
        y,
        rot: rng() * Math.PI * 2,
        sx: range(rng, 0.1, 0.24),
        sy: range(rng, 0.55, 1.75),
        tint: rng(),
        phase: rng(),
        tiltX: Math.sin(la) * lean,
        tiltZ: Math.cos(la) * lean,
      });
    }
    const geo = makeBladeGeometry();
    const mat = windify(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      { height: 1, sway: 1.2, gradient: 1, uniforms: windUniforms }
    );
    return buildInstanced(geo, mat, placements, { receiveShadow: true });
  }, [mobile]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}

/* ------------------------------------------------------------ wildflowers --- */

const flowerVertex = /* glsl */ `
  attribute float aVariant;
  attribute vec3 aPetalColor;
  attribute vec3 aFoliageColor;
  attribute vec3 aCentreColor;
  uniform float uTime;
  uniform float uWind;
  uniform vec3 uPointer;
  uniform float uPointerActive;
  uniform float uFogDensity;
  varying vec2 vMaskUv;
  varying vec3 vPetalColor;
  varying vec3 vFoliageColor;
  varying vec3 vCentreColor;
  varying float vFogDepth;

  vec2 worldBend(vec3 baseW, float h) {
    vec2 windDir = normalize(vec2(0.86, 0.5));
    float wave = sin(uTime * 1.6 + baseW.x * 0.16 + baseW.z * 0.2);
    float wave2 = sin(uTime * 0.8 - baseW.x * 0.06 + baseW.z * 0.05);
    float gust = uWind * (0.55 + 0.45 * wave) * (0.8 + 0.4 * wave2);
    vec2 toP = baseW.xz - uPointer.xz;
    float pd = length(toP);
    float pin = smoothstep(3.0, 0.0, pd) * uPointerActive;
    vec2 pinDir = pd > 0.001 ? toP / pd : vec2(0.0);
    return (windDir * gust + pinDir * pin * 2.2) * pow(h, 1.6) * 0.42;
  }

  void main() {
    vMaskUv = vec2((uv.x + aVariant) / ${MASK_VARIANTS.toFixed(1)}, uv.y);
    vPetalColor = aPetalColor;
    vFoliageColor = aFoliageColor;
    vCentreColor = aCentreColor;

    mat4 instanceWorldMatrix = modelMatrix * instanceMatrix;
    vec3 baseWorld = (instanceWorldMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float hNorm = clamp(position.y, 0.0, 1.0);
    vec2 localBend = worldBend(baseWorld, hNorm);
    vec2 bx = normalize(vec2(instanceMatrix[0].x, instanceMatrix[0].z) + 1e-4);
    vec2 bz = normalize(vec2(instanceMatrix[2].x, instanceMatrix[2].z) + 1e-4);
    vec3 transformed = position;
    transformed.x += dot(localBend, bx);
    transformed.z += dot(localBend, bz);

    vec4 mv = viewMatrix * instanceWorldMatrix * vec4(transformed, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const flowerFragment = /* glsl */ `
  uniform sampler2D uMask;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec2 vMaskUv;
  varying vec3 vPetalColor;
  varying vec3 vFoliageColor;
  varying vec3 vCentreColor;
  varying float vFogDepth;

  void main() {
    vec4 mask = texture2D(uMask, vMaskUv);
    if (mask.a < 0.3) discard;
    vec3 color = mask.r * vPetalColor + mask.g * vFoliageColor + mask.b * vCentreColor;
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    color = mix(color, uFogColor, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(color, mask.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function WildflowerField() {
  const mobile = useMobile();

  const mesh = useMemo(() => {
    const rng = mulberry32(779921);
    const count = mobile ? 1400 : 4200;
    const positions: { x: number; z: number }[] = [];
    for (let i = 0; i < count * 3 && positions.length < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (GRASS_RADIUS - 2);
      const x = GRASS_FOCUS.x + Math.cos(a) * r;
      const z = GRASS_FOCUS.z + Math.sin(a) * r;
      if (distanceToPath(x, z) < 1.2) continue;
      if (grassCoverage(x, z) < 0.42 && rng() < 0.8) continue;
      positions.push({ x, z });
    }
    const n = Math.max(1, positions.length);

    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);

    const variants = new Float32Array(n);
    const petal = new Float32Array(n * 3);
    const foliage = new Float32Array(n * 3);
    const centre = new Float32Array(n * 3);
    const put = (arr: Float32Array, i: number, c: THREE.Color) => {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    };
    for (let i = 0; i < n; i++) {
      const pal = FLOWER_PALETTES[Math.floor(rng() * FLOWER_PALETTES.length)];
      variants[i] = (i + Math.floor(rng() * MASK_VARIANTS)) % MASK_VARIANTS;
      put(petal, i, pal.petal.clone().offsetHSL((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.08));
      put(foliage, i, pal.foliage.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.05));
      put(centre, i, pal.centre.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.06));
    }
    geo.setAttribute("aVariant", new THREE.InstancedBufferAttribute(variants, 1));
    geo.setAttribute("aPetalColor", new THREE.InstancedBufferAttribute(petal, 3));
    geo.setAttribute("aFoliageColor", new THREE.InstancedBufferAttribute(foliage, 3));
    geo.setAttribute("aCentreColor", new THREE.InstancedBufferAttribute(centre, 3));

    const uniforms = {
      uMask: { value: makeFlowerMaskTexture() },
      uTime: { value: 0 },
      uWind: { value: 0.3 },
      uPointer: { value: new THREE.Vector3() },
      uPointerActive: { value: 0 },
      uFogColor: { value: new THREE.Color(PALETTE.fog) },
      uFogDensity: { value: FOG_DENSITY },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: flowerVertex,
      fragmentShader: flowerFragment,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.3,
      depthWrite: true,
      fog: false,
    });

    const flowers = new THREE.InstancedMesh(geo, mat, n);
    flowers.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const { x, z } = positions[i];
      const height = range(rng, 0.34, 0.78);
      e.set(0, rng() * Math.PI * 2, 0);
      q.setFromEuler(e);
      v.set(x, terrainHeight(x, z) - 0.02, z);
      s.set(height * range(rng, 0.42, 0.6), height, 1);
      m.compose(v, q, s);
      flowers.setMatrixAt(i, m);
    }
    flowers.instanceMatrix.needsUpdate = true;
    (flowers as unknown as { userData: { uniforms: typeof uniforms } }).userData.uniforms = uniforms;
    return flowers;
  }, [mobile]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.ShaderMaterial).uniforms.uMask.value.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);

  useFrame(() => {
    const u = (mesh as unknown as { userData: { uniforms: Record<string, THREE.IUniform> } }).userData
      .uniforms;
    if (!u) return;
    u.uTime.value = world.time;
    u.uWind.value = world.wind;
    (u.uPointer.value as THREE.Vector3).copy(world.pointerGround);
    u.uPointerActive.value = world.pointerActive;
  });

  return <primitive object={mesh} />;
}

/* ------------------------------------------------------------- big plants --- */

interface GroupSpec {
  keys: MeadowKey[];
  count: number;
  mobileCount: number;
  scale: [number, number];
  sway: number;
  castShadow: boolean;
  minPath: number;
  minKnoll: number;
  sink: number;
}

const GROUPS: GroupSpec[] = [
  { keys: TREES, count: 40, mobileCount: 18, scale: [0.9, 1.6], sway: 0.12, castShadow: true, minPath: 5, minKnoll: 7, sink: 0.1 },
  { keys: BUSHES, count: 150, mobileCount: 66, scale: [0.8, 1.7], sway: 0.28, castShadow: true, minPath: 2.4, minKnoll: 2, sink: 0.08 },
  { keys: REEDS, count: 220, mobileCount: 90, scale: [0.45, 0.95], sway: 0.55, castShadow: false, minPath: 1.3, minKnoll: 0, sink: 0.05 },
  { keys: ROCKS, count: 90, mobileCount: 40, scale: [0.6, 1.5], sway: 0, castShadow: true, minPath: 1.8, minKnoll: 0, sink: 0.16 },
];

export function MeadowPlants() {
  const models = useMeadowModels();
  const mobile = useMobile();

  const group = useMemo(() => {
    const rng = mulberry32(4242);
    const root = new THREE.Group();
    GROUPS.forEach((spec, gi) => {
      const target = mobile ? spec.mobileCount : spec.count;
      const perKey = Math.max(1, Math.round(target / spec.keys.length));
      spec.keys.forEach((key, ki) => {
        const model: ModelGeo | undefined = models[key];
        if (!model) return;
        const placements: Placement[] = [];
        for (let i = 0; i < perKey * 3 && placements.length < perKey; i++) {
          const a = rng() * Math.PI * 2;
          const r = Math.sqrt(rng()) * (GRASS_RADIUS + 8);
          const x = GRASS_FOCUS.x + Math.cos(a) * r;
          const z = GRASS_FOCUS.z + Math.sin(a) * r;
          if (distanceToPath(x, z) < spec.minPath) continue;
          if (Math.hypot(x - KNOLL.x, z - KNOLL.z) < spec.minKnoll) continue;
          placements.push({
            x,
            z,
            y: terrainHeight(x, z) - spec.sink,
            rot: rng() * Math.PI * 2,
            sx: range(rng, spec.scale[0], spec.scale[1]),
            sy: range(rng, spec.scale[0], spec.scale[1]),
            tint: rng(),
            phase: rng(),
            tiltX: 0,
            tiltZ: 0,
          });
        }
        const geo = model.geometry.clone();
        const mat = windify(
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.92,
            metalness: 0,
            flatShading: true,
          }),
          { height: model.height, sway: spec.sway, gradient: spec.sway > 0.05 ? 0.35 : 0.12, uniforms: windUniforms }
        );
        const mesh = buildInstanced(geo, mat, placements, {
          castShadow: spec.castShadow,
          receiveShadow: true,
        });
        mesh.name = `${gi}-${ki}-${key}`;
        root.add(mesh);
      });
    });
    return root;
  }, [models, mobile]);

  useEffect(
    () => () => {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
    },
    [group]
  );

  return <primitive object={group} />;
}

/** A single large hero tree on the knoll, the destination of the journey. */
export function HeroTree() {
  const models = useMeadowModels();
  const model = models["tree_high"];
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);
  if (!model) return null;
  const y = terrainHeight(KNOLL.x, KNOLL.z);
  const scale = 2.2;
  return (
    <mesh
      geometry={model.geometry}
      material={material}
      position={[KNOLL.x, y - 0.3, KNOLL.z]}
      scale={[scale, scale * 1.15, scale]}
      rotation={[0, 0.6, 0]}
      castShadow
      receiveShadow
    />
  );
}
