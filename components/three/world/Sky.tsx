import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE, SUN_DIR, makeSprinkleTexture, mulberry32, range, world } from "./scene";

/** The powder-blue sky dome, the sun, and drifting soft clouds. */

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
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uWarm;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform vec3 uFog;

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.02, 0.28, h));
    col = mix(col, uTop, smoothstep(0.26, 0.85, h));
    col = mix(uFog, col, smoothstep(-0.08, 0.14, dir.y));

    float sun = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uWarm * pow(sun, 6.0) * 0.35;
    col += uSun * pow(sun, 90.0) * 0.9;
    col += uSun * pow(sun, 900.0) * 2.2;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(PALETTE.skyTop) },
          uMid: { value: new THREE.Color(PALETTE.skyMid) },
          uHorizon: { value: new THREE.Color(PALETTE.horizon) },
          uWarm: { value: new THREE.Color(PALETTE.lowWarm) },
          uSun: { value: new THREE.Color(PALETTE.sun) },
          uSunDir: { value: SUN_DIR.clone() },
          uFog: { value: new THREE.Color(PALETTE.fog) },
        },
      }),
    []
  );

  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    // keep the dome centred on the viewer
    ref.current?.position.copy(camera.position);
  });

  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[380, 32, 20]} />
    </mesh>
  );
}

export function Sun() {
  const tex = useMemo(() => makeSprinkleTexture(64), []);
  const pos = useMemo(() => SUN_DIR.clone().multiplyScalar(150), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <sprite position={pos} scale={[42, 42, 1]}>
      <spriteMaterial
        map={tex}
        color={PALETTE.sun}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        opacity={0.9}
      />
    </sprite>
  );
}

interface Cloud {
  sprite: THREE.Sprite;
  speed: number;
  baseY: number;
  sway: number;
}

export function Clouds({ reducedMotion }: { reducedMotion: boolean }) {
  const tex = useMemo(() => makeSprinkleTexture(96), []);
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo<Cloud[]>(() => {
    const rng = mulberry32(9081);
    const list: Cloud[] = [];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(i % 4 === 0 ? PALETTE.lavender : "#ffffff"),
        transparent: true,
        depthWrite: false,
        opacity: range(rng, 0.18, 0.42),
        fog: false,
      });
      const sprite = new THREE.Sprite(m);
      const scale = range(rng, 34, 96);
      sprite.scale.set(scale, scale * range(rng, 0.42, 0.7), 1);
      const angle = rng() * Math.PI * 2;
      const rad = range(rng, 40, 150);
      const y = range(rng, 16, 62);
      sprite.position.set(Math.cos(angle) * rad, y, Math.sin(angle) * rad - 20);
      list.push({ sprite, speed: range(rng, 0.4, 1.4), baseY: y, sway: range(rng, 0.5, 2.2) });
    }
    return list;
  }, [tex]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    clouds.forEach((c) => g.add(c.sprite));
    return () => {
      clouds.forEach((c) => {
        g.remove(c.sprite);
        c.sprite.material.dispose();
      });
    };
  }, [clouds]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const d = Math.min(dt, 0.05);
    const speed = 1 + world.travel * 3.2 + world.wind * 0.4;
    for (const c of clouds) {
      c.sprite.position.x += d * c.speed * speed;
      if (c.sprite.position.x > 170) c.sprite.position.x = -170;
      c.sprite.position.y = c.baseY + Math.sin(world.time * 0.12 + c.sway) * 1.4;
    }
  });

  return <group ref={group} />;
}
