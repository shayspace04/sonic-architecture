import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FOX_URL } from "./assets";
import { pathCurve, terrainHeight, world } from "./scene";

/**
 * The orange fox protagonist — a tiny Quaternius "Animated Fox" (CC0) that
 * stands in the meadow, gazes towards the cursor and bounds off down the path
 * when the world is composed.
 */

/** Where the fox idles — off-centre so it never sits behind the heading. */
const HOME = { x: -4.9, z: -3.4 };

export default function Character({ reducedMotion }: { reducedMotion: boolean }) {
  const gltf = useLoader(GLTFLoader, FOX_URL) as unknown as GLTF;
  const root = useRef<THREE.Group>(null);
  const progress = useRef(0.1);
  const born = useRef<number | null>(null);

  const { mixer, idle, walk } = useMemo(() => {
    const scene = gltf.scene;
    const clipFor = (re: RegExp) => gltf.animations.find((a) => re.test(a.name));
    const m = new THREE.AnimationMixer(scene);
    const idleClip = clipFor(/^idle$/i) ?? clipFor(/idle/i) ?? gltf.animations[0];
    const walkClip = clipFor(/^(walk|gallop)$/i) ?? clipFor(/walk|gallop/i) ?? idleClip;
    const idleAction = idleClip ? m.clipAction(idleClip) : null;
    const walkAction = walkClip ? m.clipAction(walkClip) : null;
    idleAction?.play();
    walkAction?.setEffectiveWeight(0).play();
    return { mixer: m, idle: idleAction, walk: walkAction };
  }, [gltf]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const h = box.max.y - box.min.y;
    return h > 0.01 ? 1.15 / h : 1;
  }, [gltf]);

  useEffect(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        const mat = mesh.material as THREE.Material | THREE.Material[];
        const list = Array.isArray(mat) ? mat : [mat];
        list.forEach((x) => {
          (x as THREE.MeshStandardMaterial).envMapIntensity = 0.7;
        });
      }
    });
  }, [gltf]);

  useEffect(() => () => {
    idle?.stop();
    walk?.stop();
  }, [idle, walk]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const g = root.current;
    if (!g) return;

    const travelling = world.travel > 0.12;
    if (!reducedMotion) {
      mixer.update(d);
      // blend idle -> run as the world is composed
      const w = travelling ? Math.min(1, (world.travel - 0.12) * 2.2) : 0;
      if (idle) idle.setEffectiveWeight(1 - w);
      if (walk) walk.setEffectiveWeight(w);
    }

    if (travelling) {
      progress.current = Math.min(0.92, progress.current + d * 0.045 * (0.4 + world.travel));
      const p = progress.current;
      const point = pathCurve.getPoint(p);
      const tan = pathCurve.getTangent(p).setY(0).normalize();
      g.position.set(point.x, terrainHeight(point.x, point.z), point.z);
      g.rotation.y = Math.atan2(tan.x, tan.z);
    } else {
      const y = terrainHeight(HOME.x, HOME.z);
      const bob = reducedMotion ? 0 : Math.sin(world.time * 1.6) * 0.03;
      g.position.set(HOME.x, y + bob, HOME.z);
      // gentle gaze towards the cursor
      const gaze = reducedMotion ? 0 : world.pointer.x * 0.35;
      g.rotation.y = 0.5 + gaze;
    }

    // a soft "settle" pop when the scene first appears
    if (born.current === null) born.current = performance.now();
    const age = (performance.now() - born.current) / 1000;
    if (!reducedMotion && age < 0.9) {
      const t = Math.min(1, age / 0.9);
      const ease = 1 - Math.pow(1 - t, 3);
      g.scale.setScalar(scale * THREE.MathUtils.lerp(0.001, 1, ease));
    } else {
      g.scale.setScalar(scale);
    }
  });

  return (
    <group ref={root}>
      <primitive object={gltf.scene} />
    </group>
  );
}
