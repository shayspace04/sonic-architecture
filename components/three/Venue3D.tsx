"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import * as THREE from "three";
import type { VibePayload } from "@/lib/types";
import type { SceneParams } from "@/lib/scene-params";
import { blendHex, kelvinToRgb } from "@/lib/scene-params";
import { WebGLBoundary, usePrefersReducedMotion } from "./shared";
import VenueScene from "@/components/VenueScene";

export type LightingPreset = "morning" | "golden" | "peak";

interface Venue3DProps {
  vibe: VibePayload;
  params: SceneParams;
}

interface LightTargets {
  ambient: number;
  key: number;
  keyRgb: [number, number, number];
  accent: number;
  pendant: number;
  fogMul: number;
  bloom: number;
}

function targetsFor(preset: LightingPreset, params: SceneParams): LightTargets {
  if (preset === "morning") {
    return { ambient: 0.7, key: 2.4, keyRgb: kelvinToRgb(5400), accent: 14, pendant: 1.0, fogMul: 0.85, bloom: params.bloomIntensity * 0.75 };
  }
  if (preset === "golden") {
    return { ambient: 0.38, key: 2.0, keyRgb: kelvinToRgb(3100), accent: 26, pendant: 2.4, fogMul: 1.0, bloom: params.bloomIntensity * 0.95 };
  }
  return { ambient: 0.15, key: 0.85, keyRgb: kelvinToRgb(params.keyLightKelvin), accent: 46, pendant: 3.4, fogMul: 1.25, bloom: params.bloomIntensity * 1.1 };
}

function defaultPreset(kelvin: number): LightingPreset {
  if (kelvin >= 5500) return "morning";
  if (kelvin <= 3800) return "golden";
  return "peak";
}

function dampTo(current: number, target: number, dt: number, reduced: boolean): number {
  if (reduced) return target;
  return THREE.MathUtils.damp(current, target, 4, dt);
}

