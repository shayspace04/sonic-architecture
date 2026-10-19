import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE, SUN_DIR, makeSprinkleTexture, mulberry32, range, world } from "./scene";

/** The blue sky dome, a soft sun, and large layered cumulus clouds. */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  #include <common>
  #include <tonemapping_pars_fragment>
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uUpper;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uWarm;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform vec3 uFog;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // vertical gradient: horizon -> mid -> upper -> zenith
    vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
    col = mix(col, uUpper, smoothstep(0.16, 0.5, h));
    col = mix(col, uTop, smoothstep(0.42, 0.92, h));

    // warm glow near the horizon, strongest towards the sun
    float sunAmount = max(dot(dir, normalize(uSunDir)), 0.0);
    float warm = smoothstep(0.4, -0.02, h) * (0.22 + 0.78 * pow(sunAmount, 2.0));
    col = mix(col, uWarm, warm * 0.5);

    // sun disc glow
    col += uSun * pow(sunAmount, 220.0) * 0.9;

    // bleed into the fog at the very bottom so the dome meets the ground
    float bottom = smoothstep(0.0, -0.24, h);
    col = mix(col, uFog, bottom * 0.5);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function SkyDome() {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(PALETTE.skyTop) },
        uUpper: { value: new THREE.Color(PALETTE.skyUpper) },
        uMid: { value: new THREE.Color(PALETTE.skyMid) },
        uHorizon: { value: new THREE.Color(PALETTE.horizon) },
        uSun: { value: new THREE.Color(PALETTE.sun) },
        uWarm: { value: new THREE.Color(PALETTE.lowWarm) },
        uFog: { value: new THREE.Color(PALETTE.fog) },
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }, []);

  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 20]} />
    </mesh>
  );
}

export function Sun() {
  const tex = useMemo(() => makeSprinkleTexture(64), []);
  const pos = useMemo(() => SUN_DIR.clone().multiplyScalar(160), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <sprite position={pos} scale={[46, 46, 1]}>
      <spriteMaterial
        map={tex}
        color={PALETTE.sun}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        opacity={0.85}
      />
    </sprite>
  );
}

interface Puff {
  sprite: THREE.Sprite;
  offset: THREE.Vector2;
}
interface Cloud {
  puffs: Puff[];
  speed: number;
  baseY: number;
  sway: number;
  phase: number;
}

export function Clouds({ reducedMotion }: { reducedMotion: boolean }) {
  const tex = useMemo(() => makeSprinkleTexture(128), []);
  const group = useRef<THREE.Group>(null);
  const mobile = useMemo(
    () => (typeof window === "undefined" ? false : window.innerWidth < 768),
    []
  );

  const clouds = useMemo<Cloud[]>(() => {
    const rng = mulberry32(9081);
    const count = mobile ? 12 : 22;
    const list: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      const puffs: Puff[] = [];
      const puffCount = 4 + Math.floor(rng() * 4);
      const spreadX = range(rng, 14, 30);
      const spreadY = range(rng, 4, 8);
      for (let p = 0; p < puffCount; p++) {
        const dark = rng() < 0.35;
        const m = new THREE.SpriteMaterial({
          map: tex,
          color: new THREE.Color(dark ? PALETTE.lavender : "#ffffff"),
          transparent: true,
          depthWrite: false,
          opacity: range(rng, 0.35, 0.7),
          fog: false,
        });
        const sprite = new THREE.Sprite(m);
        const size = range(rng, 18, 46);
        sprite.scale.set(size, size * range(rng, 0.45, 0.72), 1);
        const ox = (rng() - 0.5) * spreadX;
        const oy = (rng() - 0.5) * spreadY;
        sprite.position.set(ox, oy, -Math.abs(ox) * 0.12);
        puffs.push({ sprite, offset: new THREE.Vector2(ox, oy) });
      }
      const angle = rng() * Math.PI * 2;
      const rad = range(rng, 60, 190);
      const y = range(rng, 40, 96);
      const cloud = new THREE.Group();
      puffs.forEach((p) => cloud.add(p.sprite));
      cloud.position.set(Math.cos(angle) * rad, y, Math.sin(angle) * rad - 40);
      list.push({
        puffs,
        speed: range(rng, 0.5, 1.4),
        baseY: y,
        sway: range(rng, 0.5, 2.4),
        phase: rng() * 6.283,
      });
      // keep a handle to the group on the first puff for movement
      (list[list.length - 1] as unknown as { group: THREE.Group }).group = cloud;
    }
    return list;
  }, [tex, mobile]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    clouds.forEach((c) => g.add((c as unknown as { group: THREE.Group }).group));
    return () => {
      clouds.forEach((c) => {
        const grp = (c as unknown as { group: THREE.Group }).group;
        g.remove(grp);
        c.puffs.forEach((p) => p.sprite.material.dispose());
      });
    };
  }, [clouds]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = Math.min(dt, 0.05);
    const speed = 1 + world.travel * 3 + world.wind * 0.35;
    for (const c of clouds) {
      const grp = (c as unknown as { group: THREE.Group }).group;
      grp.position.x += d * c.speed * speed;
      if (grp.position.x > 230) grp.position.x = -230;
      grp.position.y = c.baseY + Math.sin(world.time * 0.06 + c.phase) * 1.6;
    }
  });

  return <group ref={group} />;
}
