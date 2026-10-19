import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  PALETTE,
  fbm,
  terrainDirtAmount,
  terrainHeight,
  grassCoverage,
  pathCurve,
} from "./scene";
import { useSurfaces } from "./assets";

/**
 * The rolling meadow floor: a displaced plane painted per-vertex so rich
 * meadow greens break up into irregular soil patches, plus a winding path.
 * Vertex-colour painting adapted from the MIT "three-stylized" meadow.
 */

function paintTerrain(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const meadow = new THREE.Color(PALETTE.grassBase);
  const meadowDeep = new THREE.Color(PALETTE.grassDeep);
  const tip = new THREE.Color(PALETTE.grassTip);
  const soil = new THREE.Color(PALETTE.soil);
  const soilDeep = new THREE.Color(PALETTE.soilDeep);

  const a = new THREE.Color();
  const b = new THREE.Color();
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const patch = fbm(x * 0.16 + 5.1, z * 0.16 - 3.2, 4);
    const shade = fbm(x * 0.5 - 11.0, z * 0.5 + 7.3, 3);

    // meadow greens: deep base with lighter, sun-tipped variation
    a.copy(meadowDeep).lerp(meadow, patch);
    a.lerp(tip, Math.max(0, shade - 0.55) * 1.4);

    // exposed earth
    b.copy(soilDeep).lerp(soil, fbm(x * 0.62 + 2.0, z * 0.62 - 9.0, 3));

    c.copy(a).lerp(b, terrainDirtAmount(x, z));

    // slightly richer colour where cover is dense
    const cover = grassCoverage(x, z);
    c.multiplyScalar(0.9 + cover * 0.16);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function buildTerrain(size: number, seg: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
  }
  pos.needsUpdate = true;
  paintTerrain(geo);
  geo.computeVertexNormals();
  return geo;
}

function buildPathGeometry(width = 1.6, samples = 160): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const side = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = pathCurve.getPoint(t);
    const tan = pathCurve.getTangent(t).setY(0).normalize();
    side.set(-tan.z, 0, tan.x).multiplyScalar(width / 2);
    const l = p.clone().add(side);
    const r = p.clone().sub(side);
    l.y = terrainHeight(l.x, l.z) + 0.05;
    r.y = terrainHeight(r.x, r.z) + 0.05;
    positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
    uvs.push(0, t * 48, 1, t * 48);
    if (i > 0) {
      const b = (i - 1) * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export default function Terrain() {
  const s = useSurfaces(1);
  s.grassNormal.repeat.set(120, 120);
  s.grassRough.repeat.set(120, 120);
  s.groundColor.repeat.set(1.7, 52);
  s.groundNormal.repeat.set(1.7, 52);
  s.groundRough.repeat.set(1.7, 52);

  const terrain = useMemo(() => buildTerrain(340, 230), []);
  const path = useMemo(() => buildPathGeometry(1.6, 160), []);

  const grassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        normalMap: s.grassNormal,
        roughnessMap: s.grassRough,
        roughness: 1,
        metalness: 0,
        normalScale: new THREE.Vector2(0.5, 0.5),
      }),
    [s]
  );

  const pathMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: s.groundColor,
        normalMap: s.groundNormal,
        roughnessMap: s.groundRough,
        roughness: 1,
        metalness: 0,
        normalScale: new THREE.Vector2(0.7, 0.7),
        color: new THREE.Color("#cbb08a"),
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [s]
  );

  useEffect(() => {
    return () => {
      terrain.dispose();
      path.dispose();
      grassMat.dispose();
      pathMat.dispose();
    };
  }, [terrain, path, grassMat, pathMat]);

  return (
    <group>
      <mesh geometry={terrain} material={grassMat} receiveShadow />
      <mesh geometry={path} material={pathMat} receiveShadow />
    </group>
  );
}
