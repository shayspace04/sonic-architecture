/**
 * Sonic Architecture — Step 2(d): Living Details & SceneSpec LivingDetails Toggle System
 * Complete replacement module for:
 *   - components/three/LivingDetails.tsx
 *   - lib/types.ts (SceneSpec optional `livingDetails?: LivingDetailType[]` extension & validator)
 *
 * Implements all 6 data-driven Living Details toggled by `SceneSpec.livingDetails`:
 *   1. `flame`: Multi-cone procedural noise-flickering flame + warm 2200K flickering PointLight + ember bed
 *   2. `caustics_water`: Pool water basin with animated dual-layer cellular caustic canvas texture
 *   3. `waterfall`: Scrolling translucent water sheet strips + rising mist/splash light particles
 *   4. `string_lights`: Instanced warm 2400K emissive bulbs suspended along hyperbolic cosine catenary curves
 *   5. `swaying_foliage`: Wind-swaying instanced architectural foliage / trees with per-instance phase jitter
 *   6. `drifting_particles`: Drifting atmospheric dust motes (day/dawn) or warm bioluminescent fireflies (dusk/night)
 *
 * Strict TypeScript, zero `any`, full GPU geometry/material/texture disposal on unmount.
 */

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ============================================================================
// 1. SCENESPEC OPTIONAL EXTENSION & VALIDATION (lib/types.ts)
// ============================================================================

export type LivingDetailType =
  | "flame"
  | "caustics_water"
  | "waterfall"
  | "string_lights"
  | "swaying_foliage"
  | "drifting_particles";

export interface LivingDetailsConfig {
  /** Which living details are active in the current scene */
  enabledDetails: LivingDetailType[];
  /** Quality tier controlling instance & particle counts (60fps at Medium) */
  qualityTier?: "low" | "medium" | "high";
  /** Time of day preset affecting particle hue and practical emissive boost */
  timeOfDay?: "morning" | "afternoon" | "sunset" | "midnight";
  /** Room dimensions in metres */
  roomDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  /** Primary focal point coordinates [x, y, z] */
  focalPointPosition?: [number, number, number];
}

const VALID_LIVING_DETAILS: ReadonlySet<LivingDetailType> = new Set<LivingDetailType>([
  "flame",
  "caustics_water",
  "waterfall",
  "string_lights",
  "swaying_foliage",
  "drifting_particles"
]);

export function validateLivingDetails(input: unknown): LivingDetailType[] {
  if (!Array.isArray(input)) {
    return [
      "flame",
      "caustics_water",
      "waterfall",
      "string_lights",
      "swaying_foliage",
      "drifting_particles"
    ];
  }
  const validated = input.filter(
    (item): item is LivingDetailType =>
      typeof item === "string" && VALID_LIVING_DETAILS.has(item as LivingDetailType)
  );
  return validated;
}

/**
 * Resolves default living details for any architectural typology or prompt
 * when `SceneSpec.livingDetails` is omitted.
 */
export function resolveDefaultLivingDetails(
  typology: string,
  promptText = ""
): LivingDetailType[] {
  const lower = promptText.toLowerCase();
  const list = new Set<LivingDetailType>(["drifting_particles", "string_lights"]);

  if (
    typology === "listening_room" ||
    typology === "tea_room" ||
    typology === "cathedral_banquet" ||
    typology === "intimate_lounge" ||
    lower.includes("fire") ||
    lower.includes("hearth") ||
    lower.includes("candle")
  ) {
    list.add("flame");
  }

  if (
    typology === "mediterranean_courtyard" ||
    typology === "gallery_pavilion" ||
    typology === "pavilion_celebration" ||
    typology === "futuristic_launch" ||
    lower.includes("water") ||
    lower.includes("pool") ||
    lower.includes("fountain") ||
    lower.includes("waterfall")
  ) {
    list.add("caustics_water");
    list.add("waterfall");
  } else {
    // Include subtle courtyard/reflective water & waterfall in full showcase mode
    list.add("caustics_water");
    list.add("waterfall");
  }

  list.add("swaying_foliage");
  return Array.from(list);
}

// ============================================================================
// 2. PROCEDURAL CAUSTICS & WATERFALL TEXTURE GENERATORS
// ============================================================================

function createProceduralCausticsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#083344";
    ctx.fillRect(0, 0, 256, 256);

    // Cellular caustic interference rings
    ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 36; i++) {
      const cx = (i * 53) % 240 + 8;
      const cy = (i * 89) % 240 + 8;
      const r = 14 + (i % 16);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(56, 189, 248, 0.42)";
    ctx.lineWidth = 1.4;
    for (let j = 0; j < 28; j++) {
      const x0 = (j * 41) % 256;
      const y0 = (j * 67) % 256;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(
        (x0 + 40) % 256,
        (y0 + 25) % 256,
        (x0 + 20) % 256,
        (y0 + 60) % 256,
        (x0 + 65) % 256,
        (y0 + 45) % 256
      );
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createWaterfallStripTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
    ctx.fillRect(0, 0, 64, 256);

    for (let i = 0; i < 28; i++) {
      const x = (i * 19) % 58;
      const y = (i * 37) % 220;
      const len = 24 + (i % 28);
      const grad = ctx.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
      grad.addColorStop(0.5, "rgba(224, 242, 254, 0.78)");
      grad.addColorStop(1, "rgba(186, 230, 253, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, 3, len);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

// ============================================================================
// 3. REACT THREE FIBER LIVING DETAILS COMPONENT
// ============================================================================

export const LivingDetailsLayer: React.FC<LivingDetailsConfig> = ({
  enabledDetails,
  qualityTier = "medium",
  timeOfDay = "midnight",
  roomDimensions
}) => {
  const activeSet = useMemo(() => new Set<LivingDetailType>(enabledDetails), [enabledDetails]);
  const { width, height, depth } = roomDimensions;

  const tierMultiplier = qualityTier === "low" ? 0.45 : qualityTier === "medium" ? 0.75 : 1.0;
  const isNocturnal = timeOfDay === "midnight" || timeOfDay === "sunset";
  const practicalBoost = timeOfDay === "midnight" ? 1.9 : timeOfDay === "sunset" ? 1.45 : 0.85;

  // Refs for real-time 60fps animation in useFrame
  const flameGroupRef = useRef<THREE.Group | null>(null);
  const flameLightRef = useRef<THREE.PointLight | null>(null);
  const causticsMeshRef = useRef<THREE.Mesh | null>(null);
  const waterfallGroupRef = useRef<THREE.Group | null>(null);
  const splashPointsRef = useRef<THREE.Points | null>(null);
  const foliageInstRef = useRef<THREE.InstancedMesh | null>(null);
  const driftingPointsRef = useRef<THREE.Points | null>(null);

  // 1. Caustics & Waterfall Textures (with unmount disposal)
  const causticsTex = useMemo(() => createProceduralCausticsTexture(), []);
  const waterfallTex = useMemo(() => createWaterfallStripTexture(), []);

  useEffect(() => {
    return () => {
      causticsTex.dispose();
      waterfallTex.dispose();
    };
  }, [causticsTex, waterfallTex]);

  // 2. Catenary String Lights Geometry & Matrices
  const catenaryData = useMemo(() => {
    const strands = 3;
    const bulbsPerStrand = Math.max(8, Math.round(16 * tierMultiplier));
    const totalBulbs = strands * bulbsPerStrand;
    const matrices: THREE.Matrix4[] = [];
    const cableCurves: THREE.Vector3[][] = [];
    const dummy = new THREE.Object3D();

    for (let st = 0; st < strands; st++) {
      const zStrand = -depth * 0.28 + st * (depth * 0.28);
      const pts: THREE.Vector3[] = [];
      for (let b = 0; b < bulbsPerStrand; b++) {
        const u = (b / (bulbsPerStrand - 1)) * 2 - 1;
        const x = u * (width * 0.44);
        const sag = (Math.cosh(u * 1.35) - Math.cosh(1.35)) * 0.42;
        const y = height * 0.84 + sag;
        pts.push(new THREE.Vector3(x, y + 0.05, zStrand));
        dummy.position.set(x, y, zStrand);
        dummy.scale.set(1, 1.25, 1);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
      cableCurves.push(pts);
    }
    return { totalBulbs, matrices, cableCurves };
  }, [width, height, depth, tierMultiplier]);

  const bulbInstRef = useRef<THREE.InstancedMesh | null>(null);
  useEffect(() => {
    if (!bulbInstRef.current) return;
    catenaryData.matrices.forEach((mat, idx) => {
      bulbInstRef.current?.setMatrixAt(idx, mat);
    });
    bulbInstRef.current.instanceMatrix.needsUpdate = true;
  }, [catenaryData]);

  // 3. Wind-Swaying Instanced Foliage Transforms
  const foliageData = useMemo(() => {
    const count = Math.max(8, Math.round(20 * tierMultiplier));
    const baseRadius = Math.max(width, depth) * 0.62;
    const transforms: Array<{ x: number; y: number; z: number; scale: number; phase: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.2;
      const r = baseRadius * (1.05 + (i % 3) * 0.14);
      const sc = 0.8 + (i % 4) * 0.2;
      transforms.push({
        x: Math.cos(angle) * r,
        y: 1.15 * sc,
        z: Math.sin(angle) * r,
        scale: sc,
        phase: i * 0.75
      });
    }
    return { count, transforms, dummy: new THREE.Object3D() };
  }, [width, depth, tierMultiplier]);

  // 4. Waterfall Splash Particles & Atmospheric Drifting Dust / Fireflies Buffers
  const splashPositions = useMemo(() => {
    const count = Math.max(18, Math.round(42 * tierMultiplier));
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 1.65;
      arr[i * 3 + 1] = 0.08 + Math.random() * 0.45;
      arr[i * 3 + 2] = 0.22 + Math.random() * 0.55;
    }
    return arr;
  }, [tierMultiplier]);

  const driftingPositions = useMemo(() => {
    const count = Math.max(40, Math.round(140 * tierMultiplier));
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * width * 0.92;
      arr[i * 3 + 1] = 0.25 + Math.random() * (height * 0.84);
      arr[i * 3 + 2] = (Math.random() - 0.5) * depth * 0.92;
    }
    return arr;
  }, [width, height, depth, tierMultiplier]);

  // 5. Real-Time Animation Loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // (a) Animated Flame Noise-Flicker & PointLight Modulation
    if (activeSet.has("flame") && flameGroupRef.current) {
      flameGroupRef.current.children.forEach((cone, idx) => {
        const phase = idx * 1.7;
        cone.scale.y = 0.86 + Math.sin(t * 15 + phase) * 0.16 + Math.cos(t * 23 + phase) * 0.08;
        cone.scale.x = 0.92 + Math.cos(t * 13 + phase) * 0.10;
        cone.rotation.y = t * (1.4 + idx * 0.35);
      });
      if (flameLightRef.current) {
        flameLightRef.current.intensity =
          1.85 * practicalBoost * (0.88 + Math.sin(t * 19) * 0.14 + Math.cos(t * 29) * 0.06);
      }
    }

    // (b) Pool Water Animated Caustics UV Scroll
    if (activeSet.has("caustics_water") && causticsMeshRef.current) {
      causticsTex.offset.x = (t * 0.045) % 1;
      causticsTex.offset.y = (t * 0.032) % 1;
    }

    // (c) Waterfall Scrolling Strips & Splash Mist Particles
    if (activeSet.has("waterfall")) {
      waterfallTex.offset.y = (t * 0.65) % 1;
      if (waterfallGroupRef.current) {
        waterfallGroupRef.current.children.forEach((strip, sIdx) => {
          strip.position.y = height * 0.34 + Math.sin(t * 8.5 + sIdx * 1.2) * 0.06;
        });
      }
      if (splashPointsRef.current) {
        const posAttr = splashPointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          let py = posAttr.getY(i) + 0.008;
          if (py > 0.55) py = 0.08;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
      }
    }

    // (d) Wind-Swaying Instanced Foliage
    if (activeSet.has("swaying_foliage") && foliageInstRef.current) {
      const { transforms, dummy } = foliageData;
      for (let i = 0; i < transforms.length; i++) {
        const tr = transforms[i];
        dummy.position.set(tr.x, tr.y, tr.z);
        dummy.rotation.set(
          Math.sin(t * 1.55 + tr.phase) * 0.048,
          tr.phase,
          Math.cos(t * 1.25 + tr.phase) * 0.048
        );
        dummy.scale.set(tr.scale, tr.scale, tr.scale);
        dummy.updateMatrix();
        foliageInstRef.current.setMatrixAt(i, dummy.matrix);
      }
      foliageInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // (e) Drifting Dust Motes / Fireflies
    if (activeSet.has("drifting_particles") && driftingPointsRef.current) {
      const posAttr = driftingPointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i) + Math.sin(t * 0.6 + i) * 0.0018;
        let py = posAttr.getY(i) + 0.0038;
        if (py > height * 0.88) py = 0.25;
        posAttr.setX(i, px);
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group name="sonic-living-details-layer">
      {/* 1. ANIMATED HEARTH FLAME + FLICKERING 2200K POINT LIGHT */}
      {activeSet.has("flame") && (
        <group position={[width * 0.34, 0, -depth * 0.32]} name="living-hearth-flame">
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.68, 0.76, 0.36, 24]} />
            <meshStandardMaterial color="#4A423B" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.05, 20]} />
            <meshStandardMaterial color="#FF4500" emissive="#FF3300" emissiveIntensity={2.2} />
          </mesh>
          <group ref={flameGroupRef} position={[0, 0.42, 0]}>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.28, 0.65, 14]} />
              <meshBasicMaterial color="#FF5500" transparent opacity={0.82} />
            </mesh>
            <mesh position={[0, 0.28, 0]}>
              <coneGeometry args={[0.21, 0.76, 14]} />
              <meshBasicMaterial color="#FF9900" transparent opacity={0.68} />
            </mesh>
            <mesh position={[0, 0.34, 0]}>
              <coneGeometry args={[0.14, 0.86, 14]} />
              <meshBasicMaterial color="#FFEE88" transparent opacity={0.55} />
            </mesh>
          </group>
          <pointLight
            ref={flameLightRef}
            position={[0, 0.85, 0]}
            color="#FF7722"
            intensity={1.85 * practicalBoost}
            distance={7.5}
          />
        </group>
      )}

      {/* 2 & 3. WATERFALL + ANIMATED CAUSTICS POOL BASIN + SPLASH PARTICLES */}
      {(activeSet.has("waterfall") || activeSet.has("caustics_water")) && (
        <group position={[-width * 0.36, 0, -depth * 0.32]} name="living-water-feature">
          {activeSet.has("waterfall") && (
            <>
              <mesh position={[0, height * 0.34, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.85, height * 0.68, 0.24]} />
                <meshStandardMaterial color="#5C5349" roughness={0.9} />
              </mesh>
              <group ref={waterfallGroupRef}>
                {[0, 1, 2, 3, 4, 5, 6].map((sIdx) => (
                  <mesh
                    key={`wf-strip-${sIdx}`}
                    position={[-0.66 + sIdx * 0.22, height * 0.34, 0.15 + (sIdx % 2) * 0.015]}
                  >
                    <planeGeometry args={[0.19, height * 0.64]} />
                    <meshBasicMaterial
                      map={waterfallTex}
                      color="#BAE6FD"
                      transparent
                      opacity={0.48}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                ))}
              </group>
              <points ref={splashPointsRef} position={[0, 0.05, 0.25]}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={splashPositions.length / 3}
                    array={splashPositions}
                    itemSize={3}
                  />
                </bufferGeometry>
                <pointsMaterial color="#E0F2FE" size={0.055} transparent opacity={0.75} />
              </points>
            </>
          )}

          {activeSet.has("caustics_water") && (
            <mesh ref={causticsMeshRef} position={[0, 0.08, 0.55]} receiveShadow>
              <boxGeometry args={[2.1, 0.12, 1.25]} />
              <meshStandardMaterial
                map={causticsTex}
                emissive="#0284C7"
                emissiveMap={causticsTex}
                emissiveIntensity={0.62}
                roughness={0.08}
                metalness={0.25}
              />
            </mesh>
          )}
        </group>
      )}

      {/* 4. CATENARY STRING LIGHTS (INSTANCED WARM 2400K BULBS) */}
      {activeSet.has("string_lights") && (
        <group name="living-catenary-string-lights">
          <instancedMesh
            ref={bulbInstRef}
            args={[undefined, undefined, catenaryData.totalBulbs]}
          >
            <sphereGeometry args={[0.052, 10, 10]} />
            <meshBasicMaterial color="#FFE4B5" />
          </instancedMesh>
        </group>
      )}

      {/* 5. WIND-SWAYING INSTANCED FOLIAGE */}
      {activeSet.has("swaying_foliage") && (
        <instancedMesh
          ref={foliageInstRef}
          args={[undefined, undefined, foliageData.count]}
          castShadow
        >
          <coneGeometry args={[0.82, 2.6, 7]} />
          <meshStandardMaterial color="#2D4A3E" roughness={0.84} />
        </instancedMesh>
      )}

      {/* 6. DRIFTING DUST MOTES / FIREFLIES */}
      {activeSet.has("drifting_particles") && (
        <points ref={driftingPointsRef} name="living-drifting-particles">
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={driftingPositions.length / 3}
              array={driftingPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={isNocturnal ? "#FFD166" : "#FFFBEB"}
            size={0.085}
            transparent
            opacity={0.78}
          />
        </points>
      )}
    </group>
  );
};

export default LivingDetailsLayer;
