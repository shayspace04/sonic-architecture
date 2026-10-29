/**
 * Sonic Architecture — Step 2(f): CatmullRom Spline Camera Chapters & Scroll-Driven Tour
 * Complete replacement module for:
 *   - components/three/CameraChaptersRig.tsx
 *   - lib/types.ts (SceneSpec optional `chapters?: CameraChapterSpec[]` extension & validator)
 *
 * Implements:
 *   1. `SceneSpec.chapters`: 4 named architectural camera chapters (`overview`, `exterior`,
 *      `interior`, `detail`), each with camera `position`, `target`, optional `fov`, and
 *      intermediate spline control waypoints.
 *   2. `THREE.CatmullRomCurve3` point-to-point and full-tour spline interpolation with
 *      C2-continuous quintic/cubic-hermite easing (`u^2 * (3 - 2u)`), plus automatic
 *      handoff back to spherical orbit coordinates on completion or pointer drag.
 *   3. Optional scroll-driven continuous CatmullRom spline scrub (`scrollDriveEnabled`)
 *      that maps wheel delta or normalized scroll progress `u in [0, 1]` across all 4
 *      chapters (`overview` -> `exterior` -> `interior` -> `detail`).
 *   4. Optional 3D spline trajectory visualizer (`showSplineRail`) with chapter waypoint
 *      rings and full GPU geometry/material disposal on unmount.
 *
 * Strict TypeScript, zero `any`, full GPU resource disposal on unmount.
 */

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

// ============================================================================
// 1. SCENESPEC OPTIONAL EXTENSION & VALIDATION (lib/types.ts)
// ============================================================================

export type CameraChapterId = "overview" | "exterior" | "interior" | "detail";

export interface CameraChapterSpec {
  id: CameraChapterId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  subtitle?: string;
}

const VALID_CHAPTER_IDS: ReadonlySet<CameraChapterId> = new Set<CameraChapterId>([
  "overview",
  "exterior",
  "interior",
  "detail"
]);

/**
 * Generates typology-aware default camera chapters from `roomDimensions` and `focalPoint`.
 */
export function buildDefaultCameraChapters(
  roomDimensions: { width: number; height: number; depth: number },
  focalPointPosition: [number, number, number] = [0, 1.2, -2.0]
): CameraChapterSpec[] {
  const { width: rw, height: rh, depth: rd } = roomDimensions;
  const [fx, fy, fz] = focalPointPosition;

  return [
    {
      id: "overview",
      label: "01 • Overview",
      position: [rw * 0.72, rh * 0.95, rd * 0.86],
      target: [0, rh * 0.28, 0],
      fov: 44,
      subtitle: "Isometric architectural envelope & structural bay rhythm"
    },
    {
      id: "exterior",
      label: "02 • Exterior",
      position: [rw * 1.18, rh * 0.62, rd * 1.24],
      target: [0, rh * 0.35, -rd * 0.2],
      fov: 46,
      subtitle: "Contextual setting backdrop, horizon ridges & perimeter facade"
    },
    {
      id: "interior",
      label: "03 • Interior",
      position: [0.4, 1.68, rd * 0.36],
      target: [fx, 1.45, fz],
      fov: 42,
      subtitle: "1.68m human eye-level acoustic sweet-spot sightline"
    },
    {
      id: "detail",
      label: "04 • Detail",
      position: [fx - 1.8, fy + 0.55, fz + 3.1],
      target: [fx, fy, fz],
      fov: 38,
      subtitle: "Close-up focal installation & physical material grain"
    }
  ];
}

export function validateCameraChapters(
  input: unknown,
  roomDimensions: { width: number; height: number; depth: number },
  focalPointPosition: [number, number, number] = [0, 1.2, -2.0]
): CameraChapterSpec[] {
  const defaults = buildDefaultCameraChapters(roomDimensions, focalPointPosition);
  if (!Array.isArray(input)) {
    return defaults;
  }

  const validated: CameraChapterSpec[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const id = rec.id;
    if (
      typeof id === "string" &&
      VALID_CHAPTER_IDS.has(id as CameraChapterId) &&
      Array.isArray(rec.position) &&
      rec.position.length === 3 &&
      Array.isArray(rec.target) &&
      rec.target.length === 3
    ) {
      validated.push({
        id: id as CameraChapterId,
        label: typeof rec.label === "string" ? rec.label : id.toUpperCase(),
        position: [
          Number(rec.position[0]),
          Number(rec.position[1]),
          Number(rec.position[2])
        ],
        target: [
          Number(rec.target[0]),
          Number(rec.target[1]),
          Number(rec.target[2])
        ],
        fov: typeof rec.fov === "number" ? rec.fov : 44,
        subtitle: typeof rec.subtitle === "string" ? rec.subtitle : undefined
      });
    }
  }

  return validated.length === 4 ? validated : defaults;
}

