"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getRouteCrossfadeVariants, useReducedMotionSafe } from "@/lib/motion";
import type { EditorialRouteKey } from "@/lib/editorial-routes";

/**
 * ============================================================================
 * SONIC ARCHITECTURE — STEP 4:
 * ROUTE CROSS-FADE & TRANSITION WRAPPER (`components/editorial/EditorialRouteTransition.tsx`)
 * ============================================================================
 *
 * Wraps route foreground content in Framer Motion's `AnimatePresence` keyed by
 * `routeKey` (`"home" | "archive" | "studio" | "about"`).
 * - Animates strictly `opacity` and `transform` (`y: 8 -> 0 -> -8`).
 * - Collapses to a near-instant `0.08s` opacity fade when `prefers-reduced-motion` is enabled.
 */

export interface EditorialRouteTransitionProps {
  readonly routeKey: EditorialRouteKey;
  readonly children: React.ReactNode;
}

export const EditorialRouteTransition: React.FC<EditorialRouteTransitionProps> = ({
  routeKey,
  children,
}) => {
  const { prefersReducedMotion } = useReducedMotionSafe();
  const routeVariants = getRouteCrossfadeVariants(prefersReducedMotion);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        variants={routeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="sonic-route-transition-stage"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default EditorialRouteTransition;
