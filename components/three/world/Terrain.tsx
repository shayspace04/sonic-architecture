import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { pathCurve, terrainHeight } from "./scene";
import { useSurfaces } from "./assets";

/** The rolling meadow floor: a displaced plane plus a winding path ribbon. */

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
  geo.computeVertexNormals();
  return geo;
}

function buildPathGeometry(width = 1.5, samples = 150): THREE.BufferGeometry {
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
    l.y = terrainHeight(l.x, l.z) + 0.04;
    r.y = terrainHeight(r.x, r.z) + 0.04;
    positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
    uvs.push(0, t * 46, 1, t * 46);
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
  s.grassColor.repeat.set(92, 92);
  s.grassNormal.repeat.set(92, 92);
  s.grassRough.repeat.set(92, 92);
  s.groundColor.repeat.set(1.6, 46);
  s.groundNormal.repeat.set(1.6, 46);
  s.groundRough.repeat.set(1.6, 46);

  const terrain = useMemo(() => buildTerrain(300, 220), []);
  const path = useMemo(() => buildPathGeometry(1.5, 150), []);

  const grassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: s.grassColor,
        normalMap: s.grassNormal,
        roughnessMap: s.grassRough,
        roughness: 1,
        metalness: 0,
        normalScale: new THREE.Vector2(0.7, 0.7),
        color: new THREE.Color("#739449"),
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
        normalScale: new THREE.Vector2(0.8, 0.8),
        color: new THREE.Color("#cbb89a"),
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