function VenueLighting({
  params,
  preset,
  haze,
  reducedMotion,
  bloomRef,
}: {
  params: SceneParams;
  preset: LightingPreset;
  haze: boolean;
  reducedMotion: boolean;
  bloomRef: React.RefObject<BloomEffect | null>;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const accentARef = useRef<THREE.PointLight>(null);
  const accentBRef = useRef<THREE.PointLight>(null);
  const pendantsRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  const targets = useMemo(() => targetsFor(preset, params), [preset, params]);
  const baseFog = params.fogDensity * (haze ? 2.0 : 0.9);
  const state = useRef({ ambient: targets.ambient, key: targets.key, accent: targets.accent, pendant: targets.pendant, fog: baseFog, bloom: targets.bloom, rgb: [...targets.keyRgb] as [number, number, number] });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = state.current;
    s.ambient = dampTo(s.ambient, targets.ambient, dt, reducedMotion);
    s.key = dampTo(s.key, targets.key, dt, reducedMotion);
    s.accent = dampTo(s.accent, targets.accent, dt, reducedMotion);
    s.pendant = dampTo(s.pendant, targets.pendant, dt, reducedMotion);
    s.fog = dampTo(s.fog, baseFog, dt, reducedMotion);
    s.bloom = dampTo(s.bloom, targets.bloom, dt, reducedMotion);
    s.rgb[0] = dampTo(s.rgb[0], targets.keyRgb[0], dt, reducedMotion);
    s.rgb[1] = dampTo(s.rgb[1], targets.keyRgb[1], dt, reducedMotion);
    s.rgb[2] = dampTo(s.rgb[2], targets.keyRgb[2], dt, reducedMotion);

    if (ambientRef.current) ambientRef.current.intensity = s.ambient;
    if (keyRef.current) {
      keyRef.current.intensity = s.key;
      keyRef.current.color.setRGB(s.rgb[0], s.rgb[1], s.rgb[2]);
    }
    if (accentARef.current) accentARef.current.intensity = s.accent;
    if (accentBRef.current) accentBRef.current.intensity = s.accent * 0.7;
    if (pendantsRef.current) {
      pendantsRef.current.traverse((o) => {
        if (o instanceof THREE.PointLight) o.intensity = s.pendant;
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
          o.material.emissiveIntensity = 0.4 + s.pendant * 0.5;
        }
      });
    }
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = s.fog;
    if (bloomRef.current) bloomRef.current.intensity = s.bloom;
  });

  return (
    <>
      <ambientLight ref={ambientRef} color="#8FA0C0" intensity={targets.ambient} />
      <directionalLight
        ref={keyRef}
        position={[7, 10, 5]}
        intensity={targets.key}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <pointLight ref={accentARef} position={[0, 3.1, -7.6]} color={params.crestColor} distance={22} decay={2} intensity={targets.accent} />
      <pointLight ref={accentBRef} position={[-5.6, 2.4, -1.5]} color={params.shadowColor} distance={18} decay={2} intensity={targets.accent * 0.7} />
      <group ref={pendantsRef}>
        {[-2.4, 0, 2.4].map((x) => (
          <group key={x} position={[x, 3.7, -2.6]}>
            <mesh>
              <sphereGeometry args={[0.14, 20, 20]} />
              <meshStandardMaterial color="#2A2418" emissive="#FFD9A0" emissiveIntensity={2} />
            </mesh>
            <pointLight color="#FFD9A0" distance={9} decay={2} intensity={targets.pendant} />
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 2.9, 6]} />
              <meshStandardMaterial color="#17141C" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

function Portal({ w, h, z, color, accent }: { w: number; h: number; z: number; color: string; accent: string }) {
  const t = 0.2;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[-w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, 0.24]} />
        <meshStandardMaterial color="#16131D" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, 0.24]} />
        <meshStandardMaterial color="#16131D" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0, h + t / 2 - 0.01, 0]} castShadow>
        <boxGeometry args={[w + t, t, 0.24]} />
        <meshStandardMaterial color="#16131D" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.06, -0.18]}>
        <planeGeometry args={[w - t * 0.6, h - t]} />
        <meshStandardMaterial color="#05040A" emissive={accent} emissiveIntensity={0.35} toneMapped={false} />
      </mesh>
      <mesh position={[0, h * 0.5, -0.2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[Math.max(w * 0.16, 0.4), h * 0.82]} />
        <meshStandardMaterial color="#05040A" emissive={color} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Architecture({ params, gloss }: { params: SceneParams; gloss: boolean }) {
  const openness = params.openness;
  const columns = useMemo(() => {
    const n = 2 + Math.round(openness * 3);
    const xs = 3.2 + openness * 3.4;
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const z = -8.4 + (11 * i) / Math.max(n - 1, 1);
      out.push([-xs, z]);
      out.push([xs, z]);
    }
    return out;
  }, [openness]);

  const seats = useMemo(() => {
    const spread = 2.6 + openness * 2.2;
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 4; i++) {
      const z = -4.6 + i * 1.7;
      positions.push([-spread, z, 0.35]);
      positions.push([spread, z, -0.35]);
    }
    return positions;
  }, [openness]);

  const seatColor = useMemo(() => blendHex("#1A1720", params.primaryColor, 0.16), [params.primaryColor]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial
          color="#0E0C11"
          roughness={gloss ? 0.16 : 0.72}
          metalness={gloss ? 0.7 : 0.18}
        />
      </mesh>
      <mesh position={[0, 3.5, -11.2]} receiveShadow castShadow>
        <boxGeometry args={[26, 7, 0.5]} />
        <meshStandardMaterial color="#100D16" roughness={0.85} />
      </mesh>
      <mesh position={[-12, 3.5, -4]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 7, 13]} />
        <meshStandardMaterial color="#0F0C15" roughness={0.9} />
      </mesh>
      <mesh position={[12, 3.5, -4]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 7, 13]} />
        <meshStandardMaterial color="#0F0C15" roughness={0.9} />
      </mesh>

      <Portal w={6.6} h={4.7} z={-10.9} color={params.primaryColor} accent={params.crestColor} />
      <Portal w={5.2} h={4.1} z={-9.3} color={params.primaryColor} accent={params.crestColor} />
      <Portal w={3.9} h={3.5} z={-7.7} color={params.primaryColor} accent={params.crestColor} />

      {columns.map(([x, z], i) => (
        <mesh key={i} position={[x, 3, z]} castShadow>
          <cylinderGeometry args={[0.3, 0.34, 6, 18]} />
          <meshStandardMaterial color="#17141C" metalness={0.45} roughness={0.45} />
        </mesh>
      ))}

      <group position={[-7.4, 0, -2]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0.53, 0]} castShadow>
          <boxGeometry args={[1.2, 1.05, 6.2]} />
          <meshStandardMaterial color="#14111A" metalness={gloss ? 0.6 : 0.2} roughness={gloss ? 0.25 : 0.65} />
        </mesh>
        <mesh position={[0.4, 0.1, 0]}>
          <boxGeometry args={[0.5, 0.06, 5.9]} />
          <meshStandardMaterial color="#05040A" emissive={params.crestColor} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>

      {seats.map(([x, z, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, ry, 0]}>
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[1.05, 0.48, 1.05]} />
            <meshStandardMaterial color={seatColor} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.62, -0.42]} castShadow>
            <boxGeometry args={[1.05, 0.55, 0.16]} />
            <meshStandardMaterial color={seatColor} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const DUST_VENUE_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aSeed * 0.08), 6.4);
    p.x += sin(uTime * 0.15 + aSeed * 7.0) * 0.5;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = max((1.1 + aSeed * 1.9) * (24.0 / -mv.z), 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_VENUE_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;
    float glow = 1.0 - smoothstep(0.0, 0.25, d2);
    gl_FragColor = vec4(mix(uColorA, uColorB, vSeed), glow * 0.14);
  }
