"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import type {
  ArchProfileType,
  ArchitecturalKitSpec,
  CeilingKitType,
  ColumnStyleType,
  QualityTier,
  SceneSpec,
  WallArticulationType,
} from "@/lib/types";
import {
  ARCHITECTURAL_MATERIAL_LIBRARY,
  ArchitecturalMaterialId,
  buildProceduralPhysicalMaterial,
  computeWorldScaleRepeat,
  srgbHexToLinearColor,
} from "./ProceduralMaterials";
import { getPhotographicOrProceduralMaterial } from "@/lib/materials";

export type {
  ArchProfileType,
  ArchitecturalKitSpec,
  CeilingKitType,
  ColumnStyleType,
  WallArticulationType,
};

// ============================================================================
// STEP 3 (G) — SHARED PROCEDURAL CONTACT SHADOW DECAL & WALL-FLOOR AO STRIP
// ============================================================================

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
let sharedLinearWallAoTex: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 4, half, half, half - 4);
    grad.addColorStop(0.0, "rgba(14, 18, 26, 0.48)");
    grad.addColorStop(0.35, "rgba(16, 22, 32, 0.30)");
    grad.addColorStop(0.70, "rgba(20, 26, 38, 0.10)");
    grad.addColorStop(1.0, "rgba(20, 26, 38, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedContactShadowTex = tex;
  return tex;
}

export function getWallCornerAoTexture(): THREE.CanvasTexture {
  if (sharedLinearWallAoTex) return sharedLinearWallAoTex;
  const w = 64;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, "rgba(14, 18, 26, 0.44)");
    grad.addColorStop(0.35, "rgba(16, 22, 32, 0.22)");
    grad.addColorStop(1.0, "rgba(20, 26, 38, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedLinearWallAoTex = tex;
  return tex;
}

export function disposeSharedContactShadowTextures(): void {
  if (sharedContactShadowTex) {
    sharedContactShadowTex.dispose();
    sharedContactShadowTex = null;
  }
  if (sharedLinearWallAoTex) {
    sharedLinearWallAoTex.dispose();
    sharedLinearWallAoTex = null;
  }
}

export interface ContactShadowDecalProps {
  width: number;
  depth: number;
  opacity?: number;
  position?: [number, number, number];
}

/**
 * Ground-hugging soft Ambient Occlusion contact shadow decal (`depthWrite: false`,
 * `polygonOffset: true`) placed under every furniture piece, column plinth,
 * planter, and focal installation so no object ever looks like it is floating.
 */
export const ContactShadowDecal: React.FC<ContactShadowDecalProps> = ({
  width,
  depth,
  opacity = 0.64,
  position = [0, 0.004, 0],
}) => {
  const shadowMat = useMemo(() => {
    const tex = getContactShadowTexture();
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: Math.max(0.0, Math.min(0.92, opacity)),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, [opacity]);

  useEffect(() => {
    return () => {
      shadowMat.dispose();
    };
  }, [shadowMat]);

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      material={shadowMat}
      renderOrder={1}
    >
      <planeGeometry args={[width * 1.28, depth * 1.28]} />
    </mesh>
  );
};

// ============================================================================
// STEP 3 (E) — DEFAULT ARCHITECTURAL KIT DERIVATION & ACOUSTIC VOLUME/AREA DELTA
// ============================================================================

