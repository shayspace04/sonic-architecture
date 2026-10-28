"use client";

/**
 * ============================================================================
 * SONIC ARCHITECTURE — MOTION, PERFORMANCE BUDGET & DESIGN TOKENS (`/lib/motion.ts`)
 * ============================================================================
 * Centralizes:
 *   1. Brutalist-editorial design tokens (`EDITORIAL_TOKENS`) with WCAG AA
 *      verified contrast ratios and a 0.7rem minimum font-size floor.
 *   2. Cursor parallax physics (`PARALLAX_CONFIG`: 4.5% lerp per frame,
 *      ±18px X / ±10px Y shift, 0.7% radial glow tracking, disabled on touch
 *      and `prefers-reduced-motion`).
 *   3. Framer Motion variants for:
 *      - Staggered masked line reveal (`getHeroStaggerContainerVariants`, `getHeroMaskLineVariants`)
 *      - Interruptible submit zoom + hero lift (`getSubmitBackgroundZoomVariants`, `getSubmitHeroLiftVariants`)
 *      - Route cross-fade transitions (`getRouteCrossfadeVariants`)
 *   4. Step 6 Hero Media Performance Budget (`HERO_MEDIA_PERFORMANCE_BUDGET`),
 *      `useReducedMotionSafe()` / `usePrefersReducedMotion()`,
 *      `shouldSkipBackgroundVideo()` (checks `prefers-reduced-motion: reduce`,
 *      `navigator.connection.saveData`, and `2g` / `slow-2g`), and
 *      `subscribeToNetworkSaveDataChanges()`.
 *   5. All existing studio motion tokens, `ArchitecturalIcon`, & `LightSweepButton`
 *      exports so every existing 3D and studio component compiles without changes.
 *
 * Strict TypeScript, zero `any`.
 */

import React, { useEffect, useState } from "react";
import type { Transition, Variants } from "framer-motion";

/* ============================================================================
 * 1. BRUTALIST-EDITORIAL DESIGN TOKENS & CONTRAST AUDIT
 * ============================================================================ */

export interface EditorialDesignTokens {
  readonly colors: {
    readonly ink: "#f1f0eb";
    readonly dark: "#111312";
    readonly page: "#171918";
    readonly red: "#e51f35";
    readonly redText: "#ff4a5e";
    readonly muted: "rgba(241, 240, 235, 0.7)";
    readonly mutedStrong: "rgba(241, 240, 235, 0.78)";
    readonly line: "rgba(241, 240, 235, 0.28)";
    readonly lineSubtle: "rgba(241, 240, 235, 0.16)";
    readonly cursorGlow: "rgba(91, 109, 96, 0.13)";
  };
  readonly typography: {
    readonly fontDisplay: string;
    readonly fontSans: string;
    readonly fontMono: string;
    readonly minFontSizeRem: 0.7;
    readonly h1DesktopClamp: "clamp(4.8rem, 9.5vw, 10rem)";
    readonly h1MobileClamp: "clamp(2.7rem, 11vw, 4.6rem)";
    readonly h1LineHeight: 0.77;
    readonly h1LetterSpacing: "-0.095em";
    readonly h1ItalicLetterSpacing: "-0.1em";
    readonly subtitleClamp: "clamp(1.2rem, 2.3vw, 2rem)";
    readonly subtitleLetterSpacing: "-0.03em";
    readonly monoTrackingRange: readonly ["0.08em", "0.17em"];
  };
  readonly layout: {
    readonly mobileBreakpointPx: 800;
    readonly heroLeftDesktop: "9vw";
    readonly heroTopDesktop: "17vh";
    readonly heroMaxWidthRem: 52;
  };
}