`;

function VenueDust({ params, reducedMotion }: { params: SceneParams; reducedMotion: boolean }) {
  const { geo, mat } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = ((((Math.sin(i * 78.233) * 43758.5453) % 1) + 1) % 1) * 20 - 10;
      positions[i * 3 + 1] = ((((Math.sin(i * 39.425) * 24634.6345) % 1) + 1) % 1) * 6.4;
      positions[i * 3 + 2] = ((((Math.sin(i * 11.135) * 13579.1131) % 1) + 1) % 1) * 16 - 11;
      seeds[i] = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(params.shadowColor) },
        uColorB: { value: new THREE.Color(params.crestColor) },
      },
      vertexShader: DUST_VENUE_VERT,
      fragmentShader: DUST_VENUE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, [params.shadowColor, params.crestColor]);

  const time = useRef(0);
  useFrame((_, delta) => {
    if (!reducedMotion) time.current += Math.min(delta, 0.05);
    mat.uniforms.uTime.value = time.current;
  });

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  return (
    <points geometry={geo} frustumCulled={false}>
      <primitive object={mat} attach="material" />
    </points>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function OrbitRig({
  home,
  exploring,
  reducedMotion,
  resetKey,
}: {
  home: { radius: number; theta: number; phi: number };
  exploring: boolean;
  reducedMotion: boolean;
  resetKey: number;
}) {
  const { camera, gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 1.5, -3.4), []);
  const goal = useRef({ ...home });
  const smooth = useRef({ ...home });

  useEffect(() => {
    goal.current = { ...home };
  }, [home, resetKey]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";
    el.style.cursor = "grab";
    let dragging = false;
    let px = 0;
    let py = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      goal.current.theta -= dx * 0.005;
      goal.current.phi = clamp(goal.current.phi - dy * 0.003, 0.6, 1.42);
    };
    const up = () => {
      dragging = false;
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (exploring && !reducedMotion) goal.current.theta += dt * 0.13;
    const d = reducedMotion ? 1 : 1 - Math.exp(-4 * dt);
    const s = smooth.current;
    s.radius += (goal.current.radius - s.radius) * d;
    s.theta += (goal.current.theta - s.theta) * d;
    s.phi += (goal.current.phi - s.phi) * d;
    const sp = Math.sin(s.phi);
    camera.position.set(
      target.x + s.radius * sp * Math.sin(s.theta),
      target.y + s.radius * Math.cos(s.phi),
      target.z + s.radius * sp * Math.cos(s.theta)
    );
    camera.lookAt(target);
  });

  return null;
}

function VenueCanvas({ vibe, params }: Venue3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [preset, setPreset] = useState<LightingPreset>(() => defaultPreset(params.keyLightKelvin));
  const [haze, setHaze] = useState(true);
  const [gloss, setGloss] = useState(params.materialLanguage === "gloss" || params.materialLanguage === "mineral");
  const [exploring, setExploring] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const bloomRef = useRef<BloomEffect | null>(null);

  const home = useMemo(
    () => ({ radius: 15.5 - params.openness * 4.5, theta: 0.38, phi: 1.16 }),
    [params.openness]
  );

  const toggleLabel = exploring ? "Stop exploring" : "Explore space";

  return (
    <div className="relative">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-[#F4F0E8]/10 bg-[#0A0810] md:aspect-[16/9]"
        role="img"
        aria-label={`3D venue for ${vibe.concept.title}: ${vibe.concept.atmosphere}`}
      >
        <WebGLBoundary fallback={<VenueScene vibe={vibe} />}>
          <Canvas
            shadows
            dpr={[1, typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{ position: [5.5, 7.4, 12.5], fov: 45, near: 0.1, far: 60 }}
          >
            <color attach="background" args={["#0A0810"]} />
            <fogExp2 attach="fog" args={["#0A0810", params.fogDensity * 0.9]} />
            <VenueLighting params={params} preset={preset} haze={haze} reducedMotion={reducedMotion} bloomRef={bloomRef} />
            <Architecture params={params} gloss={gloss} />
            <VenueDust params={params} reducedMotion={reducedMotion} />
            <OrbitRig home={home} exploring={exploring} reducedMotion={reducedMotion} resetKey={resetKey} />
            <EffectComposer multisampling={0}>
              <Bloom ref={bloomRef} intensity={params.bloomIntensity} luminanceThreshold={0.22} luminanceSmoothing={0.3} mipmapBlur />
              <Vignette offset={0.24} darkness={0.72} />
            </EffectComposer>
          </Canvas>
        </WebGLBoundary>

        <div className="pointer-events-none absolute top-3 left-3 z-10 font-mono text-[10px] tracking-[0.24em] text-[#A6A0AA] uppercase">
          {vibe.concept.title} — {preset === "peak" ? "peak night" : preset === "golden" ? "golden hour" : "morning"} ·{" "}
          {haze ? "haze" : "clear"} · {gloss ? "gloss" : "matte"} {exploring && "· orbiting"}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 border-t border-[#F4F0E8]/10 bg-[#0B0A0D]/85 px-3 py-2.5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setExploring((v) => !v)}
            aria-pressed={exploring}
            className="rounded-sm border border-[#D5FF3F]/50 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#D5FF3F] uppercase transition-colors hover:bg-[#D5FF3F]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D5FF3F]"
          >
            {toggleLabel}
          </button>
          <button
            type="button"
            onClick={() => setPreset((p) => (p === "morning" ? "golden" : p === "golden" ? "peak" : "morning"))}
            className="rounded-sm border border-[#F4F0E8]/25 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Light: {preset === "peak" ? "peak night" : preset}
          </button>
          <button
            type="button"
            onClick={() => setHaze((v) => !v)}
            aria-pressed={haze}
            className="rounded-sm border border-[#F4F0E8]/25 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Atmosphere: {haze ? "haze" : "clear"}
          </button>
          <button
            type="button"
            onClick={() => setGloss((v) => !v)}
            aria-pressed={gloss}
            className="rounded-sm border border-[#F4F0E8]/25 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Floor: {gloss ? "gloss" : "matte"}
          </button>
          <button
            type="button"
            onClick={() => setResetKey((k) => k + 1)}
            className="rounded-sm border border-[#F4F0E8]/25 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Reset view
          </button>
          <a
            href="#signals"
            className="rounded-sm border border-[#F4F0E8]/25 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Cultural signals
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-10 max-w-[240px] rounded-sm border border-[#F4F0E8]/12 bg-[#0B0A0D]/85 p-3 font-mono text-[10px] leading-relaxed text-[#A6A0AA] backdrop-blur-sm">
        <p className="mb-1.5 tracking-[0.2em] text-[#F4F0E8] uppercase">Material study</p>
        <p><span className="text-[#D5FF3F]">Floor</span> — {vibe.flooringMaterial} ({gloss ? "polished" : "honed"}, reflectivity {params.reflectivity.toFixed(2)})</p>
        <p><span className="text-[#D5FF3F]">Seating</span> — {vibe.seatingFabric}</p>
        <p><span className="text-[#D5FF3F]">Key light</span> — {params.keyLightKelvin}K</p>
        <p><span className="text-[#D5FF3F]">Accent</span> — {params.primaryColor}</p>
        <p className="mt-1.5 text-[#8B5CF6]">Provenance: {vibe.reasoning.source}</p>
      </div>
    </div>
  );
}

export default function Venue3D(props: Venue3DProps) {
  return <VenueCanvas {...props} />;
}
