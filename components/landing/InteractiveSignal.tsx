'use client';

import { useEffect, useRef, useState } from 'react';

export function InteractiveSignal({ compact = false, position = 50 }: { compact?: boolean; position?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [signalMode, setSignalMode] = useState<'simulated' | 'microphone'>('simulated');
  const [isInView, setIsInView] = useState(true);
  const animationRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const isInViewRef = useRef(isInView);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frequencyRef = useRef<Uint8Array | any>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    isInViewRef.current = isInView;
  }, [isInView]);

  // Pause off-screen canvas via IntersectionObserver to conserve GPU/CPU cycles
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    let signal = 0.42;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mediaQuery.matches;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      if (reduced && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      } else if (!reduced && isInViewRef.current && playingRef.current) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      // If element is scrolled off-screen, do not draw and pause requestAnimationFrame
      if (!isInViewRef.current) {
        animationRef.current = null;
        return;
      }

      const t = playingRef.current ? time * 0.001 : 0;
      const analyser = analyserRef.current;
      const frequencies = frequencyRef.current;

      if (analyser && frequencies) {
        (analyser as any).getByteFrequencyData(frequencies);
        signal = frequencies.reduce((sum: number, value: number) => sum + value, 0) / frequencies.length / 255;
      } else if (playingRef.current) {
        signal = 0.33 + Math.sin(t * 1.9) * 0.1 + Math.sin(t * 5.7 + 1.4) * 0.07 + Math.max(0, Math.sin(t * 2.7 + 3)) * 0.12;
      }

      context.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) / (compact ? 420 : 620);
      const center = compact ? width * (0.34 + (position / 100) * 0.32) : width * 0.5;
      const base = height * 0.76;

      context.save();
      context.translate(center, height * 0.04);
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(23,23,22,.20)';
      context.globalAlpha = 0.75;

      for (let i = 0; i < 8; i += 1) {
        const x = (i - 3.5) * 42 * scale;
        context.beginPath();
        context.moveTo(x, base);
        context.lineTo(x * 0.76, height * 0.2);
        context.stroke();
      }

      for (let row = 0; row < 7; row += 1) {
        const y = base - row * (48 + signal * 10) * scale;
        const half = (115 + row * 12 + signal * 26) * scale;
        context.strokeStyle = row === 3 ? 'rgba(21,87,232,.78)' : 'rgba(23,23,22,.42)';
        context.globalAlpha = row === 3 ? 0.95 : 0.72;
        context.beginPath();
        for (let x = -half; x <= half; x += 5) {
          const nextY = y + Math.sin(x * 0.018 + t * 2.2 + row) * (2 + signal * 15) * scale;
          x === -half ? context.moveTo(x, nextY) : context.lineTo(x, nextY);
        }
        context.stroke();

        if (row < 6) {
          context.strokeStyle = 'rgba(23,23,22,.16)';
          context.beginPath();
          context.moveTo(-half, y);
          context.lineTo(-(half - 13 * scale), y - 48 * scale);
          context.moveTo(half, y);
          context.lineTo(half - 13 * scale, y - 48 * scale);
          context.stroke();
        }
      }

      const pulseY = base - 3.5 * (48 + signal * 10) * scale;
      context.fillStyle = '#1557e8';
      context.globalAlpha = 0.9;
      context.beginPath();
      context.arc(0, pulseY, (3 + signal * 8) * scale, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = 0.13 + signal * 0.12;
      context.beginPath();
      context.ellipse(0, pulseY, (80 + signal * 80) * scale, (20 + signal * 20) * scale, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();

      if (!reduced && playingRef.current && isInViewRef.current) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    draw(performance.now());

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      resizeObserver.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [compact, position, isInView, playing]);

  // Opt-in microphone analysis: off by default
  async function toggleMicrophone() {
    if (signalMode === 'microphone') {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      await audioRef.current?.close();
      streamRef.current = null;
      audioRef.current = null;
      analyserRef.current = null;
      frequencyRef.current = null;
      setSignalMode('simulated');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audio = new AudioCtx();
      const source = audio.createMediaStreamSource(stream);
      const analyser = audio.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      streamRef.current = stream;
      audioRef.current = audio;
      analyserRef.current = analyser;
      frequencyRef.current = new Uint8Array(analyser.frequencyBinCount);
      setSignalMode('microphone');
      setPlaying(true);
    } catch {
      setSignalMode('simulated');
    }
  }

  return (
    <div ref={containerRef} className={`signal-visual ${compact ? 'signal-visual--compact' : ''}`}>
      <canvas ref={canvasRef} aria-label="A waveform-driven architectural section" />
      {!compact && (
        <div className="signal-visual__labels">
          <span>X / resonance</span>
          <span>section / 01—04</span>
        </div>
      )}
      <div className="signal-control">
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-pressed={playing}
          aria-label={playing ? 'Pause motion' : 'Play motion'}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div>
          <strong>{signalMode === 'microphone' ? 'MICROPHONE INPUT' : playing ? 'SIMULATED SIGNAL' : 'MOTION PAUSED'}</strong>
          <span>{signalMode === 'microphone' ? 'listening / live' : 'motion / active'}</span>
        </div>
        {!compact && (
          <button
            suppressHydrationWarning
            className="signal-control__link"
            type="button"
            onClick={toggleMicrophone}
          >
            {signalMode === 'microphone' ? 'stop microphone' : 'use microphone'}
          </button>
        )}
      </div>
    </div>
  );
}