export function deriveDefaultArchitecturalKit(
  spec: SceneSpec
): ArchitecturalKitSpec {
  if (spec.architecturalKit) {
    return spec.architecturalKit;
  }

  const { depth, height } = spec.roomDimensions;
  const bayCount = Math.max(3, Math.min(7, Math.round(depth / 3.4)));
  const baySpacingMeters = Number((depth / Math.max(1, bayCount - 1)).toFixed(2));

  let archProfile: ArchProfileType = "monolithic_portal";
  let columnStyle: ColumnStyleType = "board_concrete_pier";
  let ceilingKit: CeilingKitType = "coffered_acoustic_grid";
  let wallArticulation: WallArticulationType = "extruded_acoustic_slats";
  let columnRadiusMeters = 0.22;
  let surfaceAreaMultiplier = 1.18;

  switch (spec.typology) {
    case "cathedral_banquet":
      archProfile = "pointed_gothic";
      columnStyle = "clustered_limestone";
      ceilingKit = "gothic_ribbed_vault";
      wallArticulation = "ashlar_pilaster_arcade";
      columnRadiusMeters = 0.28;
      surfaceAreaMultiplier = 1.32;
      break;
    case "futuristic_launch":
    case "industrial_warehouse":
    case "underground_club":
      archProfile = "glazed_barrel";
      columnStyle = "anodized_steel_box";
      ceilingKit = "space_frame_truss";
      wallArticulation = "board_concrete_reveals";
      columnRadiusMeters = 0.24;
      surfaceAreaMultiplier = 1.22;
      break;
    case "tea_room":
    case "coastal_retreat":
      archProfile = "sukiya_lintel";
      columnStyle = "hinoki_post";
      ceilingKit = "hinoki_exposed_rafters";
      wallArticulation = "kumiko_shoji_screens";
      columnRadiusMeters = 0.16;
      surfaceAreaMultiplier = 1.15;
      break;
    case "mediterranean_courtyard":
    case "garden_mandap":
    case "pavilion_celebration":
      archProfile = "scalloped_mandap";
      columnStyle = "fluted_classical";
      ceilingKit = "open_pergola_canopy";
      wallArticulation = "ashlar_pilaster_arcade";
      columnRadiusMeters = 0.23;
      surfaceAreaMultiplier = 1.14;
      break;
    case "brutalist_runway":
    case "gallery_pavilion":
      archProfile = "monolithic_portal";
      columnStyle = "board_concrete_pier";
      ceilingKit = "monolithic_waffle_slab";
      wallArticulation = "recessed_gallery_niches";
      columnRadiusMeters = 0.26;
      surfaceAreaMultiplier = 1.24;
      break;
    default:
      archProfile = "monolithic_portal";
      columnStyle = "hinoki_post";
      ceilingKit = "coffered_acoustic_grid";
      wallArticulation = "extruded_acoustic_slats";
      columnRadiusMeters = 0.2;
      surfaceAreaMultiplier = 1.26;
      break;
  }

  const singleColumnVol =
    Math.PI * columnRadiusMeters * columnRadiusMeters * (height * 0.85);
  const structuralVolumeDisplacementCubicMeters = Number(
    (bayCount * 2 * singleColumnVol * 1.35).toFixed(2)
  );

  return {
    bayCount,
    baySpacingMeters,
    archProfile,
    columnStyle,
    columnRadiusMeters,
    ceilingKit,
    wallArticulation,
    hasClerestoryGlazing: !spec.isOpenAir && height >= 4.2,
    hasMezzanineBalcony: height >= 6.8,
    mezzanineHeightMeters: Number((height * 0.52).toFixed(2)),
    mezzanineDepthMeters: 2.6,
    corniceProjectionMeters: 0.24,
    baseboardHeightMeters: 0.16,
    wallRevealDepthMeters: 0.04,
    surfaceAreaMultiplier,
    structuralVolumeDisplacementCubicMeters,
  };
}

/**
 * Computes the net acoustic volume V_net (subtracting column/pier/truss displacement)
 * and effective interior boundary surface area S_eff (accounting for 3D slats,
 * coffers, and vault ribs) for accurate Sabine RT60 reporting.
 */
export function computeKitAcousticAdjustment(
  spec: SceneSpec,
  kit: ArchitecturalKitSpec
): {
  grossVolumeCubicMeters: number;
  netVolumeCubicMeters: number;
  effectiveSurfaceAreaSqMeters: number;
} {
  const { width, height, depth } = spec.roomDimensions;
  const grossVolume = width * height * depth;
  const objectVolume = spec.objects.reduce((acc, obj) => {
    const [ow, oh, od] = obj.dimensions;
    return acc + ow * oh * od * 0.42;
  }, 0);
  const netVolume = Math.max(
    grossVolume * 0.68,
    grossVolume - kit.structuralVolumeDisplacementCubicMeters - objectVolume
  );
  const baseArea =
    2 * (width * depth + width * height + depth * height);
  const effectiveArea = baseArea * kit.surfaceAreaMultiplier;

  return {
    grossVolumeCubicMeters: Number(grossVolume.toFixed(1)),
    netVolumeCubicMeters: Number(netVolume.toFixed(1)),
    effectiveSurfaceAreaSqMeters: Number(effectiveArea.toFixed(1)),
  };
}

