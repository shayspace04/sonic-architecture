import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useMeadowModels, type MeadowKey } from "./assets";
import { PALETTE, mulberry32, range, terrainHeight } from "./scene";

/**
 * The layered distant horizon: rings of soft, hazy hills and mountains that
 * give the meadow depth and hide the edge of the ground plane. Replaces the
 * earlier floating-island / obelisk landmarks.
 */

interface Band {
  key: MeadowKey;
  count: number;
  minR: number;
  maxR: number;
  scale: [number, number];
  haze: number;
}

const BANDS: Band[] = [
  { key: "hill", count: 26, minR: 92, maxR: 132, scale: [3, 7], haze: 0.16 },
  { key: "mountain", count: 22, minR: 124, maxR: 168, scale: [5, 11], haze: 0.3 },
  { key: "mountain_far", count: 18, minR: 152, maxR: 200, scale: [8, 17], haze: 0.46 },
];

export default function Horizon() {
  const models = useMeadowModels();

  const groups = useMemo(() => {
    const rng = mulberry32(60214);
    const root = new THREE.Group();
    const fog = new THREE.Color(PALETTE.fog);
    BANDS.forEach((band, bi) => {
      const model = models[band.key];
      if (!model) return;
      const base = new THREE.Color(1, 1, 1).lerp(fog, band.haze);
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1,
        metalness: 0,
        color: base,
      });
      const mesh = new THREE.InstancedMesh(model.geometry, material, band.count);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();
      for (let i = 0; i < band.count; i++) {
        // mostly behind the camera view, wrapping round the front edges
        const angle = -Math.PI * 0.5 + ((i + rng() * 0.6) / band.count) * Math.PI * 2;
        const r = range(rng, band.minR, band.maxR);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r - 30;
        const scale = range(rng, band.scale[0], band.scale[1]);
        e.set(0, rng() * Math.PI * 2, 0);
        q.setFromEuler(e);
        v.set(x, terrainHeight(x, z) - 0.4 - scale * 0.08, z);
        s.set(scale * range(rng, 0.85, 1.3), scale, scale * range(rng, 0.85, 1.3));
        m.compose(v, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.name = `horizon-${bi}-${band.key}`;
      root.add(mesh);
    });
    return root;
  }, [models]);

  useEffect(
    () => () => {
      groups.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          (m.material as THREE.Material).dispose();
        }
      });
    },
    [groups]
  );

  return <primitive object={groups} />;
}
