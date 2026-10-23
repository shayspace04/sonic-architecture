"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import * as THREE from "three";
import type { VibePayload } from "@/lib/types";
import type { SceneParams } from "@/lib/scene-params";
import { kelvinToRgb } from "@/lib/scene-params";
import { WebGLBoundary, usePrefersReducedMotion } from "./shared";
import VenueScene from "@/components/VenueScene";
import type { SceneSpec, SpatialObject, SpatialZone } from "@/lib/scene-spec";
import { generateSceneSpec } from "@/lib/scene-spec";
import { captureViewportSnapshot } from "@/lib/brief";

export type LightingPreset = "morning" | "golden" | "midnight";
export type CameraViewPreset = "orbit" | "plan" | "exploded" | "eye" | "focal";

interface Venue3DProps {
  vibe: VibePayload;
  params: SceneParams;
  spec?: SceneSpec;
  promptText?: string;
  fill?: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (obj: SpatialObject | null) => void;
  layoutMode?: "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony";
  onLayoutModeChange?: (mode: "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony") => void;
  guestCount?: number;
  onGuestCountChange?: (count: number) => void;
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
    return {
      ambient: 0.65,
      key: 2.6,
      keyRgb: kelvinToRgb(5600),
      accent: 12,
      pendant: 0.8,
      fogMul: 0.8,
      bloom: params.bloomIntensity * 0.7,
    };
  }
  if (preset === "golden") {
    return {
      ambient: 0.42,
      key: 2.2,
      keyRgb: kelvinToRgb(3200),
      accent: 28,
      pendant: 2.2,
      fogMul: 1.0,
      bloom: params.bloomIntensity * 0.95,
    };
  }
  // midnight
  return {
    ambient: 0.18,
    key: 0.8,
    keyRgb: kelvinToRgb(2400),
    accent: 48,
    pendant: 3.6,
    fogMul: 1.25,
    bloom: params.bloomIntensity * 1.2,
  };
}

function dampTo(current: number, target: number, dt: number, reduced: boolean): number {
  if (reduced) return target;
  return THREE.MathUtils.damp(current, target, 4.5, dt);
}

function VenueLighting({
  params,
  preset,
  haze,
  reducedMotion,
  bloomRef,
  spec,
}: {
  params: SceneParams;
  preset: LightingPreset;
  haze: boolean;
  reducedMotion: boolean;
  bloomRef: React.RefObject<BloomEffect | null>;
  spec: SceneSpec;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const accentARef = useRef<THREE.PointLight>(null);
  const accentBRef = useRef<THREE.PointLight>(null);
  const { scene } = useThree();

  const targets = useMemo(() => targetsFor(preset, params), [preset, params]);
  const baseFog = params.fogDensity * (haze ? 1.6 : 0.85);
  const state = useRef({
    ambient: targets.ambient,
    key: targets.key,
    accent: targets.accent,
    pendant: targets.pendant,
    fog: baseFog,
    bloom: targets.bloom,
    rgb: [...targets.keyRgb] as [number, number, number],
  });

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
    if (accentBRef.current) accentBRef.current.intensity = s.accent * 0.75;
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = s.fog;
    if (bloomRef.current) bloomRef.current.intensity = s.bloom;
  });

  return (
    <>
      <ambientLight ref={ambientRef} color="#C4D0E5" intensity={targets.ambient} />
      <directionalLight
        ref={keyRef}
        position={[10, 14, 8]}
        intensity={targets.key}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={65}
        shadow-bias={-0.0003}
      />
      <directionalLight
        position={[-12, 8, -10]}
        intensity={0.65}
        color="#8B9EB5"
      />
      <pointLight
        ref={accentARef}
        position={[0, 3.2, -6.5]}
        color={spec.accentColor || params.crestColor}
        distance={24}
        decay={2}
        intensity={targets.accent}
      />
      <pointLight
        ref={accentBRef}
        position={[-6, 2.8, -1.0]}
        color={spec.primaryColor || params.shadowColor}
        distance={20}
        decay={2}
        intensity={targets.accent * 0.75}
      />
      {preset === "midnight" && <CelestialStars visible={true} />}
    </>
  );
}

const CELESTIAL_POSITIONS = (() => {
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < starCount; i++) {
    const u = rnd() * 0.85 + 0.15;
    const theta = rnd() * Math.PI * 2;
    const radius = 65 + rnd() * 45;
    const qq = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(theta) * qq * radius;
    positions[i * 3 + 1] = u * radius + 5;
    positions[i * 3 + 2] = Math.sin(theta) * qq * radius;
  }
  return positions;
})();

function CelestialStars({ visible }: { visible: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(CELESTIAL_POSITIONS, 3));
    return g;
  }, []);

  return (
    <points geometry={geo} visible={visible}>
      <pointsMaterial
        color="#DCE8FF"
        size={0.65}
        transparent
        opacity={visible ? 0.9 : 0}
        depthWrite={false}
      />
    </points>
  );
}

/* ---------------------------------------------------------------------------
   Procedural Architectural Shell (Walls, Apertures, Slats, Flooring, Exploded Layers)
--------------------------------------------------------------------------- */

