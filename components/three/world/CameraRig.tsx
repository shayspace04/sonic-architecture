import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { windUniforms, world, type WorldPhase } from "./scene";

/**
 * The single writer of shared per-frame state. Runs first; every other layer
 * reads `world` / `windUniforms`.
 */
export function WorldClock({
  phase,
  reducedMotion,
}: {
  phase: WorldPhase;
  reducedMotion: boolean;
}) {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    world.phase = phase;
    if (!reducedMotion) world.time += d;

    const targetTravel = phase === "travelling" ? 1 : 0;
    const targetWind = phase === "travelling" ? 1.5 : phase === "charging" ? 0.85 : 0.38;
    const targetWarmth = phase === "travelling" ? 1 : phase === "charging" ? 0.65 : 0;
    const k = reducedMotion ? 1 : 1 - Math.exp(-1.6 * d);
    world.travel += (targetTravel - world.travel) * k;
    world.wind += (targetWind - world.wind) * k;
    world.warmth += (targetWarmth - world.warmth) * k;

    windUniforms.uTime.value = world.time;
    windUniforms.uWind.value = world.wind;
    windUniforms.uPointer.value.copy(world.pointerGround);
    windUniforms.uPointerActive.value = world.pointerActive;
  });
  return null;
}

const raycaster = new THREE.Raycaster();
const downPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

/** Cursor-following camera with parallax, breathing and the forward journey. */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const targetNDC = useRef(new THREE.Vector2(0, 0));
  const pos = useRef(new THREE.Vector3(0, 2.7, 14.5));
  const look = useRef(new THREE.Vector3(1.0, 1.15, -9));

  useEffect(() => {
    const apply = (x: number, y: number) => {
      targetNDC.current.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      world.pointerActive = 1;
    };
    const pm = (e: PointerEvent) => apply(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) apply(t.clientX, t.clientY);
    };
    window.addEventListener("pointermove", pm, { passive: true });
    window.addEventListener("touchstart", tm, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    return () => {
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("touchstart", tm);
      window.removeEventListener("touchmove", tm);
    };
  }, []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const k = reducedMotion ? 1 : 1 - Math.exp(-2.6 * d);
    const travel = world.travel;
    world.pointer.lerp(targetNDC.current, reducedMotion ? 1 : 1 - Math.exp(-3.2 * d));

    const px = world.pointer.x;
    const py = world.pointer.y;
    const t = world.time;

    const baseX = px * 2.3 * (1 - travel * 0.55) + Math.sin(t * 0.22) * 0.22 * (1 - travel);
    const baseY = 2.7 - py * 1.05 + travel * 1.4 + Math.sin(t * 0.5) * 0.07 * (1 - travel);
    const baseZ = 14.5 - travel * 26;
    pos.current.lerp(new THREE.Vector3(baseX, Math.max(1.3, baseY), baseZ), k);
    camera.position.copy(pos.current);

    look.current.lerp(
      new THREE.Vector3(px * 2.9 + 1.0, 1.15 - py * 0.8 + travel * 1.1, -9 - travel * 23),
      k
    );
    camera.lookAt(look.current);

    const targetFov = 44 - travel * 5;
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov += (targetFov - pc.fov) * d * 1.5;
    pc.updateProjectionMatrix();

    // project the cursor onto the ground for the foliage response
    if (world.pointerActive > 0) {
      raycaster.setFromCamera(world.pointer, camera);
      if (raycaster.ray.intersectPlane(downPlane, hit)) {
        world.pointerGround.lerp(hit, 1 - Math.exp(-6 * d));
      }
    }
    void state;
  });

  return null;
}