export const EDITORIAL_TOKENS: EditorialDesignTokens = {
  colors: {
    ink: "#f1f0eb",
    dark: "#111312",
    page: "#171918",
    red: "#e51f35",
    redText: "#ff4a5e",
    muted: "rgba(241, 240, 235, 0.7)",
    mutedStrong: "rgba(241, 240, 235, 0.78)",
    line: "rgba(241, 240, 235, 0.28)",
    lineSubtle: "rgba(241, 240, 235, 0.16)",
    cursorGlow: "rgba(91, 109, 96, 0.13)",
  },
  typography: {
    fontDisplay: "var(--font-fraunces), Georgia, serif",
    fontSans:
      "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "var(--font-dm-mono), ui-monospace, SFMono-Regular, monospace",
    minFontSizeRem: 0.7,
    h1DesktopClamp: "clamp(4.8rem, 9.5vw, 10rem)",
    h1MobileClamp: "clamp(2.7rem, 11vw, 4.6rem)",
    h1LineHeight: 0.77,
    h1LetterSpacing: "-0.095em",
    h1ItalicLetterSpacing: "-0.1em",
    subtitleClamp: "clamp(1.2rem, 2.3vw, 2rem)",
    subtitleLetterSpacing: "-0.03em",
    monoTrackingRange: ["0.08em", "0.17em"],
  },
  layout: {
    mobileBreakpointPx: 800,
    heroLeftDesktop: "9vw",
    heroTopDesktop: "17vh",
    heroMaxWidthRem: 52,
  },
} as const;

/* ============================================================================
 * 2. STEP 6 HERO MEDIA PERFORMANCE BUDGET & ENCODING SPECIFICATION
 * ============================================================================ */

export interface HeroMediaPerformanceBudget {
  readonly sourceWidth: 1344;
  readonly sourceHeight: 768;
  readonly encodedWidth: 1280;
  readonly encodedHeight: 720;
  readonly fps: 24;
  readonly durationSeconds: 8;
  readonly targetSizeMbRange: readonly [2, 3];
  readonly hasAudioTrack: false;
  readonly mp4720Path: "/bg-720.mp4";
  readonly webm720Path: "/bg-720.webm";
  readonly mp4FallbackPath: "/sonic-architecture-bg.mp4";
  readonly webmFallbackPath: "/sonic-architecture-bg.webm";
  readonly posterWebpPath: "/modernist-city.webp";
  readonly posterAvifPath: "/modernist-city.avif";
  readonly ffmpegMp4Command: string;
  readonly ffmpegWebmCommand: string;
}

export const HERO_MEDIA_PERFORMANCE_BUDGET: HeroMediaPerformanceBudget = {
  sourceWidth: 1344,
  sourceHeight: 768,
  encodedWidth: 1280,
  encodedHeight: 720,
  fps: 24,
  durationSeconds: 8,
  targetSizeMbRange: [2, 3],
  hasAudioTrack: false,
  mp4720Path: "/bg-720.mp4",
  webm720Path: "/bg-720.webm",
  mp4FallbackPath: "/sonic-architecture-bg.mp4",
  webmFallbackPath: "/sonic-architecture-bg.webm",
  posterWebpPath: "/modernist-city.webp",
  posterAvifPath: "/modernist-city.avif",
  ffmpegMp4Command:
    "ffmpeg -i sonic-architecture-bg.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart bg-720.mp4",
  ffmpegWebmCommand:
    "ffmpeg -i sonic-architecture-bg.mp4 -vf scale=1280:-2 -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -an bg-720.webm",
} as const;

/* ============================================================================
 * 3. CURSOR PARALLAX & MOTION TOKENS (Framer Motion Compatible)
 * ============================================================================ */

export const PARALLAX_CONFIG = {
  /** Eased interpolation factor per animation frame (~4.5% per frame as in template) */
  lerpFactor: 0.045,
  /** Maximum horizontal shift in pixels at viewport edges */
  maxShiftX: 18,
  /** Maximum vertical shift in pixels at viewport edges */
  maxShiftY: 10,
  /** Multiplier converting pixel shift into radial glow percentage offset */
  glowShiftFactor: 0.7,
  /** Convergence threshold in pixels below which the RAF loop idles */
  epsilon: 0.05,
} as const;

export const EDITORIAL_EASINGS = {
  /** Exact cubic-bezier(0.2, 0.8, 0.25, 1) from meadowhero template */
  submitZoom: [0.2, 0.8, 0.25, 1] as const,
  /** Masked line reveal easing */
  revealOutExpo: [0.16, 1, 0.3, 1] as const,
  /** Smooth route cross-fade easing */
  routeCrossfade: [0.25, 1, 0.5, 1] as const,
} as const;

export const EDITORIAL_DURATIONS = {
  instantReduced: 0.08,
  fast: 0.18,
  reveal: 0.72,
  routeCrossfade: 0.42,
  submitZoom: 1.25,
  submitLift: 0.7,
  submitHandoffDelayMs: 650,
} as const;

