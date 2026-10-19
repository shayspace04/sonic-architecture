"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SkyFallback from "@/components/SkyFallback";
import { WebGLBoundary } from "./shared";

/**
 * CloudWorld — the immersive landing environment.
 *
 * A fully procedural, full-viewport sky: a gradient/sun sky dome, ~15 layered
 * cloud billboards shaded by a tiled value-noise texture (no image assets), a
 * distant floating pavilion + walkway with a tiny human silhouette, drifting
 * dust, and a pointer-parallax camera rig. Everything is generated on the GPU
 * from three small shaders plus one CPU-built noise texture.
 *
 * Phase machine (`idle -> charging -> travelling`) drives the reaction to a
 * submit: the world slows, thickens and warms while the request is in flight,
 * then accelerates forward as the venue is revealed. Motion is continuous and
 * calm — never a reactive "visualiser".
 */

export type WorldPhase = "idle" | "charging" | "travelling";

const PALETTE = {
  skyTop: "#9fd2e9",
  skyMid: "#cfe9f4",
  skyLow: "#f7f3ee",
  lavender: "#dcd8f4",
  sun: "#ffe1cb",
  cloudLit: "#ffffff",
  cloudShadow: "#c2d6e6",
  fog: "#e7f1f7",
  structure: "#eef4f8",
  ink: "#3d4f66",
} as const;

const FOG_DENSITY = 0.0112;
/** Clouds travel toward the camera across this z span, then wrap invisibly. */
const CLOUD_Z_MIN = -86;
const CLOUD_Z_MAX = 6;

interface WorldState {
  time: number;
  /** Damped 0=idle, 1=charging, 2=travelling. */
  phase: number;
  /** Damped forward-motion multiplier. */
  speed: number;
  /** Damped 0..1 warmth of sky + cloud light. */
  warmth: number;
}

type WorldRef = MutableRefObject<WorldState>;

/* ---------------------------------------------------------------- noise ---- */

function fract(v: number): number {
  return v - Math.floor(v);
}

function valueNoise(size: number, period: number): Float32Array {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = fract(Math.sin(i * 12.9898 + period * 78.233) * 43758.5453);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period;
      const fy = (y / size) * period;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const xa = x0 % period;
      const ya = y0 % period;
      const x1 = (x0 + 1) % period;
      const y1 = (y0 + 1) % period;
      const v00 = g[ya * period + xa];
      const v10 = g[ya * period + x1];
      const v01 = g[y1 * period + xa];
      const v11 = g[y1 * period + x1];
      out[y * size + x] = (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy;
    }
  }
  return out;
}

let cachedNoise: THREE.DataTexture | null = null;

/** Tiling multi-octave value noise, built once on the CPU and reused. */
function cloudNoiseTexture(): THREE.DataTexture {
  if (cachedNoise) return cachedNoise;
  const size = 256;
  const octaves: [number, number][] = [
    [4, 0.55],
    [8, 0.3],
    [16, 0.22],
    [32, 0.15],
  ];
  const weightSum = octaves.reduce((s, [, w]) => s + w, 0);
  const acc = new Float32Array(size * size);
  for (const [period, weight] of octaves) {
    const layer = valueNoise(size, period);
    for (let i = 0; i < acc.length; i++) acc[i] += (layer[i] * weight) / weightSum;
  }
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < acc.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(acc[i] * 255)));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedNoise = tex;
  return tex;
}

