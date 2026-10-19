import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSurfaces } from "./assets";
import { KNOLL, PALETTE, terrainHeight, world } from "./scene";

/**
 * The hero monument: a designed, surreal stone-and-timber pavilion on the
 * knoll — the destination the camera travels towards on submit.
 */

export default function Pavilion({ reducedMotion }: { reducedMotion: boolean }) {
  const s = useSurfaces(1);
  s.concreteColor.repeat.set(3, 3);
  s.concreteNormal.repeat.set(3, 3);
  s.concreteRough.repeat.set(3, 3);
  s.woodColor.repeat.set(2, 6);
  s.woodNormal.repeat.set(2, 6);
  s.woodRough.repeat.set(2, 6);

  const concrete = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: s.concreteColor,
        normalMap: s.concreteNormal,
        roughnessMap: s.concreteRough,
        roughness: 1,
        metalness: 0,
        color: new THREE.Color(PALETTE.concrete),
      }),
    [s]
  );
  const wood = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: s.woodColor,
        normalMap: s.woodNormal,
        roughnessMap: s.woodRough,
        roughness: 1,
        metalness: 0,
        color: new THREE.Color(PALETTE.wood),
      }),
    [s]
  );
  const accent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2b2a3d"),
        emissive: new THREE.Color(PALETTE.violet),
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.1,
      }),
    []
  );

  const group = useRef<THREE.Group>(null);
  const slab = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const y = terrainHeight(KNOLL.x, KNOLL.z);

  useEffect(
    () => () => {
      concrete.dispose();
      wood.dispose();
      accent.dispose();
    },
    [concrete, wood, accent]
  );

  useFrame(() => {
    if (reducedMotion) return;
    if (slab.current) {
      slab.current.position.y = 9.4 + Math.sin(world.time * 0.5) * 0.35;
      slab.current.rotation.y = world.time * 0.15;
    }
    if (ring.current) ring.current.rotation.z = world.time * 0.12;
  });

  const columns = useMemo(() => {
    const n = 10;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: Math.cos(a) * 5.2, z: Math.sin(a) * 5.2 };
    });
  }, []);

  return (
    <group ref={group} position={[KNOLL.x, y, KNOLL.z]}>
      {/* stepped platform */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow material={concrete}>
        <cylinderGeometry args={[8.3, 8.6, 0.36, 48]} />
      </mesh>
      <mesh position={[0, 0.54, 0]} castShadow receiveShadow material={concrete}>
        <cylinderGeometry args={[7.1, 7.35, 0.42, 48]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} receiveShadow material={concrete}>
        <cylinderGeometry args={[6.4, 6.6, 0.34, 48]} />
      </mesh>

      {/* column ring */}
      {columns.map((c, i) => (
        <mesh key={i} position={[c.x, 4.0, c.z]} castShadow material={concrete}>
          <cylinderGeometry args={[0.26, 0.34, 6.2, 16]} />
        </mesh>
      ))}

      {/* lintel + canopy */}
      <mesh position={[0, 7.05, 0]} castShadow material={concrete}>
        <torusGeometry args={[5.2, 0.24, 12, 64]} />
      </mesh>
      <mesh position={[0, 7.5, 0]} castShadow material={concrete}>
        <cylinderGeometry args={[6.5, 6.9, 0.4, 48]} />
      </mesh>
      <mesh position={[0, 8.1, 0]} castShadow material={wood}>
        <coneGeometry args={[6.9, 1.3, 48, 1, false]} />
      </mesh>

      {/* central portal ring, facing the path */}
      <mesh ref={ring} position={[0, 4.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}>
        <torusGeometry args={[2.5, 0.22, 16, 96]} />
      </mesh>

      {/* floating stone slab (surreal) */}
      <group ref={slab} position={[0, 9.4, 0]}>
        <mesh castShadow material={concrete}>
          <cylinderGeometry args={[3.1, 2.7, 0.5, 6]} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow material={concrete}>
          <cylinderGeometry args={[1.2, 1.7, 2.4, 6]} />
        </mesh>
      </group>

      {/* timber arch at the approach */}
      <mesh position={[0, 0.9, 7.4]} rotation={[Math.PI / 2, 0, 0]} castShadow material={wood}>
        <torusGeometry args={[3.4, 0.16, 10, 40, Math.PI]} />
      </mesh>
      <mesh position={[3.4, 0.9, 7.4]} castShadow material={wood}>
        <cylinderGeometry args={[0.16, 0.18, 1.8, 10]} />
      </mesh>
      <mesh position={[-3.4, 0.9, 7.4]} castShadow material={wood}>
        <cylinderGeometry args={[0.16, 0.18, 1.8, 10]} />
      </mesh>
    </group>
  );
}
