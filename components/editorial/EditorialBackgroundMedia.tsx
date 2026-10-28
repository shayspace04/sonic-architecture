"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  getSubmitBackgroundZoomVariants,
  HERO_MEDIA_PERFORMANCE_BUDGET,
  shouldSkipBackgroundVideo,
  subscribeToNetworkSaveDataChanges,
  useReducedMotionSafe,
} from "@/lib/motion";
import type { EditorialRouteTheme } from "./EditorialNav";

export interface EditorialBackgroundMediaProps {
  /** Active route theme ("home" | "archive" | "studio" | "about") */
  readonly routeTheme: EditorialRouteTheme;
  /** Whether the hero is currently playing the interruptible submit zoom/dim transition */
  readonly isEntering?: boolean;
  /** Optional explicit reduced-motion override (combined with OS prefers-reduced-motion) */
  readonly prefersReducedMotionOverride?: boolean;
  /** Primary compressed 720p WebM video source path */
  readonly videoWebm720Src?: string;
  /** Primary compressed 720p MP4 (faststart, no audio) video source path (`ffmpeg ... bg-720.mp4`) */
  readonly videoMp4720Src?: string;
  /** Fallback WebM video source path */
  readonly videoWebmFallbackSrc?: string;
  /** Fallback MP4 video source path */
  readonly videoMp4FallbackSrc?: string;
  /** WebP/AVIF poster image path (rendered via next/image) */
  readonly posterSrc?: string;
}

/**
 * Route-specific media opacity map so switching between
 * `/`, `/archive`, `/studio`, and `/about` smoothly cross-fades the background
 * treatment using GPU-composited opacity.
 */
const ROUTE_MEDIA_OPACITY: Readonly<Record<EditorialRouteTheme, number>> = {
  home: 1,
  archive: 0.64,
  studio: 0.36,
  about: 0,
};

/**
 * Brutalist-Editorial Background Media, Wash, Film-Grain & Submit-Zoom Layer
 * (`components/editorial/EditorialBackgroundMedia.tsx`)
 *
 * Step 6 Performance Pass Enhancements:
 * 1. LCP Poster First (`next/image`):
 *    - Renders `posterSrc` (`/modernist-city.webp`, auto-negotiated to AVIF/WebP by Next.js)
 *      with `priority`, `fetchPriority="high"`, `decoding="async"`, `quality={82}`, and `sizes="100vw"`.
 *    - Defers `<video>` mounting until after the first paint (`requestIdleCallback` / `requestAnimationFrame`)
 *      so video metadata/segment requests never compete with the LCP poster or `next/font/google` preloads.
 * 2. Compressed Dual-Format Video (`bg-720.webm` + `bg-720.mp4`):
 *    - Serves VP9 WebM first, then H.264 MP4 (`-vf scale=1280:-2 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart bg-720.mp4`),
 *      with `preload="metadata"`, `muted`, `loop`, `playsInline`, `disablePictureInPicture`, and `disableRemotePlayback`.
 * 3. Lifecycle & Bandwidth Guards:
 *    - Skips `<video>` completely when `prefers-reduced-motion: reduce`, in-app reduced-motion override,
 *      `navigator.connection.saveData === true`, or 2G cellular (`slow-2g` / `2g`) is detected,
 *      and subscribes to live `navigator.connection` changes.
 *    - Pauses `<video>` immediately when `document.visibilityState === "hidden"`, when the hero
 *      scrolls offscreen (`IntersectionObserver`), or when on the `/about` route.
 */
