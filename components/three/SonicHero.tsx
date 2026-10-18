"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { SceneParams } from "@/lib/scene-params";
import ResonanceField from "@/components/ResonanceField";
import { WebGLBoundary } from "./shared";

export type HeroPhase = "resonance" | "charging" | "forming";

interface SonicHeroProps {
  params: SceneParams;
  phase: HeroPhase;
  analyserRef?: MutableRefObject<AnalyserNode | null>;
  reducedMotion: boolean;
}

/** Shared GLSL: displacement field of the resonance membrane. */
const DISPLACE = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uSpeed;
  uniform float uAudio;
  uniform float uForm;
  uniform float uCharge;
  attribute float aPhase;
  attribute float aRing;

  vec3 displace(vec3 p, float phase, float ring) {
    vec2 e = vec2(p.x / 7.5, p.z / 4.75);
    float d = length(e);
    float env = smoothstep(1.0, 0.28, d);
    float t = uTime * uSpeed;
    float w = sin(p.x * 0.55 + t * 1.3 + phase * 6.2831) * 0.5
            + sin(p.z * 0.85 - t * 0.9 + phase * 3.1415) * 0.32
            + sin((p.x + p.z) * 0.34 + t * 0.65) * 0.42
            + sin(length(p.xz) * 1.15 - t * 1.6) * 0.3;
    w *= env;
    w *= uAmp * (1.0 + uAudio * 1.7 + uCharge * 0.55);
    w *= (1.0 - uForm * 0.8);
    float ang = atan(p.z, p.x);
    float r = 2.1 + ring * 1.15;
    vec3 target = vec3(cos(ang) * r, sin(ang) * r * 0.58 + 1.35, -3.2 - ring * 1.9);
    float f = clamp(uForm * 1.5 - phase * 0.5, 0.0, 1.0);
    f = f * f * (3.0 - 2.0 * f);
    return mix(vec3(p.x, p.y + w, p.z), target, f);
  }

  float envOf(vec3 p) {
    return smoothstep(1.0, 0.28, length(vec2(p.x / 7.5, p.z / 4.75)));
  }
`;

const POINT_VERT = /* glsl */ `
  ${DISPLACE}
  uniform float uSize;
  varying float vH;
  varying float vEnv;
  void main() {
    vec3 p = displace(position, aPhase, aRing);
    vEnv = envOf(position);
    vH = p.y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = max(uSize * (34.0 / -mv.z), 0.75);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vH;
  varying float vEnv;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;
    float glow = 1.0 - smoothstep(0.0, 0.25, d2);
    float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, h);
    float a = glow * uOpacity * (0.3 + 0.7 * h) * (0.25 + 0.75 * vEnv);
    gl_FragColor = vec4(col * (0.55 + h), a);
  }
`;

const LINE_VERT = /* glsl */ `
  ${DISPLACE}
  varying float vH;
  varying float vEnv;
  void main() {
    vec3 p = displace(position, aPhase, aRing);
    vEnv = envOf(position);
    vH = p.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vH;
  varying float vEnv;
  void main() {
    float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, h);
    gl_FragColor = vec4(col, uOpacity * (0.2 + 0.8 * h) * (0.2 + 0.8 * vEnv));
  }
`;

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.07 + aSeed * 0.11), 5.2);
    p.x += sin(uTime * 0.18 + aSeed * 9.0) * 0.4;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = max((1.2 + aSeed * 2.2) * (26.0 / -mv.z), 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;
    float glow = 1.0 - smoothstep(0.0, 0.25, d2);
    gl_FragColor = vec4(mix(uColorA, uColorB, vSeed), glow * 0.16);
  }
`;

function hash(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

interface SharedUniforms {
  uTime: { value: number };
  uAmp: { value: number };
  uSpeed: { value: number };
  uAudio: { value: number };
  uForm: { value: number };
  uCharge: { value: number };
}

function buildMembraneGeometry(cols: number, rows: number) {
  const geo = new THREE.PlaneGeometry(15, 9.5, cols, rows);
  geo.rotateX(-Math.PI / 2);
  const count = geo.attributes.position.count;
  const phase = new Float32Array(count);
  const ring = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    phase[i] = hash(i + 1);
    ring[i] = i % 3;
  }
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.setAttribute("aRing", new THREE.BufferAttribute(ring, 1));
  return geo;
}