/**
 * Helper to create Framer Motion variants that automatically collapse into
 * near-instant opacity fades when `prefersReducedMotion` is true.
 */
export function getHeroStaggerContainerVariants(
  prefersReducedMotion: boolean
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.085,
        delayChildren: prefersReducedMotion ? 0 : 0.06,
      },
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -16,
      transition: {
        duration: prefersReducedMotion
          ? EDITORIAL_DURATIONS.instantReduced
          : EDITORIAL_DURATIONS.submitLift,
        ease: EDITORIAL_EASINGS.submitZoom,
      },
    },
  };
}

/**
 * Masked line reveal for kicker, H1 lines, subtitle, description, form, and chips.
 * Uses only GPU-composited `transform` (`y`) and `opacity`.
 */
export function getHeroMaskLineVariants(
  prefersReducedMotion: boolean
): Variants {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0, y: 0 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
      submitting: {
        opacity: 0,
        y: 0,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
    };
  }

  return {
    hidden: {
      opacity: 0,
      y: "105%",
    },
    visible: {
      opacity: 1,
      y: "0%",
      transition: {
        duration: EDITORIAL_DURATIONS.reveal,
        ease: EDITORIAL_EASINGS.revealOutExpo,
      },
    },
    submitting: {
      opacity: 0,
      y: "-16px",
      transition: {
        duration: EDITORIAL_DURATIONS.submitLift,
        ease: EDITORIAL_EASINGS.submitZoom,
      },
    },
  };
}

/**
 * Submit transition variants for the background media layer:
 * Zooms from `scale(1.05)` to `scale(1.12)` and dims (`opacity: 0.22`) while
 * the hero content lifts (`y: -16`) and fades out. Interruptible if cancelled.
 */
export function getSubmitBackgroundZoomVariants(
  prefersReducedMotion: boolean
): Variants {
  if (prefersReducedMotion) {
    return {
      idle: { scale: 1, opacity: 1 },
      submitting: {
        scale: 1,
        opacity: 0.28,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
    };
  }

  return {
    idle: {
      scale: 1.05,
      opacity: 1,
      transition: {
        duration: EDITORIAL_DURATIONS.routeCrossfade,
        ease: EDITORIAL_EASINGS.routeCrossfade,
      },
    },
    submitting: {
      scale: 1.12,
      opacity: 0.22,
      transition: {
        duration: EDITORIAL_DURATIONS.submitZoom,
        ease: EDITORIAL_EASINGS.submitZoom,
      },
    },
  };
}

/**
 * Submit transition variants for the hero foreground block:
 * Lifts by 16px (`translateY(-16px)`) and fades out over 0.7s.
 */
export function getSubmitHeroLiftVariants(
  prefersReducedMotion: boolean
): Variants {
  if (prefersReducedMotion) {
    return {
      idle: { opacity: 1, y: 0 },
      submitting: {
        opacity: 0,
        y: 0,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
    };
  }

  return {
    idle: {
      opacity: 1,
      y: 0,
      transition: {
        duration: EDITORIAL_DURATIONS.routeCrossfade,
        ease: EDITORIAL_EASINGS.routeCrossfade,
      },
    },
    submitting: {
      opacity: 0,
      y: -16,
      transition: {
        duration: EDITORIAL_DURATIONS.submitLift,
        ease: EDITORIAL_EASINGS.submitZoom,
      },
    },
  };
}

/**
 * Smooth cross-fade variants between `/`, `/archive`, `/studio`, and `/about`.
 */
export function getRouteCrossfadeVariants(
  prefersReducedMotion: boolean
): Variants {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
      exit: {
        opacity: 0,
        transition: { duration: EDITORIAL_DURATIONS.instantReduced },
      },
    };
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: EDITORIAL_DURATIONS.routeCrossfade,
        ease: EDITORIAL_EASINGS.routeCrossfade,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: {
        duration: 0.24,
        ease: EDITORIAL_EASINGS.routeCrossfade,
      },
    },
  };
}

/* ============================================================================
 * 4. REDUCED MOTION, TOUCH DETECTION & SAVE-DATA MEDIA HELPERS
 * ============================================================================ */