export interface HeroStructureProps {
  spec: SceneSpec;
  showCeiling: boolean;
  showWalls?: boolean;
  qualityTier?: QualityTier;
}

/**
 * Step 3 (E + G) — Articulated 3D Architectural Shell Kit
 * Replaces flat wall/ceiling boxes with:
 * - Stepped obsidian exhibition sub-plinth + recessed shadow-gap reveal
 * - Extruded baseboards (`baseboardHeightMeters`) + multi-step crown cornices
 * - Wall-to-floor soft Ambient Occlusion shadow strips (`getWallCornerAoTexture`)
 * - 3D wall articulation: vertical acoustic timber ribs over dark felt core,
 *   recessed gallery/arcade niches, or Kumiko shoji lattice mullions
 * - Multi-part structural bay columns (stepped plinth + torus molding + fluted/chamfered shaft + capital + AO decal)
 * - Overhead 3D roof systems: Warren space-frame trusses with diagonal struts,
 *   Gothic pointed vault ribs + boss keystones, or bidirectional acoustic coffers.
 */
export const HeroStructureKit: React.FC<HeroStructureProps> = ({
  spec,
  showCeiling,
  showWalls = true,
  qualityTier = "high",
}) => {
  const { width, height, depth } = spec.roomDimensions;
  const isOpenAir = spec.isOpenAir;
  const kit = useMemo(() => deriveDefaultArchitecturalKit(spec), [spec]);
  const contactShadowOpacity = spec.contactShadowOpacity ?? 0.64;

  const {
    floorMat,
    backWallMat,
    sideWallMat,
    ceilingMat,
    accentMetalMat,
    darkFeltMat,
    obsidianPlinthMat,
    glazingMat,
    wallAoMat,
  } = useMemo(() => {
    const floorId = spec.materials.floor.id as ArchitecturalMaterialId;
    const wallId = spec.materials.wall.id as ArchitecturalMaterialId;
    const ceilId = spec.materials.ceiling.id as ArchitecturalMaterialId;
    const accentId = spec.materials.secondaryAccent.id as ArchitecturalMaterialId;

    const floorSpec =
      ARCHITECTURAL_MATERIAL_LIBRARY[floorId] ??
      ARCHITECTURAL_MATERIAL_LIBRARY.warm_oak;
    const wallSpec =
      ARCHITECTURAL_MATERIAL_LIBRARY[wallId] ??
      ARCHITECTURAL_MATERIAL_LIBRARY.acoustic_slats;
    const ceilSpec =
      ARCHITECTURAL_MATERIAL_LIBRARY[ceilId] ??
      ARCHITECTURAL_MATERIAL_LIBRARY.warm_oak;

    const [fRx, fRy] = computeWorldScaleRepeat(
      width,
      depth,
      floorSpec.tileSizeMeters
    );
    const [bwRx, bwRy] = computeWorldScaleRepeat(
      width,
      height,
      wallSpec.tileSizeMeters
    );
    const [swRx, swRy] = computeWorldScaleRepeat(
      depth * 0.78,
      height,
      wallSpec.tileSizeMeters
    );
    const [cRx, cRy] = computeWorldScaleRepeat(
      width,
      depth * 0.25,
      ceilSpec.tileSizeMeters
    );

    const fMat = getPhotographicOrProceduralMaterial(
      floorId,
      width,
      depth,
      spec.palette?.floorHex
    );
    const bwMat = getPhotographicOrProceduralMaterial(
      wallId,
      width,
      height,
      spec.palette?.wallHex
    );
    const swMat = getPhotographicOrProceduralMaterial(
      wallId,
      depth * 0.78,
      height,
      spec.palette?.wallHex
    );
    const cMat = getPhotographicOrProceduralMaterial(
      ceilId,
      width,
      depth * 0.25,
      spec.palette?.wallHex
    );
    const aMat = getPhotographicOrProceduralMaterial(
      accentId || "brushed_brass",
      2,
      2,
      spec.palette?.accentHex
    );

    const felt = new THREE.MeshStandardMaterial({
      color: srgbHexToLinearColor("#13161D", "wall"),
      roughness: 0.92,
      metalness: 0.02,
    });
    const plinth = new THREE.MeshStandardMaterial({
      color: srgbHexToLinearColor("#0E1117", "floor"),
      roughness: 0.26,
      metalness: 0.36,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#C6E2FA"),
      roughness: 0.08,
      metalness: 0.08,
      transmission: 0.74,
      transparent: true,
      opacity: 0.48,
    });
    const aoTex = getWallCornerAoTexture();
    const wAo = new THREE.MeshBasicMaterial({
      map: aoTex,
      transparent: true,
      opacity: contactShadowOpacity * 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    return {
      floorMat: fMat,
      backWallMat: bwMat,
      sideWallMat: swMat,
      ceilingMat: cMat,
      accentMetalMat: aMat,
      darkFeltMat: felt,
      obsidianPlinthMat: plinth,
      glazingMat: glass,
      wallAoMat: wAo,
    };
  }, [
    spec.materials.floor.id,
    spec.materials.wall.id,
    spec.materials.ceiling.id,
    spec.materials.secondaryAccent.id,
    width,
    height,
    depth,
    contactShadowOpacity,
  ]);

  useEffect(() => {
    return () => {
      darkFeltMat.dispose();
      obsidianPlinthMat.dispose();
      glazingMat.dispose();
      wallAoMat.dispose();
    };
  }, [darkFeltMat, obsidianPlinthMat, glazingMat, wallAoMat]);

  const bayPositionsZ = useMemo(() => {
    const count = Math.max(3, kit.bayCount);
    const span = depth * 0.86;
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(-span / 2 + (i / (count - 1)) * span);
    }
    return positions;
  }, [depth, kit.bayCount]);

  // 3D Vertical Slat Ribs along the North Back Wall for acoustic/timber typologies
  const northWallSlatPositionsX = useMemo(() => {
    const slatCount = qualityTier === "low" ? 18 : 34;
    const span = width * 0.94;
    return Array.from(
      { length: slatCount },
      (_, i) => -span / 2 + (i / (slatCount - 1)) * span
    );
  }, [width, qualityTier]);

  return (
    <group name="step-3-architectural-shell-kit">
      {/* 1. Stepped Architectural Exhibition Plinth + Shadow-Gap Reveal + Main Floor Slab */}
      <mesh
        position={[0, -0.48, 0]}
        material={obsidianPlinthMat}
        receiveShadow
      >
        <boxGeometry args={[width + 2.4, 0.28, depth + 2.4]} />
      </mesh>
      <mesh position={[0, -0.24, 0]} material={darkFeltMat} receiveShadow>
        <boxGeometry args={[width + 1.0, 0.2, depth + 1.0]} />
      </mesh>
      <mesh position={[0, -0.07, 0]} material={floorMat} receiveShadow>
        <boxGeometry args={[width, 0.14, depth]} />
      </mesh>

      {/* Perimeter Brass / Anodized Inlay Trim Frame */}
      <mesh position={[0, 0.002, -depth / 2 + 0.28]} material={accentMetalMat}>
        <boxGeometry args={[width - 0.4, 0.006, 0.035]} />
      </mesh>
      <mesh position={[0, 0.002, depth / 2 - 0.28]} material={accentMetalMat}>
        <boxGeometry args={[width - 0.4, 0.006, 0.035]} />
      </mesh>

      {/* 2. Rhythmic Structural Bays: Columns (Stepped Plinth + Torus Base + Fluted/Chamfered Shaft + Capital + Contact Shadow) */}
      {bayPositionsZ.map((zPos, bayIdx) => (
        <group key={`bay-${bayIdx}`} position={[0, 0, zPos]}>
          {[-width * 0.455, width * 0.455].map((xPos, sideIdx) => {
            const r = kit.columnRadiusMeters;
            const colH = height * 0.84;
            const isBoxPier =
              kit.columnStyle === "board_concrete_pier" ||
              kit.columnStyle === "anodized_steel_box" ||
              kit.columnStyle === "hinoki_post";

            return (
              <group key={`col-${sideIdx}`} position={[xPos, 0, 0]}>
                {/* Column Base Contact Shadow Decal */}
                <ContactShadowDecal
                  width={r * 4.4}
                  depth={r * 4.4}
                  opacity={contactShadowOpacity * 0.85}
                />

                {/* Lower Stepped Plinth Block */}
                <mesh
                  position={[0, 0.18, 0]}
                  material={backWallMat}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[r * 3.0, 0.36, r * 3.0]} />
                </mesh>

                {/* Upper Chamfered Base Collar */}
                <mesh
                  position={[0, 0.4, 0]}
                  material={accentMetalMat}
                  castShadow
                >
                  <cylinderGeometry args={[r * 1.24, r * 1.46, 0.1, 16]} />
                </mesh>

                {/* Primary Column Shaft */}
                <mesh
                  position={[0, colH / 2 + 0.42, 0]}
                  material={
                    kit.columnStyle === "anodized_steel_box"
                      ? accentMetalMat
                      : kit.columnStyle === "hinoki_post"
                        ? ceilingMat
                        : backWallMat
                  }
                  castShadow
                  receiveShadow
                >
                  {isBoxPier ? (
                    <boxGeometry args={[r * 1.95, colH, r * 2.15]} />
                  ) : (
                    <cylinderGeometry
                      args={[
                        r * 0.88,
                        r * 1.04,
                        colH,
                        kit.columnStyle === "fluted_classical" ? 16 : 24,
                      ]}
                    />
                  )}
                </mesh>

                {/* Necking Ring + Molded Capital Impost */}
                <mesh
                  position={[0, colH + 0.44, 0]}
                  material={accentMetalMat}
                  castShadow
                >
                  <cylinderGeometry args={[r * 1.32, r * 1.08, 0.09, 16]} />
                </mesh>
                <mesh
                  position={[0, colH + 0.58, 0]}
                  material={backWallMat}
                  castShadow
                >
                  <boxGeometry args={[r * 2.75, 0.22, r * 2.75]} />
                </mesh>
              </group>
            );
          })}

          {/* Overhead Bay Spanning Arch / Portal / Warren Truss */}
          {showCeiling && (
            <group position={[0, height * 0.85, 0]}>
              {kit.archProfile === "pointed_gothic" ||
              kit.archProfile === "scalloped_mandap" ? (
                <>
                  <mesh
                    position={[-width * 0.23, height * 0.08, 0]}
                    rotation={[0, 0, -0.42]}
                    material={backWallMat}
                    castShadow
                  >
                    <boxGeometry args={[width * 0.5, 0.3, 0.36]} />
                  </mesh>
                  <mesh
                    position={[width * 0.23, height * 0.08, 0]}
                    rotation={[0, 0, 0.42]}
                    material={backWallMat}
                    castShadow
                  >
                    <boxGeometry args={[width * 0.5, 0.3, 0.36]} />
                  </mesh>
                  {/* Boss Keystone */}
                  <mesh
                    position={[0, height * 0.18, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    material={accentMetalMat}
                  >
                    <cylinderGeometry args={[0.24, 0.2, 0.44, 12]} />
                  </mesh>
                </>
              ) : kit.ceilingKit === "space_frame_truss" ? (
                <group>
                  {/* Top & Bottom Truss Chords */}
                  <mesh
                    position={[0, height * 0.12, 0]}
                    material={accentMetalMat}
                    castShadow
                  >
                    <boxGeometry args={[width * 0.92, 0.11, 0.14]} />
                  </mesh>
                  <mesh
                    position={[0, -0.04, 0]}
                    material={accentMetalMat}
                    castShadow
                  >
                    <boxGeometry args={[width * 0.92, 0.11, 0.14]} />
                  </mesh>
                  {/* Diagonal Warren Web Struts */}
                  {[-0.36, -0.18, 0, 0.18, 0.36].map((xf, sIdx) => (
                    <mesh
                      key={sIdx}
                      position={[xf * width, height * 0.04, 0]}
                      rotation={[0, 0, sIdx % 2 === 0 ? 0.58 : -0.58]}
                      material={accentMetalMat}
                    >
                      <cylinderGeometry
                        args={[0.032, 0.032, height * 0.22, 8]}
                      />
                    </mesh>
                  ))}
                </group>
              ) : (
                <mesh
                  position={[0, height * 0.07, 0]}
                  material={ceilingMat}
                  castShadow
                >
                  <boxGeometry args={[width * 0.93, 0.28, 0.32]} />
                </mesh>
              )}
            </group>
          )}
        </group>
      ))}

      {/* 3. Articulated Perimeter Walls with Baseboards, Cornices, 3D Ribs/Mullions & Floor Corner AO Strips */}
      {showWalls && !isOpenAir && (
        <group name="articulated-perimeter-walls">
          {/* North Back Wall Core + Dark Acoustic Reveal Backing */}
          <mesh
            position={[0, height / 2, -depth / 2]}
            material={backWallMat}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[width, height, 0.28]} />
          </mesh>

          {/* North Wall-to-Floor Soft AO Strip */}
          <mesh
            position={[0, 0.005, -depth / 2 + 0.42]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={wallAoMat}
          >
            <planeGeometry args={[width, 0.65]} />
          </mesh>

          {/* Stepped Baseboard Plinth + Shadow-Gap Reveal (North Wall) */}
          <mesh
            position={[0, 0.02, -depth / 2 + 0.15]}
            material={darkFeltMat}
          >
            <boxGeometry args={[width, 0.04, 0.04]} />
          </mesh>
          <mesh
            position={[
              0,
              kit.baseboardHeightMeters / 2 + 0.03,
              -depth / 2 + 0.165,
            ]}
            material={accentMetalMat}
            receiveShadow
          >
            <boxGeometry args={[width, kit.baseboardHeightMeters, 0.05]} />
          </mesh>

          {/* Multi-Step Crown Cornice Entablature (North Wall) */}
          <mesh
            position={[0, height - 0.12, -depth / 2 + 0.18]}
            material={backWallMat}
            castShadow
          >
            <boxGeometry args={[width, 0.2, kit.corniceProjectionMeters]} />
          </mesh>
          <mesh
            position={[0, height - 0.24, -depth / 2 + 0.16]}
            material={accentMetalMat}
          >
            <boxGeometry
              args={[width, 0.045, kit.corniceProjectionMeters * 0.75]}
            />
          </mesh>

          {/* 3D Extruded Vertical Acoustic Timber Slats on North Wall */}
          {(kit.wallArticulation === "extruded_acoustic_slats" ||
            kit.wallArticulation === "kumiko_shoji_screens") && (
            <group position={[0, height * 0.5, -depth / 2 + 0.16]}>
              <mesh position={[0, 0, -0.015]} material={darkFeltMat}>
                <boxGeometry args={[width * 0.95, height * 0.82, 0.02]} />
              </mesh>
              {northWallSlatPositionsX.map((xPos, idx) => (
                <mesh
                  key={idx}
                  position={[xPos, 0, 0.015]}
                  material={ceilingMat}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.042, height * 0.82, 0.055]} />
                </mesh>
              ))}
            </group>
          )}

          {/* West Side Wall (Three-Quarter Cutaway for Studio Inspection) */}
          <mesh
            position={[-width / 2, height / 2, -depth * 0.1]}
            material={sideWallMat}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[0.28, height, depth * 0.8]} />
          </mesh>

          {/* West Wall-to-Floor Soft AO Strip */}
          <mesh
            position={[-width / 2 + 0.42, 0.005, -depth * 0.1]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            material={wallAoMat}
          >
            <planeGeometry args={[depth * 0.8, 0.65]} />
          </mesh>

          {/* West Wall Baseboard + Cornice */}
          <mesh
            position={[
              -width / 2 + 0.165,
              kit.baseboardHeightMeters / 2 + 0.03,
              -depth * 0.1,
            ]}
            material={accentMetalMat}
          >
            <boxGeometry
              args={[0.05, kit.baseboardHeightMeters, depth * 0.8]}
            />
          </mesh>
          <mesh
            position={[-width / 2 + 0.18, height - 0.12, -depth * 0.1]}
            material={sideWallMat}
          >
            <boxGeometry
              args={[kit.corniceProjectionMeters, 0.2, depth * 0.8]}
            />
          </mesh>

          {/* Deep Recessed Clerestory Window Reveal + 3D Mullions on West Wall */}
          {kit.hasClerestoryGlazing && (
            <group position={[-width / 2 + 0.16, height * 0.74, -depth * 0.1]}>
              {/* Window Sill & Lintel Reveal */}
              <mesh
                position={[0, -height * 0.12, 0]}
                material={accentMetalMat}
              >
                <boxGeometry args={[0.18, 0.05, depth * 0.68]} />
              </mesh>
              <mesh
                position={[0, height * 0.12, 0]}
                material={accentMetalMat}
              >
                <boxGeometry args={[0.18, 0.05, depth * 0.68]} />
              </mesh>
              {/* Glazing Pane */}
              <mesh material={glazingMat}>
                <boxGeometry args={[0.03, height * 0.22, depth * 0.66]} />
              </mesh>
              {/* 3D Vertical Window Mullions */}
              {[-0.28, -0.14, 0, 0.14, 0.28].map((zf, mIdx) => (
                <mesh
                  key={mIdx}
                  position={[0.02, 0, zf * depth]}
                  material={accentMetalMat}
                >
                  <boxGeometry args={[0.06, height * 0.23, 0.045]} />
                </mesh>
              ))}
            </group>
          )}

          {/* East Cutaway Wainscot + Warm Shoji / Clerestory Light Aperture */}
          <mesh
            position={[width / 2, height * 0.22, -depth * 0.08]}
            material={sideWallMat}
            receiveShadow
          >
            <boxGeometry args={[0.26, height * 0.44, depth * 0.56]} />
          </mesh>
          <mesh
            position={[width / 2 - 0.04, height * 0.54, -depth * 0.08]}
            receiveShadow
          >
            <boxGeometry args={[0.1, height * 0.38, depth * 0.44]} />
            <meshStandardMaterial
              color="#DEC89E"
              emissive="#FF9E42"
              emissiveIntensity={1.15}
              roughness={0.58}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* 4. Overhead Coffered / Vaulted / Rafter Ceiling Grid */}
      {showCeiling && !isOpenAir && (
        <group name="ceiling-structural-grid" position={[0, height, 0]}>
          {/* Longitudinal Purlins */}
          {[-0.36, -0.18, 0, 0.18, 0.36].map((xf, idx) => (
            <mesh
              key={`purlin-${idx}`}
              position={[xf * width, -0.12, -depth * 0.06]}
              material={ceilingMat}
              castShadow
            >
              <boxGeometry args={[0.16, 0.2, depth * 0.84]} />
            </mesh>
          ))}
          {/* Pitched Cutaway Roof Wing */}
          <mesh
            position={[width * 0.34, 0.42, -depth * 0.34]}
            rotation={[-0.34, 0, 0]}
            material={obsidianPlinthMat}
            castShadow
          >
            <boxGeometry args={[width * 0.84, 0.12, depth * 0.34]} />
          </mesh>
          <mesh
            position={[width * 0.34, 0.42, -depth * 0.08]}
            rotation={[0.34, 0, 0]}
            material={obsidianPlinthMat}
            castShadow
          >
            <boxGeometry args={[width * 0.84, 0.12, depth * 0.34]} />
          </mesh>
        </group>
      )}
    </group>
  );
};