/* --------------------------------------------------------------- shaders --- */

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform vec3 uLavender;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uWarmth;
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uLow, uMid, smoothstep(0.40, 0.62, h));
    col = mix(col, uTop, smoothstep(0.60, 1.0, h));
    col = mix(col, uLavender, smoothstep(0.34, 0.0, h) * 0.34);
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSun * pow(sd, 8.0) * (0.20 + uWarmth * 0.34);
    col += uSun * pow(sd, 220.0) * 0.85;
    col = mix(col, uSun, uWarmth * 0.07 * smoothstep(0.35, 0.85, 1.0 - h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CLOUD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uTime;
  uniform float uScale;
  uniform float uDrift;
  uniform float uCoverage;
  uniform float uSoft;
  uniform float uOpacity;
  uniform float uWarmth;
  uniform float uSeed;
  uniform float uFogDensity;
  uniform vec2 uSunDir;
  uniform vec3 uLit;
  uniform vec3 uShadow;
  uniform vec3 uTint;
  uniform vec3 uFogColor;
  varying vec2 vUv;
  varying float vDepth;

  float field(vec2 uv) {
    vec2 p = uv * uScale + vec2(uSeed * 9.1, uSeed * 4.7);
    float t = uTime * uDrift;
    float n1 = texture2D(uNoise, p * 0.32 + vec2(t * 0.012, t * 0.004)).r;
    float n2 = texture2D(uNoise, p * 0.62 + vec2(n1 * 0.45, n1 * 0.22) - vec2(t * 0.02, 0.0)).r;
    float n3 = texture2D(uNoise, p * 1.25 + vec2(t * 0.03, t * 0.006)).r;
    return n1 * 0.55 + n2 * 0.30 + n3 * 0.22;
  }

  void main() {
    float d = field(vUv);
    float density = smoothstep(uCoverage, uCoverage + uSoft, d);
    if (density < 0.004) discard;

    float thick = smoothstep(uCoverage, 1.0, d);
    float vert = smoothstep(0.08, 0.95, vUv.y);
    float light = clamp(0.26 + thick * 0.60 + vert * 0.50 + (vUv.x - 0.5) * uSunDir.x * 0.60, 0.0, 1.0);
    vec3 lit = mix(uLit, vec3(1.0, 0.87, 0.78), uWarmth * 0.30);
    vec3 col = mix(uShadow, lit, light) * uTint;

    float edge =
      smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x) *
      smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);

    float fog = exp(-pow(vDepth * uFogDensity, 2.0));
    float a = density * edge * uOpacity * fog;
    if (a < 0.003) discard;

    gl_FragColor = vec4(mix(uFogColor, col, fog), a);
  }
