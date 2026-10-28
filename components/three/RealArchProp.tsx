// components/three/RealArchProp.tsx
// Sonic Architecture - CC0 Photographic 3D Props & Furniture Loader
import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { SpatialObject } from "@/lib/types";

export type CC0ModelSemantic =
  | "wooden_chair"
  | "armchair"
  | "coffee_table"
  | "dining_table"
  | "wooden_stool"
  | "lounge_sofa"
  | "potted_plant"
  | "wine_bottles"
  | "hanging_lamp";

export const CC0_MODEL_PATHS: Record<CC0ModelSemantic, string> = {
  wooden_chair: "/assets/models/WoodenChair_01/WoodenChair_01_1k.gltf",
  armchair: "/assets/models/modern_arm_chair_01/modern_arm_chair_01_1k.gltf",
  coffee_table: "/assets/models/modern_coffee_table_01/modern_coffee_table_01_1k.gltf",
  dining_table: "/assets/models/dining_table/dining_table_1k.gltf",
  wooden_stool: "/assets/models/wooden_stool_01/wooden_stool_01_1k.gltf",
  lounge_sofa: "/assets/models/sofa_02/sofa_02_1k.gltf",
  potted_plant: "/assets/models/potted_plant_01/potted_plant_01_1k.gltf",
  wine_bottles: "/assets/models/wine_bottles_01/wine_bottles_01_1k.gltf",
  hanging_lamp: "/assets/models/hanging_industrial_lamp/hanging_industrial_lamp_1k.gltf",
};

/**
 * Preload all CC0 models so they are ready instantly without pop-in.
 */
export function preloadAllCC0Models(): void {
  if (typeof window === "undefined") return;
  for (const path of Object.values(CC0_MODEL_PATHS)) {
    try {
      useGLTF.preload(path);
    } catch {
      // Ignored during SSR or non-browser environments
    }
  }
}

/**
 * Maps spatial object archetype to the best matching CC0 photographic model.
 */
export function resolveModelSemanticForArchetype(
  archetype: string
): CC0ModelSemantic | null {
  const lower = archetype.toLowerCase();

  if (lower.includes("chair") || lower.includes("seat") || lower.includes("auditorium")) {
    if (lower.includes("arm") || lower.includes("lounge")) return "armchair";
    if (lower.includes("stool") || lower.includes("bar")) return "wooden_stool";
    return "wooden_chair";
  }

  if (lower.includes("sofa") || lower.includes("banquette") || lower.includes("booth")) {
    return "lounge_sofa";
  }

  if (lower.includes("table") || lower.includes("desk") || lower.includes("counter")) {
    if (lower.includes("coffee") || lower.includes("side") || lower.includes("low")) {
      return "coffee_table";
    }
    return "dining_table";
  }

  if (lower.includes("plant") || lower.includes("biophilia") || lower.includes("tree")) {
    return "potted_plant";
  }

  if (lower.includes("clutter") || lower.includes("bottle") || lower.includes("glass") || lower.includes("bar_ware")) {
    return "wine_bottles";
  }

  if (lower.includes("pendant") || lower.includes("chandelier") || lower.includes("lamp") || lower.includes("fixture")) {
    return "hanging_lamp";
  }

  return null;
}

interface RealArchPropProps {
  obj: SpatialObject;
  semantic: CC0ModelSemantic;
  targetWidth: number;
  targetHeight: number;
  targetDepth: number;
  jitterSeed?: number;
}

/**
 * Renders an authentic photographic CC0 3D model with realistic scaling,
 * automatic shadow casting, and organic position/rotation jitter to prevent "cloned" looks.
 */
export const RealArchProp: React.FC<RealArchPropProps> = ({
  obj,
  semantic,
  targetWidth,
  targetHeight,
  targetDepth,
  jitterSeed = 0,
}) => {
  const gltfPath = CC0_MODEL_PATHS[semantic];
  const { scene } = useGLTF(gltfPath);

  // Clone scene for this instance so materials/transforms don't mutate globally
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Compute bounding box of original model
    const bbox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Scale model proportionally to match target real-world height or width
    const maxTargetDim = Math.max(targetWidth, targetDepth);
    const maxSourceDim = Math.max(size.x, size.z);
    let scaleFactor = 1.0;

    if (semantic === "hanging_lamp") {
      scaleFactor = (targetHeight * 0.9) / Math.max(0.1, size.y);
    } else if (size.y > 0.05 && targetHeight > 0.05) {
      scaleFactor = (targetHeight * 0.95) / size.y;
    } else if (maxSourceDim > 0.05) {
      scaleFactor = maxTargetDim / maxSourceDim;
    }

    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Re-center model at bottom center (y=0 at base)
    clone.position.x = -center.x * scaleFactor;
    clone.position.y = -bbox.min.y * scaleFactor - targetHeight * 0.5;
    clone.position.z = -center.z * scaleFactor;

    // Apply shadow flags to all sub-meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.envMapIntensity = 0.9;
        }
      }
    });

    return clone;
  }, [scene, semantic, targetWidth, targetHeight, targetDepth]);

  // Jitter calculation (pseudo-random from object ID or position)
  const [jitterRotY, jitterX, jitterZ] = useMemo(() => {
    const hash = (obj.id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), jitterSeed);
    // Slight organic angle jitter: +/- 3.5 degrees (+/- 0.06 rad)
    const rot = ((hash % 100) / 100 - 0.5) * 0.12;
    // Slight translation jitter: +/- 2 cm
    const jx = (((hash * 13) % 100) / 100 - 0.5) * 0.04;
    const jz = (((hash * 17) % 100) / 100 - 0.5) * 0.04;
    return [rot, jx, jz];
  }, [obj.id, jitterSeed]);

  return (
    <group position={[jitterX, 0, jitterZ]} rotation={[0, jitterRotY, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
};
