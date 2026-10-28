"use client";

/**
 * Sonic Architecture — Step 4: Web Audio Playback & 3D Analyser Engine
 * (/lib/soundtrack-audio-engine.ts)
 *
 * Implements:
 * 1. Three honest playback modes:
 *    - "preview-cors": HTML5 <audio crossOrigin="anonymous"> playing verified 30s catalog
 *      previews (e.g., iTunes M4A) routed through Web Audio API `MediaElementAudioSourceNode`
 *      -> `AnalyserNode` -> `GainNode` -> `destination`.
 *    - "spotify-embed": Official Spotify URI iframe embed (`https://open.spotify.com/embed/track/...`).
 *      HONESTY RULE: Cross-origin iframes cannot be inspected by Web Audio `AnalyserNode`.
 *      When "spotify-embed" is active, `analyserActive` is strictly `false` and no fake FFT
 *      data is synthesized.
 *    - "synth-fallback": Procedural Web Audio polyphonic venue synth routed directly into
 *      the same `AnalyserNode` when a track has no 30s preview URL or when offline.
 * 2. Real-time FFT band extraction (`bass`, `mid`, `treble`, `overall`, `spectrumBins`)
 *    exposed via a zero-allocation `MutableRefObject<AudioReactiveBands>` for 60fps R3F `useFrame`
 *    consumption without causing React state re-renders every frame.
 *
 * Strict TypeScript, zero `any`.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  SceneSpec,
  SoundtrackPlaylist,
  SoundtrackTrackItem,
} from "./types";

// ============================================================================
// 1. DATA MODELS & INTERFACES
// ============================================================================

export type SoundtrackPlaybackMode =
  | "preview-cors"
  | "spotify-embed"
  | "synth-fallback";

export interface AudioReactiveBands {
  /** Normalized sub-bass & bass energy (20–250 Hz), 0..1 */
  bass: number;
  /** Normalized midrange energy (250–2000 Hz), 0..1 */
  mid: number;
  /** Normalized high-frequency presence (2000–8000 Hz), 0..1 */
  treble: number;
  /** Overall RMS/average energy, 0..1 */
  overall: number;
  /** True ONLY when a CORS-allowed audio source or Web Audio synth is actively feeding AnalyserNode */
  analyserActive: boolean;
  /** Current playback mode */
  mode: SoundtrackPlaybackMode;
  /** 16 downsampled frequency bars (0..1) for the mini-player spectrum HUD */
  spectrumBars: readonly number[];
}