interface NavigatorConnectionLike {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
  readonly addEventListener?: (type: "change", listener: () => void) => void;
  readonly removeEventListener?: (
    type: "change",
    listener: () => void
  ) => void;
}

/**
 * Returns true if background video should be skipped (showing only the poster image)
 * due to `prefers-reduced-motion: reduce`, `Save-Data` enabled in the browser,
 * or constrained 2G cellular connections (`slow-2g` / `2g`).
 */
export function shouldSkipBackgroundVideo(
  prefersReducedMotion: boolean
): boolean {
  if (prefersReducedMotion) return true;
  if (typeof navigator !== "undefined" && "connection" in navigator) {
    const conn = (
      navigator as Navigator & { connection?: NavigatorConnectionLike }
    ).connection;
    if (conn?.saveData === true) {
      return true;
    }
    if (
      conn?.effectiveType === "slow-2g" ||
      conn?.effectiveType === "2g"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Subscribes to runtime `navigator.connection` changes so toggling Data Saver
 * or dropping to a 2G network mid-session immediately pauses and unmounts `<video>`.
 */
export function subscribeToNetworkSaveDataChanges(
  onChange: () => void
): () => void {
  if (typeof navigator === "undefined" || !("connection" in navigator)) {
    return () => {};
  }
  const conn = (
    navigator as Navigator & { connection?: NavigatorConnectionLike }
  ).connection;
  if (conn && typeof conn.addEventListener === "function") {
    conn.addEventListener("change", onChange);
    return () => {
      if (typeof conn.removeEventListener === "function") {
        conn.removeEventListener("change", onChange);
      }
    };
  }
  return () => {};
}

/**
 * Returns true if the current primary pointing device is coarse (touch screen),
 * in which case cursor parallax is disabled.
 */
export function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/* ============================================================================
 * 5. PRESERVED STUDIO & 3D MOTION EXPORTS (Backwards-Compatible with Existing App)
 * ============================================================================ */

export const DESIGN_TOKENS = {
  colors: {
    obsidian: {
      base: "#111312",
      elevated: "#171918",
      surface: "#1c1f1e",
      glass: "rgba(17, 19, 18, 0.78)",
      glassHover: "rgba(23, 25, 24, 0.88)",
    },
    alabaster: {
      primary: "#f1f0eb",
      stone: "rgba(241, 240, 235, 0.78)",
      ash: "rgba(241, 240, 235, 0.7)",
      disabled: "rgba(241, 240, 235, 0.45)",
    },
    accents: {
      warmAmber: "#D4A373",
      amberGlow: "rgba(212, 163, 115, 0.24)",
      terracotta: "#e51f35",
      redText: "#ff4a5e",
      cyan: "#38BDF8",
      emerald: "#34D399",
      rose: "#ff4a5e",
    },
    borders: {
      hairline: "rgba(241, 240, 235, 0.28)",
      subtle: "rgba(241, 240, 235, 0.16)",
      activeAmber: "rgba(229, 31, 53, 0.65)",
      activeCyan: "rgba(56, 189, 248, 0.50)",
    },
  },
  typography: {
    fonts: {
      display: "var(--font-fraunces), Georgia, serif",
      serif: "var(--font-fraunces), Georgia, serif",
      sans: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "var(--font-dm-mono), ui-monospace, SFMono-Regular, monospace",
    },
  },
} as const;

export const MOTION_DURATIONS = {
  fast: 0.15,
  base: 0.28,
  slow: 0.6,
  cinematic: 1.25,
} as const;

export const MOTION_DURATIONS_MS = {
  fast: 150,
  base: 280,
  slow: 600,
  cinematic: 1250,
} as const;

export const MOTION_EASINGS = {
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  easeInOutQuart: [0.76, 0, 0.24, 1] as const,
  easeOutQuart: [0.25, 1, 0.5, 1] as const,
  architectural: [0.2, 0.8, 0.25, 1] as const,
} as const;

export const MOTION_EASINGS_CSS = {
  easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOutQuart: "cubic-bezier(0.76, 0, 0.24, 1)",
  easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
  architectural: "cubic-bezier(0.2, 0.8, 0.25, 1)",
} as const;

export interface SpringPhysicsConfig {
  readonly type: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

export const SPRING_SNAPPY: SpringPhysicsConfig = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
} as const;

export const SPRING_GENTLE: SpringPhysicsConfig = {
  type: "spring",
  stiffness: 220,
  damping: 26,
  mass: 1.0,
} as const;

export const SPRING_HEAVY: SpringPhysicsConfig = {
  type: "spring",
  stiffness: 140,
  damping: 24,
  mass: 1.25,
} as const;

export const MOTION_SPRINGS = {
  snappy: SPRING_SNAPPY,
  gentle: SPRING_GENTLE,
  heavy: SPRING_HEAVY,
} as const;

export const MOTION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, transform: "translate3d(0px, 16px, 0px)" },
    visible: { opacity: 1, transform: "translate3d(0px, 0px, 0px)" },
    exit: { opacity: 0, transform: "translate3d(0px, -10px, 0px)" },
  },
  scalePanel: {
    hidden: { opacity: 0, transform: "scale3d(0.96, 0.96, 1)" },
    visible: { opacity: 1, transform: "scale3d(1, 1, 1)" },
    exit: { opacity: 0, transform: "scale3d(0.98, 0.98, 1)" },
  },
} as const;

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}