function ArchitecturalShell({
  spec,
  gloss,
  exploded = 0,
  showRoof = true,
  showWalls = true,
  showPlanGrid = false,
  showDimensions = false,
  activeZoneId = null,
  onSelectZone,
}: {
  spec: SceneSpec;
  gloss: boolean;
  exploded?: number;
  showRoof?: boolean;
  showWalls?: boolean;
  showPlanGrid?: boolean;
  showDimensions?: boolean;
  activeZoneId?: string | null;
  onSelectZone?: (zone: SpatialZone) => void;
}) {
  const { width: W, depth: D, height: H } = spec.roomDimensions;
  const halfW = W / 2;
  const halfD = D / 2;

  // Exploded offsets
  const expY = exploded * 4.2;
  const expZ = exploded * 3.2;
  const expX = exploded * 3.0;

  // Floor material characteristics
  const floorRoughness = gloss ? 0.12 : spec.floorFinish === "warm_oak" ? 0.58 : 0.75;
  const floorMetalness = gloss ? 0.65 : spec.floorFinish === "warm_oak" ? 0.05 : 0.15;
  const floorColor =
    spec.floorFinish === "warm_oak"
      ? "#6E5033"
      : spec.floorFinish === "glossy_concrete"
        ? "#0E0D12"
        : spec.floorFinish === "polished_stone"
          ? "#23262D"
          : "#282520";

  // Wall material characteristics
  const wallColor =
    spec.wallFinish === "gallery_white"
      ? "#EBE7DF"
      : spec.wallFinish === "wood_panel"
        ? "#856B52"
        : spec.wallFinish === "distressed_plaster"
          ? "#2E2A34"
          : "#1C1B22";

  // Acoustic slats count for listening lounge
  const slats = useMemo(() => {
    if (spec.wallFinish !== "acoustic_slats") return [];
    const count = 38;
    const items: number[] = [];
    const step = (W * 0.85) / count;
    for (let i = 0; i < count; i++) {
      items.push(-W * 0.425 + i * step);
    }
    return items;
  }, [spec.wallFinish, W]);

  const deckColor =
    spec.typology === "scandinavian_living"
      ? "#CCC6B8"
      : spec.typology === "listening_room"
        ? "#38281E"
        : spec.typology === "futuristic_launch"
          ? "#121418"
          : spec.typology === "mediterranean_courtyard"
            ? "#A25838"
            : spec.typology === "intimate_lounge"
              ? "#28221D"
              : "#2A2D34";

  return (
    <group>
      {/* --- Surrounding Ground Plane --- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[W * 3.5, D * 3.5]} />
        <meshStandardMaterial color="#070910" roughness={0.96} metalness={0.0} />
      </mesh>

      {/* --- Raised Foundation Plinth / Floating Deck Platform (Nest-style) --- */}
      <group position={[0, -0.19, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[W + 3.6, 0.38, D + 3.6]} />
          <meshStandardMaterial color={deckColor} roughness={0.65} metalness={0.12} />
        </mesh>
        {/* Plinth Edge Fascia Trim */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[W + 3.68, 0.04, D + 3.68]} />
          <meshStandardMaterial color="#1E1C1A" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>

      {/* --- Outdoor Reflecting Pool or Garden Basin alongside Pavilion --- */}
      <group position={[halfW + 1.2, -0.16, 0]}>
        {/* Basin Rim */}
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2.0, 0.32, D * 0.85]} />
          <meshStandardMaterial color="#14151B" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Reflective Water Surface */}
        <mesh position={[0, 0.14, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.7, D * 0.8]} />
          <meshStandardMaterial
            color="#284454"
            roughness={0.04}
            metalness={0.88}
            transparent
            opacity={0.88}
          />
        </mesh>
      </group>

      {/* --- Interior Floor Plate --- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={floorRoughness}
          metalness={floorMetalness}
        />
      </mesh>

      {/* --- Architectural Floor Plan & Zoning Blueprint Grid --- */}
      {showPlanGrid && (
        <group position={[0, 0.005, 0]}>
          <gridHelper
            args={[Math.max(W, D) * 1.4, Math.round(Math.max(W, D) * 1.4), "#5B7568", "#1E2A24"]}
            position={[0, 0.002, 0]}
          />
          {/* Spatial Envelope Boundary Box */}
          <lineSegments position={[0, 0.004, 0]} rotation-x={-Math.PI / 2}>
            <edgesGeometry args={[new THREE.PlaneGeometry(W, D)]} />
            <lineBasicMaterial color="#E8B878" transparent opacity={0.65} />
          </lineSegments>

          {/* Interactive Spatial Zones */}
          {spec.zones?.map((zone) => {
            const isSelected = activeZoneId === zone.id;
            return (
              <group
                key={zone.id}
                position={[zone.center[0], 0.008, zone.center[2]]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectZone?.(zone);
                }}
              >
                {/* Zone Floor Tint */}
                <mesh rotation-x={-Math.PI / 2}>
                  <planeGeometry args={[zone.dimensions[0], zone.dimensions[1]]} />
                  <meshBasicMaterial
                    color={zone.color}
                    transparent
                    opacity={isSelected ? 0.35 : 0.14}
                  />
                </mesh>
                {/* Zone Outline */}
                <lineSegments rotation-x={-Math.PI / 2}>
                  <edgesGeometry args={[new THREE.PlaneGeometry(zone.dimensions[0], zone.dimensions[1])]} />
                  <lineBasicMaterial
                    color={isSelected ? "#FFFFFF" : zone.color}
                    transparent
                    opacity={isSelected ? 0.95 : 0.5}
                  />
                </lineSegments>
              </group>
            );
          })}
        </group>
      )}

      {/* --- Exploded Leader Lines (Nest deconstruction visual) --- */}
      {exploded > 0.08 && showRoof && showWalls && (
        <group>
          {[
            [-halfW, -halfD],
            [halfW, -halfD],
            [-halfW, halfD],
            [halfW, halfD],
          ].map(([x, z], idx) => (
            <group key={idx}>
              {/* Leader Line cylinder */}
              <mesh position={[x, (H + expY) / 2, z]}>
                <cylinderGeometry args={[0.015, 0.015, H + expY, 8]} />
                <meshBasicMaterial color="#D9532B" transparent opacity={0.45} />
              </mesh>
              {/* Ground Anchor Node */}
              <mesh position={[x, 0.02, z]}>
                <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
                <meshStandardMaterial color="#D9532B" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Roof Anchor Node */}
              <mesh position={[x, H + expY, z]}>
                <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
                <meshStandardMaterial color="#D9532B" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* --- Architectural Dimension Annotations (Lintel-style Sheet Callouts) --- */}
      {showDimensions && (
        <group>
          {/* Front Width Dimension Line & End Ticks */}
          <group position={[0, 0.08, halfD + 1.25]}>
            {/* Main horizontal dimension line */}
            <mesh>
              <boxGeometry args={[W, 0.025, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Left end tick mark */}
            <mesh position={[-halfW, 0, 0]}>
              <boxGeometry args={[0.025, 0.025, 0.35]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Right end tick mark */}
            <mesh position={[halfW, 0, 0]}>
              <boxGeometry args={[0.025, 0.025, 0.35]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Witness extension lines from building corners to dimension line */}
            <mesh position={[-halfW, 0, -0.625]}>
              <boxGeometry args={[0.015, 0.015, 1.25]} />
              <meshBasicMaterial color="#D9532B" transparent opacity={0.4} />
            </mesh>
            <mesh position={[halfW, 0, -0.625]}>
              <boxGeometry args={[0.015, 0.015, 1.25]} />
              <meshBasicMaterial color="#D9532B" transparent opacity={0.4} />
            </mesh>
            {/* Dimension Badge Plane */}
            <group position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
              <mesh>
                <planeGeometry args={[2.2, 0.65]} />
                <meshBasicMaterial color="#EEE8DC" />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(2.2, 0.65)]} />
                <lineBasicMaterial color="#D9532B" />
              </lineSegments>
            </group>
          </group>

          {/* Right Depth Dimension Line & End Ticks */}
          <group position={[halfW + 1.25, 0.08, 0]}>
            {/* Main longitudinal dimension line */}
            <mesh>
              <boxGeometry args={[0.025, 0.025, D]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Near end tick */}
            <mesh position={[0, 0, -halfD]}>
              <boxGeometry args={[0.35, 0.025, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Far end tick */}
            <mesh position={[0, 0, halfD]}>
              <boxGeometry args={[0.35, 0.025, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Witness extension lines */}
            <mesh position={[-0.625, 0, -halfD]}>
              <boxGeometry args={[1.25, 0.015, 0.015]} />
              <meshBasicMaterial color="#D9532B" transparent opacity={0.4} />
            </mesh>
            <mesh position={[-0.625, 0, halfD]}>
              <boxGeometry args={[1.25, 0.015, 0.015]} />
              <meshBasicMaterial color="#D9532B" transparent opacity={0.4} />
            </mesh>
            {/* Dimension Badge Plane */}
            <group position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}>
              <mesh>
                <planeGeometry args={[2.2, 0.65]} />
                <meshBasicMaterial color="#EEE8DC" />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(2.2, 0.65)]} />
                <lineBasicMaterial color="#D9532B" />
              </lineSegments>
            </group>
          </group>

          {/* Vertical Height Dimension Line */}
          <group position={[-halfW - 0.9, H / 2, halfD]}>
            <mesh>
              <boxGeometry args={[0.025, H, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Bottom tick */}
            <mesh position={[0, -H / 2, 0]}>
              <boxGeometry args={[0.35, 0.025, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Top tick */}
            <mesh position={[0, H / 2, 0]}>
              <boxGeometry args={[0.35, 0.025, 0.025]} />
              <meshBasicMaterial color="#D9532B" />
            </mesh>
            {/* Dimension Badge */}
            <group position={[0, 0, 0]}>
              <mesh>
                <planeGeometry args={[2.2, 0.65]} />
                <meshBasicMaterial color="#EEE8DC" side={THREE.DoubleSide} />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(2.2, 0.65)]} />
                <lineBasicMaterial color="#D9532B" />
              </lineSegments>
            </group>
          </group>
        </group>
      )}

      {/* --- Perimeter Walls --- */}
      {showWalls && (
        <group>
          {spec.wallArchitecture === "arched_colonnade" ? (
            /* --- Arched Window Colonnades (Cathedrals & Courtyards) --- */
            <group>
              {/* Back Wall with Grand Arched Niche */}
              <group position={[0, H / 2, -halfD - expZ]}>
                <mesh receiveShadow castShadow>
                  <boxGeometry args={[W, H, 0.45]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                {/* Arched Altar / Fountain Niche Frame */}
                <mesh position={[0, 0.2, 0.24]}>
                  <boxGeometry args={[5.2, 5.0, 0.12]} />
                  <meshStandardMaterial color="#DDD6CB" roughness={0.85} />
                </mesh>
              </group>

              {/* Left Wall Arched Colonnade */}
              <group position={[-halfW - expX, H / 2, 0]}>
                <mesh position={[0, -H * 0.38, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.45, H * 0.24, D]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                <mesh position={[0, H * 0.38, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.45, H * 0.24, D]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                {[-7.2, -2.4, 2.4, 7.2].map((z, idx) => (
                  <group key={`arch-left-${idx}`} position={[0, 0, z]}>
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.08, H * 0.52, 3.4]} />
                      <meshStandardMaterial
                        color="#BCE5FC"
                        roughness={0.1}
                        metalness={0.6}
                        transparent
                        opacity={0.32}
                      />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.18, H * 0.52, 0.08]} />
                      <meshStandardMaterial color="#1E1C1A" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, H * 0.1, 0]}>
                      <boxGeometry args={[0.18, 0.08, 3.4]} />
                      <meshStandardMaterial color="#1E1C1A" metalness={0.7} roughness={0.3} />
                    </mesh>
                  </group>
                ))}
              </group>

              {/* Right Wall Arched Colonnade */}
              <group position={[halfW + expX, H / 2, 0]}>
                <mesh position={[0, -H * 0.38, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.45, H * 0.24, D]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                <mesh position={[0, H * 0.38, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.45, H * 0.24, D]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                {[-7.2, -2.4, 2.4, 7.2].map((z, idx) => (
                  <group key={`arch-right-${idx}`} position={[0, 0, z]}>
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.08, H * 0.52, 3.4]} />
                      <meshStandardMaterial
                        color="#BCE5FC"
                        roughness={0.1}
                        metalness={0.6}
                        transparent
                        opacity={0.32}
                      />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.18, H * 0.52, 0.08]} />
                      <meshStandardMaterial color="#1E1C1A" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, H * 0.1, 0]}>
                      <boxGeometry args={[0.18, 0.08, 3.4]} />
                      <meshStandardMaterial color="#1E1C1A" metalness={0.7} roughness={0.3} />
                    </mesh>
                  </group>
                ))}
              </group>

              {/* Front Portal Entrance Framing */}
              <group position={[0, H / 2, halfD + expZ]}>
                {/* Left Pier */}
                <mesh position={[-halfW * 0.65, 0, 0]} receiveShadow castShadow>
                  <boxGeometry args={[halfW * 0.7, H, 0.45]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                {/* Right Pier */}
                <mesh position={[halfW * 0.65, 0, 0]} receiveShadow castShadow>
                  <boxGeometry args={[halfW * 0.7, H, 0.45]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
                {/* Header Beam */}
                <mesh position={[0, H * 0.4, 0]} receiveShadow castShadow>
                  <boxGeometry args={[W, H * 0.2, 0.45]} />
                  <meshStandardMaterial color="#EAE5DC" roughness={0.88} />
                </mesh>
              </group>
            </group>
          ) : (
            /* --- Architectural Shell Walls --- */
            <group>
              {/* Back Wall */}
              <mesh position={[0, H / 2, -halfD - expZ]} receiveShadow castShadow>
                <boxGeometry args={[W, H, 0.4]} />
                <meshStandardMaterial
                  color={wallColor}
                  roughness={spec.wallFinish === "gallery_white" ? 0.85 : 0.7}
                  metalness={0.05}
                />
              </mesh>

              {/* Left Wall */}
              <mesh position={[-halfW - expX, H / 2, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.4, H, D]} />
                <meshStandardMaterial
                  color={wallColor}
                  roughness={0.75}
                  metalness={0.05}
                />
              </mesh>

              {/* Right Wall (with Window Aperture or Panoramic Glazing) */}
              {spec.hasWindowAperture ? (
                <group position={[halfW + expX, H / 2, 0]}>
                  {/* Wall header above window */}
                  <mesh position={[0, H * 0.38, 0]} receiveShadow castShadow>
                    <boxGeometry args={[0.4, H * 0.24, D]} />
                    <meshStandardMaterial color={wallColor} roughness={0.75} />
                  </mesh>
                  {/* Wall base below window */}
                  <mesh position={[0, -H * 0.42, 0]} receiveShadow castShadow>
                    <boxGeometry args={[0.4, H * 0.16, D]} />
                    <meshStandardMaterial color={wallColor} roughness={0.75} />
                  </mesh>
                  {/* Window Glass Aperture */}
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.08, H * 0.6, D * 0.82]} />
                    <meshStandardMaterial
                      color="#A8D8F0"
                      roughness={0.1}
                      metalness={0.8}
                      transparent
                      opacity={0.35}
                    />
                  </mesh>
                  {/* Window Mullions / Frame */}
                  {[-D * 0.28, -D * 0.1, D * 0.1, D * 0.28].map((z, idx) => (
                    <mesh key={idx} position={[0, 0, z]}>
                      <boxGeometry args={[0.18, H * 0.6, 0.12]} />
                      <meshStandardMaterial color="#1E1815" metalness={0.5} roughness={0.4} />
                    </mesh>
                  ))}
                </group>
              ) : (
                <mesh position={[halfW + expX, H / 2, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.4, H, D]} />
                  <meshStandardMaterial color={wallColor} roughness={0.75} metalness={0.05} />
                </mesh>
              )}

              {/* Acoustic Slatted Timber Detail (Back Wall Feature) */}
              {slats.length > 0 && (
                <group position={[0, H / 2, -halfD - expZ + 0.22]}>
                  {slats.map((x, i) => (
                    <mesh key={i} position={[x, 0, 0]} castShadow>
                      <boxGeometry args={[0.07, H * 0.88, 0.08]} />
                      <meshStandardMaterial
                        color="#452F1E"
                        roughness={0.65}
                        metalness={0.1}
                      />
                    </mesh>
                  ))}
                </group>
              )}

              {/* Front Facade Framing & Pocket Sliding Glass (Nest Pavilion Architecture) */}
              <group position={[0, H / 2, halfD + expZ]}>
                {/* Left Structural Corner Column */}
                <mesh position={[-halfW + 0.16, 0, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.32, H, 0.32]} />
                  <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.1} />
                </mesh>
                {/* Right Structural Corner Column */}
                <mesh position={[halfW - 0.16, 0, 0]} receiveShadow castShadow>
                  <boxGeometry args={[0.32, H, 0.32]} />
                  <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.1} />
                </mesh>
                {/* Upper Lintel / Header Beam */}
                <mesh position={[0, H * 0.44, 0]} receiveShadow castShadow>
                  <boxGeometry args={[W, H * 0.12, 0.32]} />
                  <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.1} />
                </mesh>
                {/* Floor Threshold Guide Track */}
                <mesh position={[0, -H * 0.48, 0]}>
                  <boxGeometry args={[W, 0.06, 0.2]} />
                  <meshStandardMaterial color="#1E1C1A" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Left Pocket Sliding Glass Panel */}
                <mesh position={[-halfW * 0.65, -H * 0.02, 0]}>
                  <boxGeometry args={[W * 0.28, H * 0.8, 0.06]} />
                  <meshStandardMaterial
                    color="#BCE5FC"
                    roughness={0.08}
                    metalness={0.75}
                    transparent
                    opacity={0.32}
                  />
                </mesh>
                {/* Left Glass Panel Frame */}
                <mesh position={[-halfW * 0.51, -H * 0.02, 0]}>
                  <boxGeometry args={[0.08, H * 0.8, 0.1]} />
                  <meshStandardMaterial color="#1E1C1A" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Right Pocket Sliding Glass Panel */}
                <mesh position={[halfW * 0.65, -H * 0.02, 0]}>
                  <boxGeometry args={[W * 0.28, H * 0.8, 0.06]} />
                  <meshStandardMaterial
                    color="#BCE5FC"
                    roughness={0.08}
                    metalness={0.75}
                    transparent
                    opacity={0.32}
                  />
                </mesh>
                {/* Right Glass Panel Frame */}
                <mesh position={[halfW * 0.51, -H * 0.02, 0]}>
                  <boxGeometry args={[0.08, H * 0.8, 0.1]} />
                  <meshStandardMaterial color="#1E1C1A" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>
            </group>
          )}
        </group>
      )}

      {/* --- Architectural Ceiling Structures & Cantilevered Roof Slab --- */}
      {showRoof && (
        <group position={[0, H - 0.1 + expY, 0]}>
          {/* Cantilevered Overhanging Roof Slab (Nest-style pavilion roof) */}
          {spec.ceilingStructure !== "cathedral_truss" && (
            <group position={[0, 0.18, 0]}>
              <mesh receiveShadow castShadow>
                <boxGeometry args={[W + 2.2, 0.22, D + 2.2]} />
                <meshStandardMaterial
                  color={
                    spec.typology === "futuristic_launch"
                      ? "#0F1115"
                      : spec.typology === "scandinavian_living"
                        ? "#DCD6CB"
                        : "#22252B"
                  }
                  roughness={0.7}
                  metalness={0.12}
                />
              </mesh>
              {/* Roof Fascia Edge Trim */}
              <mesh position={[0, 0.11, 0]}>
                <boxGeometry args={[W + 2.28, 0.04, D + 2.28]} />
                <meshStandardMaterial color="#15171C" metalness={0.5} roughness={0.5} />
              </mesh>
            </group>
          )}
          {spec.ceilingStructure === "cathedral_truss" ? (
            /* Exposed Cathedral Timber A-Frame Trusses */
            <group>
              {/* Longitudinal Ridge Beam at apex */}
              <mesh position={[0, 1.8, 0]} castShadow>
                <boxGeometry args={[0.38, 0.45, D * 1.05]} />
                <meshStandardMaterial color="#8B5E34" roughness={0.75} metalness={0.05} />
              </mesh>
              {/* Sloped Roof Deck panels */}
              <mesh position={[-halfW * 0.5, 0.9, 0]} rotation-z={-Math.PI / 10} receiveShadow>
                <boxGeometry args={[W * 0.58, 0.15, D * 1.02]} />
                <meshStandardMaterial color="#A67B51" roughness={0.8} />
              </mesh>
              <mesh position={[halfW * 0.5, 0.9, 0]} rotation-z={Math.PI / 10} receiveShadow>
                <boxGeometry args={[W * 0.58, 0.15, D * 1.02]} />
                <meshStandardMaterial color="#A67B51" roughness={0.8} />
              </mesh>
              {/* Heavy Timber Trusses spaced along the hall */}
              {[-8.5, -4.25, 0, 4.25, 8.5].map((z, i) => (
                <group key={`truss-${i}`} position={[0, 0, z]}>
                  {/* Horizontal Tie Beam */}
                  <mesh position={[0, -0.2, 0]} castShadow>
                    <boxGeometry args={[W * 0.98, 0.38, 0.35]} />
                    <meshStandardMaterial color="#784E25" roughness={0.7} />
                  </mesh>
                  {/* Vertical King Post */}
                  <mesh position={[0, 0.8, 0]} castShadow>
                    <boxGeometry args={[0.32, 1.8, 0.32]} />
                    <meshStandardMaterial color="#784E25" roughness={0.7} />
                  </mesh>
                  {/* Left Rafter */}
                  <mesh position={[-halfW * 0.48, 0.8, 0]} rotation-z={-Math.PI / 10} castShadow>
                    <boxGeometry args={[W * 0.56, 0.32, 0.32]} />
                    <meshStandardMaterial color="#784E25" roughness={0.7} />
                  </mesh>
                  {/* Right Rafter */}
                  <mesh position={[halfW * 0.48, 0.8, 0]} rotation-z={Math.PI / 10} castShadow>
                    <boxGeometry args={[W * 0.56, 0.32, 0.32]} />
                    <meshStandardMaterial color="#784E25" roughness={0.7} />
                  </mesh>
                </group>
              ))}
            </group>
          ) : spec.ceilingStructure === "acoustic_coffered" ? (
            /* Deep Recessed Acoustic Coffered Timber Grid */
            <group>
              <mesh position={[0, 0.15, 0]}>
                <boxGeometry args={[W, 0.25, D]} />
                <meshStandardMaterial color="#221813" roughness={0.8} />
              </mesh>
              {/* Longitudinal Coffers */}
              {[-halfW * 0.6, -halfW * 0.2, halfW * 0.2, halfW * 0.6].map((x, xi) => (
                <mesh key={`coff-x-${xi}`} position={[x, -0.15, 0]} castShadow>
                  <boxGeometry args={[0.24, 0.35, D * 0.96]} />
                  <meshStandardMaterial color="#3A281E" roughness={0.65} />
                </mesh>
              ))}
              {/* Transversal Coffers */}
              {[-halfD * 0.65, -halfD * 0.32, 0, halfD * 0.32, halfD * 0.65].map((z, zi) => (
                <mesh key={`coff-z-${zi}`} position={[0, -0.15, z]} castShadow>
                  <boxGeometry args={[W * 0.96, 0.35, 0.24]} />
                  <meshStandardMaterial color="#3A281E" roughness={0.65} />
                </mesh>
              ))}
            </group>
          ) : spec.ceilingStructure === "timber_pergola" ? (
            /* Open Timber Pergola with Skylight Aperture */
            <group>
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[W * 0.75, 0.06, D * 0.75]} />
                <meshStandardMaterial color="#BCE5FC" roughness={0.1} metalness={0.6} transparent opacity={0.35} />
              </mesh>
              {[-halfD * 0.75, -halfD * 0.5, -halfD * 0.25, 0, halfD * 0.25, halfD * 0.5, halfD * 0.75].map((z, i) => (
                <mesh key={`pergola-${i}`} position={[0, -0.14, z]} castShadow>
                  <boxGeometry args={[W * 0.88, 0.28, 0.16]} />
                  <meshStandardMaterial color="#8B5A2B" roughness={0.75} />
                </mesh>
              ))}
            </group>
          ) : spec.ceilingStructure === "neon_lightgrid" ? (
            /* Suspended Geometric Neon Lightgrid */
            <group>
              <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[W, 0.1, D]} />
                <meshStandardMaterial color="#0A0B0E" roughness={0.9} />
              </mesh>
              {[-halfW * 0.5, 0, halfW * 0.5].map((x, xi) => (
                <mesh key={`neon-x-${xi}`} position={[x, -0.35, 0]}>
                  <boxGeometry args={[0.08, 0.08, D * 0.85]} />
                  <meshStandardMaterial color="#FF1493" emissive="#FF007F" emissiveIntensity={2.5} toneMapped={false} />
                </mesh>
              ))}
              {[-halfD * 0.5, 0, halfD * 0.5].map((z, zi) => (
                <mesh key={`neon-z-${zi}`} position={[0, -0.32, z]}>
                  <boxGeometry args={[W * 0.85, 0.08, 0.08]} />
                  <meshStandardMaterial color="#00F0FF" emissive="#00E5FF" emissiveIntensity={2.5} toneMapped={false} />
                </mesh>
              ))}
            </group>
          ) : spec.ceilingStructure === "concrete_beams" ? (
            /* Heavy Concrete Structural Beams */
            <group>
              {[-halfD * 0.65, -halfD * 0.22, halfD * 0.22, halfD * 0.65].map((z, i) => (
                <mesh key={`conc-beam-${i}`} position={[0, -0.22, z]} castShadow>
                  <boxGeometry args={[W * 0.98, 0.44, 0.48]} />
                  <meshStandardMaterial color="#2E3035" roughness={0.8} />
                </mesh>
              ))}
            </group>
          ) : (
            /* Minimal Soffit / Standard Beams */
            <group>
              {[-halfD * 0.6, -halfD * 0.2, halfD * 0.2, halfD * 0.6].map((z, i) => (
                <mesh key={i} position={[0, 0, z]} castShadow>
                  <boxGeometry args={[W, 0.28, 0.35]} />
                  <meshStandardMaterial color="#18151D" metalness={0.3} roughness={0.6} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Procedural 3D Spatial Objects
--------------------------------------------------------------------------- */

function ObjectMesh({
  obj,
  isSelected,
  onSelect,
}: {
  obj: SpatialObject;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Render geometry based on kind and id
  const renderGeometry = () => {
    /* --- Grand Baroque Multi-Tier Crystal Chandelier --- */
    if (obj.id.includes("chandelier")) {
      return (
        <group>
          {/* Suspension Chain */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.4, 8]} />
            <meshStandardMaterial color="#B38A4B" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Central Ornate Brass Body */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.42, 0.6, 16]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.88} roughness={0.2} />
          </mesh>
          {/* Tiered Faceted Crystal Prisms */}
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.72, 0.22, 0.52, 16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.2} transparent opacity={0.82} />
          </mesh>
          {/* Radiating Curved Brass Arms & Candle Lights */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const ang = (i * Math.PI) / 4;
            const r = 0.88;
            const x = Math.cos(ang) * r;
            const z = Math.sin(ang) * r;
            return (
              <group key={i} position={[x, -0.08, z]}>
                <mesh position={[-x * 0.45, 0, -z * 0.45]} rotation-y={ang}>
                  <boxGeometry args={[0.04, 0.04, r * 0.85]} />
                  <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.04, 0.03, 0.16, 8]} />
                  <meshStandardMaterial color="#FFF8E7" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.22, 0]}>
                  <sphereGeometry args={[0.038, 8, 8]} />
                  <meshStandardMaterial
                    color="#FFAE42"
                    emissive="#FF9D2E"
                    emissiveIntensity={3.2}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            );
          })}
          {/* Warm Ambient Chandelier Glow */}
          <pointLight color="#FFD992" distance={22} decay={2} intensity={4.8} />
        </group>
      );
    }

    /* --- Glass Hurricane Candle Lantern --- */
    if (obj.id.includes("candle-lantern")) {
      return (
        <group>
          {/* Glass Hurricane Enclosure */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.26, 0.42, 0.26]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.05}
              metalness={0.2}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* Antiqued Brass Rims */}
          <mesh position={[0, 0.21, 0]}>
            <boxGeometry args={[0.28, 0.03, 0.28]} />
            <meshStandardMaterial color="#B38A4B" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.21, 0]}>
            <boxGeometry args={[0.28, 0.03, 0.28]} />
            <meshStandardMaterial color="#B38A4B" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Wax Pillar Candle Inside */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.22, 16]} />
            <meshStandardMaterial color="#FFF5E4" roughness={0.8} />
          </mesh>
          {/* Glowing Flame */}
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial
              color="#FFA834"
              emissive="#FF9D1E"
              emissiveIntensity={3.8}
              toneMapped={false}
            />
          </mesh>
          {/* Localized Candlelight Bounce */}
          <pointLight color="#FFAE34" distance={3.8} decay={2} intensity={1.8} />
        </group>
      );
    }

    /* --- Draped Linen Banquet Table with Tableware & Chiavari Chairs --- */
    if (obj.id.includes("banquet-table")) {
      return (
        <group>
          {/* Draped floor-length linen tablecloth */}
          <mesh castShadow receiveShadow position={[0, -0.02, 0]}>
            <boxGeometry args={[1.5, 0.74, 13.8]} />
            <meshStandardMaterial
              color="#F7F4EE"
              roughness={0.94}
              metalness={0.02}
            />
          </mesh>
          {/* Table runner */}
          <mesh position={[0, 0.36, 0]} receiveShadow>
            <boxGeometry args={[0.65, 0.015, 13.6]} />
            <meshStandardMaterial color="#EAE4D8" roughness={0.9} />
          </mesh>
          {/* Tabletop candle votives spaced along table */}
          {[-5.0, -3.0, -1.0, 1.0, 3.0, 5.0].map((z, idx) => (
            <group key={idx} position={[0, 0.42, z]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.03, 0.08, 12]} />
                <meshStandardMaterial color="#FFF9E6" emissive="#FFA834" emissiveIntensity={1.8} />
              </mesh>
              <pointLight color="#FFA834" distance={1.8} decay={2} intensity={0.4} />
            </group>
          ))}
          {/* Chiavari Banquet Chairs flanking table */}
          {[-5.2, -3.6, -2.0, -0.4, 1.2, 2.8, 4.4].map((z, idx) => (
            <group key={`chairs-${idx}`}>
              {/* Left chair */}
              <group position={[-1.0, -0.05, z]} rotation-y={Math.PI / 2}>
                <mesh position={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.42, 0.06, 0.42]} />
                  <meshStandardMaterial color="#FFF8ED" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.25, -0.18]} castShadow>
                  <boxGeometry args={[0.4, 0.46, 0.04]} />
                  <meshStandardMaterial color="#B08D57" metalness={0.3} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.22, 0]}>
                  <cylinderGeometry args={[0.018, 0.015, 0.42, 8]} />
                  <meshStandardMaterial color="#B08D57" metalness={0.3} roughness={0.5} />
                </mesh>
              </group>
              {/* Right chair */}
              <group position={[1.0, -0.05, z]} rotation-y={-Math.PI / 2}>
                <mesh position={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.42, 0.06, 0.42]} />
                  <meshStandardMaterial color="#FFF8ED" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.25, -0.18]} castShadow>
                  <boxGeometry args={[0.4, 0.46, 0.04]} />
                  <meshStandardMaterial color="#B08D57" metalness={0.3} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.22, 0]}>
                  <cylinderGeometry args={[0.018, 0.015, 0.42, 8]} />
                  <meshStandardMaterial color="#B08D57" metalness={0.3} roughness={0.5} />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      );
    }

    /* --- Elevated Floral Centerpiece on Trumpet Pedestal --- */
    if (obj.id.includes("floral-pedestal")) {
      return (
        <group>
          {/* Polished Brass Trumpet Stand */}
          <mesh position={[0, -0.4, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.16, 1.2, 16]} />
            <meshStandardMaterial color="#C5A059" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.98, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.06, 24]} />
            <meshStandardMaterial color="#C5A059" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.26, 0.06, 0.22, 16]} />
            <meshStandardMaterial color="#C5A059" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Lush White Rose & Hydrangea Bouquet */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <sphereGeometry args={[0.46, 16, 16]} />
            <meshStandardMaterial color="#F7F3EE" roughness={0.85} />
          </mesh>
          <mesh position={[-0.18, 0.65, 0.1]} castShadow>
            <sphereGeometry args={[0.26, 12, 12]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
          </mesh>
          <mesh position={[0.2, 0.62, -0.1]} castShadow>
            <sphereGeometry args={[0.24, 12, 12]} />
            <meshStandardMaterial color="#EFE7DA" roughness={0.8} />
          </mesh>
          {/* Trailing Eucalyptus Foliage Collar */}
          <mesh position={[0, 0.35, 0]}>
            <torusGeometry args={[0.4, 0.14, 8, 16]} />
            <meshStandardMaterial color="#354E38" roughness={0.9} />
          </mesh>
        </group>
      );
    }

    /* --- Cathedral Botanical Floral Archway --- */
    if (obj.id.includes("floral-arch")) {
      return (
        <group>
          {/* Arched foliage crown */}
          <mesh castShadow position={[0, 0, 0]}>
            <torusGeometry args={[2.2, 0.42, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#2E4733" roughness={0.9} />
          </mesh>
          {/* Left and Right vertical foliage pillars */}
          <mesh castShadow position={[-2.2, -1.1, 0]}>
            <cylinderGeometry args={[0.38, 0.45, 2.4, 12]} />
            <meshStandardMaterial color="#2E4733" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[2.2, -1.1, 0]}>
            <cylinderGeometry args={[0.38, 0.45, 2.4, 12]} />
            <meshStandardMaterial color="#2E4733" roughness={0.9} />
          </mesh>
          {/* Blooming white garden rose clusters */}
          {[-1.8, -0.9, 0, 0.9, 1.8].map((x, i) => (
            <mesh key={i} position={[x, Math.sqrt(Math.max(0, 4.84 - x * x)), 0.15]}>
              <sphereGeometry args={[0.26, 12, 12]} />
              <meshStandardMaterial color="#FFF5EE" roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    }

    /* --- Ceremonial Altar Table with Draped Silks --- */
    if (obj.id.includes("altar-table")) {
      return (
        <group>
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[2.8, 0.88, 0.9]} />
            <meshStandardMaterial color="#1E1C1A" roughness={0.7} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.05, 0.05]} castShadow>
            <boxGeometry args={[2.85, 0.8, 0.95]} />
            <meshStandardMaterial color="#F7F3EB" roughness={0.9} />
          </mesh>
          {[-0.8, 0, 0.8].map((x, i) => (
            <group key={i} position={[x, 0.55, 0]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.035, 0.22, 12]} />
                <meshStandardMaterial color="#FFF9EE" emissive="#FFA834" emissiveIntensity={2.0} />
              </mesh>
              <pointLight color="#FFA834" distance={2.5} decay={2} intensity={0.6} />
            </group>
          ))}
        </group>
      );
    }

    if (obj.kind === "light" && obj.id.includes("lantern")) {
      return (
        <group>
          {/* Lantern sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.45, 32, 32]} />
            <meshStandardMaterial
              color={obj.color}
              emissive={obj.emissive || "#FFD480"}
              emissiveIntensity={obj.emissiveIntensity || 1.8}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>
          <pointLight
            color={obj.emissive || "#FFD480"}
            distance={8}
            decay={2}
            intensity={2.8}
          />
          {/* Suspension wire */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 2.4, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      );
    }

    if (obj.kind === "light" && obj.id.includes("neon")) {
      return (
        <group>
          <mesh>
            <boxGeometry args={[4.8, 3.2, 0.08]} />
            <meshStandardMaterial
              color={obj.color}
              emissive={obj.emissive || obj.color}
              emissiveIntensity={obj.emissiveIntensity || 3.0}
              toneMapped={false}
            />
          </mesh>
          <pointLight color={obj.emissive || obj.color} distance={12} decay={2} intensity={3.5} />
        </group>
      );
    }

    if (obj.id.includes("audio-console") || obj.id.includes("dj-booth")) {
      return (
        <group>
          {/* Main Credenza Body */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[2.8, 0.8, 0.85]} />
            <meshStandardMaterial
              color={obj.color}
              roughness={obj.roughness}
              metalness={obj.metalness}
            />
          </mesh>
          {/* Turntable Platter 1 */}
          <mesh position={[-0.7, 0.43, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Turntable Platter 2 */}
          <mesh position={[0.7, 0.43, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Mixer / Amp Center */}
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.45, 0.04, 0.35]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      );
    }

    if (obj.id.includes("speaker")) {
      return (
        <group>
          {/* Cabinet Base */}
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.65, 1.2, 0.55]} />
            <meshStandardMaterial color={obj.color} roughness={0.6} metalness={0.2} />
          </mesh>
          {/* Horn flare on top */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.12, 0.45, 16]} />
            <meshStandardMaterial color="#5A3A24" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      );
    }

    if (obj.id.includes("sofa") || obj.id.includes("lounge-banquette")) {
      return (
        <group>
          {/* Base cushion */}
          <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[3.2, 0.45, 1.2]} />
            <meshStandardMaterial color={obj.color} roughness={0.9} metalness={0.05} />
          </mesh>
          {/* Backrest */}
          <mesh castShadow receiveShadow position={[0, 0.3, -0.42]}>
            <boxGeometry args={[3.2, 0.48, 0.35]} />
            <meshStandardMaterial color={obj.color} roughness={0.9} metalness={0.05} />
          </mesh>
        </group>
      );
    }

    if (obj.kind === "seat") {
      return (
        <group>
          {/* Seat Cushion */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.8, 0.38, 0.8]} />
            <meshStandardMaterial
              color={obj.color}
              roughness={obj.roughness}
              metalness={obj.metalness}
            />
          </mesh>
          {/* Backrest */}
          <mesh castShadow receiveShadow position={[0, 0.4, -0.32]}>
            <boxGeometry args={[0.8, 0.46, 0.16]} />
            <meshStandardMaterial
              color={obj.color}
              roughness={obj.roughness}
              metalness={obj.metalness}
            />
          </mesh>
        </group>
      );
    }

    if (obj.id.includes("rug")) {
      return (
        <mesh receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[4.8, 4.2]} />
          <meshStandardMaterial
            color={obj.color}
            roughness={obj.roughness}
            metalness={0.0}
          />
        </mesh>
      );
    }

    if (obj.id.includes("coffee-table") || obj.id.includes("chrome-table")) {
      return (
        <group>
          {/* Table Top */}
          <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.08, 32]} />
            <meshStandardMaterial
              color={obj.color}
              roughness={obj.roughness}
              metalness={obj.metalness}
            />
          </mesh>
          {/* Pedestal Leg */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.08, 0.18, 0.4, 24]} />
            <meshStandardMaterial color="#1E1B18" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );
    }

    if (obj.id.includes("tree-planter")) {
      return (
        <group>
          {/* Planter Pot */}
          <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.55, 0.42, 0.9, 24]} />
            <meshStandardMaterial color="#8B4A2D" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Tree Foliage Clusters */}
          <mesh castShadow position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.85, 16, 16]} />
            <meshStandardMaterial color="#354E35" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0.25, 0.95, 0.1]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial color="#4A6A4A" roughness={0.9} />
          </mesh>
        </group>
      );
    }

    /* --- Fluted Cocktail Bar Counter --- */
    if (obj.id.includes("bar-counter") || obj.id.includes("bar")) {
      return (
        <group>
          {/* Main Curved/Fluted Counter Base */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[4.2, 1.05, 1.1]} />
            <meshStandardMaterial color={obj.color} roughness={0.45} metalness={0.2} />
          </mesh>
          {/* Honed Stone / Marble Counter Top with Overhang */}
          <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[4.4, 0.08, 1.25]} />
            <meshStandardMaterial color="#1E1B18" roughness={0.2} metalness={0.6} />
          </mesh>
          {/* Polished Brass Footrail */}
          <mesh position={[0, -0.38, 0.62]}>
            <cylinderGeometry args={[0.025, 0.025, 4.2, 16]} rotation-z={Math.PI / 2} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Backlit Under-Counter Glow */}
          <mesh position={[0, 0.48, 0.58]}>
            <boxGeometry args={[4.2, 0.02, 0.04]} />
            <meshStandardMaterial color="#FFB84D" emissive="#FFA834" emissiveIntensity={2.0} />
          </mesh>
        </group>
      );
    }

    /* --- Floor-to-Ceiling Grid Library & Vinyl Shelving Wall --- */
    if (obj.id.includes("shelving-wall") || obj.id.includes("shelf") || obj.id.includes("library")) {
      return (
        <group>
          {/* Outer Grid Frame */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[5.2, 3.4, 0.45]} />
            <meshStandardMaterial color={obj.color} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Internal Grid Shelves & Record Sleeves */}
          {[-1.8, -0.9, 0, 0.9, 1.8].map((x, xi) => (
            <mesh key={`div-${xi}`} position={[x, 0, 0.02]}>
              <boxGeometry args={[0.04, 3.35, 0.42]} />
              <meshStandardMaterial color="#1A1512" roughness={0.6} />
            </mesh>
          ))}
          {[-1.0, -0.3, 0.4, 1.1].map((y, yi) => (
            <group key={`shelf-${yi}`}>
              <mesh position={[0, y, 0.02]}>
                <boxGeometry args={[5.15, 0.04, 0.42]} />
                <meshStandardMaterial color="#1A1512" roughness={0.6} />
              </mesh>
              {/* Record album bundles on shelf */}
              {[-1.4, -0.5, 0.5, 1.4].map((rx, ri) => (
                <mesh key={`rec-${ri}`} position={[rx, y + 0.16, 0.05]}>
                  <boxGeometry args={[0.28, 0.3, 0.32]} />
                  <meshStandardMaterial color="#C5B095" roughness={0.8} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    }

    /* --- Carved Stone Water Fountain Basin --- */
    if (obj.id.includes("fountain")) {
      return (
        <group>
          {/* Octagonal Carved Stone Basin */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.6, 0.75, 8]} />
            <meshStandardMaterial color="#DDD5C7" roughness={0.65} metalness={0.1} />
          </mesh>
          {/* Inner Water Surface */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[1.35, 1.35, 0.02, 16]} />
            <meshStandardMaterial color="#4A7C85" roughness={0.05} metalness={0.8} transparent opacity={0.85} />
          </mesh>
          {/* Central Water Plinth & Brass Spout */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 0.45, 8]} />
            <meshStandardMaterial color="#DDD5C7" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );
    }

    /* --- Architectural Travertine Hearth / Fireplace --- */
    if (obj.id.includes("hearth") || obj.id.includes("fireplace")) {
      return (
        <group>
          {/* Cantilevered Travertine Slab */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[2.8, 0.55, 0.9]} />
            <meshStandardMaterial color={obj.color} roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Recessed Firebox */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.8, 0.25, 0.6]} />
            <meshStandardMaterial color="#141210" roughness={0.9} />
          </mesh>
          {/* Glowing Embers */}
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[1.5, 0.08, 0.4]} />
            <meshStandardMaterial color="#FFA834" emissive="#FF7A18" emissiveIntensity={3.2} toneMapped={false} />
          </mesh>
          <pointLight color="#FF9C28" distance={4.5} decay={2} intensity={2.0} />
        </group>
      );
    }

    /* --- Qloo Cultural Artist Showcase Plinth --- */
    if (obj.id.includes("showcase") || obj.id.includes("cultural-showcase")) {
      return (
        <group>
          {/* Honed Architectural Stone Vitrine Pedestal */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[1.1, 1.0, 0.75]} />
            <meshStandardMaterial color="#3A3836" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Inscribed Brushed Brass Plaque */}
          <mesh position={[0, 0.1, 0.39]}>
            <boxGeometry args={[0.75, 0.35, 0.02]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.25} />
          </mesh>
          {/* Glass Display Vitrine Hood */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.95, 0.5, 0.65]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.05} metalness={0.1} transparent opacity={0.28} />
          </mesh>
          {/* Vinyl Showcase Record / Artifact Inside */}
          <mesh position={[0, 0.75, 0]} rotation-x={Math.PI / 4}>
            <cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Spotlight over showcase */}
          <pointLight color="#FFE2A8" distance={3.5} decay={2} intensity={1.8} />
        </group>
      );
    }

    /* --- Mouth-Blown Amber Teardrop Glass Pendant --- */
    if (obj.id.includes("pendant-amber")) {
      return (
        <group>
          {/* Mouth-blown Amber Glass Pendant */}
          <mesh castShadow>
            <sphereGeometry args={[0.26, 24, 24]} />
            <meshStandardMaterial color="#FFAE4A" roughness={0.1} metalness={0.1} transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#FFAE34" emissive="#FF9D2E" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 2.2, 8]} />
            <meshStandardMaterial color="#2B1A0E" />
          </mesh>
          <pointLight color="#FF9C28" distance={6.0} decay={2} intensity={2.2} />
        </group>
      );
    }

    // Default plinth / structure
    return (
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 0.85, 1.2]} />
        <meshStandardMaterial
          color={obj.color}
          roughness={obj.roughness}
          metalness={obj.metalness}
          emissive={obj.emissive}
          emissiveIntensity={obj.emissiveIntensity}
        />
      </mesh>
    );
  };

  return (
    <group
      position={obj.position}
      rotation={obj.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {renderGeometry()}

      {/* Architectural selection wireframe indicator */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 1.5, 1.8]} />
          <meshBasicMaterial
            wireframe
            color={isSelected ? "#D9532B" : "#2F5A4C"}
            transparent
            opacity={isSelected ? 0.9 : 0.4}
          />
        </mesh>
      )}
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Camera Orbit & Preset Rig
--------------------------------------------------------------------------- */