function buildContourGeometry(ptsGeo: THREE.BufferGeometry, cols: number, rows: number) {
  const stride = cols + 1;
  const pos = ptsGeo.attributes.position.array as Float32Array;
  const phaseArr = ptsGeo.attributes.aPhase.array as Float32Array;
  const ringArr = ptsGeo.attributes.aRing.array as Float32Array;
  const stripCount = 9;
  const rowStep = Math.max(1, Math.floor(rows / stripCount));
  const positions: number[] = [];
  const phases: number[] = [];
  const rings: number[] = [];
  for (let r = 0; r <= rows; r += rowStep) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      const b = a + 1;
      positions.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]);
      positions.push(pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
      phases.push(phaseArr[a], phaseArr[b]);
      rings.push(ringArr[a], ringArr[b]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geo.setAttribute("aRing", new THREE.Float32BufferAttribute(rings, 1));
  return geo;
}

function buildDustGeometry() {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (hash(i * 3 + 7) - 0.5) * 17;
    positions[i * 3 + 1] = hash(i * 3 + 8) * 5.2;
    positions[i * 3 + 2] = (hash(i * 3 + 9) - 0.5) * 11;
    seeds[i] = hash(i + 31);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return geo;
}

function ResonanceMembrane({
  params,
  shared,
  reducedMotion,
}: {
  params: SceneParams;
  shared: SharedUniforms;
  reducedMotion: boolean;
}) {
  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const density = Math.round(params.pointDensity * (isMobile ? 0.6 : 1));
  const cols = density;
  const rows = Math.round(density * 0.62);

  const { ptsGeo, lineGeo, dustGeo, mats } = useMemo(() => {
    const pts = buildMembraneGeometry(cols, rows);
    const lines = buildContourGeometry(pts, cols, rows);
    const dust = buildDustGeometry();
    const colorUniforms = () => ({
      uColorA: { value: new THREE.Color(params.shadowColor) },
      uColorB: { value: new THREE.Color(params.crestColor) },
    });
    const ptsMat = new THREE.ShaderMaterial({
      uniforms: { ...shared, ...colorUniforms(), uSize: { value: params.pointSize }, uOpacity: { value: 0.85 } },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { ...shared, ...colorUniforms(), uOpacity: { value: 0.14 } },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const dustMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uColorA: { value: new THREE.Color(params.shadowColor) },
        uColorB: { value: new THREE.Color(params.crestColor) },
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { ptsGeo: pts, lineGeo: lines, dustGeo: dust, mats: { ptsMat, lineMat, dustMat } };
    // Geometry/material creation is driven by density; param color/size changes
    // are applied in the effect below without rebuilding buffers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows]);

  useEffect(() => {
    mats.ptsMat.uniforms.uSize.value = params.pointSize;
    for (const m of [mats.ptsMat, mats.lineMat, mats.dustMat]) {
      const ua = m.uniforms.uColorA as { value: THREE.Color };
      const ub = m.uniforms.uColorB as { value: THREE.Color };
      if (ua && ub) {
        ua.value.set(params.shadowColor);
        ub.value.set(params.crestColor);
      }
    }
  }, [params, mats]);

  useEffect(() => {
    shared.uAmp.value = params.waveAmplitude;
    shared.uSpeed.value = reducedMotion ? params.waveSpeed * 0.15 : params.waveSpeed;
  }, [params.waveAmplitude, params.waveSpeed, reducedMotion, shared]);

  useEffect(() => {
    return () => {
      ptsGeo.dispose();
      lineGeo.dispose();
      dustGeo.dispose();
      mats.ptsMat.dispose();
      mats.lineMat.dispose();
      mats.dustMat.dispose();
    };
  }, [ptsGeo, lineGeo, dustGeo, mats]);

  return (
    <group>
      <points geometry={ptsGeo} frustumCulled={false}>
        <primitive object={mats.ptsMat} attach="material" />
      </points>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <primitive object={mats.lineMat} attach="material" />
      </lineSegments>
      <points geometry={dustGeo} frustumCulled={false}>
        <primitive object={mats.dustMat} attach="material" />
      </points>
    </group>
  );
}

function HeroLights({ params, shared }: { params: SceneParams; shared: SharedUniforms }) {
  const crestRef = useRef<THREE.PointLight>(null);
  const shadowRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const pulse = 0.5 + 0.5 * Math.sin(shared.uTime.value * 1.3);
    const charge = shared.uCharge.value;
    const form = shared.uForm.value;
    if (crestRef.current) {
      crestRef.current.intensity = 24 + pulse * 12 + charge * 30 + form * 24;
    }
    if (shadowRef.current) {
      shadowRef.current.intensity = 30 + (1 - pulse) * 12 + form * 16;
    }
  });

  return (
    <>
      <ambientLight color="#241533" intensity={0.5} />
      <pointLight ref={crestRef} position={[5.2, 3.4, 2.2]} color={params.crestColor} distance={26} decay={2} />
      <pointLight ref={shadowRef} position={[-5.4, 4.2, -3]} color={params.shadowColor} distance={30} decay={2} />
      <directionalLight position={[0, 8, 6]} color="#3A3350" intensity={0.35} />
    </>
  );
}

function Rig({
  shared,
  analyserRef,
  forming,
  charging,
  reducedMotion,
}: {
  shared: SharedUniforms;
  analyserRef?: MutableRefObject<AnalyserNode | null>;
  forming: boolean;
  charging: boolean;
  reducedMotion: boolean;
}) {
  const { camera, pointer } = useThree();
  const bins = useMemo(() => new Uint8Array(128), []);
  const audioSmooth = useRef(0);
  const look = useMemo(() => new THREE.Vector3(0, 0.8, -2), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!reducedMotion) shared.uTime.value += dt;

    const analyser = analyserRef?.current;
    let target = 0;
    if (analyser) {
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 1; i < 24; i++) sum += bins[i];
      target = sum / (23 * 255);
    }
    audioSmooth.current += (target - audioSmooth.current) * (1 - Math.exp(-8 * dt));
    shared.uAudio.value = audioSmooth.current;

    shared.uForm.value = THREE.MathUtils.damp(shared.uForm.value, forming ? 1 : 0, 1.5, dt);
    shared.uCharge.value = THREE.MathUtils.damp(shared.uCharge.value, charging ? 1 : 0, 2.4, dt);

    if (!reducedMotion) {
      camera.position.x += (pointer.x * 1.15 - camera.position.x) * (1 - Math.exp(-2.2 * dt));
      camera.position.y += (2.1 + pointer.y * 0.45 - camera.position.y) * (1 - Math.exp(-2.2 * dt));
    }
    const zTarget = forming ? 5.7 : 7.2;
    camera.position.z += (zTarget - camera.position.z) * (1 - Math.exp(-1.3 * dt));
    camera.lookAt(look);
  });

  return null;
}

