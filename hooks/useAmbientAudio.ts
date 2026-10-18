"use client";

import { useEffect, useRef } from "react";

const AudioContextCtor =
  typeof window !== "undefined"
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;

export function useAmbientAudio(vibeScore: number, isAudioEnabled: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!isAudioEnabled) {
      if (ctxRef.current && ctxRef.current.state === "running") {
        ctxRef.current.suspend().catch(() => {});
      }
      return;
    }

    if (!AudioContextCtor) return;

    if (!ctxRef.current) {
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 440;

      filter.type = "lowpass";
      filter.frequency.value = 1200;
      filter.Q.value = 1;

      gain.gain.value = 0.06;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      ctxRef.current = ctx;
      oscRef.current = osc;
      filterRef.current = filter;
      gainRef.current = gain;
    }

    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, [isAudioEnabled]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    const filter = filterRef.current;
    if (!ctx || !osc || !filter) return;
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;
    const t = Math.min(Math.max(vibeScore / 100, 0), 1);
    const freq = 440 - (440 - 120) * t;
    const cutoff = 1200 - (1200 - 300) * t;

    try {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freq, 0.001), now + 0.5);
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff, 0.001), now + 0.5);
    } catch {
      osc.frequency.value = freq;
      filter.frequency.value = cutoff;
    }
  }, [vibeScore]);

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.disconnect();
        filterRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);
}