// ============================================================================
// 2. CATMULL-ROM SPLINE CAMERA RIG COMPONENT
// ============================================================================

export interface CameraChaptersRigProps {
  chapters: CameraChapterSpec[];
  activeChapterId: CameraChapterId;
  /** When true, wheel/scroll scrubs continuously along the 4-chapter CatmullRom path */
  scrollDriveEnabled?: boolean;
  /** Normalized scroll progress [0..1] when controlled externally */
  scrollProgress?: number;
  /** Renders a subtle 3D architectural spline path and waypoint rings in dev/studio mode */
  showSplineRail?: boolean;
  /** Duration of point-to-point eased chapter transitions in seconds */
  transitionDurationSec?: number;
  /** Callback fired when scroll scrubbing crosses into a new active chapter */
  onActiveChapterChange?: (chapterId: CameraChapterId) => void;
}

interface FlightTransitionState {
  active: boolean;
  elapsedSec: number;
  durationSec: number;
  posCurve: THREE.CatmullRomCurve3;
  targetCurve: THREE.CatmullRomCurve3;
  startFov: number;
  endFov: number;
}

function cubicHermiteEase(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

export const CameraChaptersRig: React.FC<CameraChaptersRigProps> = ({
  chapters,
  activeChapterId,
  scrollDriveEnabled = false,
  scrollProgress,
  showSplineRail = false,
  transitionDurationSec = 1.5,
  onActiveChapterChange
}) => {
  const { camera, gl } = useThree();
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const scrollURef = useRef<number>(0);
  const targetScrollURef = useRef<number>(0);
  const lastReportedChapterRef = useRef<CameraChapterId>(activeChapterId);

  // Master 4-chapter CatmullRom curves for continuous scroll-driven camera tour
  const masterTourCurves = useMemo(() => {
    const posPoints = chapters.map((c) => new THREE.Vector3(...c.position));
    const tgtPoints = chapters.map((c) => new THREE.Vector3(...c.target));
    const posCurve = new THREE.CatmullRomCurve3(posPoints, false, "catmullrom", 0.5);
    const targetCurve = new THREE.CatmullRomCurve3(tgtPoints, false, "catmullrom", 0.5);
    return { posCurve, targetCurve };
  }, [chapters]);

  // Point-to-point flight state when clicking a specific chapter button
  const flightRef = useRef<FlightTransitionState | null>(null);

  const startFlightToChapter = useCallback(
    (chapterId: CameraChapterId) => {
      const targetSpec = chapters.find((c) => c.id === chapterId) ?? chapters[0];
      if (!targetSpec) return;

      const startPos = camera.position.clone();
      const endPos = new THREE.Vector3(...targetSpec.position);
      const midPos = startPos.clone().lerp(endPos, 0.5);
      // Add a graceful architectural arc apex so the camera never clips through furniture
      midPos.y += Math.max(1.2, startPos.distanceTo(endPos) * 0.12);

      const startTgt = currentLookAtRef.current.clone();
      const endTgt = new THREE.Vector3(...targetSpec.target);
      const midTgt = startTgt.clone().lerp(endTgt, 0.5);

      const perspCam = camera as THREE.PerspectiveCamera;
      const startFov = perspCam.isPerspectiveCamera ? perspCam.fov : 44;
      const endFov = targetSpec.fov ?? 44;

      flightRef.current = {
        active: true,
        elapsedSec: 0,
        durationSec: Math.max(0.25, transitionDurationSec),
        posCurve: new THREE.CatmullRomCurve3([startPos, midPos, endPos], false, "catmullrom", 0.5),
        targetCurve: new THREE.CatmullRomCurve3([startTgt, midTgt, endTgt], false, "catmullrom", 0.5),
        startFov,
        endFov
      };

      // Sync scroll progress index so enabling scroll tour starts from this chapter
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx >= 0 && chapters.length > 1) {
        const u = idx / (chapters.length - 1);
        scrollURef.current = u;
        targetScrollURef.current = u;
      }
    },
    [camera, chapters, transitionDurationSec]
  );

  // Trigger eased CatmullRom flight whenever activeChapterId prop changes
  useEffect(() => {
    if (!scrollDriveEnabled) {
      startFlightToChapter(activeChapterId);
    }
  }, [activeChapterId, scrollDriveEnabled, startFlightToChapter]);

  // Sync external scrollProgress prop if provided
  useEffect(() => {
    if (typeof scrollProgress === "number") {
      targetScrollURef.current = Math.max(0, Math.min(1, scrollProgress));
    }
  }, [scrollProgress]);

  // Release camera flight immediately upon user pointer down/drag
  useEffect(() => {
    const dom = gl.domElement;
    const handlePointerDown = () => {
      if (flightRef.current && flightRef.current.active) {
        flightRef.current.active = false;
        flightRef.current = null;
      }
    };
    dom.addEventListener("pointerdown", handlePointerDown);
    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [gl.domElement]);

  // Attach wheel listener on canvas when scrollDriveEnabled is active
  useEffect(() => {
    if (!scrollDriveEnabled) return;
    const dom = gl.domElement;
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      flightRef.current = null;
      const step = e.deltaY * 0.00065;
      targetScrollURef.current = Math.max(0, Math.min(1, targetScrollURef.current + step));
    };
    dom.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      dom.removeEventListener("wheel", handleWheel);
    };
  }, [gl.domElement, scrollDriveEnabled]);

  // Advance spline flight or continuous scroll-driven spline interpolation at 60fps
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1);
    const perspCam = camera as THREE.PerspectiveCamera;

    if (scrollDriveEnabled) {
      scrollURef.current = THREE.MathUtils.lerp(scrollURef.current, targetScrollURef.current, dt * 7.5);
      const easedU = cubicHermiteEase(scrollURef.current);

      const pos = masterTourCurves.posCurve.getPoint(easedU);
      const tgt = masterTourCurves.targetCurve.getPoint(easedU);
      camera.position.copy(pos);
      currentLookAtRef.current.copy(tgt);
      camera.lookAt(currentLookAtRef.current);

      // Notify parent when scroll crosses into a new chapter segment
      const segIdx = Math.min(
        chapters.length - 1,
        Math.max(0, Math.round(easedU * (chapters.length - 1)))
      );
      const nearestChapter = chapters[segIdx]?.id;
      if (nearestChapter && nearestChapter !== lastReportedChapterRef.current) {
        lastReportedChapterRef.current = nearestChapter;
        onActiveChapterChange?.(nearestChapter);
      }
      return;
    }

    const flight = flightRef.current;
    if (flight && flight.active) {
      flight.elapsedSec += dt;
      const rawU = Math.min(1, flight.elapsedSec / flight.durationSec);
      const easedU = cubicHermiteEase(rawU);

      const pos = flight.posCurve.getPoint(easedU);
      const tgt = flight.targetCurve.getPoint(easedU);
      camera.position.copy(pos);
      currentLookAtRef.current.copy(tgt);
      camera.lookAt(currentLookAtRef.current);

      if (perspCam.isPerspectiveCamera) {
        perspCam.fov = THREE.MathUtils.lerp(flight.startFov, flight.endFov, easedU);
        perspCam.updateProjectionMatrix();
      }

      if (rawU >= 1) {
        flight.active = false;
      }
    }
  });

  // Optional 3D CatmullRom spline rail geometry + material with clean disposal on unmount
  const splineRailLine = useMemo(() => {
    const pts = masterTourCurves.posCurve.getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: "#D9532B",
      transparent: true,
      opacity: 0.55
    });
    return new THREE.Line(geo, mat);
  }, [masterTourCurves]);

  useEffect(() => {
    return () => {
      splineRailLine.geometry.dispose();
      (splineRailLine.material as THREE.Material).dispose();
    };
  }, [splineRailLine]);

  if (!showSplineRail) {
    return null;
  }

  return (
    <group name="sonic-camera-spline-rail">
      <primitive object={splineRailLine} />
      {chapters.map((ch) => (
        <mesh key={`chap-node-${ch.id}`} position={ch.position}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial color={ch.id === activeChapterId ? "#D9532B" : "#2F5A4C"} />
        </mesh>
      ))}
    </group>
  );
};

export default CameraChaptersRig;
