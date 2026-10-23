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

export type LightingPreset = "morning" | "golden" | "midnight";
export type CameraViewPreset = "orbit" | "plan" | "exploded" | "eye" | "focal";

interface Venue3DProps {
  vibe: VibePayload;
  params: SceneParams;
  spec?: SceneSpec;
  promptText?: string;
  fill?: boolean;
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
        position={[8, 12, 6]}
        intensity={targets.key}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={45}
        shadow-bias={-0.0003}
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
    </>
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
  activeZoneId = null,
  onSelectZone,
}: {
  spec: SceneSpec;
  gloss: boolean;
  exploded?: number;
  showRoof?: boolean;
  showWalls?: boolean;
  showPlanGrid?: boolean;
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

  return (
    <group>
      {/* --- Main Floor --- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 1.5, D * 1.5]} />
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
            <mesh key={idx} position={[x, (H + expY) / 2, z]}>
              <cylinderGeometry args={[0.015, 0.015, H + expY, 8]} />
              <meshBasicMaterial color="#D9532B" transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      )}

      {/* --- Perimeter Walls --- */}
      {showWalls && (
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

          {/* Right Wall (with Window Aperture if applicable) */}
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
                <boxGeometry args={[0.08, H * 0.6, D * 0.78]} />
                <meshStandardMaterial
                  color="#A8D8F0"
                  roughness={0.1}
                  metalness={0.8}
                  transparent
                  opacity={0.35}
                />
              </mesh>
              {/* Window Mullions / Frame */}
              {[-D * 0.25, 0, D * 0.25].map((z, idx) => (
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
        </group>
      )}

      {/* --- Architectural Ceiling Beams / Soffits (Elevates in Exploded Mode) --- */}
      {showRoof && (
        <group position={[0, H - 0.1 + expY, 0]}>
          {[-halfD * 0.6, -halfD * 0.2, halfD * 0.2, halfD * 0.6].map((z, i) => (
            <mesh key={i} position={[0, 0, z]} castShadow>
              <boxGeometry args={[W, 0.28, 0.35]} />
              <meshStandardMaterial color="#18151D" metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
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
      goal.current = { radius: 14.5, theta: 0.38, phi: 1.16 };
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
}: Venue3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const spec = useMemo(
    () => initialSpec || generateSceneSpec(promptText, vibe),
    [initialSpec, promptText, vibe]
  );

  const [preset, setPreset] = useState<LightingPreset>("golden");
  const [viewPreset, setViewPreset] = useState<CameraViewPreset>("orbit");
  const [haze, setHaze] = useState(true);
  const [gloss, setGloss] = useState(spec.floorFinish === "glossy_concrete");
  const [exploring, setExploring] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [selectedObject, setSelectedObject] = useState<SpatialObject | null>(null);

  // Architectural Layout & Planning States
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [showRoof, setShowRoof] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [showPlanGrid, setShowPlanGrid] = useState(false);
  const [activeZone, setActiveZone] = useState<SpatialZone | null>(null);
  const [focusPoint, setFocusPoint] = useState<[number, number, number] | null>(null);

  const bloomRef = useRef<BloomEffect | null>(null);

  const handleViewPresetChange = (v: CameraViewPreset) => {
    setViewPreset(v);
    if (v === "exploded") {
      setExplodedFactor(1);
      setShowPlanGrid(true);
      setFocusPoint(null);
    } else if (v === "plan") {
      setShowPlanGrid(true);
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
    setSelectedObject(null);
    setFocusPoint(zone.center);
    setShowPlanGrid(true);
  };

  return (
    <div className={fill ? "relative h-full w-full" : "relative"}>
      <div
        className={
          fill
            ? "relative h-full w-full overflow-hidden bg-[#0A0E1A]"
            : "relative aspect-[16/10] w-full overflow-hidden rounded-[2px] border border-[var(--lintel-paper)]/15 bg-[#0A0E1A] md:aspect-[16/9]"
        }
        role="img"
        aria-label={`3D architectural space: ${spec.typologyLabel}`}
        onClick={() => {
          setSelectedObject(null);
          setActiveZone(null);
          setFocusPoint(null);
        }}
      >
        <WebGLBoundary fallback={<VenueScene vibe={vibe} />}>
          <Canvas
            shadows
            dpr={[1, typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
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
              activeZoneId={activeZone?.id || null}
              onSelectZone={handleSelectZone}
            />

            {/* Objects in Scene */}
            {spec.objects.map((obj) => (
              <ObjectMesh
                key={obj.id}
                obj={obj}
                isSelected={selectedObject?.id === obj.id}
                onSelect={() => {
                  setSelectedObject(obj);
                  setActiveZone(null);
                  setFocusPoint(obj.position);
                }}
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
                  setSelectedObject(null);
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
                  setResetKey((k) => k + 1);
                  setExplodedFactor(0);
                  setShowPlanGrid(false);
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