export function useReducedMotionSafe(): {
  prefersReducedMotion: boolean;
  safeDuration: (standardSeconds: number) => number;
  safeTransitionCss: (
    property?: string,
    durationMs?: number,
    easing?: string
  ) => string;
  framerTransition: (standardSeconds?: number) => Transition;
} {
  const prefersReducedMotion = usePrefersReducedMotion();

  const safeDuration = (standardSeconds: number): number =>
    prefersReducedMotion ? 0.01 : standardSeconds;

  const safeTransitionCss = (
    property: string = "transform, opacity",
    durationMs: number = MOTION_DURATIONS_MS.base,
    easing: string = MOTION_EASINGS_CSS.easeOutExpo
  ): string => {
    if (prefersReducedMotion) {
      return "opacity 80ms linear";
    }
    return `${property} ${durationMs}ms ${easing}`;
  };

  const framerTransition = (
    standardSeconds: number = EDITORIAL_DURATIONS.reveal
  ): Transition => {
    if (prefersReducedMotion) {
      return { duration: EDITORIAL_DURATIONS.instantReduced, ease: "linear" };
    }
    return {
      duration: standardSeconds,
      ease: EDITORIAL_EASINGS.revealOutExpo,
    };
  };

  return {
    prefersReducedMotion,
    safeDuration,
    safeTransitionCss,
    framerTransition,
  };
}

export type ArchitecturalIconName =
  | "sparkles"
  | "compass"
  | "music"
  | "volume"
  | "sun"
  | "sunrise"
  | "sunset"
  | "moon"
  | "layers"
  | "sliders"
  | "eye"
  | "download"
  | "share"
  | "search"
  | "command"
  | "check"
  | "alert"
  | "refresh"
  | "chevronRight"
  | "chevronDown"
  | "close"
  | "building"
  | "grid"
  | "lamp"
  | "chair"
  | "door"
  | "trees"
  | "wand"
  | "radio"
  | "users"
  | "camera"
  | "flame"
  | "arrowRight";

export interface ArchitecturalIconProps {
  readonly name: ArchitecturalIconName;
  readonly size?: number;
  readonly className?: string;
  readonly strokeWidth?: number;
  readonly title?: string;
}