function OrbitRig({
  viewPreset,
  exploring,
  reducedMotion,
  resetKey,
  focusPoint = null,
  specDimensions,
}: {
  viewPreset: CameraViewPreset;
  exploring: boolean;
  reducedMotion: boolean;
  resetKey: number;
  focusPoint?: [number, number, number] | null;
  specDimensions: { width: number; depth: number; height: number };
}) {
  const { camera, gl } = useThree();

  const defaultTarget = useMemo(() => new THREE.Vector3(0, 1.2, -1.8), []);
  const currentTarget = useRef(new THREE.Vector3(0, 1.2, -1.8));
  const goal = useRef({ radius: 14.5, theta: 0.38, phi: 1.16 });
  const smooth = useRef({ radius: 14.5, theta: 0.38, phi: 1.16 });

  // Update target when camera view changes
  useEffect(() => {
    const maxDim = Math.max(specDimensions.width, specDimensions.depth);
    if (viewPreset === "plan") {
      goal.current = { radius: Math.max(16.0, maxDim * 1.35), theta: 0.0001, phi: 0.06 }; // Top-down plan
    } else if (viewPreset === "exploded") {
      goal.current = { radius: Math.max(18.0, maxDim * 1.45), theta: 0.55, phi: 0.95 }; // Axonometric exploded
    } else if (viewPreset === "eye") {
      goal.current = { radius: 6.2, theta: 0.15, phi: 1.48 }; // Eye-level perspective
    } else if (viewPreset === "focal") {
      goal.current = { radius: 5.2, theta: 0.45, phi: 1.28 }; // Focal close-up
    } else {
      // Standard perspective orbit
      goal.current = { radius: Math.max(14.0, maxDim * 1.15), theta: 0.38, phi: 1.16 };
    }
  }, [viewPreset, resetKey, specDimensions]);

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
      goal.current.phi = Math.min(1.5, Math.max(0.08, goal.current.phi - dy * 0.003));
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
    if (exploring && !reducedMotion) goal.current.theta += dt * 0.12;

    const d = reducedMotion ? 1 : 1 - Math.exp(-4.5 * dt);
    const s = smooth.current;
    s.radius += (goal.current.radius - s.radius) * d;
    s.theta += (goal.current.theta - s.theta) * d;
    s.phi += (goal.current.phi - s.phi) * d;

    // Smooth focus target
    const dest = focusPoint
      ? new THREE.Vector3(focusPoint[0], 0.8, focusPoint[2])
      : defaultTarget;
    currentTarget.current.lerp(dest, reducedMotion ? 1 : Math.min(1, 4.5 * dt));

    const sp = Math.sin(s.phi);
    camera.position.set(
      currentTarget.current.x + s.radius * sp * Math.sin(s.theta),
      currentTarget.current.y + s.radius * Math.cos(s.phi),
      currentTarget.current.z + s.radius * sp * Math.cos(s.theta)
    );
    camera.lookAt(currentTarget.current);
  });

  return null;
}