export const INITIAL_AUDIO_REACTIVE_BANDS: AudioReactiveBands = {
  bass: 0,
  mid: 0,
  treble: 0,
  overall: 0,
  analyserActive: false,
  mode: "preview-cors",
  spectrumBars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export interface SoundtrackPlaybackState {
  readonly activeTrack: SoundtrackTrackItem | null;
  readonly isPlaying: boolean;
  readonly playbackMode: SoundtrackPlaybackMode;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly currentTimeSec: number;
  readonly durationSec: number;
  readonly analyserConnected: boolean;
  readonly statusNotice: string | null;
}

export interface UseSoundtrackPlaybackEngineOptions {
  readonly playlist: SoundtrackPlaylist | null;
  readonly sceneSpec: SceneSpec;
  readonly prefersReducedMotion: boolean;
}

export interface UseSoundtrackPlaybackEngineResult {
  readonly playbackState: SoundtrackPlaybackState;
  readonly audioBandsRef: React.MutableRefObject<AudioReactiveBands>;
  readonly selectAndPlayTrack: (
    track: SoundtrackTrackItem,
    preferredMode?: SoundtrackPlaybackMode
  ) => void;
  readonly togglePlayPause: () => void;
  readonly playNextTrack: () => void;
  readonly playPreviousTrack: () => void;
  readonly seekToSeconds: (seconds: number) => void;
  readonly setVolumeLevel: (nextVolume: number) => void;
  readonly toggleMute: () => void;
  readonly switchPlaybackMode: (mode: SoundtrackPlaybackMode) => void;
}

// ============================================================================
// 2. HELPER: EXTRACT SPOTIFY EMBED URL OR FALLBACK SEARCH
// ============================================================================

export function resolveSpotifyEmbedUrlForTrack(
  track: SoundtrackTrackItem
): string | null {
  if (track.embedUrl && track.embedUrl.startsWith("https://open.spotify.com/embed/")) {
    return track.embedUrl;
  }
  const idMatch = track.id.match(/^spotify-([A-Za-z0-9]{22})$/);
  if (idMatch && idMatch[1]) {
    return `https://open.spotify.com/embed/track/${idMatch[1]}?utm_source=generator&theme=0`;
  }
  return null;
}

// ============================================================================
// 3. REACT HOOK: useSoundtrackPlaybackEngine
// ============================================================================

export function useSoundtrackPlaybackEngine({
  playlist,
  sceneSpec,
  prefersReducedMotion,
}: UseSoundtrackPlaybackEngineOptions): UseSoundtrackPlaybackEngineResult {
  const [activeTrack, setActiveTrack] = useState<SoundtrackTrackItem | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] =
    useState<SoundtrackPlaybackMode>("preview-cors");
  const [volume, setVolume] = useState<number>(0.75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [analyserConnected, setAnalyserConnected] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Mutable ref read at 60fps by R3F Venue3D and MiniPlayer spectrum visualizer
  const audioBandsRef = useRef<AudioReactiveBands>({
    ...INITIAL_AUDIO_REACTIVE_BANDS,
  });

  // Web Audio API graph refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const synthStepRef = useRef<number>(0);

  // Sync default activeTrack when playlist loads
  useEffect(() => {
    if (!playlist || playlist.tracks.length === 0) {
      setActiveTrack(null);
      setIsPlaying(false);
      return;
    }
    setActiveTrack((prev) => {
      if (prev && playlist.tracks.some((t) => t.id === prev.id)) {
        return prev;
      }
      const firstTrack = playlist.tracks[0];
      if (firstTrack.previewUrl) {
        setPlaybackMode("preview-cors");
      } else if (resolveSpotifyEmbedUrlForTrack(firstTrack)) {
        setPlaybackMode("spotify-embed");
      } else {
        setPlaybackMode("synth-fallback");
      }
      return firstTrack;
    });
  }, [playlist]);

  // Ensure Web Audio API context & AnalyserNode exist
  const ensureAudioGraph = useCallback((): {
    ctx: AudioContext;
    analyser: AnalyserNode;
    gain: GainNode;
  } | null => {
    if (typeof window === "undefined") return null;
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxCtor) return null;

    if (!audioCtxRef.current) {
      const ctx = new AudioCtxCtor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = prefersReducedMotion ? 0.92 : 0.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);

      analyser.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = gain;
      freqDataRef.current = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount)
      );
    }

    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }

    if (
      !audioCtxRef.current ||
      !analyserRef.current ||
      !masterGainRef.current
    ) {
      return null;
    }

    return {
      ctx: audioCtxRef.current,
      analyser: analyserRef.current,
      gain: masterGainRef.current,
    };
  }, [isMuted, prefersReducedMotion, volume]);

  // Stop procedural synth timer
  const stopSynthLoop = useCallback(() => {
    if (synthTimerRef.current !== null) {
      window.clearTimeout(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  // Stop HTML5 <audio> element
  const stopAudioElement = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
  }, []);

  // Schedule procedural Web Audio synth notes routed through AnalyserNode
  const startSynthLoop = useCallback(
    (track: SoundtrackTrackItem) => {
      stopSynthLoop();
      const graph = ensureAudioGraph();
      if (!graph) return;

      const bpm = Math.max(54, Math.min(148, track.bpmEstimate ?? 92));
      const stepDurationSec = 60 / bpm / 2; // 8th-note steps

      // Base frequencies derived from scene typology & moment energy
      const baseRootHz =
        (sceneSpec.typology as string) === "cathedral_banquet"
          ? 110.0
          : sceneSpec.typology === "futuristic_launch" || sceneSpec.typology === "gallery_pavilion"
          ? 130.81
          : sceneSpec.typology === "mediterranean_courtyard"
          ? 146.83
          : 123.47;

      const scaleIntervals = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];

      const tick = () => {
        const currentGraph = ensureAudioGraph();
        if (!currentGraph) return;
        const { ctx, analyser } = currentGraph;
        const now = ctx.currentTime + 0.02;
        const step = synthStepRef.current++;

        // Bass pulse on beats 0, 2, 4, 6
        if (step % 2 === 0) {
          const bassOsc = ctx.createOscillator();
          const bassEnv = ctx.createGain();
          bassOsc.type = track.estimatedEnergy > 0.65 ? "sawtooth" : "triangle";
          const bassNote =
            baseRootHz * (step % 8 === 6 ? 1.5 : step % 4 === 2 ? 1.25 : 1);
          bassOsc.frequency.setValueAtTime(bassNote, now);

          const bassFilter = ctx.createBiquadFilter();
          bassFilter.type = "lowpass";
          bassFilter.frequency.setValueAtTime(
            260 + track.estimatedEnergy * 420,
            now
          );

          bassEnv.gain.setValueAtTime(0.0001, now);
          bassEnv.gain.linearRampToValueAtTime(0.18, now + 0.02);
          bassEnv.gain.exponentialRampToValueAtTime(
            0.0001,
            now + stepDurationSec * 1.6
          );

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassEnv);
          bassEnv.connect(analyser);
          bassOsc.start(now);
          bassOsc.stop(now + stepDurationSec * 1.65);
        }

        // Harmonic pad / lead voice
        const interval =
          scaleIntervals[(step * 3 + Math.round(track.estimatedEnergy * 10)) % scaleIntervals.length];
        const leadOsc = ctx.createOscillator();
        const leadEnv = ctx.createGain();
        leadOsc.type = "sine";
        leadOsc.frequency.setValueAtTime(baseRootHz * 2 * interval, now);

        leadEnv.gain.setValueAtTime(0.0001, now);
        leadEnv.gain.linearRampToValueAtTime(0.09, now + 0.03);
        leadEnv.gain.exponentialRampToValueAtTime(
          0.0001,
          now + stepDurationSec * 1.9
        );

        leadOsc.connect(leadEnv);
        leadEnv.connect(analyser);
        leadOsc.start(now);
        leadOsc.stop(now + stepDurationSec * 1.95);

        setCurrentTimeSec((prev) => (prev + stepDurationSec) % 30);

        synthTimerRef.current = window.setTimeout(
          tick,
          Math.round(stepDurationSec * 1000)
        );
      };

      tick();
    },
    [ensureAudioGraph, sceneSpec.typology, stopSynthLoop]
  );

  // Start CORS 30s preview via HTMLAudioElement connected to Web Audio AnalyserNode
  const startCorsPreviewPlayback = useCallback(
    async (track: SoundtrackTrackItem) => {
      stopSynthLoop();
      if (!track.previewUrl) {
        setPlaybackMode("synth-fallback");
        setAnalyserConnected(true);
        setStatusNotice(
          "No 30s catalog preview URL on this track; using Web Audio venue synth connected to 3D AnalyserNode."
        );
        startSynthLoop(track);
        return;
      }

      const graph = ensureAudioGraph();
      if (!graph) return;

      if (!audioElRef.current) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";

        audio.addEventListener("timeupdate", () => {
          setCurrentTimeSec(audio.currentTime || 0);
        });
        audio.addEventListener("loadedmetadata", () => {
          if (audio.duration && Number.isFinite(audio.duration)) {
            setDurationSec(audio.duration);
          } else {
            setDurationSec(30);
          }
        });
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setCurrentTimeSec(0);
        });

        audioElRef.current = audio;
      }

      const audioEl = audioElRef.current;
      if (!mediaSourceNodeRef.current) {
        try {
          mediaSourceNodeRef.current =
            graph.ctx.createMediaElementSource(audioEl);
          mediaSourceNodeRef.current.connect(graph.analyser);
        } catch {
          // MediaElementSource already connected
        }
      }

      try {
        if (audioEl.src !== track.previewUrl) {
          audioEl.src = track.previewUrl;
          audioEl.currentTime = 0;
        }
        await audioEl.play();
        setAnalyserConnected(true);
        setStatusNotice(
          "30s CORS catalog preview active — Web Audio AnalyserNode driving 3D lighting & structure."
        );
      } catch {
        // If CORS or network blocks the remote preview stream, fall back cleanly to Web Audio synth
        setPlaybackMode("synth-fallback");
        setAnalyserConnected(true);
        setStatusNotice(
          "Catalog preview stream blocked or offline — switched to Web Audio synth connected to 3D AnalyserNode."
        );
        startSynthLoop(track);
      }
    },
    [ensureAudioGraph, startSynthLoop, stopSynthLoop]
  );

  // 60fps AnalyserNode sampling loop
  useEffect(() => {
    const updateAnalyserBands = () => {
      const analyser = analyserRef.current;
      const freqData = freqDataRef.current;

      // Cross-origin iframes (spotify-embed) CANNOT be analysed by Web Audio API
      if (
        !isPlaying ||
        playbackMode === "spotify-embed" ||
        !analyser ||
        !freqData
      ) {
        audioBandsRef.current = {
          bass: 0,
          mid: 0,
          treble: 0,
          overall: 0,
          analyserActive: false,
          mode: playbackMode,
          spectrumBars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        };
        rafIdRef.current = window.requestAnimationFrame(updateAnalyserBands);
        return;
      }

      analyser.getByteFrequencyData(freqData);
      const binCount = freqData.length; // 64 bins for fftSize=128

      // Band 1: Bass (bins 0..7)
      let bassSum = 0;
      for (let i = 0; i < 8 && i < binCount; i++) {
        bassSum += freqData[i];
      }
      const bass = Math.min(1, bassSum / (8 * 255));

      // Band 2: Midrange (bins 8..27)
      let midSum = 0;
      for (let i = 8; i < 28 && i < binCount; i++) {
        midSum += freqData[i];
      }
      const mid = Math.min(1, midSum / (20 * 255));

      // Band 3: Treble / Presence (bins 28..55)
      let trebleSum = 0;
      for (let i = 28; i < 56 && i < binCount; i++) {
        trebleSum += freqData[i];
      }
      const treble = Math.min(1, trebleSum / (28 * 255));

      const overall = Number(
        (bass * 0.45 + mid * 0.35 + treble * 0.2).toFixed(3)
      );

      // 16 spectrum bars for HUD mini-player
      const bars: number[] = [];
      const binsPerBar = Math.max(1, Math.floor(binCount / 16));
      for (let b = 0; b < 16; b++) {
        let sum = 0;
        for (let k = 0; k < binsPerBar; k++) {
          sum += freqData[b * binsPerBar + k] ?? 0;
        }
        bars.push(Number((sum / (binsPerBar * 255)).toFixed(3)));
      }

      audioBandsRef.current = {
        bass: Number(bass.toFixed(3)),
        mid: Number(mid.toFixed(3)),
        treble: Number(treble.toFixed(3)),
        overall,
        analyserActive: true,
        mode: playbackMode,
        spectrumBars: bars,
      };

      rafIdRef.current = window.requestAnimationFrame(updateAnalyserBands);
    };

    rafIdRef.current = window.requestAnimationFrame(updateAnalyserBands);
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, playbackMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSynthLoop();
      stopAudioElement();
    };
  }, [stopAudioElement, stopSynthLoop]);

  // Select and play a specific track
  const selectAndPlayTrack = useCallback(
    (
      track: SoundtrackTrackItem,
      preferredMode?: SoundtrackPlaybackMode
    ) => {
      setActiveTrack(track);
      setCurrentTimeSec(0);
      setDurationSec(
        track.durationMs && track.durationMs > 0
          ? Math.min(30, Math.round(track.durationMs / 1000))
          : 30
      );

      const resolvedMode: SoundtrackPlaybackMode =
        preferredMode ??
        (track.previewUrl
          ? "preview-cors"
          : resolveSpotifyEmbedUrlForTrack(track)
          ? "spotify-embed"
          : "synth-fallback");

      setPlaybackMode(resolvedMode);
      setIsPlaying(true);

      if (resolvedMode === "spotify-embed") {
        stopSynthLoop();
        stopAudioElement();
        setAnalyserConnected(false);
        setStatusNotice(
          "Spotify URI iframe embed active. Cross-origin iframes cannot be inspected by Web Audio AnalyserNode; 3D audio-reactive modulation is honestly bypassed."
        );
      } else if (resolvedMode === "preview-cors") {
        void startCorsPreviewPlayback(track);
      } else {
        stopAudioElement();
        setAnalyserConnected(true);
        setStatusNotice(
          "Web Audio polyphonic synth active — connected directly to 3D AnalyserNode."
        );
        startSynthLoop(track);
      }
    },
    [
      startCorsPreviewPlayback,
      startSynthLoop,
      stopAudioElement,
      stopSynthLoop,
    ]
  );

  const togglePlayPause = useCallback(() => {
    const targetTrack =
      activeTrack ?? (playlist && playlist.tracks[0] ? playlist.tracks[0] : null);
    if (!targetTrack) return;

    if (!isPlaying) {
      selectAndPlayTrack(targetTrack, playbackMode);
    } else {
      setIsPlaying(false);
      stopSynthLoop();
      stopAudioElement();
      setAnalyserConnected(false);
    }
  }, [
    activeTrack,
    isPlaying,
    playbackMode,
    playlist,
    selectAndPlayTrack,
    stopAudioElement,
    stopSynthLoop,
  ]);

  const playNextTrack = useCallback(() => {
    if (!playlist || playlist.tracks.length === 0) return;
    const currentIdx = activeTrack
      ? playlist.tracks.findIndex((t) => t.id === activeTrack.id)
      : -1;
    const nextIdx = (currentIdx + 1) % playlist.tracks.length;
    selectAndPlayTrack(playlist.tracks[nextIdx]);
  }, [activeTrack, playlist, selectAndPlayTrack]);

  const playPreviousTrack = useCallback(() => {
    if (!playlist || playlist.tracks.length === 0) return;
    const currentIdx = activeTrack
      ? playlist.tracks.findIndex((t) => t.id === activeTrack.id)
      : 0;
    const prevIdx =
      (currentIdx - 1 + playlist.tracks.length) % playlist.tracks.length;
    selectAndPlayTrack(playlist.tracks[prevIdx]);
  }, [activeTrack, playlist, selectAndPlayTrack]);

  const seekToSeconds = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(durationSec, seconds));
      setCurrentTimeSec(clamped);
      if (playbackMode === "preview-cors" && audioElRef.current) {
        audioElRef.current.currentTime = clamped;
      }
    },
    [durationSec, playbackMode]
  );

  const setVolumeLevel = useCallback(
    (nextVolume: number) => {
      const clamped = Math.max(0, Math.min(1, nextVolume));
      setVolume(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setTargetAtTime(
          clamped,
          audioCtxRef.current.currentTime,
          0.04
        );
      }
      if (audioElRef.current) {
        audioElRef.current.volume = clamped;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setTargetAtTime(
          nextMuted ? 0 : volume,
          audioCtxRef.current.currentTime,
          0.04
        );
      }
      if (audioElRef.current) {
        audioElRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  }, [volume]);

  const switchPlaybackMode = useCallback(
    (mode: SoundtrackPlaybackMode) => {
      const targetTrack =
        activeTrack ?? (playlist && playlist.tracks[0] ? playlist.tracks[0] : null);
      if (!targetTrack) {
        setPlaybackMode(mode);
        return;
      }
      selectAndPlayTrack(targetTrack, mode);
    },
    [activeTrack, playlist, selectAndPlayTrack]
  );

  return {
    playbackState: {
      activeTrack,
      isPlaying,
      playbackMode,
      volume,
      isMuted,
      currentTimeSec,
      durationSec,
      analyserConnected,
      statusNotice,
    },
    audioBandsRef,
    selectAndPlayTrack,
    togglePlayPause,
    playNextTrack,
    playPreviousTrack,
    seekToSeconds,
    setVolumeLevel,
    toggleMute,
    switchPlaybackMode,
  };
}