function Scene({
  params,
  phase,
  analyserRef,
  reducedMotion,
}: SonicHeroProps) {
  const shared = useMemo<SharedUniforms>(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: params.waveAmplitude },
      uSpeed: { value: params.waveSpeed },
      uAudio: { value: 0 },
      uForm: { value: 0 },
      uCharge: { value: 0 },
    }),
    // Create once; live updates flow through the uniform objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <color attach="background" args={["#0A0810"]} />
      <fogExp2 attach="fog" args={["#0A0810", params.fogDensity]} />
      <Rig
        shared={shared}
        analyserRef={analyserRef}
        forming={phase === "forming"}
        charging={phase === "charging"}
        reducedMotion={reducedMotion}
      />
      <HeroLights params={params} shared={shared} />
      <ResonanceMembrane params={params} shared={shared} reducedMotion={reducedMotion} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[17, 64]} />
        <meshStandardMaterial color="#0C0B10" roughness={0.3} metalness={0.55} />
      </mesh>
      <EffectComposer multisampling={0}>
        <Bloom intensity={params.bloomIntensity} luminanceThreshold={0.2} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette offset={0.28} darkness={0.78} />
      </EffectComposer>
    </>
  );
}

export default function SonicHero(props: SonicHeroProps) {
  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  return (
    <WebGLBoundary fallback={<ResonanceField intensity={props.phase === "charging" ? 0.9 : 0.55} />}>
      <Canvas
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 2.1, 7.2], fov: 42, near: 0.1, far: 60 }}
      >
        <Scene {...props} />
      </Canvas>
    </WebGLBoundary>
  );
}
