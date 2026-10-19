import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PALETTE, SUN_DIR, makeSprinkleTexture, mulberry32, range, world } from "./scene";

/** Floating pollen, drifting petals and soft sun shafts. */

function makeBeamTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size - 0.5) * 2;
      const ny = y / size;
      const horizontal = Math.max(0, 1 - Math.abs(nx));
      const vertical = Math.sin(ny * Math.PI);
      const a = Math.pow(horizontal, 2.4) * Math.pow(vertical, 0.9);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 250;
      data[i + 2] = 235;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function Pollen({ reducedMotion }: { reducedMotion: boolean }) {
  const tex = useMemo(() => makeSprinkleTexture(32), []);
  const camera = useThree((s) => s.camera);
  const mobile = useMemo(() => (typeof window === "undefined" ? false : window.innerWidth < 768), []);
  const count = mobile ? 320 : 820;

  const points = useMemo(() => {
    const rng = mulberry32(5150);
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = range(rng, -30, 30);
      positions[i * 3 + 1] = range(rng, 0.2, 16);
      positions[i * 3 + 2] = range(rng, -40, 20);
      drift[i * 3] = range(rng, 0.1, 0.5);
      drift[i * 3 + 1] = range(rng, 0.05, 0.28);
      drift[i * 3 + 2] = range(rng, -0.1, 0.1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aDrift", new THREE.BufferAttribute(drift, 3));
    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.22,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#fff6d8"),
      opacity: 0.85,
      fog: true,
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  }, [count, tex]);

  useEffect(() => () => {
    points.geometry.dispose();
    (points.material as THREE.Material).dispose();
    tex.dispose();
  }, [points, tex]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = Math.min(dt, 0.05);
    const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const drift = points.geometry.getAttribute("aDrift") as THREE.BufferAttribute;
    const gust = 1 + world.travel * 2.4 + world.wind;
    for (let i = 0; i < count; i++) {
      let x = pos.getX(i) + drift.getX(i) * gust * d;
      let y = pos.getY(i) + drift.getY(i) * d;
      let z = pos.getZ(i) + drift.getZ(i) * d + world.travel * d * 1.5;
      const cx = camera.position.x;
      const cz = camera.position.z;
      if (y > 17) y = 0.2;
      if (x - cx > 34) x = cx - 34;
      if (cx - x > 34) x = cx + 34;
      if (z < cz - 46) z = cz + 18;
      if (z - cz > 22) z = cz - 46;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return <primitive object={points} />;
}

export function Petals({ reducedMotion }: { reducedMotion: boolean }) {
  const mobile = useMemo(() => (typeof window === "undefined" ? false : window.innerWidth < 768), []);
  const count = mobile ? 80 : 190;

  const mesh = useMemo(() => {
    const rng = mulberry32(31337);
    const geo = new THREE.PlaneGeometry(0.16, 0.1);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ffeacb"),
      roughness: 0.7,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.frustumCulled = false;
    const state = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      state[i * 6] = range(rng, -28, 28);
      state[i * 6 + 1] = range(rng, 0.4, 12);
      state[i * 6 + 2] = range(rng, -40, 18);
      state[i * 6 + 3] = range(rng, 0.2, 0.8); // fall speed
      state[i * 6 + 4] = rng() * Math.PI * 2; // phase
      state[i * 6 + 5] = range(rng, 0.4, 1.2); // spin
    }
    (im as unknown as { userData: { state: Float32Array } }).userData.state = state;
    return im;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = Math.min(dt, 0.05);
    const state = (mesh as unknown as { userData: { state: Float32Array } }).userData.state;
    const gust = 0.6 + world.wind + world.travel * 2;
    for (let i = 0; i < count; i++) {
      const b = i * 6;
      let x = state[b] + Math.sin(world.time * 0.6 + state[b + 4]) * d * 1.2 * gust + d * 0.5 * gust;
      let y = state[b + 1] - state[b + 3] * d;
      let z = state[b + 2] + world.travel * d * 1.4;
      if (y < 0.1) y = 12;
      if (x > 34) x = -34;
      if (z < -46) z = 18;
      state[b] = x;
      state[b + 1] = y;
      state[b + 2] = z;
      dummy.position.set(x, y, z);
      dummy.rotation.set(world.time * state[b + 5], world.time * state[b + 5] * 0.7 + state[b + 4], world.time * 0.9 * state[b + 5]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}

export function SunShafts({ reducedMotion }: { reducedMotion: boolean }) {
  const tex = useMemo(() => makeBeamTexture(64), []);
  const group = useRef<THREE.Group>(null);
  const shafts = useMemo(() => {
    const rng = mulberry32(2468);
    return Array.from({ length: 7 }, () => {
      const m = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(PALETTE.sun),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: range(rng, 0.05, 0.13),
        fog: false,
      });
      const s = new THREE.Sprite(m);
      const base = SUN_DIR.clone().multiplyScalar(range(rng, 60, 140));
      s.position.set(base.x + range(rng, -22, 22), range(rng, 24, 88), base.z + range(rng, -22, 22));
      s.scale.set(range(rng, 5, 11), range(rng, 40, 90), 1);
      s.userData.phase = rng() * Math.PI * 2;
      return s;
    });
  }, [tex]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    shafts.forEach((s) => g.add(s));
    return () => {
      shafts.forEach((s) => {
        g.remove(s);
        s.material.dispose();
      });
    };
  }, [shafts]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(() => {
    if (reducedMotion) return;
    shafts.forEach((s, i) => {
      const m = s.material as THREE.SpriteMaterial;
      m.opacity = 0.08 + Math.sin(world.time * 0.35 + (s.userData.phase as number)) * 0.045;
      m.rotation = Math.sin(world.time * 0.1 + i) * 0.08;
    });
  });

  return <group ref={group} renderOrder={4} />;
}