export const EditorialBackgroundMedia: React.FC<EditorialBackgroundMediaProps> = ({
  routeTheme,
  isEntering = false,
  prefersReducedMotionOverride,
  videoWebm720Src = HERO_MEDIA_PERFORMANCE_BUDGET.webm720Path,
  videoMp4720Src = HERO_MEDIA_PERFORMANCE_BUDGET.mp4720Path,
  videoWebmFallbackSrc = HERO_MEDIA_PERFORMANCE_BUDGET.webmFallbackPath,
  videoMp4FallbackSrc = HERO_MEDIA_PERFORMANCE_BUDGET.mp4FallbackPath,
  posterSrc = HERO_MEDIA_PERFORMANCE_BUDGET.posterWebpPath,
}) => {
  const { prefersReducedMotion: osReducedMotion } = useReducedMotionSafe();
  const effectiveReducedMotion = Boolean(
    prefersReducedMotionOverride ?? osReducedMotion
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start with skipVideo=true until client hydration + post-LCP idle check completes
  const [skipVideo, setSkipVideo] = useState<boolean>(true);
  const [isLcpPosterPainted, setIsLcpPosterPainted] = useState<boolean>(false);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isOffscreen, setIsOffscreen] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Defer video mounting until after initial poster paint so LCP is never delayed by video bandwidth
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = 0;
    let timerId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      timerId = window.setTimeout(() => {
        setIsLcpPosterPainted(true);
      }, 60);
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  // Evaluate prefers-reduced-motion, Save-Data, and cellular effectiveType (including live connection changes)
  useEffect(() => {
    const syncSkipState = () => {
      const shouldSkip = shouldSkipBackgroundVideo(effectiveReducedMotion);
      setSkipVideo(shouldSkip);
      if (shouldSkip) {
        setIsVideoReady(false);
      }
    };

    syncSkipState();
    const unsubscribe = subscribeToNetworkSaveDataChanges(syncSkipState);
    return () => {
      unsubscribe();
    };
  }, [effectiveReducedMotion]);

  // Pause video when browser tab is hidden
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Pause video when hero shell scrolls offscreen
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsOffscreen(!entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Synchronize video playback state with visibility, intersection, reduced-motion, and routeTheme
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldPause =
      skipVideo ||
      !isLcpPosterPainted ||
      isOffscreen ||
      isTabHidden ||
      routeTheme === "about";

    if (shouldPause) {
      if (!video.paused) {
        video.pause();
      }
    } else {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Autoplay blocked by browser policy or power-saving mode; poster remains visible
        });
      }
    }
  }, [
    skipVideo,
    isLcpPosterPainted,
    isOffscreen,
    isTabHidden,
    routeTheme,
  ]);

  const submitZoomVariants = getSubmitBackgroundZoomVariants(
    effectiveReducedMotion
  );
  const routeTargetOpacity = ROUTE_MEDIA_OPACITY[routeTheme] ?? 1;
  const shouldMountVideo =
    isLcpPosterPainted && !skipVideo && routeTheme !== "about";

  return (
    <div
      ref={containerRef}
      className="sonic-media-stage"
      aria-hidden="true"
    >
      {/* Interruptible Submit Zoom & Dim Layer (transform: scale + opacity only) */}
      <motion.div
        className="sonic-image-zoom-stage"
        variants={submitZoomVariants}
        initial="idle"
        animate={isEntering ? "submitting" : "idle"}
      >
        {/* Route Cross-Fade Wrapper */}
        <motion.div
          className="sonic-image-wrapper"
          initial={false}
          animate={{ opacity: routeTargetOpacity }}
          transition={{
            duration: effectiveReducedMotion ? 0.08 : 0.48,
            ease: [0.25, 1, 0.5, 1],
          }}
        >
          {/* Next/Image Poster Layer (Always rendered for instant LCP and Reduced-Motion / Save-Data fallback) */}
          <Image
            src={posterSrc}
            alt=""
            fill
            priority
            fetchPriority="high"
            decoding="async"
            quality={82}
            sizes="100vw"
            className="sonic-image sonic-poster-image"
          />

          {/* Looping Muted Brutalist Tower Video (Mounted after LCP poster paint; Skipped on Reduced-Motion & Save-Data) */}
          {shouldMountVideo && (
            <video
              ref={videoRef}
              id="sonic-image"
              className={`sonic-image sonic-video-element transition-opacity duration-500 ${
                isVideoReady ? "opacity-100" : "opacity-0"
              }`}
              width={HERO_MEDIA_PERFORMANCE_BUDGET.encodedWidth}
              height={HERO_MEDIA_PERFORMANCE_BUDGET.encodedHeight}
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
              preload="metadata"
              poster={posterSrc}
              onCanPlay={() => setIsVideoReady(true)}
            >
              <source src={videoWebm720Src} type="video/webm" />
              <source src={videoMp4720Src} type="video/mp4" />
              <source src={videoWebmFallbackSrc} type="video/webm" />
              <source src={videoMp4FallbackSrc} type="video/mp4" />
            </video>
          )}
        </motion.div>
      </motion.div>

      {/* Left-Heavy Dark Gradient Wash + Bottom-Up Gradient + Cursor Radial Glow */}
      <div className="sonic-wash" />

      {/* SVG feTurbulence Film-Grain Layer (opacity 0.1, mix-blend-mode: screen) */}
      <div className="sonic-grain" />
    </div>
  );
};

export default EditorialBackgroundMedia;


// ----------------------------------------------------------------------------
