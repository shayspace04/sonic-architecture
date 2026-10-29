"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type {
  ExposureGuardTelemetry,
  QualityTier,
  SceneSpec,
  SpatialObject,
} from "@/lib/types";
import type { AudioReactiveBands } from "@/lib/soundtrack-audio-engine";
import {
  LightRecipeAndSky,
  TIME_OF_DAY_LIGHT_RECIPES,
  validateAndNormalizeLightingSpec,
} from "./LightRecipeAndSky";
import {
  ARCHITECTURAL_MATERIAL_LIBRARY,
  ArchitecturalMaterialId,
  buildProceduralPhysicalMaterial,
  computeWorldScaleRepeat,
  disposeMaterialCache,
  enforcePaletteContrastGuard,
  recalculateSabineRT60,
  srgbHexToLinearColor,
} from "./ProceduralMaterials";
import { getPhotographicOrProceduralMaterial } from "@/lib/materials";
import {
  RealArchProp,
  preloadAllCC0Models,
} from "./RealArchProp";
import {
  computeKitAcousticAdjustment,
  ContactShadowDecal,
  deriveDefaultArchitecturalKit,
  disposeSharedContactShadowTextures,
  HeroStructureKit,
} from "./ArchitecturalKit";
import { AtmosphereAndSetting } from "./AtmosphereAndSetting";
import {
  LivingDetailsLayer,
  resolveDefaultLivingDetails,
} from "./LivingDetails";
import {
  disposeSharedBloomHaloTexture,
  PostProcessingAndWhitewashGuard,
  validateAndNormalizePostProcessing,
} from "./PostProcessingAndWhitewashGuard";

export interface Venue3DProps {
  sceneSpec: SceneSpec;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  showCeiling: boolean;
  showDimensions?: boolean;
  showDispersionCones?: boolean;
  showAcousticRays?: boolean;
  showEgressPaths?: boolean;
  cameraPreset?: "overview" | "interior" | "focal" | "plan";
  qualityTier?: QualityTier;
  /** Optional Step 5 list of 3D object IDs currently pulsing after a revision or provenance hover */
  pulsingObjectIds?: readonly string[];
  /** Optional Step 4 (Soundtrack) Web Audio AnalyserNode bands ref for 60fps 3D lighting & structural reactivity */
  audioBandsRef?: React.MutableRefObject<AudioReactiveBands>;
  /** Respects user prefers-reduced-motion setting in 3D audio-reactive modulation */
  prefersReducedMotion?: boolean;
  /** Optional sync bus for synchronizing camera orbit/pan/zoom in split comparison mode */
  cameraSyncBus?: React.MutableRefObject<{
    sourceId: string | null;
    position: THREE.Vector3;
    target: THREE.Vector3;
    updated: boolean;
  }>;
  cameraSyncId?: string;
}