/* ---------------------------------------------------------------------------
   Main Venue Canvas & Architectural Studio Interface
--------------------------------------------------------------------------- */

function VenueCanvas({
  vibe,
  params,
  spec: initialSpec,
  promptText = "",
  fill = false,
  selectedObjectId = null,
  onSelectObject,
  layoutMode,
  onLayoutModeChange,
  guestCount,
  onGuestCountChange,
}: Venue3DProps) {
  const reducedMotion = usePrefersReducedMotion();

  const [internalLayoutMode, setInternalLayoutMode] = useState<
    "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony"
  >(initialSpec?.eventCapacity?.layoutMode ?? "lounge");

  const [internalGuestCount, setInternalGuestCount] = useState<number>(
    initialSpec?.eventCapacity?.guests ?? 80
  );

  const currentLayoutMode = layoutMode ?? internalLayoutMode;
  const currentGuestCount = guestCount ?? internalGuestCount;

  const handleLayoutModeChange = (
    mode: "banquet" | "theatre" | "cocktail" | "lounge" | "ceremony"
  ) => {
    setInternalLayoutMode(mode);
    onLayoutModeChange?.(mode);
  };

  const handleGuestCountChange = (count: number) => {
    setInternalGuestCount(count);
    onGuestCountChange?.(count);
  };

  const spec = useMemo(
    () =>
      initialSpec ||
      generateSceneSpec(promptText, vibe, {
        layoutMode: currentLayoutMode,
        guestCount: currentGuestCount,
      }),
    [initialSpec, promptText, vibe, currentLayoutMode, currentGuestCount]
  );

  const [preset, setPreset] = useState<LightingPreset>("golden");
  const [viewPreset, setViewPreset] = useState<CameraViewPreset>("orbit");
  const [haze, setHaze] = useState(true);
  const [gloss, setGloss] = useState(spec.floorFinish === "glossy_concrete");
  const [exploring, setExploring] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [internalSelectedObject, setInternalSelectedObject] = useState<SpatialObject | null>(null);

  // Derived selected object (prioritizes external selection prop if controlled)
  const selectedObject = useMemo(() => {
    if (selectedObjectId !== undefined) {
      if (!selectedObjectId) return null;
      return spec.objects.find((o) => o.id === selectedObjectId) ?? null;
    }
    return internalSelectedObject;
  }, [selectedObjectId, spec.objects, internalSelectedObject]);

  // Architectural Layout & Planning States
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [showRoof, setShowRoof] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [showPlanGrid, setShowPlanGrid] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [activeZone, setActiveZone] = useState<SpatialZone | null>(null);
  const [focusPoint, setFocusPoint] = useState<[number, number, number] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<BloomEffect | null>(null);

  const handleViewPresetChange = (v: CameraViewPreset) => {
    setViewPreset(v);
    if (v === "exploded") {
      setExplodedFactor(1);
      setShowPlanGrid(true);
      setShowDimensions(true);
      setFocusPoint(null);
    } else if (v === "plan") {
      setShowPlanGrid(true);
      setShowDimensions(true);
      setFocusPoint(null);
    } else {
      if (explodedFactor > 0) {
        setExplodedFactor(0);
      }
      setShowPlanGrid(false);
    }
  };

  const handleSelectZone = (zone: SpatialZone) => {
    setActiveZone(zone);
    setInternalSelectedObject(null);
    setFocusPoint(zone.center);
    setShowPlanGrid(true);
    onSelectObject?.(null);
  };

  const handleSelectObject = (obj: SpatialObject) => {
    setInternalSelectedObject(obj);
    setActiveZone(null);
    setFocusPoint(obj.position);
    onSelectObject?.(obj);
  };

  const handleDeselect = () => {
    setInternalSelectedObject(null);
    setActiveZone(null);
    setFocusPoint(null);
    onSelectObject?.(null);
  };

  return (
    <div ref={containerRef} className={fill ? "relative h-full w-full" : "relative"}>
      <div
        className={
          fill
            ? "relative h-full w-full overflow-hidden bg-[#0A0E1A]"
            : "relative aspect-[16/10] w-full overflow-hidden rounded-[2px] border border-[var(--lintel-paper)]/15 bg-[#0A0E1A] md:aspect-[16/9]"
        }
        role="img"
        aria-label={`3D architectural space: ${spec.typologyLabel}`}
        onClick={handleDeselect}
      >
        <WebGLBoundary fallback={<VenueScene vibe={vibe} />}>
          <Canvas
            shadows
            dpr={[1, typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 2]}
            gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
            camera={{ position: [6.0, 7.5, 13.0], fov: 44, near: 0.1, far: 70 }}
          >
            <color attach="background" args={["#0A0E1A"]} />
            <fogExp2 attach="fog" args={["#0A0E1A", params.fogDensity * 0.85]} />
            <VenueLighting
              params={params}
              preset={preset}
              haze={haze}
              reducedMotion={reducedMotion}
              bloomRef={bloomRef}
              spec={spec}
            />
            <ArchitecturalShell
              spec={spec}
              gloss={gloss}
              exploded={explodedFactor}
              showRoof={showRoof}
              showWalls={showWalls}
              showPlanGrid={showPlanGrid || viewPreset === "plan" || viewPreset === "exploded"}
              showDimensions={showDimensions}
              activeZoneId={activeZone?.id || null}
              onSelectZone={handleSelectZone}
            />

            {/* Objects in Scene */}
            {spec.objects.map((obj) => (
              <ObjectMesh
                key={obj.id}
                obj={obj}
                isSelected={selectedObject?.id === obj.id}
                onSelect={() => handleSelectObject(obj)}
              />
            ))}

            <OrbitRig
              viewPreset={viewPreset}
              exploring={exploring}
              reducedMotion={reducedMotion}
              resetKey={resetKey}
              focusPoint={focusPoint}
              specDimensions={spec.roomDimensions}
            />

            <EffectComposer multisampling={0}>
              <Bloom
                ref={bloomRef}
                intensity={params.bloomIntensity * 0.9}
                luminanceThreshold={0.24}
                luminanceSmoothing={0.3}
                mipmapBlur
              />
              <Vignette offset={0.24} darkness={0.68} />
            </EffectComposer>
          </Canvas>
        </WebGLBoundary>

        {/* --- Top Left Architectural Metadata Badge (Nest-style glass pill) --- */}
        <div
          className={`pointer-events-none absolute left-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-xl ${
            fill ? "top-20" : "top-4"
          }`}
        >
          <span className="font-mono text-[9px] font-semibold tracking-[0.22em] text-[var(--lintel-terracotta)] uppercase">{spec.typologyLabel}</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="font-mono text-[9px] tracking-[0.16em] text-white/55">{spec.roomDimensions.width}m × {spec.roomDimensions.depth}m × {spec.roomDimensions.height}m</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="font-mono text-[9px] tracking-[0.16em] text-white/55">{preset.toUpperCase()}</span>
        </div>

        {/* --- Floating Spatial Layout & Planning Drawer (Nest-style architectural HUD) --- */}
        {isPlanningOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-20 left-4 z-30 max-h-[calc(100%-140px)] w-88 overflow-y-auto rounded-2xl border border-white/15 bg-black/75 p-5 font-mono text-xs text-white shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[9px] font-semibold tracking-[0.24em] text-[var(--lintel-terracotta)] uppercase">
                  Spatial Layout &amp; Planning
                </span>
                <h4 className="mt-0.5 text-sm font-medium tracking-tight text-white">
                  {spec.typologyLabel}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanningOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Dimensional Metrics Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <span className="text-white/40 block">Envelope Footprint</span>
                <span className="text-white/90 font-semibold text-xs">
                  {spec.roomDimensions.width}m × {spec.roomDimensions.depth}m ({spec.roomDimensions.width * spec.roomDimensions.depth}m²)
                </span>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <span className="text-white/40 block">Volume &amp; Clear</span>
                <span className="text-white/90 font-semibold text-xs">
                  {spec.roomDimensions.width * spec.roomDimensions.depth * spec.roomDimensions.height}m³ · {spec.roomDimensions.height}m H
                </span>
              </div>
            </div>

            {/* Qloo Cultural Evidence & Dynamic Recommendations */}
            {(spec.qlooFlooring || spec.qlooSeating || spec.qlooFeaturedArtist || spec.qlooLightingK) && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] tracking-[0.2em] text-[var(--lintel-moss)] uppercase font-semibold">
                    Qloo Recommendations
                  </span>
                  <span className="text-[8px] text-white/40 font-mono">AFFINITY-DRIVEN</span>
                </div>
                <div className="space-y-1 text-white/70">
                  {spec.qlooFlooring && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Flooring:</span>
                      <span className="text-white/90 font-medium text-right">{spec.qlooFlooring}</span>
                    </div>
                  )}
                  {spec.qlooSeating && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Seating:</span>
                      <span className="text-white/90 font-medium text-right">{spec.qlooSeating}</span>
                    </div>
                  )}
                  {spec.qlooFeaturedArtist && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Cultural Artist:</span>
                      <span className="text-[var(--lintel-terracotta)] font-semibold text-right">{spec.qlooFeaturedArtist}</span>
                    </div>
                  )}
                  {spec.qlooLightingK && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Kelvin:</span>
                      <span className="text-white/90 font-medium text-right">{spec.qlooLightingK}K</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interactive Spatial Zones */}
            <div className="mt-4">
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase block mb-2">
                Zoning Plan ({spec.zones?.length || 0} Functional Zones)
              </span>
              <div className="space-y-2">
                {spec.zones?.map((zone) => {
                  const isSelected = activeZone?.id === zone.id;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => handleSelectZone(zone)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-[var(--lintel-terracotta)] bg-[var(--lintel-terracotta)]/15 shadow-sm"
                          : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="text-xs font-medium text-white">
                            {zone.name}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-white/60">
                          {zone.areaSqM}m²
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-white/65">
                        {zone.rationale}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-white/40">
                        <span>Bounds: {zone.dimensions[0]}m × {zone.dimensions[1]}m</span>
                        <span className="text-[var(--lintel-terracotta)]">Focus Zone ↗</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architectural Capacity & Layout Configuration (Lintel Chapter 2) */}
            <div className="mt-4 border-t border-white/10 pt-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] tracking-[0.2em] text-[var(--lintel-terracotta)] uppercase font-semibold">
                  Spatial Layout &amp; Event Capacity
                </span>
                <span className="font-mono text-[8px] text-white/50">
                  SHEET A-03 · 1:200
                </span>
              </div>

              {/* Layout Archetype Selector */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] mb-3">
                {(
                  [
                    ["banquet", "Banquet", "rounds of 10"],
                    ["theatre", "Theatre", "rows of 16"],
                    ["cocktail", "Cocktail", "high tables"],
                    ["lounge", "Lounge", "intimate salon"],
                  ] as const
                ).map(([k, label, note]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleLayoutModeChange(k)}
                    className={`flex flex-col rounded-lg border p-2 text-left transition-all ${
                      currentLayoutMode === k
                        ? "border-[var(--lintel-terracotta)] bg-[var(--lintel-terracotta)]/20 text-white font-semibold"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[8px] text-white/40">{note}</span>
                  </button>
                ))}
              </div>

              {/* Guest Attendance Slider */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-white/50 uppercase">
                    Guest Attendance
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">
                    {currentGuestCount} guests
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max={Math.max(260, Math.round((spec.roomDimensions.width * spec.roomDimensions.depth) / 1.0))}
                  step="5"
                  value={currentGuestCount}
                  onChange={(e) => handleGuestCountChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--lintel-terracotta)] cursor-pointer"
                />
                <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-white/10 pt-2 text-center font-mono text-[9px]">
                  <div>
                    <span className="text-white/40 block">Tables</span>
                    <span className="text-white font-medium">
                      {spec.eventCapacity?.tablesCount ?? Math.ceil(currentGuestCount / 10)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Density</span>
                    <span className="text-white font-medium">
                      {((spec.roomDimensions.width * spec.roomDimensions.depth) / currentGuestCount).toFixed(1)} m²/g
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Status</span>
                    <span
                      className={
                        (spec.roomDimensions.width * spec.roomDimensions.depth) / currentGuestCount >= 1.8
                          ? "text-emerald-400 font-semibold"
                          : "text-amber-400 font-semibold"
                      }
                    >
                      {(spec.roomDimensions.width * spec.roomDimensions.depth) / currentGuestCount >= 1.8
                        ? "Fits"
                        : "Tight"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architectural Deconstruction (Nest Exploded Layers) */}
            <div className="mt-4 border-t border-white/10 pt-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase">
                  Exploded Deconstruction
                </span>
                <span className="text-[10px] text-white/70">
                  {Math.round(explodedFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedFactor}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setExplodedFactor(val);
                  if (val > 0) setShowPlanGrid(true);
                }}
                className="w-full accent-[var(--lintel-terracotta)] cursor-pointer"
              />
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => setShowRoof((v) => !v)}
                  className={`rounded-lg border px-2 py-1.5 uppercase transition-all ${
                    showRoof ? "border-white/25 bg-white/15 text-white" : "border-white/10 text-white/40"
                  }`}
                >
                  Roof: {showRoof ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalls((v) => !v)}
                  className={`rounded-lg border px-2 py-1.5 uppercase transition-all ${
                    showWalls ? "border-white/25 bg-white/15 text-white" : "border-white/10 text-white/40"
                  }`}
                >
                  Walls: {showWalls ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlanGrid((v) => !v)}
                  className={`rounded-lg border px-2 py-1.5 uppercase transition-all ${
                    showPlanGrid ? "border-white/25 bg-white/15 text-white" : "border-white/10 text-white/40"
                  }`}
                >
                  Grid: {showPlanGrid ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Selected Object Inspector Card (Nest-style dark glass) --- */}
        {selectedObject && (
          <div className="absolute top-20 right-4 z-20 w-72 overflow-hidden rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[9px] font-semibold tracking-[0.24em] text-[var(--lintel-terracotta)] uppercase">
                Object Inspector
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeselect();
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>
            <h4 className="mt-2.5 text-sm font-medium tracking-tight text-white">
              {selectedObject.label}
            </h4>
            <div className="mt-3 space-y-2 text-[11px] text-white/70">
              <p>
                <span className="text-white/40">Dimensions</span><br /><span className="text-white/85">{selectedObject.dimensions}</span>
              </p>
              <p>
                <span className="text-white/40">Material</span><br /><span className="text-white/85">{selectedObject.material}</span>
              </p>
              <p className="mt-2.5 border-t border-white/10 pt-2.5 text-[10px] leading-relaxed text-white/75">
                <span className="mb-1 block font-semibold tracking-[0.16em] text-[var(--lintel-moss)] uppercase">Design Rationale</span>
                {selectedObject.rationale}
              </p>
            </div>
          </div>
        )}

        {/* --- Projected Dimension Sheet Header (Lintel Sheet A-03) --- */}
        {showDimensions && (
          <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
            <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-[var(--lintel-terracotta)] bg-[#EEE8DC] px-4 py-1.5 font-mono text-[11px] font-semibold text-[#171A1F] shadow-2xl backdrop-blur-xl">
              <span className="text-[var(--lintel-moss)] font-bold">WIDTH</span>
              <span>{spec.roomDimensions.width.toFixed(1)}m</span>
              <span className="text-[#171A1F]/30">×</span>
              <span className="text-[var(--lintel-moss)] font-bold">DEPTH</span>
              <span>{spec.roomDimensions.depth.toFixed(1)}m</span>
              <span className="text-[#171A1F]/30">×</span>
              <span className="text-[var(--lintel-moss)] font-bold">RIDGE</span>
              <span>{spec.roomDimensions.height.toFixed(1)}m</span>
              <span className="ml-1 rounded bg-[var(--lintel-terracotta)]/15 px-2 py-0.5 text-[10px] text-[var(--lintel-terracotta)] font-semibold">
                {(spec.roomDimensions.width * spec.roomDimensions.depth).toFixed(0)}m² floor · {(spec.roomDimensions.width * spec.roomDimensions.depth * spec.roomDimensions.height).toFixed(0)}m³
              </span>
            </div>
          </div>
        )}

        {/* --- Bottom Controls Bar (Nest-style floating glass dock) --- */}
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <div className="flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/55 px-4 py-2.5 shadow-2xl backdrop-blur-2xl">
            {/* Camera View Switcher */}
            <div className="flex items-center gap-1">
              <span className="mr-1.5 hidden font-mono text-[8px] font-semibold tracking-[0.24em] text-white/30 uppercase sm:inline">
                View
              </span>
              {(
                [
                  ["orbit", "Persp"],
                  ["plan", "Plan"],
                  ["exploded", "Exploded"],
                  ["eye", "Eye"],
                  ["focal", "Focal"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleViewPresetChange(v)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                    viewPreset === v
                      ? "bg-[var(--lintel-terracotta)] text-white shadow-sm font-semibold"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowDimensions((v) => !v)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                  showDimensions
                    ? "bg-[var(--lintel-terracotta)] text-white shadow-sm font-semibold"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                Dims: {showDimensions ? "On" : "Off"}
              </button>
            </div>

            {/* Layouts & Planning Drawer Button */}
            <button
              type="button"
              onClick={() => setIsPlanningOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                isPlanningOpen
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              <span>⊞</span>
              <span>Layout &amp; Plans</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-white/15 hidden sm:block" />

            {/* Lighting & Environment Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setPreset((p) => (p === "morning" ? "golden" : p === "golden" ? "midnight" : "morning"))
                }
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] text-white/65 uppercase transition-all hover:bg-white/10 hover:text-white"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${preset === "morning" ? "bg-sky-300" : preset === "golden" ? "bg-amber-400" : "bg-indigo-400"}`} />
                {preset === "morning" ? "Morning" : preset === "golden" ? "Golden" : "Midnight"}
              </button>
              <button
                type="button"
                onClick={() => setHaze((h) => !h)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                  haze ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                Haze
              </button>
              <button
                type="button"
                onClick={() => setGloss((v) => !v)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                  gloss ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                Gloss
              </button>
              <button
                type="button"
                onClick={() => setExploring((v) => !v)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase transition-all ${
                  exploring
                    ? "bg-[var(--lintel-moss)] text-white shadow-sm"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {exploring ? "● Orbiting" : "Orbit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const canvas = containerRef.current?.querySelector("canvas");
                  if (canvas) captureViewportSnapshot(canvas, spec.typologyLabel);
                }}
                className="rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] text-white/55 uppercase transition-all hover:bg-white/10 hover:text-white"
                title="Capture WebGL Viewport Snapshot (.png)"
              >
                Snapshot
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetKey((k) => k + 1);
                  setExplodedFactor(0);
                  setShowPlanGrid(false);
                  setShowDimensions(false);
                  setShowRoof(true);
                  setShowWalls(true);
                  setActiveZone(null);
                  setFocusPoint(null);
                }}
                className="rounded-lg px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] text-white/40 uppercase transition-all hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Venue3D(props: Venue3DProps) {
  return <VenueCanvas {...props} />;
}