`;

const SUN_DIR = new THREE.Vector3(0.55, 0.4, -0.72).normalize();
const SUN_DIR_UV = new THREE.Vector2(0.7, 0.35);

/* ----------------------------------------------------------------- world --- */

interface CloudData {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  tilt: number;
  scale: number;
  coverage: number;
  soft: number;
  opacity: number;
  drift: number;
  speed: number;
  seed: number;
  tint: THREE.Color;
}

function buildClouds(count: number): CloudData[] {
  let s = 20260119;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const clouds: CloudData[] = [];
  for (let i = 0; i < count; i++) {
    const wisp = i % 5 === 4;
    const w = wisp ? 70 + rnd() * 60 : 30 + rnd() * 40;
    const h = w * (wisp ? 0.26 + rnd() * 0.1 : 0.34 + rnd() * 0.18);
    const farness = Math.min(1, Math.max(0, (-(CLOUD_Z_MIN + rnd() * (CLOUD_Z_MAX - CLOUD_Z_MIN))) / -CLOUD_Z_MIN));
    clouds.push({
      x: (rnd() - 0.5) * 58,
      y: -7 + rnd() * 22,
      z: CLOUD_Z_MIN + rnd() * (CLOUD_Z_MAX - CLOUD_Z_MIN),
      w,
      h,
      tilt: (rnd() - 0.5) * 0.22,
      scale: wisp ? 0.5 + rnd() * 0.5 : 0.8 + rnd() * 1.5,
      coverage: wisp ? 0.5 : 0.44 + rnd() * 0.12,
      soft: wisp ? 0.34 : 0.18 + rnd() * 0.1,
      opacity: wisp ? 0.14 + rnd() * 0.1 : 0.34 + rnd() * 0.4,
      drift: 0.5 + rnd() * 0.9,
      speed: 0.5 + rnd() * 0.9,
      seed: rnd() * 10,
      tint: new THREE.Color(PALETTE.cloudLit).lerp(new THREE.Color(PALETTE.lavender), farness * 0.35),
    });
  }
  return clouds;
}

function wrap(v: number, lo: number, hi: number): number {
  const range = hi - lo;
  let r = v;
  while (r > hi) r -= range;
  while (r < lo) r += range;
  return r;
}

/** Advances the shared world state; rendered first so consumers read fresh values. */
function WorldClock({
  state,
  target,
  reducedMotion,
}: {
  state: WorldRef;
  target: MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  useFrame((_, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 0.05);
    if (reducedMotion) {
      s.phase = target.current;
      s.speed = target.current >= 2 ? 1 : target.current;
      s.warmth = Math.min(1, target.current * 0.6);
      return;
    }
    s.time += dt;
    const k = 1 - Math.exp(-1.6 * dt);
    s.phase += (target.current - s.phase) * k;
    const speedTarget = target.current >= 2 ? 7.5 : target.current;
    s.speed += (speedTarget - s.speed) * (1 - Math.exp(-2.2 * dt));
    const warmthTarget = target.current >= 1 ? 1 : 0;
    s.warmth += (warmthTarget - s.warmth) * (1 - Math.exp(-0.9 * dt));
  });
  return null;
}

function SkyDome({ state }: { state: WorldRef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uLow: { value: new THREE.Color(PALETTE.skyLow) },
      uLavender: { value: new THREE.Color(PALETTE.lavender) },
      uSun: { value: new THREE.Color(PALETTE.sun) },
      uSunDir: { value: SUN_DIR.clone() },
      uWarmth: { value: 0 },
    }),
    []
  );

  useFrame(({ camera }) => {
    if (meshRef.current) meshRef.current.position.copy(camera.position);
    if (matRef.current) matRef.current.uniforms.uWarmth.value = state.current.warmth;
  });

  return (
    <mesh ref={meshRef} scale={300} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function CloudPlane({
  cloud,
  state,
  reducedMotion,
  noise,
}: {
  cloud: CloudData;
  state: WorldRef;
  reducedMotion: boolean;
  noise: THREE.DataTexture;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uNoise: { value: noise },
      uTime: { value: 0 },
      uScale: { value: cloud.scale },
      uDrift: { value: cloud.drift },
      uCoverage: { value: cloud.coverage },
      uSoft: { value: cloud.soft },
      uOpacity: { value: cloud.opacity },
      uWarmth: { value: 0 },
      uSeed: { value: cloud.seed },
      uFogDensity: { value: FOG_DENSITY },
      uSunDir: { value: SUN_DIR_UV.clone() },
      uLit: { value: new THREE.Color(PALETTE.cloudLit) },
      uShadow: { value: new THREE.Color(PALETTE.cloudShadow) },
      uTint: { value: cloud.tint.clone() },
      uFogColor: { value: new THREE.Color(PALETTE.fog) },
    }),
    [cloud, noise]
  );

  useFrame((_, delta) => {
    const s = state.current;
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    mat.uniforms.uTime.value = s.time;
    mat.uniforms.uWarmth.value = s.warmth;
    mat.uniforms.uOpacity.value = cloud.opacity * (1 + s.phase * 0.22);
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.05);
    mesh.position.z = wrap(mesh.position.z + dt * (0.5 + s.speed * 1.9) * cloud.speed, CLOUD_Z_MIN, CLOUD_Z_MAX);
    mesh.rotation.z = cloud.tilt + Math.sin(s.time * 0.04 + cloud.seed) * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[cloud.x, cloud.y, cloud.z]} rotation-z={cloud.tilt}>
      <planeGeometry args={[cloud.w, cloud.h]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={CLOUD_VERT}
        fragmentShader={CLOUD_FRAG}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function FloatingArchitecture() {
  const structure = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.structure,
        roughness: 0.92,
        metalness: 0.02,
        emissive: new THREE.Color("#d8e9f5"),
        emissiveIntensity: 0.16,
      }),
    []
  );

  return (
    <group>
      {/* Distant pavilion on a floating platform. */}
      <group position={[-15, -3.2, -84]}>
        <mesh position={[0, 0, 0]} material={structure}>
          <boxGeometry args={[16, 0.7, 12]} />
        </mesh>
        {[-6.4, -2.2, 2.2, 6.4].map((x) => (
          <mesh key={x} position={[x, 5, -4]} material={structure}>
            <boxGeometry args={[0.5, 10, 0.5]} />
          </mesh>
        ))}
        <mesh position={[0, 10.2, 0]} material={structure}>
          <boxGeometry args={[17, 0.7, 13]} />
        </mesh>
      </group>

      {/* Suspended walkway with a thin rail. */}
      <group position={[7, -3.6, -76]}>
        <mesh material={structure}>
          <boxGeometry args={[40, 0.4, 2.6]} />
        </mesh>
        <mesh position={[0, 0.9, 1.1]} material={structure}>
          <boxGeometry args={[40, 0.12, 0.12]} />
        </mesh>
      </group>

      {/* Two open frames reading as distant arches. */}
      {[
        [-3, -1.6, -66, 9, 7],
        [12, 0.4, -98, 13, 10],
      ].map(([x, y, z, w, h]) => (
        <group key={z} position={[x, y, z]}>
          <mesh position={[-w / 2, h / 2, 0]} material={structure}>
            <boxGeometry args={[0.6, h, 0.6]} />
          </mesh>
          <mesh position={[w / 2, h / 2, 0]} material={structure}>
            <boxGeometry args={[0.6, h, 0.6]} />
          </mesh>
          <mesh position={[0, h, 0]} material={structure}>
            <boxGeometry args={[w + 0.6, 0.6, 0.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A tiny, silent human silhouette walking the floating walkway. */
function DistantWalker({ state, reducedMotion }: { state: WorldRef; reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const legARef = useRef<THREE.Mesh>(null);
  const legBRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.current.time;
    const phase = reducedMotion ? 0.35 : (t * 0.075) % 1;
    g.position.x = 7 + (phase - 0.5) * 30;
    g.position.y = -2.9 + (reducedMotion ? 0 : Math.abs(Math.sin(t * 1.6)) * 0.05);
    const swing = reducedMotion ? 0.2 : Math.sin(t * 3.1) * 0.5;
    if (legARef.current) legARef.current.rotation.x = swing;
    if (legBRef.current) legBRef.current.rotation.x = -swing;
  });

  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 1, metalness: 0 }),
    []
  );

  return (
    <group ref={groupRef} position={[7, -2.9, -75.4]} scale={1.6}>
      <mesh position={[0, 1.35, 0]} material={skin}>
        <capsuleGeometry args={[0.16, 0.7, 4, 8]} />
      </mesh>
      <mesh position={[0, 1.95, 0]} material={skin}>
        <sphereGeometry args={[0.14, 12, 12]} />
      </mesh>
      <mesh ref={legARef} position={[-0.09, 0.45, 0]} material={skin}>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
      </mesh>
      <mesh ref={legBRef} position={[0.09, 0.45, 0]} material={skin}>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
      </mesh>
    </group>
  );
}

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute float aSeed;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vSeed = aSeed;
    vec3 p = position;
    p.z = mod(p.z + uTime * (0.4 + uSpeed * 2.4) * (0.5 + aSeed), 96.0) - 90.0;
    p.x += sin(uTime * 0.2 + aSeed * 8.0) * 0.6;
    p.y += cos(uTime * 0.16 + aSeed * 6.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_PointSize = clamp((0.5 + aSeed * 1.0) * (44.0 / -mv.z), 0.5, 24.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFogDensity;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;
    float glow = 1.0 - smoothstep(0.0, 0.25, d2);
    float fog = exp(-pow(vDepth * uFogDensity, 2.0));
    gl_FragColor = vec4(uColor, glow * 0.16 * fog * (0.4 + vSeed * 0.6));
  }
`;