function AudioReactiveSceneRig({
  sceneSpec,
  audioBandsRef,
  prefersReducedMotion = false,
}: {
  sceneSpec: SceneSpec;
  audioBandsRef?: React.MutableRefObject<AudioReactiveBands>;
  prefersReducedMotion?: boolean;
}) {
  const focalLightRef = useRef<THREE.PointLight>(null);
  const westRimLightRef = useRef<THREE.PointLight>(null);
  const eastRimLightRef = useRef<THREE.PointLight>(null);
  const bassRingRef = useRef<THREE.Mesh>(null);
  const midRingRef = useRef<THREE.Mesh>(null);
  const trebleHaloRef = useRef<THREE.Mesh>(null);
  const bassRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const midRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const trebleHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const [fx, fy, fz] = sceneSpec.focalPoint.position;
  const { width, height, depth } = sceneSpec.roomDimensions;
  const accentColor =
    sceneSpec.lighting.temperatureK >= 4000 ? "#38BDF8" : "#D48C56";

  useFrame(() => {
    const bands = audioBandsRef?.current;
    // Strictly inactive when paused or when playing a cross-origin iframe (spotify-embed)
    if (!bands || !bands.analyserActive || bands.mode === "spotify-embed") {
      if (focalLightRef.current) focalLightRef.current.intensity = 0;
      if (westRimLightRef.current) westRimLightRef.current.intensity = 0;
      if (eastRimLightRef.current) eastRimLightRef.current.intensity = 0;
      if (bassRingMatRef.current) bassRingMatRef.current.opacity = 0;
      if (midRingMatRef.current) midRingMatRef.current.opacity = 0;
      if (trebleHaloMatRef.current) trebleHaloMatRef.current.opacity = 0;
      return;
    }

    const { bass, mid, treble, overall } = bands;

    // 1. Modulate 3D focal & perimeter lights from real Web Audio FFT bands
    if (focalLightRef.current) {
      focalLightRef.current.intensity = prefersReducedMotion
        ? overall * 0.85
        : bass * 2.4 + mid * 0.8;
    }
    if (westRimLightRef.current) {
      westRimLightRef.current.intensity = prefersReducedMotion
        ? overall * 0.5
        : mid * 1.65;
    }
    if (eastRimLightRef.current) {
      eastRimLightRef.current.intensity = prefersReducedMotion
        ? overall * 0.5
        : mid * 1.65;
    }

    // 2. Modulate 3D concentric acoustic wave rings around focal stage (disabled motion if prefersReducedMotion)
    if (bassRingRef.current && bassRingMatRef.current) {
      const s = prefersReducedMotion ? 1 : 1 + bass * 0.42;
      bassRingRef.current.scale.set(s, s, 1);
      bassRingMatRef.current.opacity = prefersReducedMotion
        ? Math.min(0.28, overall * 0.35)
        : Math.min(0.65, 0.12 + bass * 0.55);
    }

    if (midRingRef.current && midRingMatRef.current) {
      const s = prefersReducedMotion ? 1 : 1 + mid * 0.34;
      midRingRef.current.scale.set(s, s, 1);
      midRingMatRef.current.opacity = prefersReducedMotion
        ? Math.min(0.22, overall * 0.25)
        : Math.min(0.5, 0.08 + mid * 0.45);
    }

    if (trebleHaloRef.current && trebleHaloMatRef.current) {
      const s = prefersReducedMotion ? 1 : 1 + treble * 0.28;
      trebleHaloRef.current.scale.set(s, 1, s);
      trebleHaloMatRef.current.opacity = prefersReducedMotion
        ? Math.min(0.2, overall * 0.22)
        : Math.min(0.48, 0.06 + treble * 0.44);
    }
  });

  return (
    <group name="step4-audio-reactive-3d-rig">
      <pointLight
        ref={focalLightRef}
        position={[fx, Math.min(height - 0.4, fy + 1.8), fz]}
        color={accentColor}
        intensity={0}
        distance={Math.max(width, depth) * 0.9}
        decay={2}
      />
      <pointLight
        ref={westRimLightRef}
        position={[-width * 0.36, height * 0.55, 0]}
        color="#E5B887"
        intensity={0}
        distance={width * 0.8}
        decay={2}
      />
      <pointLight
        ref={eastRimLightRef}
        position={[width * 0.36, height * 0.55, 0]}
        color="#3D6B58"
        intensity={0}
        distance={width * 0.8}
        decay={2}
      />

      {/* Bass Floor Acoustic Wave Ring */}
      <mesh
        ref={bassRingRef}
        position={[fx, 0.03, fz]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.35, 1.52, 48]} />
        <meshBasicMaterial
          ref={bassRingMatRef}
          color={accentColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Midrange Floor Acoustic Wave Ring */}
      <mesh
        ref={midRingRef}
        position={[fx, 0.035, fz]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.15, 2.28, 48]} />
        <meshBasicMaterial
          ref={midRingMatRef}
          color="#68B694"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Treble Overhead Acoustic Halo Ring */}
      <mesh
        ref={trebleHaloRef}
        position={[fx, Math.max(1.8, height - 0.55), fz]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[1.65, 0.025, 12, 48]} />
        <meshBasicMaterial
          ref={trebleHaloMatRef}
          color="#E5B887"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function RevisionPulseOutline({
  w,
  h,
  d,
}: {
  w: number;
  h: number;
  d: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = 1.02 + Math.sin(t * 9.5) * 0.03;
    if (meshRef.current) {
      meshRef.current.scale.set(s, s, s);
    }
    if (matRef.current) {
      matRef.current.opacity = 0.45 + Math.sin(t * 9.5) * 0.4;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[w + 0.24, h + 0.24, d + 0.24]} />
      <meshBasicMaterial
        ref={matRef}
        color="#E5B887"
        wireframe
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ============================================================================
// STEP 3 (E + F) — MULTI-PART FURNITURE, BENTWOOD CHAIRS & ORGANIC TREE ASSEMBLIES
// ============================================================================

function DiningChairSubAssembly({
  position,
  rotationY,
  seatMaterial,
  frameMaterial,
}: {
  position: [number, number, number];
  rotationY: number;
  seatMaterial: THREE.Material;
  frameMaterial: THREE.Material;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <ContactShadowDecal width={0.48} depth={0.48} opacity={0.48} />

      <mesh
        position={[0, 0.44, 0]}
        material={seatMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.45, 0.055, 0.44]} />
      </mesh>
      <mesh
        position={[0, 0.44, 0.22]}
        rotation={[0, 0, Math.PI / 2]}
        material={seatMaterial}
        castShadow
      >
        <cylinderGeometry args={[0.027, 0.027, 0.45, 12]} />
      </mesh>

      <mesh
        position={[0, 0.68, -0.2]}
        rotation={[-0.1, 0, 0]}
        material={seatMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.43, 0.34, 0.042]} />
      </mesh>

      {[
        [-0.19, -0.19, 0.05, 0.05],
        [0.19, -0.19, 0.05, -0.05],
        [-0.19, 0.19, -0.05, 0.05],
        [0.19, 0.19, -0.05, -0.05],
      ].map(([lx, lz, rx, rz], i) => (
        <mesh
          key={i}
          position={[lx, 0.22, lz]}
          rotation={[rx, 0, rz]}
          material={frameMaterial}
          castShadow
        >
          <cylinderGeometry args={[0.019, 0.012, 0.44, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function OrganicTreeAssembly({
  width,
  height,
  depth,
  planterMaterial,
}: {
  width: number;
  height: number;
  depth: number;
  planterMaterial: THREE.Material;
}) {
  const canopyGroupRef = useRef<THREE.Group>(null);
  const planterH = height * 0.26;
  const trunkH = height * 0.48;

  const { barkMat, soilMat, leafMats, foliagePads, branches } = useMemo(() => {
    const bark = new THREE.MeshStandardMaterial({
      color: srgbHexToLinearColor("#463527", "furniture"),
      roughness: 0.88,
      metalness: 0.02,
    });
    const soil = new THREE.MeshStandardMaterial({
      color: srgbHexToLinearColor("#1E1813", "floor"),
      roughness: 0.95,
      metalness: 0.0,
    });
    const tones = ["#354C34", "#466142", "#587451", "#2B3E2B"];
    const lMats = tones.map(
      (hex) =>
        new THREE.MeshStandardMaterial({
          color: srgbHexToLinearColor(hex, "accent"),
          roughness: 0.78,
          metalness: 0.02,
        })
    );

    const branchList = [
      {
        pos: [-width * 0.12, -height * 0.02, 0.06] as [number, number, number],
        rot: [0.22, 0.4, 0.48] as [number, number, number],
        len: height * 0.28,
      },
      {
        pos: [width * 0.14, 0.02, -0.08] as [number, number, number],
        rot: [-0.26, -0.3, -0.44] as [number, number, number],
        len: height * 0.3,
      },
      {
        pos: [0.05, height * 0.06, depth * 0.13] as [number, number, number],
        rot: [0.44, 0.2, -0.18] as [number, number, number],
        len: height * 0.25,
      },
      {
        pos: [-0.06, height * 0.08, -depth * 0.12] as [number, number, number],
        rot: [-0.38, -0.5, 0.24] as [number, number, number],
        len: height * 0.24,
      },
    ];

    const padCount = 14;
    const pads = Array.from({ length: padCount }, (_, i) => {
      const tier = Math.floor(i / 5);
      const angle = (i * 2.39996) % (Math.PI * 2);
      const rad =
        (tier === 0 ? 0.32 : tier === 1 ? 0.24 : 0.12) *
        Math.min(width, depth);
      const px = Math.cos(angle) * rad;
      const pz = Math.sin(angle) * rad;
      const py =
        height * 0.12 +
        tier * (height * 0.11) +
        ((i % 3) - 1) * (height * 0.035);
      const rx = width * (0.24 - tier * 0.03 + (i % 2) * 0.03);
      const ry = height * (0.095 + (i % 3) * 0.015);
      const rz = depth * (0.22 - tier * 0.025 + ((i + 1) % 2) * 0.03);
      return {
        pos: [px, py, pz] as [number, number, number],
        scale: [rx, ry, rz] as [number, number, number],
        rot: [
          ((i % 3) - 1) * 0.12,
          angle * 0.5,
          (((i + 1) % 3) - 1) * 0.1,
        ] as [number, number, number],
        matIdx: i % lMats.length,
      };
    });

    return {
      barkMat: bark,
      soilMat: soil,
      leafMats: lMats,
      foliagePads: pads,
      branches: branchList,
    };
  }, [width, height, depth]);

  useFrame(({ clock }) => {
    if (!canopyGroupRef.current) return;
    const t = clock.getElapsedTime();
    canopyGroupRef.current.rotation.z = Math.sin(t * 0.85) * 0.018;
    canopyGroupRef.current.rotation.x = Math.cos(t * 0.65) * 0.014;
  });

  useEffect(() => {
    return () => {
      barkMat.dispose();
      soilMat.dispose();
      leafMats.forEach((m) => m.dispose());
    };
  }, [barkMat, soilMat, leafMats]);

  return (
    <group>
      <mesh
        position={[0, -height / 2 + planterH / 2, 0]}
        material={planterMaterial}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[width * 0.34, width * 0.26, planterH, 24]}
        />
      </mesh>
      <mesh
        position={[0, -height / 2 + planterH, 0]}
        material={planterMaterial}
        castShadow
      >
        <cylinderGeometry
          args={[width * 0.36, width * 0.35, planterH * 0.12, 24]}
        />
      </mesh>
      <mesh
        position={[0, -height / 2 + planterH * 0.96, 0]}
        material={soilMat}
      >
        <cylinderGeometry args={[width * 0.32, width * 0.32, 0.04, 20]} />
      </mesh>

      <mesh
        position={[0, -height / 2 + planterH + trunkH * 0.45, 0]}
        rotation={[0.04, 0, -0.05]}
        material={barkMat}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[width * 0.045, width * 0.085, trunkH, 12]}
        />
      </mesh>

      <group ref={canopyGroupRef}>
        {branches.map((br, bIdx) => (
          <mesh
            key={`branch-${bIdx}`}
            position={br.pos}
            rotation={br.rot}
            material={barkMat}
            castShadow
          >
            <cylinderGeometry
              args={[width * 0.022, width * 0.042, br.len, 8]}
            />
          </mesh>
        ))}

        {foliagePads.map((pad, pIdx) => (
          <mesh
            key={`pad-${pIdx}`}
            position={pad.pos}
            rotation={pad.rot}
            scale={pad.scale}
            material={leafMats[pad.matIdx]}
            castShadow
            receiveShadow
          >
            <icosahedronGeometry args={[1, 2]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SculptedSofaAssembly({
  width,
  height,
  depth,
  upholsteryMaterial,
  frameMaterial,
  accentMaterial,
}: {
  width: number;
  height: number;
  depth: number;
  upholsteryMaterial: THREE.Material;
  frameMaterial: THREE.Material;
  accentMaterial: THREE.Material;
}) {
  const legH = height * 0.18;
  const seatY = -height / 2 + legH + height * 0.16;
  const cushionCount = Math.max(2, Math.min(4, Math.round(width / 0.85)));
  const cushionW = (width * 0.86) / cushionCount;

  return (
    <group>
      {[
        [-width * 0.44, -depth * 0.4],
        [width * 0.44, -depth * 0.4],
        [-width * 0.44, depth * 0.4],
        [width * 0.44, depth * 0.4],
      ].map(([lx, lz], idx) => (
        <mesh
          key={`leg-${idx}`}
          position={[lx, -height / 2 + legH / 2, lz]}
          material={accentMaterial}
          castShadow
        >
          <cylinderGeometry args={[0.026, 0.016, legH, 12]} />
        </mesh>
      ))}

      <mesh
        position={[0, -height / 2 + legH + 0.04, 0]}
        material={frameMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, 0.08, depth * 0.92]} />
      </mesh>

      {Array.from({ length: cushionCount }, (_, cIdx) => {
        const cx =
          -((cushionCount - 1) * cushionW) / 2 + cIdx * cushionW;
        return (
          <group key={`cush-${cIdx}`} position={[cx, seatY, depth * 0.04]}>
            <mesh
              material={upholsteryMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[cushionW * 0.96, height * 0.22, depth * 0.78]}
              />
            </mesh>
            <mesh
              position={[0, 0, depth * 0.39]}
              rotation={[0, 0, Math.PI / 2]}
              material={upholsteryMaterial}
              castShadow
            >
              <cylinderGeometry
                args={[height * 0.11, height * 0.11, cushionW * 0.96, 16]}
              />
            </mesh>
            <mesh
              position={[0, height * 0.26, -depth * 0.3]}
              rotation={[-0.14, 0, 0]}
              material={upholsteryMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[cushionW * 0.95, height * 0.42, depth * 0.22]}
              />
            </mesh>
          </group>
        );
      })}

      {[-width * 0.46, width * 0.46].map((ax, aIdx) => (
        <group key={`arm-${aIdx}`} position={[ax, seatY + height * 0.12, 0]}>
          <mesh material={upholsteryMaterial} castShadow receiveShadow>
            <boxGeometry args={[width * 0.08, height * 0.42, depth * 0.88]} />
          </mesh>
          <mesh
            position={[aIdx === 0 ? 0.08 : -0.08, height * 0.06, 0.04]}
            rotation={[Math.PI / 2, 0, 0]}
            material={accentMaterial}
            castShadow
          >
            <cylinderGeometry args={[0.075, 0.075, depth * 0.62, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SculptedLoungeChairAssembly({
  width,
  height,
  depth,
  upholsteryMaterial,
  frameMaterial,
  accentMaterial,
}: {
  width: number;
  height: number;
  depth: number;
  upholsteryMaterial: THREE.Material;
  frameMaterial: THREE.Material;
  accentMaterial: THREE.Material;
}) {
  return (
    <group>
      {[0, Math.PI / 4, -Math.PI / 4].map((rotY, idx) => (
        <mesh
          key={idx}
          position={[0, -height / 2 + 0.06, 0]}
          rotation={[0, rotY, 0]}
          material={accentMaterial}
          castShadow
        >
          <boxGeometry args={[width * 0.72, 0.03, 0.045]} />
        </mesh>
      ))}
      <mesh
        position={[0, -height / 2 + height * 0.2, 0]}
        material={accentMaterial}
      >
        <cylinderGeometry args={[0.032, 0.038, height * 0.28, 12]} />
      </mesh>

      <group position={[0, -height * 0.08, 0.04]} rotation={[-0.18, 0, 0]}>
        <mesh material={frameMaterial} castShadow receiveShadow>
          <boxGeometry args={[width * 0.84, 0.045, depth * 0.68]} />
        </mesh>
        <mesh
          position={[0, 0.065, 0]}
          material={upholsteryMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.8, 0.09, depth * 0.64]} />
        </mesh>
      </group>

      <group
        position={[0, height * 0.18, -depth * 0.26]}
        rotation={[-0.32, 0, 0]}
      >
        <mesh material={frameMaterial} castShadow>
          <boxGeometry args={[width * 0.82, height * 0.52, 0.04]} />
        </mesh>
        <mesh
          position={[0, 0, 0.055]}
          material={upholsteryMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.78, height * 0.48, 0.08]} />
        </mesh>
      </group>

      {[-width * 0.42, width * 0.42].map((ax, i) => (
        <mesh
          key={i}
          position={[ax, height * 0.04, -0.02]}
          rotation={[-0.12, 0, 0]}
          material={upholsteryMaterial}
          castShadow
        >
          <boxGeometry args={[0.085, 0.07, depth * 0.52]} />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralArchObject({
  obj,
  isSelected,
  isPulsing = false,
  onSelect,
  defaultContactShadowOpacity,
}: {
  obj: SpatialObject;
  isSelected: boolean;
  isPulsing?: boolean;
  onSelect: (id: string) => void;
  defaultContactShadowOpacity: number;
}) {
  const [w, h, d] = obj.dimensions;
  const shadowOpacity =
    obj.contactShadowOpacity ?? defaultContactShadowOpacity;
  const isFloorGrounded = obj.position[1] - h / 2 <= 0.35;

  const {
    primaryPbrMat,
    accentPbrMat,
    secondaryWoodMat,
    accentLinearColor,
  } = useMemo(() => {
    const matSpec =
      ARCHITECTURAL_MATERIAL_LIBRARY[
        obj.materialId as ArchitecturalMaterialId
      ] ?? ARCHITECTURAL_MATERIAL_LIBRARY.warm_oak;
    const [rx, ry] = computeWorldScaleRepeat(
      Math.max(w, d),
      Math.max(h, d),
      matSpec.tileSizeMeters
    );
    const pMat = getPhotographicOrProceduralMaterial(
      obj.materialId,
      Math.max(w, d),
      Math.max(h, d),
      obj.accentColorHex
    );
    const aMat = getPhotographicOrProceduralMaterial(
      obj.secondaryMaterialId || "brushed_brass",
      1,
      1,
      obj.accentColorHex
    );
    const wMat = getPhotographicOrProceduralMaterial("warm_oak", 1.5, 1.5);
    return {
      primaryPbrMat: pMat,
      accentPbrMat: aMat,
      secondaryWoodMat: wMat,
      accentLinearColor: srgbHexToLinearColor(
        obj.accentColorHex || "#C59B4E",
        "accent"
      ),
    };
  }, [
    obj.materialId,
    obj.secondaryMaterialId,
    obj.accentColorHex,
    w,
    h,
    d,
  ]);

  return (
    <group
      position={obj.position}
      rotation={obj.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
    >
      {isFloorGrounded && (
        <ContactShadowDecal
          width={w}
          depth={d}
          opacity={
            obj.archetype === "woven_area_rug"
              ? shadowOpacity * 0.45
              : shadowOpacity
          }
          position={[0, -h / 2 + 0.005, 0]}
        />
      )}

      {isSelected && (
        <mesh>
          <boxGeometry args={[w + 0.18, h + 0.18, d + 0.18]} />
          <meshBasicMaterial color="#D9532B" wireframe />
        </mesh>
      )}
      {isPulsing && <RevisionPulseOutline w={w} h={h} d={d} />}

      {obj.archetype === "horn_speaker_pair" ? (
        <group>
          <mesh position={[0, -h * 0.47, 0]} receiveShadow>
            <boxGeometry args={[w * 1.06, 0.07, d * 1.06]} />
            <meshStandardMaterial
              color="#16191E"
              roughness={0.32}
              metalness={0.75}
            />
          </mesh>
          <mesh
            position={[0, -h * 0.08, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h * 0.72, d * 0.88]} />
          </mesh>
          <mesh position={[0, -h * 0.08, d * 0.445]}>
            <boxGeometry args={[w * 0.88, h * 0.64, 0.03]} />
            <meshStandardMaterial color="#14161A" roughness={0.72} />
          </mesh>
          <mesh
            position={[0, -h * 0.07, d * 0.48]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry
              args={[w * 0.39, w * 0.1, d * 0.38, 36, 1, true]}
            />
            <meshPhysicalMaterial
              color={srgbHexToLinearColor("#8F4E27", "furniture")}
              roughness={0.22}
              metalness={0.12}
              clearcoat={0.55}
              clearcoatRoughness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -h * 0.07, d * 0.35]} material={accentPbrMat}>
            <sphereGeometry args={[w * 0.085, 20, 16]} />
          </mesh>
          <mesh
            position={[0, h * 0.4, d * 0.24]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry
              args={[w * 0.45, w * 0.11, d * 0.56, 40, 1, true]}
            />
            <meshPhysicalMaterial
              color={srgbHexToLinearColor("#8F4E27", "furniture")}
              roughness={0.22}
              metalness={0.12}
              clearcoat={0.55}
              clearcoatRoughness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[0, h * 0.4, d * 0.08]}
            rotation={[Math.PI / 2, 0, 0]}
            material={accentPbrMat}
          >
            <coneGeometry args={[w * 0.08, 0.18, 24]} />
          </mesh>
        </group>
      ) : obj.archetype === "analog_turntable_console" ? (
        <group>
          {[
            [-w * 0.44, -d * 0.4],
            [w * 0.44, -d * 0.4],
            [-w * 0.44, d * 0.4],
            [w * 0.44, d * 0.4],
          ].map(([lx, lz], i) => (
            <mesh
              key={i}
              position={[lx, -h * 0.38, lz]}
              material={accentPbrMat}
              castShadow
            >
              <cylinderGeometry args={[0.022, 0.014, h * 0.24, 12]} />
            </mesh>
          ))}
          <mesh
            position={[0, -h * 0.02, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h * 0.52, d]} />
          </mesh>
          <mesh position={[0, h * 0.28, 0]} receiveShadow>
            <boxGeometry args={[w * 1.02, 0.05, d * 1.03]} />
            <meshStandardMaterial
              color="#181B20"
              roughness={0.28}
              metalness={0.4}
            />
          </mesh>
          {[-0.58, 0.58].map((xp, idx) => (
            <group key={idx} position={[xp, h * 0.34, 0.02]}>
              <mesh material={accentPbrMat}>
                <cylinderGeometry args={[0.17, 0.18, 0.028, 36]} />
              </mesh>
              <mesh position={[0, 0.016, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.008, 36]} />
                <meshStandardMaterial
                  color="#0B0C0E"
                  roughness={0.18}
                  metalness={0.35}
                />
              </mesh>
            </group>
          ))}
        </group>
      ) : obj.archetype === "listening_sofa" ||
        obj.archetype === "tufted_grunge_sofa" ||
        obj.archetype === "diwan_bolster_lounge" ? (
        <RealArchProp
          obj={obj}
          semantic="lounge_sofa"
          targetWidth={w}
          targetHeight={h}
          targetDepth={d}
        />
      ) : obj.archetype === "low_lounge_chair" ? (
        <RealArchProp
          obj={obj}
          semantic="armchair"
          targetWidth={w}
          targetHeight={h}
          targetDepth={d}
        />
      ) : obj.archetype === "olive_tree_planter" ? (
        <RealArchProp
          obj={obj}
          semantic="potted_plant"
          targetWidth={w}
          targetHeight={h}
          targetDepth={d}
        />
      ) : obj.archetype === "vinyl_record_shelf" ||
        obj.archetype === "tokonoma_alcove" ? (
        <group>
          <mesh
            position={[0, 0, -d * 0.44]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h, d * 0.12]} />
          </mesh>
          {[-0.48, 0, 0.48].map((yf, idx) => (
            <mesh
              key={`shelf-h-${idx}`}
              position={[0, yf * h, 0]}
              material={primaryPbrMat}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[w, 0.045, d]} />
            </mesh>
          ))}
          {[-0.48, -0.16, 0.16, 0.48].map((xf, idx) => (
            <mesh
              key={`shelf-v-${idx}`}
              position={[xf * w, 0, 0]}
              material={primaryPbrMat}
              castShadow
            >
              <boxGeometry args={[0.04, h * 0.96, d * 0.94]} />
            </mesh>
          ))}
          {[-0.32, 0.0, 0.32].map((xf, bIdx) => (
            <mesh
              key={`vinyl-${bIdx}`}
              position={[xf * w, -h * 0.22, 0.02]}
              material={accentPbrMat}
              castShadow
            >
              <boxGeometry args={[w * 0.22, h * 0.36, d * 0.76]} />
            </mesh>
          ))}
        </group>
      ) : obj.archetype === "acoustic_wall_panel" ||
        obj.archetype === "shoji_sliding_screen" ? (
        <group>
          <mesh material={primaryPbrMat} castShadow receiveShadow>
            <boxGeometry args={[w, h, d * 0.45]} />
          </mesh>
          {Array.from({ length: 9 }, (_, sIdx) => {
            const sx = -w * 0.42 + (sIdx / 8) * (w * 0.84);
            return (
              <mesh
                key={sIdx}
                position={[sx, 0, d * 0.28]}
                material={accentPbrMat}
                castShadow
              >
                <boxGeometry args={[w * 0.055, h * 0.92, d * 0.42]} />
              </mesh>
            );
          })}
        </group>
      ) : obj.archetype === "woven_area_rug" ||
        obj.archetype === "obsidian_runway_deck" ? (
        <group>
          <mesh position={[0, 0, 0]} material={primaryPbrMat} receiveShadow>
            <boxGeometry args={[w, Math.max(0.024, h), d]} />
          </mesh>
          <mesh position={[0, -0.004, 0]} material={accentPbrMat}>
            <boxGeometry args={[w * 1.02, 0.012, d * 1.02]} />
          </mesh>
        </group>
      ) : obj.archetype === "peristyle_stone_column" ||
        obj.archetype === "monolithic_concrete_pier" ? (
        <group>
          <mesh
            position={[0, -h * 0.44, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 1.22, h * 0.12, d * 1.22]} />
          </mesh>
          <mesh
            position={[0, 0, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[w * 0.42, w * 0.48, h * 0.78, 20]} />
          </mesh>
          <mesh
            position={[0, h * 0.44, 0]}
            material={accentPbrMat}
            castShadow
          >
            <boxGeometry args={[w * 1.18, h * 0.1, d * 1.18]} />
          </mesh>
        </group>
      ) : obj.archetype === "ev_product_plinth" ||
        obj.archetype === "ceremonial_altar_dais" ? (
        <group>
          <mesh
            position={[0, -h * 0.25, 0]}
            material={primaryPbrMat}
            receiveShadow
          >
            <cylinderGeometry args={[w * 0.51, w * 0.54, h * 0.45, 64]} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[w * 0.5, w * 0.5, h * 0.08, 64]} />
            <meshStandardMaterial
              color={accentLinearColor}
              emissive={accentLinearColor}
              emissiveIntensity={2.15}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[0, h * 0.2, 0]}
            material={primaryPbrMat}
            receiveShadow
          >
            <cylinderGeometry args={[w * 0.46, w * 0.48, h * 0.34, 64]} />
          </mesh>
        </group>
      ) : obj.archetype === "concept_vehicle_sculpture" ? (
        <group>
          <mesh position={[0, -h * 0.32, 0]} castShadow>
            <boxGeometry args={[w * 0.98, h * 0.14, d * 0.96]} />
            <meshStandardMaterial
              color="#16191F"
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>
          <mesh
            position={[0, -h * 0.12, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 0.95, h * 0.36, d * 0.94]} />
          </mesh>
          <mesh position={[-w * 0.05, h * 0.18, 0]} castShadow>
            <boxGeometry args={[w * 0.54, h * 0.36, d * 0.8]} />
            <meshPhysicalMaterial
              color="#0A1222"
              roughness={0.05}
              metalness={0.9}
              clearcoat={1.0}
            />
          </mesh>
        </group>
      ) : obj.archetype === "wedding_mandap_canopy" ||
        obj.archetype === "mandap_scalloped_arch" ||
        obj.archetype === "pergola_linen_canopy" ? (
        <group>
          <mesh
            position={[0, -h * 0.44, 0]}
            material={primaryPbrMat}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[w * 1.06, 0.36, d * 1.06]} />
          </mesh>
          {[
            [-w * 0.42, -d * 0.42],
            [w * 0.42, -d * 0.42],
            [-w * 0.42, d * 0.42],
            [w * 0.42, d * 0.42],
          ].map(([px, pz], idx) => (
            <mesh
              key={idx}
              position={[px, 0, pz]}
              material={primaryPbrMat}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.22, h * 0.82, 18]} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.42, 0]} material={accentPbrMat} castShadow>
            <boxGeometry args={[w * 1.02, 0.28, d * 1.02]} />
          </mesh>
          <mesh position={[0, h * 0.52, 0]} material={accentPbrMat}>
            <coneGeometry args={[w * 0.58, h * 0.26, 8]} />
          </mesh>
          <mesh position={[0, -h * 0.22, 0]}>
            <boxGeometry args={[0.75, 0.28, 0.75]} />
            <meshStandardMaterial
              color="#F97316"
              emissive="#EA580C"
              emissiveIntensity={2.1}
              toneMapped={false}
            />
          </mesh>
        </group>
      ) : obj.archetype === "circular_water_feature" ||
        obj.archetype === "limestone_fountain" ||
        obj.archetype === "sunken_ro_hearth" ? (
        <group>
          <mesh position={[0, 0, 0]} material={primaryPbrMat} receiveShadow>
            <cylinderGeometry args={[w * 0.5, w * 0.52, h, 36]} />
          </mesh>
          <mesh position={[0, h * 0.35, 0]}>
            <cylinderGeometry args={[w * 0.44, w * 0.44, 0.05, 36]} />
            <meshPhysicalMaterial
              color={accentLinearColor}
              roughness={0.08}
              metalness={0.35}
              clearcoat={0.95}
              transparent
              opacity={0.86}
            />
          </mesh>
        </group>
      ) : obj.archetype === "banquet_long_table" ||
        obj.archetype === "bistro_courtyard_table" ? (
        <group>
          <RealArchProp
            obj={obj}
            semantic="dining_table"
            targetWidth={w * 0.75}
            targetHeight={h}
            targetDepth={d}
          />
          {/* Authentic CC0 Chairs with natural human-scale position & rotation jitter */}
          {[-d * 0.35, 0, d * 0.35].map((zPos, idx) => (
            <React.Fragment key={idx}>
              <group position={[-w * 0.44, 0, zPos]} rotation={[0, Math.PI / 2, 0]}>
                <RealArchProp
                  obj={{ ...obj, id: `${obj.id}-chair-l-${idx}` }}
                  semantic="wooden_chair"
                  targetWidth={0.5}
                  targetHeight={0.88}
                  targetDepth={0.5}
                  jitterSeed={idx * 7 + 1}
                />
              </group>
              <group position={[w * 0.44, 0, zPos]} rotation={[0, -Math.PI / 2, 0]}>
                <RealArchProp
                  obj={{ ...obj, id: `${obj.id}-chair-r-${idx}` }}
                  semantic="wooden_chair"
                  targetWidth={0.5}
                  targetHeight={0.88}
                  targetDepth={0.5}
                  jitterSeed={idx * 7 + 2}
                />
              </group>
            </React.Fragment>
          ))}
          {/* Tabletop Clutter: Real wine bottles & glassware */}
          <group position={[0, h * 0.52, 0]}>
            <RealArchProp
              obj={{ ...obj, id: `${obj.id}-bottles` }}
              semantic="wine_bottles"
              targetWidth={0.3}
              targetHeight={0.36}
              targetDepth={0.3}
              jitterSeed={42}
            />
          </group>
        </group>
      ) : obj.archetype === "chabudai_tea_table" ? (
        <group>
          <RealArchProp
            obj={obj}
            semantic="coffee_table"
            targetWidth={w}
            targetHeight={h}
            targetDepth={d}
          />
          {/* Tabletop tea clutter */}
          <group position={[0, h * 0.52, 0]}>
            <RealArchProp
              obj={{ ...obj, id: `${obj.id}-tea` }}
              semantic="wine_bottles"
              targetWidth={0.24}
              targetHeight={0.26}
              targetDepth={0.24}
              jitterSeed={88}
            />
          </group>
        </group>
      ) : obj.archetype === "brass_ring_chandelier" ||
        obj.archetype === "linear_light_blade" ? (
        <group>
          <RealArchProp
            obj={obj}
            semantic="hanging_lamp"
            targetWidth={w}
            targetHeight={h}
            targetDepth={d}
          />
          {/* Emissive center bloom core */}
          <pointLight
            position={[0, -h * 0.4, 0]}
            color="#FFC87A"
            intensity={2.8}
            distance={Math.max(6, w * 4)}
            decay={2}
          />
        </group>
      ) : (
        <group>
          <mesh
            position={[0, -h * 0.42, 0]}
            material={accentPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 0.96, h * 0.16, d * 0.96]} />
          </mesh>
          <mesh
            position={[0, 0.04, 0]}
            material={primaryPbrMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h * 0.78, d]} />
          </mesh>
          <mesh
            position={[0, h * 0.46, 0]}
            material={secondaryWoodMat}
            castShadow
          >
            <boxGeometry args={[w * 1.02, h * 0.08, d * 1.02]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ControlledCameraRig({
  preset = "overview",
  sceneSpec,
  cameraSyncBus,
  cameraSyncId,
}: {
  preset?: "overview" | "interior" | "focal" | "plan";
  sceneSpec: SceneSpec;
  cameraSyncBus?: React.MutableRefObject<{
    sourceId: string | null;
    position: THREE.Vector3;
    target: THREE.Vector3;
    updated: boolean;
  }>;
  cameraSyncId?: string;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastPresetRef = useRef<string | null>(null);
  const lastSceneIdRef = useRef<string | null>(null);
  const { width, depth } = sceneSpec.roomDimensions;

  // Reposition camera and update orbit target ONLY when preset or scene id changes,
  // preventing user manual dragging/zooming from being overridden.
  useEffect(() => {
    const isNewPreset = lastPresetRef.current !== preset;
    const isNewScene = lastSceneIdRef.current !== sceneSpec.id;

    if (!isNewPreset && !isNewScene) return;

    lastPresetRef.current = preset;
    lastSceneIdRef.current = sceneSpec.id;

    let pos: [number, number, number];
    let target: [number, number, number];

    switch (preset) {
      case "interior":
        pos = sceneSpec.cameraDefaults.interiorPosition;
        target = sceneSpec.cameraDefaults.interiorTarget;
        break;
      case "focal":
        pos = sceneSpec.cameraDefaults.focalPosition;
        target = sceneSpec.cameraDefaults.focalTarget;
        break;
      case "plan":
        pos = [0, Math.max(width, depth) * 1.5, 0.001];
        target = [0, 0, 0];
        break;
      case "overview":
      default:
        pos = sceneSpec.cameraDefaults.overviewPosition;
        target = sceneSpec.cameraDefaults.overviewTarget;
        break;
    }

    camera.position.set(pos[0], pos[1], pos[2]);
    if (controlsRef.current) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    } else {
      camera.lookAt(target[0], target[1], target[2]);
    }
    camera.updateProjectionMatrix();

    if (cameraSyncBus) {
      cameraSyncBus.current.sourceId = cameraSyncId ?? null;
      cameraSyncBus.current.position.set(pos[0], pos[1], pos[2]);
      cameraSyncBus.current.target.set(target[0], target[1], target[2]);
      cameraSyncBus.current.updated = true;
    }
  }, [preset, sceneSpec.id, sceneSpec.cameraDefaults, camera, width, depth, cameraSyncBus, cameraSyncId]);

  // Synchronize on frame when driven by the paired viewport in split mode
  useFrame(() => {
    if (
      cameraSyncBus &&
      cameraSyncBus.current.updated &&
      cameraSyncBus.current.sourceId !== cameraSyncId &&
      controlsRef.current
    ) {
      camera.position.copy(cameraSyncBus.current.position);
      controlsRef.current.target.copy(cameraSyncBus.current.target);
      controlsRef.current.update();
    }
  });

  const handleControlsChange = useCallback(() => {
    if (cameraSyncBus && cameraSyncId && controlsRef.current) {
      cameraSyncBus.current.sourceId = cameraSyncId;
      cameraSyncBus.current.position.copy(camera.position);
      cameraSyncBus.current.target.copy(controlsRef.current.target);
      cameraSyncBus.current.updated = true;
    }
  }, [camera, cameraSyncBus, cameraSyncId]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={1.2}
      maxDistance={Math.max(width, depth) * 4}
      maxPolarAngle={Math.PI / 2 + 0.05}
      onChange={handleControlsChange}
    />
  );
}

export function Venue3D({
  sceneSpec,
  selectedObjectId,
  onSelectObject,
  showCeiling,
  showDimensions = false,
  showDispersionCones = false,
  showAcousticRays = false,
  showEgressPaths = false,
  cameraPreset = "overview",
  qualityTier = "high",
  pulsingObjectIds = [],
  audioBandsRef,
  prefersReducedMotion = false,
  cameraSyncBus,
  cameraSyncId,
}: Venue3DProps) {
  const { width, height, depth } = sceneSpec.roomDimensions;
  const safeTier: "low" | "medium" | "high" = qualityTier === "ultra" ? "high" : qualityTier;
  const [exposureTelemetry, setExposureTelemetry] =
    useState<ExposureGuardTelemetry | null>(null);

  useEffect(() => {
    preloadAllCC0Models();
  }, []);

  const normalizedLighting = useMemo(
    () => validateAndNormalizeLightingSpec(sceneSpec),
    [sceneSpec]
  );
  const contrastReport = useMemo(
    () => enforcePaletteContrastGuard(sceneSpec.palette),
    [sceneSpec.palette]
  );
  const architecturalKit = useMemo(
    () => deriveDefaultArchitecturalKit(sceneSpec),
    [sceneSpec]
  );
  const kitAcousticDelta = useMemo(
    () => computeKitAcousticAdjustment(sceneSpec, architecturalKit),
    [sceneSpec, architecturalKit]
  );
  const sabineRt60 = useMemo(
    () => recalculateSabineRT60(sceneSpec),
    [sceneSpec]
  );
  const postCfg = useMemo(
    () => validateAndNormalizePostProcessing(sceneSpec, qualityTier),
    [sceneSpec, qualityTier]
  );

  const recipe =
    TIME_OF_DAY_LIGHT_RECIPES[sceneSpec.timeOfDay] ??
    TIME_OF_DAY_LIGHT_RECIPES.midnight;

  // Dispose cached procedural PBR materials, contact shadows, and selective bloom textures on unmount
  useEffect(() => {
    return () => {
      disposeMaterialCache();
      disposeSharedContactShadowTextures();
      disposeSharedBloomHaloTexture();
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-[#0B0E14]">
      <Canvas
        shadows="soft"
        dpr={qualityTier === "low" ? [1, 1] : [1, 2]}
        gl={{
          antialias: qualityTier !== "low",
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping:
            (THREE as unknown as { AgXToneMapping?: THREE.ToneMapping })
              .AgXToneMapping ?? THREE.ACESFilmicToneMapping,
          toneMappingExposure: normalizedLighting.exposure,
        }}
        camera={{
          position: sceneSpec.cameraDefaults.overviewPosition,
          fov: 44,
          near: 0.1,
          far: 240,
        }}
        onPointerMissed={() => onSelectObject(null)}
      >
        {/* Working OrbitControls & Camera Preset Orchestrator */}
        <ControlledCameraRig
          preset={cameraPreset}
          sceneSpec={sceneSpec}
          cameraSyncBus={cameraSyncBus}
          cameraSyncId={cameraSyncId}
        />

        {/* Step 1: Time-of-Day HDRI/Sky Lighting */}
        <LightRecipeAndSky
          spec={sceneSpec}
          qualityTier={safeTier}
          practicalsEnabled={true}
        />

        {/* Step 2(d) & Phase 5: Atmospheric Dust Particles, Swaying Foliage, Flickering Warm Hearth & String Lights */}
        <LivingDetailsLayer
          enabledDetails={resolveDefaultLivingDetails(sceneSpec.typology, sceneSpec.title || "")}
          qualityTier={safeTier}
          timeOfDay={sceneSpec.timeOfDay}
          roomDimensions={sceneSpec.roomDimensions}
        />

        {/* Step 3 (F): 3D Displaced Exterior Terrain, Animated Water & Instanced Multi-Crown Trees */}
        <AtmosphereAndSetting spec={sceneSpec} qualityTier={safeTier} />

        {/* Step 4 (H + I): High-Threshold Selective Emissive Bloom, Whitewash Detector & Opt-In Debug Overlays */}
        <PostProcessingAndWhitewashGuard
          spec={sceneSpec}
          qualityTier={safeTier}
          showAcousticRays={showAcousticRays}
          showDispersionCones={showDispersionCones}
          showEgressPaths={showEgressPaths}
          onWhitewashTelemetry={setExposureTelemetry}
        />

        {/* Practical Spot & Point Lights */}
        {sceneSpec.lighting.sources
          .filter((l) => l.type === "spot" || l.type === "point")
          .slice(0, safeTier === "low" ? 2 : 4)
          .map((light) => {
            if (light.type === "spot") {
              return (
                <spotLight
                  key={light.id}
                  position={light.position}
                  color={light.colorHex}
                  intensity={Math.min(2.6, light.intensity)}
                  angle={light.angleRad || 0.58}
                  penumbra={light.penumbra || 0.65}
                  distance={light.distance || Math.max(width, depth) * 1.3}
                  decay={2}
                  castShadow={qualityTier === "high" && light.castShadow}
                  shadow-bias={-0.00035}
                  shadow-normalBias={0.02}
                />
              );
            }
            return (
              <pointLight
                key={light.id}
                position={light.position}
                color={light.colorHex}
                intensity={
                  Math.min(1.8, light.intensity) *
                  recipe.practicalBoostMultiplier
                }
                distance={light.distance || 16}
                decay={2}
              />
            );
          })}

        {/* Step 3 (E + G): Articulated 3D Architectural Shell Kit + Baseboards/Cornices/Mullions + Wall-Floor AO Strips */}
        <HeroStructureKit
          spec={sceneSpec}
          showCeiling={showCeiling}
          showWalls={!sceneSpec.isOpenAir}
          qualityTier={safeTier}
        />

        {/* Step 4 (Soundtrack): Web Audio AnalyserNode 3D Lighting & Acoustic Ring Reactivity */}
        <AudioReactiveSceneRig
          sceneSpec={sceneSpec}
          audioBandsRef={audioBandsRef}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* Step 3 (E + F + G): All SceneSpec Objects with Sculpted Sub-Assemblies & Ground Contact Shadows */}
        {sceneSpec.objects.map((obj) => (
          <ProceduralArchObject
            key={obj.id}
            obj={obj}
            isSelected={selectedObjectId === obj.id}
            isPulsing={pulsingObjectIds.includes(obj.id)}
            onSelect={onSelectObject}
            defaultContactShadowOpacity={
              sceneSpec.contactShadowOpacity ?? 0.64
            }
          />
        ))}
      </Canvas>

      {/* Step 4 (H): Optical Vignette & Highlight Roll-off Overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, transparent ${Math.round(
            postCfg.vignetteOffset * 100
          )}%, rgba(24, 32, 44, ${Math.min(0.18, postCfg.vignetteDarkness * 0.35)}) 100%)`,
        }}
      />

      {/* Opt-In 3D CAD Dimension Callout Pill (OFF by default) */}
      {showDimensions && (
        <div className="pointer-events-none absolute top-14 left-3 rounded bg-black/80 px-2.5 py-1 text-[10px] font-mono text-neutral-200 border border-white/15">
          SPAN WIDTH (X): {width.toFixed(2)}m • DEPTH (Z): {depth.toFixed(2)}m •
          CLEAR HEIGHT (Y): {height.toFixed(2)}m
        </div>
      )}

          </div>
  );
}

export default Venue3D;
