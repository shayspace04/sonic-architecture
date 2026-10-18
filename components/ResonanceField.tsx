"use client";

import { useEffect, useRef } from "react";

interface ResonanceFieldProps {
  intensity?: number;
  className?: string;
}

const LIME = { r: 213, g: 255, b: 63 };
const VIOLET = { r: 139, g: 92, b: 246 };

export default function ResonanceField({ intensity = 0.5, className = "" }: ResonanceFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;
    let visible = true;
    let width = 0;
    let height = 0;
    let cols = 90;
    let rows = 30;
    let points: Float32Array | null = null;
    const pointer = { x: 0.5, targetX: 0.5 };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      height = Math.max(240, Math.floor(rect?.height ?? window.innerHeight));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const mobile = width < 720;
      cols = mobile ? 56 : 96;
      rows = mobile ? 20 : 30;
      points = new Float32Array(cols * rows * 2);
    };

    const draw = (time: number) => {
      if (!points || !ctx) return;
      const t = time * 0.00035;
      const amp = (28 + intensityRef.current * 46) * (height / 640);
      pointer.x += (pointer.targetX - pointer.x) * 0.04;

      ctx.clearRect(0, 0, width, height);
      const horizon = height * 0.34;
      const depthSpan = height * 0.62;
      const parallax = (pointer.x - 0.5) * 26;

      for (let r = 0; r < rows; r++) {
        const dz = r / (rows - 1);
        const perspective = 0.35 + dz * dz * 0.9;
        const y0 = horizon + depthSpan * dz * dz;
        const alphaRow = (0.1 + dz * 0.75) * (0.55 + intensityRef.current * 0.45);

        for (let c = 0; c < cols; c++) {
          const dx = c / (cols - 1);
          const xBase = dx * width;
          const x = xBase + parallax * (1 - dz * 0.6);
          const wave =
            Math.sin(dx * 7.2 + t * 2.1 + dz * 2.4) * 0.55 +
            Math.sin(dx * 13.4 - t * 1.4 + dz * 5.1) * 0.3 +
            Math.sin(dx * 3.1 + t * 0.8) * 0.15;
          const y = y0 - wave * amp * perspective;

          const mix = Math.min(1, Math.max(0, (wave + 1) * 0.5));
          const rr = Math.round(VIOLET.r + (LIME.r - VIOLET.r) * mix);
          const gg = Math.round(VIOLET.g + (LIME.g - VIOLET.g) * mix);
          const bb = Math.round(VIOLET.b + (LIME.b - VIOLET.b) * mix);

          const edgeFade = Math.min(1, Math.min(dx, 1 - dx) * 6);
          const a = alphaRow * edgeFade * (0.35 + mix * 0.65);
          if (a <= 0.01) continue;

          const size = perspective * 1.7;
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${a.toFixed(3)})`;
          ctx.fillRect(x, y, size, size);
        }
      }
    };

    const loop = (time: number) => {
      if (running && visible) draw(time);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = (e.clientX - rect.left) / Math.max(1, rect.width);
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };

    build();
    if (reducedMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    }

    const ro = new ResizeObserver(() => {
      build();
      if (reducedMotion) draw(0);
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && document.visibilityState === "visible";
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      io.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B0A0D] to-transparent" />
    </div>
  );
}
