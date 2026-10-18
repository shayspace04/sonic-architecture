"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** Catches WebGL/shader runtime failures so the 2D fallback stays usable. */
export class WebGLBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("WebGL scene failed; falling back to 2D.", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getReduced = () =>
  typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, () => false);
}

let webglSupport: boolean | null = null;
const subscribeNoop = () => () => {};

const getWebGLSupport = (): boolean | null => {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
};

/** `null` during SSR/hydration, then a stable boolean on the client. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(subscribeNoop, getWebGLSupport, () => null);
}

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return getWebGLSupport() ?? false;
}
