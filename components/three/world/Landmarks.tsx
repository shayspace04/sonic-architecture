import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useNatureModels, type NatureKey } from "./assets";
import { KNOLL, mulberry32, range, terrainHeight, world } from "./scene";

/** Distant floating islands that give the world scale and a surreal horizon. */

interface Piece {
  key: NatureKey;
  position: [number, number, number];
  scale: number | [number, number, number];
  rotY: number;
}

interface Island {
  position: [number, number, number];
  pieces: Piece[];
  bob: number;
  spin: number;
  phase: number;
}

export default function FloatingIslands({ reducedMotion }: { reducedMotion: boolean }) {
  const models = useNatureModels();
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );
  const mobile = useMemo(() => (typeof window === "undefined" ? false : window.innerWidth < 768), []);

  const islands = useMemo<Island[]>(() => {
    const rng = mulberry32(60214);
    const count = mobile ? 4 : 7;
    const tops: NatureKey[] = ["platform_grass", "cliff_top_rock", "platform_stone"];
    const unders: NatureKey[] = ["cliff_block_rock", "cliff_waterfall_rock"];
    const deco: NatureKey[] = [
      "tree_pineRoundC",
      "tree_default",
      "tree_small",
      "rock_largeA",
      "plant_bushLarge",
      "statue_obelisk",
    ];
    const list: Island[] = [];
    for (let i = 0; i < count; i++) {
      const a = (-0.5 + rng()) * Math.PI * 1.1;
      const dist = range(rng, 55, 150);
      const px = Math.sin(a) * dist + range(rng, -20, 20);
      const pz = -Math.abs(Math.cos(a)) * dist - 30;
      const py = range(rng, 14, 46);
      const size = range(rng, 5, 11);
      const pieces: Piece[] = [
        { key: tops[Math.floor(rng() * tops.length)], position: [0, 0, 0], scale: [size, size * 0.5, size], rotY: rng() * Math.PI * 2 },
        { key: unders[Math.floor(rng() * unders.length)], position: [0, -size * 0.55, 0], scale: [size * 0.95, size * 1.35, size * 0.95], rotY: rng() * Math.PI * 2 },
      ];
      const nd = mobile ? 1 : 2 + Math.floor(rng() * 2);
      for (let d = 0; d < nd; d++) {
        pieces.push({
          key: deco[Math.floor(rng() * deco.length)],
          position: [range(rng, -size * 0.5, size * 0.5), size * 0.22, range(rng, -size * 0.5, size * 0.5)],
          scale: range(rng, size * 0.28, size * 0.5),
          rotY: rng() * Math.PI * 2,
        });
      }
      list.push({ position: [px, py, pz], pieces, bob: range(rng, 0.3, 0.9), spin: range(rng, 0.01, 0.05), phase: rng() * 6.283 });
    }
    return list;
  }, [mobile]);

  const root = useRef<THREE.Group>(null);
  const refs = useRef<THREE.Group[]>([]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    if (reducedMotion) return;
    islands.forEach((isl, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.y = isl.position[1] + Math.sin(world.time * isl.bob + isl.phase) * 1.6;
      g.rotation.y = world.time * isl.spin;
    });
  });

  return (
    <group ref={root}>
      {islands.map((isl, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
          position={isl.position}
        >
          {isl.pieces.map((p, j) => {
            const geo = models[p.key]?.geometry;
            if (!geo) return null;
            const sc = Array.isArray(p.scale) ? p.scale : [p.scale, p.scale, p.scale];
            return (
              <mesh
                key={j}
                geometry={geo}
                material={material}
                position={p.position}
                rotation={[0, p.rotY, 0]}
                scale={sc as [number, number, number]}
              />
            );
          })}
        </group>
      ))}
      {/* a lone obelisk on the horizon, echoing the pavilion */}
      <Obelisk models={models} material={material} />
    </group>
  );
}

function Obelisk({
  models,
  material,
}: {
  models: Record<string, { geometry: THREE.BufferGeometry; height: number }>;
  material: THREE.Material;
}) {
  const geo = models["statue_obelisk"]?.geometry;
  const x = KNOLL.x - 26;
  const z = KNOLL.z - 20;
  const y = terrainHeight(x, z);
  const scale = 5.5;
  if (!geo) return null;
  return (
    <mesh geometry={geo} material={material} position={[x, y - 0.2, z]} scale={[scale, scale * 1.4, scale]} castShadow />
  );
}