export const ArchitecturalIcon: React.FC<ArchitecturalIconProps> = ({
  name,
  size = 16,
  className = "",
  strokeWidth = 1.6,
  title,
}) => {
  const commonProps: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: `inline-block shrink-0 ${className}`,
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
  };

  const renderSvg = (...children: React.ReactNode[]): React.ReactElement =>
    React.createElement(
      "svg",
      commonProps,
      title ? React.createElement("title", { key: "title" }, title) : null,
      ...children
    );

  switch (name) {
    case "sparkles":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
        }),
        React.createElement("path", {
          key: "p2",
          d: "M20 3v4M22 5h-4M4 17v2M5 18H3",
        })
      );
    case "flame":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
        })
      );
    case "compass":
      return renderSvg(
        React.createElement("circle", { key: "c1", cx: "12", cy: "12", r: "10" }),
        React.createElement("polygon", {
          key: "poly1",
          points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76",
        })
      );
    case "music":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M9 18V5l12-2v13" }),
        React.createElement("circle", { key: "c1", cx: "6", cy: "18", r: "3" }),
        React.createElement("circle", { key: "c2", cx: "18", cy: "16", r: "3" })
      );
    case "volume":
      return renderSvg(
        React.createElement("polygon", {
          key: "poly1",
          points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
        }),
        React.createElement("path", { key: "p1", d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
        React.createElement("path", { key: "p2", d: "M19.07 4.93a10 10 0 0 1 0 14.14" })
      );
    case "sliders":
      return renderSvg(
        React.createElement("line", { key: "l1", x1: "4", x2: "4", y1: "21", y2: "14" }),
        React.createElement("line", { key: "l2", x1: "4", x2: "4", y1: "10", y2: "3" }),
        React.createElement("line", { key: "l3", x1: "12", x2: "12", y1: "21", y2: "12" }),
        React.createElement("line", { key: "l4", x1: "12", x2: "12", y1: "8", y2: "3" }),
        React.createElement("line", { key: "l5", x1: "20", x2: "20", y1: "21", y2: "16" }),
        React.createElement("line", { key: "l6", x1: "20", x2: "20", y1: "12", y2: "3" }),
        React.createElement("line", { key: "l7", x1: "2", x2: "6", y1: "14", y2: "14" }),
        React.createElement("line", { key: "l8", x1: "10", x2: "14", y1: "8", y2: "8" }),
        React.createElement("line", { key: "l9", x1: "18", x2: "22", y1: "16", y2: "16" })
      );
    case "eye":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
        }),
        React.createElement("circle", { key: "c1", cx: "12", cy: "12", r: "3" })
      );
    case "download":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
        }),
        React.createElement("polyline", { key: "pl1", points: "7 10 12 15 17 10" }),
        React.createElement("line", { key: "l1", x1: "12", x2: "12", y1: "15", y2: "3" })
      );
    case "share":
      return renderSvg(
        React.createElement("circle", { key: "c1", cx: "18", cy: "5", r: "3" }),
        React.createElement("circle", { key: "c2", cx: "6", cy: "12", r: "3" }),
        React.createElement("circle", { key: "c3", cx: "18", cy: "19", r: "3" }),
        React.createElement("line", {
          key: "l1",
          x1: "8.59",
          x2: "15.42",
          y1: "13.51",
          y2: "17.49",
        }),
        React.createElement("line", {
          key: "l2",
          x1: "15.41",
          x2: "8.59",
          y1: "6.51",
          y2: "10.49",
        })
      );
    case "search":
      return renderSvg(
        React.createElement("circle", { key: "c1", cx: "11", cy: "11", r: "8" }),
        React.createElement("path", { key: "p1", d: "m21 21-4.3-4.3" })
      );
    case "alert":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
        }),
        React.createElement("path", { key: "p2", d: "M12 9v4" }),
        React.createElement("path", { key: "p3", d: "M12 17h.01" })
      );
    case "refresh":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
        }),
        React.createElement("path", { key: "p2", d: "M21 3v5h-5" }),
        React.createElement("path", {
          key: "p3",
          d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
        }),
        React.createElement("path", { key: "p4", d: "M8 16H3v5" })
      );
    case "chevronRight":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "m9 18 6-6-6-6" })
      );
    case "chevronDown":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "m6 9 6 6 6-6" })
      );
    case "close":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M18 6 6 18" }),
        React.createElement("path", { key: "p2", d: "m6 6 12 12" })
      );
    case "building":
      return renderSvg(
        React.createElement("rect", {
          key: "r1",
          width: "16",
          height: "20",
          x: "4",
          y: "2",
          rx: "2",
          ry: "2",
        }),
        React.createElement("path", { key: "p1", d: "M9 22v-4h6v4" }),
        React.createElement("path", {
          key: "p2",
          d: "M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01",
        })
      );
    case "grid":
      return renderSvg(
        React.createElement("rect", {
          key: "r1",
          width: "18",
          height: "18",
          x: "3",
          y: "3",
          rx: "2",
        }),
        React.createElement("path", { key: "p1", d: "M3 9h18M3 15h18M9 3v18M15 3v18" })
      );
    case "lamp":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M8 2h8l4 10H4L8 2Z" }),
        React.createElement("path", { key: "p2", d: "M12 12v6" }),
        React.createElement("path", {
          key: "p3",
          d: "M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z",
        })
      );
    case "chair":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3",
        }),
        React.createElement("path", {
          key: "p2",
          d: "M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z",
        }),
        React.createElement("path", { key: "p3", d: "M5 18v2M19 18v2" })
      );
    case "door":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M13 4h3a2 2 0 0 1 2 2v14" }),
        React.createElement("path", { key: "p2", d: "M2 20h3" }),
        React.createElement("path", { key: "p3", d: "M13 20h9" }),
        React.createElement("path", { key: "p4", d: "M10 12v.01" }),
        React.createElement("path", {
          key: "p5",
          d: "M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",
        })
      );
    case "trees":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z",
        }),
        React.createElement("path", { key: "p2", d: "M7 16v6" }),
        React.createElement("path", { key: "p3", d: "M13 19v3" }),
        React.createElement("path", {
          key: "p4",
          d: "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5",
        })
      );
    case "wand":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5m-16 16 9-9M12.2 6.2 11 5",
        })
      );
    case "radio":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9" }),
        React.createElement("path", { key: "p2", d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" }),
        React.createElement("circle", { key: "c1", cx: "12", cy: "12", r: "2" }),
        React.createElement("path", { key: "p3", d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" }),
        React.createElement("path", { key: "p4", d: "M19.1 4.9C23 8.8 23 15.1 19.1 19" })
      );
    case "users":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        }),
        React.createElement("circle", { key: "c1", cx: "9", cy: "7", r: "4" }),
        React.createElement("path", { key: "p2", d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
        React.createElement("path", { key: "p3", d: "M16 3.13a4 4 0 0 1 0 7.75" })
      );
    case "camera":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
        }),
        React.createElement("circle", { key: "c1", cx: "12", cy: "13", r: "3" })
      );
    case "sunrise":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M12 2v8m-7.07.93 1.41 1.41M2 18h2m16 0h2m-2.93-7.07-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0",
        })
      );
    case "sun":
      return renderSvg(
        React.createElement("circle", { key: "c1", cx: "12", cy: "12", r: "4" }),
        React.createElement("path", {
          key: "p1",
          d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
        })
      );
    case "sunset":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M12 10V2m-7.07 8.93 1.41 1.41M2 18h2m16 0h2m-2.93-7.07-1.41 1.41M22 22H2m14-16-4 4-4-4M16 18a4 4 0 0 0-8 0",
        })
      );
    case "moon":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
        })
      );
    case "check":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M20 6 9 17l-5-5" })
      );
    case "command":
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",
        })
      );
    case "arrowRight":
      return renderSvg(
        React.createElement("path", { key: "p1", d: "M5 12h14" }),
        React.createElement("path", { key: "p2", d: "m12 5 7 7-7 7" })
      );
    case "layers":
    default:
      return renderSvg(
        React.createElement("path", {
          key: "p1",
          d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
        }),
        React.createElement("path", {
          key: "p2",
          d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",
        }),
        React.createElement("path", {
          key: "p3",
          d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",
        })
      );
  }
};

export interface LightSweepButtonProps {
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "glass";
  readonly icon?: ArchitecturalIconName;
  readonly shortcutHint?: string;
  readonly className?: string;
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
}

export const LightSweepButton: React.FC<LightSweepButtonProps> = ({
  children,
  onClick,
  variant = "glass",
  icon,
  shortcutHint,
  className = "",
  type = "button",
  disabled = false,
}) => {
  const baseClass =
    variant === "primary"
      ? "bg-[var(--red)] text-[var(--ink)] border border-[var(--red-text)] font-semibold hover:bg-[#c9192d]"
      : "bg-[#111312] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--red-text)]";

  return React.createElement(
    "button",
    {
      type,
      disabled,
      onClick,
      className: `inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors ${baseClass} ${className}`,
    },
    icon ? React.createElement(ArchitecturalIcon, { name: icon, size: 12 }) : null,
    React.createElement("span", null, children),
    shortcutHint
      ? React.createElement(
          "kbd",
          {
            className:
              "px-1.5 py-0.5 text-[0.7rem] border border-[var(--line)] bg-black/40 text-[var(--muted-strong)]",
          },
          shortcutHint
        )
      : null
  );
};

export default EDITORIAL_TOKENS;
