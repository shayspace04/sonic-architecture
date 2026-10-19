import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { pathCurve, terrainHeight, world } from "./scene";

/** A tiny animated wanderer strolling the path, for scale and life. */

type FBXGroup = THREE.Group & { animations: THREE.AnimationClip[] };

export default function Character({ reducedMotion }: { reducedMotion: boolean }) {
  const fbx = useLoader(FBXLoader, "/assets/char/character.fbx") as unknown as FBXGroup;
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0.12);

  const { mixer, action } = useMemo(() => {
    const clip =
      fbx.animations.find((a) => /walk/i.test(a.name)) ?? fbx.animations.find((a) => /idle/i.test(a.name)) ?? fbx.animations[0];
    const m = new THREE.AnimationMixer(fbx);
    const a = clip ? m.clipAction(clip) : null;
    a?.setLoop(THREE.LoopRepeat, Infinity);
    a?.play();
    return { mixer: m, action: a };
  }, [fbx]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(fbx);
    const h = box.max.y - box.min.y;
    return h > 0.01 ? 1.72 / h : 1;
  }, [fbx]);

  useEffect(() => {
    fbx.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      }
    });
  }, [fbx]);

  useFrame((_, dt) => {
    if (!reducedMotion) {
      mixer.update(Math.min(dt, 0.05));
      progress.current = (progress.current + Math.min(dt, 0.05) * 0.012 * (1 + world.travel * 2)) % 1;
    }
    const p = progress.current;
    const point = pathCurve.getPoint(p);
    const tan = pathCurve.getTangent(p).setY(0).normalize();
    const g = group.current;
    if (!g) return;
    const y = terrainHeight(point.x, point.z);
    g.position.set(point.x, y, point.z);
    g.rotation.y = Math.atan2(tan.x, tan.z);
  });

  useEffect(
    () => () => {
      action?.stop();
    },
    [action]
  );

  return (
    <group ref={group}>
      <primitive object={fbx} scale={scale} />
    </group>
  );
}