function CloudDust({ state }: { state: WorldRef }) {
  const { geo, mat } = useMemo(() => {
    const count = 160;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (fract(Math.sin(i * 78.233) * 43758.5453) - 0.5) * 44;
      positions[i * 3 + 1] = -6 + fract(Math.sin(i * 39.425) * 24634.6345) * 18;
      positions[i * 3 + 2] = -90 + fract(Math.sin(i * 11.135) * 13579.1131) * 96;
      seeds[i] = fract(Math.sin(i * 12.9898) * 43758.5453);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
        uColor: { value: new THREE.Color("#ffffff") },
        uFogDensity: { value: FOG_DENSITY },
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo: g, mat: m };
  }, []);

  useFrame(() => {
    mat.uniforms.uTime.value = state.current.time;
    mat.uniforms.uSpeed.value = state.current.speed;
  });

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function CameraRig({ state, reducedMotion }: { state: WorldRef; reducedMotion: boolean }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0.5, -14), []);
  const smooth = useRef({ x: 0, y: 0.6, z: 6.6 });

  useFrame(({ pointer }, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = state.current;
    const zTarget = s.phase >= 1.6 ? 1.4 : s.phase >= 0.5 ? 4.7 : 6.6;
    let x = pointer.x * 1.5;
    let y = pointer.y * 0.8 + 0.6;
    if (!reducedMotion) {
      x += Math.sin(s.time * 0.11) * 0.22;
      y += Math.sin(s.time * 0.16) * 0.12;
    }
    const k = reducedMotion ? 1 : 1 - Math.exp(-3.2 * dt);
    const c = smooth.current;
    c.x += (x - c.x) * k;
    c.y += (y - c.y) * k;
    c.z += (zTarget - c.z) * (reducedMotion ? 1 : 1 - Math.exp(-1.8 * dt));
    camera.position.set(c.x, c.y, c.z);
    look.set(c.x * 0.35, 0.5 + c.y * 0.15, -14);
    camera.lookAt(look);
  });

  return null;
}

