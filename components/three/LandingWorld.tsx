"use client";

import { Suspense, Component, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, DepthOfField } from "@react-three/postprocessing";
import { FOG_DENSITY, PALETTE, SUN_DIR, world, type WorldPhase } from "./world/scene";
import { useSkyEnvironment } from "./world/assets";
import Terrain from "./world/Terrain";
import { GrassField, WildflowerField, MeadowPlants, HeroTree } from "./world/Vegetation";
import { SkyDome, Sun, Clouds } from "./world/Sky";
import Horizon from "./world/Landmarks";
import Character from "./world/Character";
import { Petals, Pollen, SunShafts } from "./world/Atmosphere";
import { WorldClock, CameraRig } from "./world/CameraRig";

export type { WorldPhase };

/** Keeps optional scenery (e.g. the character) from taking down the whole scene. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Optional world element failed to load.", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SkyEnvironment() {
  useSkyEnvironment();
  return null;
}

function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const warm = useRef(new THREE.Color("#fff3d9"));
  const target = useRef(new THREE.Color());
  useFrame(() => {
    const s = sun.current;
    if (!s) return;
    const warmth = world.warmth;
    s.intensity = 2.7 + warmth * 1.3;
    target.current.setRGB(1, 0.95 - warmth * 0.06, 0.85 - warmth * 0.16);
    warm.current.lerp(target.current, 0.05);
    s.color.copy(warm.current);
  });
  return (
    <>
      <hemisphereLight args={[PALETTE.skyUpper, PALETTE.grassDeep, 0.22]} />
      <ambientLight intensity={0.12} color={PALETTE.skyMid} />
      <directionalLight
        ref={sun}
        position={[SUN_DIR.x * 70, SUN_DIR.y * 70, SUN_DIR.z * 70]}
        intensity={2.7}
        color="#fff3d9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={240}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
    </>
  );
}

function World({
  phase,
  reducedMotion,
  mobile,
}: {
  phase: WorldPhase;
  reducedMotion: boolean;
  mobile: boolean;
}) {
  return (
    <>
      <WorldClock phase={phase} reducedMotion={reducedMotion} />
      <CameraRig reducedMotion={reducedMotion} />
      <SkyEnvironment />
      <Lighting />

      {/* Always-present sky so the loading window is already beautiful */}
      <SkyDome />
      <Sun />
      <Clouds reducedMotion={reducedMotion} />

      <Suspense fallback={<SkyDome />}>
        <Terrain />
        <GrassField />
        <WildflowerField />
        <MeadowPlants />
        <HeroTree />
        <Horizon />
        <SilentBoundary>
          <Suspense fallback={null}>
            <Character reducedMotion={reducedMotion} />
          </Suspense>
        </SilentBoundary>
        <Pollen reducedMotion={reducedMotion} />
        <Petals reducedMotion={reducedMotion} />
        <SunShafts reducedMotion={reducedMotion} />
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.16} luminanceThreshold={0.95} luminanceSmoothing={0.35} mipmapBlur />
        {!mobile && (
          <DepthOfField target={[0, 1.2, -18]} focalLength={0.02} bokehScale={2.2} />
        )}
        <Vignette offset={0.32} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export default function LandingWorld({
  phase,
  reducedMotion = false,
}: {
  phase: WorldPhase;
  reducedMotion?: boolean;
}) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, mobile ? 1.5 : 1.75]}
        shadows="percentage"
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 2.7, 14.5], fov: 44, near: 0.1, far: 700 }}
      >
        <color attach="background" args={[PALETTE.skyMid]} />
        <fogExp2 attach="fog" args={[PALETTE.fog, FOG_DENSITY]} />
        <World phase={phase} reducedMotion={reducedMotion} mobile={mobile} />
      </Canvas>
    </div>
  );
}
