import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BUSHES,
  FLOWERS,
  PROPS,
  ROCKS,
  TREES,
  TUFTS,
  useNatureModels,
  type ModelGeo,
  type NatureKey,
} from "./assets";
import {
  KNOLL,
  distanceToPath,
  makeBladeGeometry,
  makeFlowerGeometry,
  mulberry32,
  range,
  terrainHeight,
  windify,
  windUniforms,
} from "./scene";

/** All ground cover: instanced grass blades, wildflowers and scattered props. */

interface Placement {
  x: number;
  z: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  tint: number;
  phase: number;
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
    e.set(0, p.rot, 0);
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
  const mobile = useMemo(
    () => (typeof window === "undefined" ? false : window.innerWidth < 768),
    []
  );
  return mobile;
}

/* ----------------------------------------------------------------- grass ---- */

const GRASS_FOCUS = { x: 1, z: -4 };
const GRASS_RADIUS = 32;

export function GrassField() {
  const mobile = useMobile();

  const mesh = useMemo(() => {
    const rng = mulberry32(20260120);
    const count = mobile ? 18000 : 62000;
    const placements: Placement[] = [];
    for (let i = 0; i < count * 2 && placements.length < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * GRASS_RADIUS;
      const x = GRASS_FOCUS.x + Math.cos(a) * r;
      const z = GRASS_FOCUS.z + Math.sin(a) * r;
      if (distanceToPath(x, z) < 1.05) continue;
      const dk = Math.hypot(x - KNOLL.x, z - KNOLL.z);
      if (dk < 6 && rng() < 0.75) continue;
      const y = terrainHeight(x, z) - 0.03;
      placements.push({
        x,
        z,
        y,
        rot: rng() * Math.PI * 2,
        sx: range(rng, 0.12, 0.26),
        sy: range(rng, 0.5, 1.3),
        tint: rng(),
        phase: rng(),
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
      { height: 1, sway: 1.1, gradient: 1, uniforms: windUniforms }
    );
    return buildInstanced(geo, mat, placements);
  }, [mobile]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}

/* ---------------------------------------------------------------- blooms ---- */

export function Blooms() {
  const mobile = useMobile();

  const mesh = useMemo(() => {
    const rng = mulberry32(779921);
    const count = mobile ? 1400 : 4200;
    const placements: Placement[] = [];
    for (let i = 0; i < count * 2 && placements.length < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (GRASS_RADIUS - 3);
      const x = GRASS_FOCUS.x + Math.cos(a) * r;
      const z = GRASS_FOCUS.z + Math.sin(a) * r;
      if (distanceToPath(x, z) < 1.1) continue;
      placements.push({
        x,
        z,
        y: terrainHeight(x, z) - 0.02,
        rot: rng() * Math.PI * 2,
        sx: range(rng, 0.7, 1.5),
        sy: range(rng, 0.6, 1.3),
        tint: rng(),
        phase: rng(),
      });
    }
    const geo = makeFlowerGeometry(5);
    const mat = windify(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      { height: 1.3, sway: 1.25, gradient: 0.15, uniforms: windUniforms }
    );
    return buildInstanced(geo, mat, placements);
  }, [mobile]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}

/* ------------------------------------------------------- nature scatter ---- */

interface GroupSpec {
  keys: NatureKey[];
  count: number;
  mobileCount: number;
  scale: [number, number];
  sway: number;
  castShadow: boolean;
  minPathDist: number;
  minKnollDist: number;
  sink?: number;
}

const GROUPS: GroupSpec[] = [
  { keys: TREES, count: 34, mobileCount: 16, scale: [0.9, 1.5], sway: 0.16, castShadow: true, minPathDist: 4, minKnollDist: 9, sink: 0.08 },
  { keys: BUSHES, count: 130, mobileCount: 60, scale: [0.8, 1.6], sway: 0.3, castShadow: true, minPathDist: 2.2, minKnollDist: 2, sink: 0.06 },
  { keys: TUFTS, count: 320, mobileCount: 140, scale: [0.7, 1.4], sway: 0.6, castShadow: false, minPathDist: 1.2, minKnollDist: 0, sink: 0.04 },
  { keys: FLOWERS, count: 460, mobileCount: 200, scale: [0.9, 1.7], sway: 1.1, castShadow: false, minPathDist: 1.4, minKnollDist: 0, sink: 0.02 },
  { keys: ROCKS, count: 96, mobileCount: 44, scale: [0.8, 2.2], sway: 0.0, castShadow: true, minPathDist: 1.6, minKnollDist: 0, sink: 0.12 },
  { keys: PROPS, count: 74, mobileCount: 34, scale: [0.9, 1.5], sway: 0.05, castShadow: true, minPathDist: 2.6, minKnollDist: 3, sink: 0.05 },
];

export function NatureScatter() {
  const models = useNatureModels();
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
          const r = 6 + Math.sqrt(rng()) * 50;
          const x = Math.cos(a) * r;
          const z = Math.sin(a) * r - 6;
          if (distanceToPath(x, z) < spec.minPathDist) continue;
          if (Math.hypot(x - KNOLL.x, z - KNOLL.z) < spec.minKnollDist) continue;
          const sc = range(rng, spec.scale[0], spec.scale[1]);
          placements.push({
            x,
            z,
            y: terrainHeight(x, z) - (spec.sink ?? 0),
            rot: rng() * Math.PI * 2,
            sx: sc,
            sy: range(rng, 0.9, 1.15) * sc,
            tint: rng(),
            phase: rng(),
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
          { height: model.height, sway: spec.sway, gradient: spec.sway > 0.05 ? 0.2 : 0, uniforms: windUniforms }
        );
        const mesh = buildInstanced(geo, mat, placements, { castShadow: spec.castShadow, receiveShadow: true });
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