function Scene({
  target,
  reducedMotion,
}: {
  target: MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const state = useRef<WorldState>({ time: 0, phase: 0, speed: 0, warmth: 0 });
  const noise = useMemo(() => cloudNoiseTexture(), []);
  const cloudCount = useMemo(
    () => (typeof window !== "undefined" && window.innerWidth < 768 ? 10 : 15),
    []
  );
  const clouds = useMemo(() => buildClouds(cloudCount), [cloudCount]);

  return (
    <>
      <WorldClock state={state} target={target} reducedMotion={reducedMotion} />
      <color attach="background" args={[PALETTE.skyMid]} />
      <fogExp2 attach="fog" args={[PALETTE.fog, FOG_DENSITY]} />
      <hemisphereLight args={["#eaf4fb", "#cbd8e6", 0.85]} />
      <ambientLight intensity={0.55} color="#e2eff8" />
      <directionalLight position={[26, 34, -6]} intensity={1.5} color="#fff2e2" />
      <SkyDome state={state} />
      <FloatingArchitecture />
      <DistantWalker state={state} reducedMotion={reducedMotion} />
      {clouds.map((cloud, i) => (
        <CloudPlane key={i} cloud={cloud} state={state} reducedMotion={reducedMotion} noise={noise} />
      ))}
      <CloudDust state={state} />
      <CameraRig state={state} reducedMotion={reducedMotion} />
    </>
  );
}

export default function CloudWorld({
  phase,
  reducedMotion = false,
}: {
  phase: WorldPhase;
  reducedMotion?: boolean;
}) {
  const target = useRef(0);
  useEffect(() => {
    // Refs may not be written during render; the frame loop reads this on the
    // next tick, which is exactly when the new phase should take effect.
    target.current = phase === "travelling" ? 2 : phase === "charging" ? 1 : 0;
  }, [phase]);

  return (
    <WebGLBoundary fallback={<SkyFallback note="WebGL unavailable — static atmosphere" />}>
      <Canvas
        flat
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.6, 6.6], fov: 46, near: 0.1, far: 400 }}
      >
        <Scene target={target} reducedMotion={reducedMotion} />
      </Canvas>
    </WebGLBoundary>
  );
}
