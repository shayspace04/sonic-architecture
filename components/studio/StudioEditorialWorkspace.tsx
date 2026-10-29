'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type {
  DiffCategory,
  ProcurementLineItem,
  ProjectBudgetConfig,
  SceneComparison,
  SceneSpec,
  SoundtrackPlaylist,
  TimeOfDay,
  VibePayload,
} from '@/lib/types';

export type CameraPresetKey = 'overview' | 'interior' | 'focal' | 'plan';
export type StudioTabKey = 'scene' | 'why-qloo' | 'playlist' | 'brief' | 'sourcing';
export type SceneViewMode = 'grounded' | 'baseline' | 'split';

import { generateSceneFromPrompt } from '@/lib/scene-spec';
import { deriveMusicProfile } from '@/lib/music-profile';
import { buildLabeledFallbackPlaylist } from '@/lib/soundtrack-pipeline';
import { buildHonestTrackSearchLinks, generateMarkdownDesignBrief } from '@/lib/brief';
import { generateSceneComparison } from '@/lib/compare/sceneGenerator';
import { WhatQlooChangedList } from '@/components/compare/WhatQlooChangedList';
import { CompareSplitViewer } from '@/components/compare/CompareSplitViewer';
import ProcurementWorkspacePanel from '@/components/ui/ProcurementWorkspacePanel';
import {
  calculateProcurementSummary,
  createDefaultBudgetConfig,
  exportProcurementBriefMarkdown,
  formatCurrency,
} from '@/lib/procurement';
import type { Venue3DProps } from '@/components/three/Venue3D';
import { STARTER_PROMPTS } from '@/components/landing/PromptComposer';

// Lazy-load the real Three.js 3D viewer without SSR
const DynamicVenue3D = dynamic<Venue3DProps>(
  () => import('@/components/three/Venue3D').then((mod) => mod.Venue3D || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b0b0e] text-[#aaa9a2] font-mono text-xs uppercase tracking-widest gap-3">
        <div className="w-6 h-6 rounded-full border border-[var(--blue)] border-t-transparent animate-spin" />
        <span>Initializing 3D Viewport...</span>
      </div>
    ),
  }
);

interface QlooHealthState {
  ok: boolean;
  status: number;
  latencyMs: number;
  source: 'live' | 'cache' | 'partly_sample' | 'sample' | 'fixture' | 'fallback';
}

function StudioEditorialWorkspaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryPrompt = searchParams.get('prompt') || STARTER_PROMPTS[0];

  const [currentPrompt, setCurrentPrompt] = useState(queryPrompt);
  const [inputPrompt, setInputPrompt] = useState(queryPrompt);
  const [scene, setScene] = useState<SceneSpec | null>(null);
  const [comparison, setComparison] = useState<SceneComparison | null>(null);
  const [sceneSource, setSceneSource] = useState<'live' | 'cache' | 'partly_sample' | 'sample' | 'fixture' | 'fallback'>('sample');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTabKey>('scene');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('overview');
  const [daylightMode, setDaylightMode] = useState<TimeOfDay>('afternoon');
  const [sceneViewMode, setSceneViewMode] = useState<SceneViewMode>('grounded');
  const [stageViewMode, setStageViewMode] = useState<'viewport' | 'procurement'>('viewport');
  const [health, setHealth] = useState<QlooHealthState | null>(null);
  const [isPlayingSoundtrack, setIsPlayingSoundtrack] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [traceSteps, setTraceSteps] = useState<Array<{ endpoint: string; count: number; latencyMs: number; status: number }>>([]);

  // Procurement & Sourcing State
  const [budgetConfig, setBudgetConfig] = useState<ProjectBudgetConfig>(() => createDefaultBudgetConfig());
  const [procurementList, setProcurementList] = useState<ProcurementLineItem[]>([]);

  // Track Audio Preview Player State
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  const handleToggleTrackPreview = useCallback((previewUrl: string) => {
    if (activePreviewUrl === previewUrl) {
      previewAudioRef.current?.pause();
      setActivePreviewUrl(null);
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.onended = () => setActivePreviewUrl(null);
    }
    previewAudioRef.current.src = previewUrl;
    previewAudioRef.current.play().catch(() => setActivePreviewUrl(null));
    setActivePreviewUrl(previewUrl);
  }, [activePreviewUrl]);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
    };
  }, []);

  const handleDownloadBOQ = useCallback(() => {
    if (!scene) return;
    const summary = calculateProcurementSummary(procurementList, budgetConfig);
    const md = exportProcurementBriefMarkdown(summary, scene);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonic-architecture-boq-${scene.id ?? 'project'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scene, procurementList, budgetConfig]);

  // Sync state if URL prompt changes
  useEffect(() => {
    if (queryPrompt && queryPrompt !== currentPrompt) {
      setCurrentPrompt(queryPrompt);
      setInputPrompt(queryPrompt);
    }
  }, [queryPrompt]);

  // Query live Qloo health check endpoint
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/qloo-health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ ok: false, status: res.status, latencyMs: 0, source: 'fallback' });
      }
    } catch {
      setHealth({ ok: false, status: 500, latencyMs: 0, source: 'fallback' });
    }
  }, []);

  useEffect(() => {
    checkHealth();

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
            checkHealth();
          }
        }, 45000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHealth]);

  // Synthesize scene using the real /api/vibe route with live streaming trace steps
  const synthesize = useCallback(async (promptText: string) => {
    setIsGenerating(true);
    setTraceSteps([]);
    try {
      const res = await fetch('/api/vibe?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, seed: 42 }),
      });

      if (res.ok && res.body && res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedResult = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const block of parts) {
            const lines = block.split('\n');
            let event = '';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) event = line.slice(7).trim();
              if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
            }

            if (event === 'trace' && dataStr) {
              try {
                const step = JSON.parse(dataStr);
                setTraceSteps((prev) => [...prev, step]);
              } catch {}
            } else if (event === 'complete' && dataStr) {
              try {
                const data = JSON.parse(dataStr);
                if (data.scene) {
                  setScene(data.scene);
                  setSceneSource(data.source || (data.scene.qloo_evidence ? 'live' : 'sample'));
                  if (data.comparison) {
                    setComparison(data.comparison);
                  } else {
                    setComparison(generateSceneComparison({ prompt: promptText, seed: 42 }));
                  }
                  receivedResult = true;
                }
              } catch {}
            }
          }
        }
        if (receivedResult) return;
      }

      // If streaming wasn't available, standard JSON fallback
      const jsonRes = await fetch('/api/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, seed: 42 }),
      });

      if (jsonRes.ok) {
        const data = await jsonRes.json();
        if (data.scene) {
          setScene(data.scene);
          setSceneSource(data.source || (data.scene.qloo_evidence ? 'live' : 'sample'));
          if (data.comparison) {
            setComparison(data.comparison);
          } else {
            setComparison(generateSceneComparison({ prompt: promptText, seed: 42 }));
          }
          return;
        }
      }

      // Local fallback generator
      const comp = generateSceneComparison({ prompt: promptText, seed: 42 });
      setScene(comp.grounded);
      setComparison(comp);
      setSceneSource(comp.isSampleFixture ? 'sample' : 'fallback');
    } catch {
      const comp = generateSceneComparison({ prompt: promptText, seed: 42 });
      setScene(comp.grounded);
      setComparison(comp);
      setSceneSource('fallback');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    synthesize(currentPrompt);
  }, [currentPrompt, synthesize]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    setCurrentPrompt(inputPrompt.trim());
    router.replace(`/studio?prompt=${encodeURIComponent(inputPrompt.trim())}`);
  };

  const handleSelectStarter = (starter: string) => {
    setInputPrompt(starter);
    setCurrentPrompt(starter);
    router.replace(`/studio?prompt=${encodeURIComponent(starter)}`);
  };

  const handleDownloadBrief = () => {
    if (!scene) return;
    const briefMarkdown = generateMarkdownDesignBrief(scene);
    const blob = new Blob([briefMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonic-architecture-brief-${currentPrompt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Derive playlist from scene
  const playlist: SoundtrackPlaylist = useMemo(() => {
    if (scene?.soundtrack) return scene.soundtrack;
    const activeScene = scene || generateSceneFromPrompt(currentPrompt);
    return buildLabeledFallbackPlaylist(activeScene);
  }, [scene, currentPrompt]);

  // Derived "Because" rationale sentences from Qloo evidence
  const becauseSentences = useMemo(() => {
    if (!scene) return [];
    if (Array.isArray(scene.becauseSentences) && scene.becauseSentences.length > 0) {
      return scene.becauseSentences.map((s: any) => (typeof s === 'string' ? s : s.sentence));
    }
    const sentences: string[] = [];

    const wallName = scene.materials?.wall?.name || 'Raw Concrete';
    const rt60 = scene.acousticTarget?.targetRT60Seconds ?? 0.85;
    const height = scene.roomDimensions?.height ?? 3.4;
    const width = scene.roomDimensions?.width ?? 14;
    const depth = scene.roomDimensions?.depth ?? 10;
    const alpha = scene.acousticTarget?.averageAbsorptionAlpha ?? 0.35;

    if (scene.qloo_evidence?.resolved_entities?.length) {
      const topEntity = scene.qloo_evidence.resolved_entities[0];
      sentences.push(
        `Fans of ${topEntity.entity_name} show cross-domain cultural affinity for intimate spaces, shaping this room's ${wallName} envelope and ${rt60}s reverberation.`
      );
    } else {
      sentences.push(
        `Cultural taste signals in "${currentPrompt}" modulated the architectural envelope, acoustic RT60 (${rt60}s), and material library.`
      );
    }

    if (scene.materials?.wall) {
      sentences.push(
        `Wall surface is mapped to ${wallName} with sound absorption coefficient α = ${alpha}.`
      );
    }

    if (scene.roomDimensions) {
      sentences.push(
        `Spatial massing establishes an intimate ${height}m ceiling height with ${width}m × ${depth}m proportions.`
      );
    }

    return sentences;
  }, [scene, currentPrompt]);

  return (
    <main className={`studio-workspace ${sidebarOpen ? '' : 'studio-workspace--sidebar-closed'}`}>
      {/* Studio Sidebar */}
      <aside className="studio-sidebar" aria-label="Studio workbench sidebar">
        <div className="studio-sidebar__top">
          <Link className="wordmark" href="/">
            <span className="wordmark-mark" aria-hidden="true" />
            SONIC / ARCHITECTURE
          </Link>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close studio sidebar"
          >
            ×
          </button>
        </div>

        <div className="studio-sidebar__prompt">
          <div className="eyebrow">Current world</div>
          <h1>{currentPrompt}</h1>

          <form onSubmit={handlePromptSubmit} className="prompt-form" style={{ marginTop: '12px' }}>
            <label htmlFor="studio-prompt-input" className="sr-only">
              Prompt
            </label>
            <textarea
              id="studio-prompt-input"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Describe what you love..."
              rows={2}
            />
            <button
              suppressHydrationWarning
              type="submit"
              disabled={isGenerating || !inputPrompt.trim()}
              className="signal-button"
            >
              <span>{isGenerating ? 'Synthesizing...' : 'Update World'}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </form>

          <div className="prompt-examples" style={{ marginTop: '10px' }}>
            <span className="prompt-examples__label">Starters</span>
            {STARTER_PROMPTS.map((starter) => (
              <button
                suppressHydrationWarning
                key={starter}
                type="button"
                onClick={() => handleSelectStarter(starter)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {starter}
              </button>
            ))}
          </div>

          {isGenerating && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'var(--paper-deep)', border: '1px solid var(--line)', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '6px' }}>
                <span className="live-indicator__dot" />
                <span>Live Qloo Trace Stream</span>
              </div>
              {traceSteps.length === 0 ? (
                <div style={{ color: 'var(--ink-muted)' }}>Querying Qloo taste graph (parallel budget &lt;10s)...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {traceSteps.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{s.endpoint}</span>
                      <span>{s.latencyMs}ms ({s.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workbench 5 Tabs */}
        <div className="studio-sidebar__nav" role="tablist" aria-label="Studio tools">
          <span className="eyebrow">Studio Tools / 01—05</span>
          <button
            suppressHydrationWarning
            type="button"
            role="tab"
            aria-selected={activeTab === 'scene'}
            className={activeTab === 'scene' ? 'active' : ''}
            onClick={() => setActiveTab('scene')}
          >
            <span>01</span>
            <strong>Scene</strong>
            <small>Camera, lighting & acoustics</small>
          </button>

          <button
            suppressHydrationWarning
            type="button"
            role="tab"
            aria-selected={activeTab === 'why-qloo'}
            className={activeTab === 'why-qloo' ? 'active' : ''}
            onClick={() => setActiveTab('why-qloo')}
          >
            <span>02</span>
            <strong>Why Qloo</strong>
            <small>Evidence & comparison</small>
          </button>

          <button
            suppressHydrationWarning
            type="button"
            role="tab"
            aria-selected={activeTab === 'playlist'}
            className={activeTab === 'playlist' ? 'active' : ''}
            onClick={() => setActiveTab('playlist')}
          >
            <span>03</span>
            <strong>Playlist</strong>
            <small>Generative soundtrack</small>
          </button>

          <button
            suppressHydrationWarning
            type="button"
            role="tab"
            aria-selected={activeTab === 'brief'}
            className={activeTab === 'brief' ? 'active' : ''}
            onClick={() => setActiveTab('brief')}
          >
            <span>04</span>
            <strong>Export brief</strong>
            <small>Architectural documentation</small>
          </button>

          <button
            suppressHydrationWarning
            type="button"
            role="tab"
            aria-selected={activeTab === 'sourcing'}
            className={activeTab === 'sourcing' ? 'active' : ''}
            onClick={() => {
              setActiveTab('sourcing');
              setStageViewMode('procurement');
            }}
          >
            <span>05</span>
            <strong>Pricing & Sourcing</strong>
            <small>Procurement & shopping list</small>
          </button>
        </div>

        {/* Tab Detail Panels */}
        <div className="studio-sidebar__detail">
          {activeTab === 'scene' && (
            <div>
              <span className="eyebrow">Camera & Environment</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', margin: '12px 0' }}>
                {(['overview', 'interior', 'focal', 'plan'] as CameraPresetKey[]).map((preset) => (
                  <button
                    suppressHydrationWarning
                    key={preset}
                    type="button"
                    onClick={() => setCameraPreset(preset)}
                    style={{
                      padding: '6px 4px',
                      border: '1px solid var(--line)',
                      background: cameraPreset === preset ? 'var(--ink)' : 'transparent',
                      color: cameraPreset === preset ? 'var(--paper)' : 'inherit',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <span className="eyebrow" style={{ marginTop: '14px', display: 'block' }}>
                Daylight Field
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', margin: '10px 0' }}>
                {(['morning', 'afternoon', 'sunset', 'midnight'] as TimeOfDay[]).map((mode) => (
                  <button
                    suppressHydrationWarning
                    key={mode}
                    type="button"
                    onClick={() => setDaylightMode(mode)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      border: '1px solid var(--line)',
                      background: daylightMode === mode ? 'var(--blue)' : 'transparent',
                      color: daylightMode === mode ? '#fff' : 'inherit',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '16px', fontSize: '12px', lineHeight: '1.6' }}>
                <div>
                  <strong>RT60 Reverberation:</strong> {scene?.acousticTarget?.targetRT60Seconds ?? 0.85}s
                </div>
                <div>
                  <strong>Ceiling Height:</strong> {scene?.roomDimensions?.height ?? 3.4}m
                </div>
                <div>
                  <strong>Dimensions:</strong> {scene?.roomDimensions?.width ?? 14}m × {scene?.roomDimensions?.depth ?? 10}m
                </div>
                <div>
                  <strong>Wall Material:</strong> {scene?.materials?.wall?.name ?? 'Raw Concrete'}
                </div>
                <div>
                  <strong>Floor Material:</strong> {scene?.materials?.floor?.name ?? 'Dark Timber'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'why-qloo' && (
            <div>
              <span className="eyebrow">Provenance & Grounding</span>
              <div style={{ margin: '10px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {sceneSource === 'live' && (
                  <span className="provenance-badge provenance-badge--qloo">● Qloo Live Evidence</span>
                )}
                {sceneSource === 'cache' && (
                  <span className="provenance-badge provenance-badge--qloo">○ Cached Evidence</span>
                )}
                {sceneSource === 'partly_sample' && (
                  <span className="provenance-badge provenance-badge--sample">◌ Partly Sample Data</span>
                )}
                {(sceneSource === 'sample' || sceneSource === 'fixture') && (
                  <span className="provenance-badge provenance-badge--sample">◌ Sample Data Fixture</span>
                )}
                {sceneSource === 'fallback' && (
                  <span className="provenance-badge provenance-badge--fallback">● Fallback Mode</span>
                )}
                <span className="provenance-badge provenance-badge--inferred">● Agent Inferred</span>
              </div>

              {scene?.palette?.isFallback && (
                <div style={{ margin: '8px 0', padding: '6px 10px', background: 'rgba(217, 83, 79, 0.1)', border: '1px solid rgba(217, 83, 79, 0.3)', borderRadius: '2px', fontSize: '11px', color: '#b94a48' }}>
                  no Qloo-derived palette for this reference
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <span className="eyebrow">Design Decisions</span>
                <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px', lineHeight: '1.6' }}>
                  {becauseSentences.map((sentence, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      {sentence}
                    </li>
                  ))}
                </ul>
              </div>

              {comparison && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setSceneViewMode(sceneViewMode === 'split' ? 'grounded' : 'split')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--line)',
                      background: sceneViewMode === 'split' ? 'var(--blue)' : 'var(--paper)',
                      color: sceneViewMode === 'split' ? '#fff' : 'inherit',
                      fontSize: '11px',
                      fontFamily: 'var(--mono)',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {sceneViewMode === 'split' ? 'Close Split Comparison' : 'Inspect Baseline vs Grounded'}
                  </button>

                  <div style={{ marginTop: '10px' }}>
                    <WhatQlooChangedList comparison={comparison} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'playlist' && (
            <div>
              <span className="eyebrow">Spatial Soundtrack & Listening Links</span>
              <div style={{ margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {playlist.tracks.map((track, idx) => {
                  const links = buildHonestTrackSearchLinks(
                    track.artist,
                    track.title,
                    track.externalSearchUrl,
                    track.storeUrl
                  );
                  const isTrackActive = activePreviewUrl === track.previewUrl;

                  return (
                    <div
                      key={track.id || idx}
                      style={{
                        padding: '10px',
                        border: '1px solid var(--line-subtle)',
                        background: 'var(--paper)',
                        borderRadius: '2px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{track.title}</div>
                        {track.previewUrl && (
                          <button
                            suppressHydrationWarning
                            type="button"
                            onClick={() => handleToggleTrackPreview(track.previewUrl!)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '10px',
                              fontFamily: 'var(--mono)',
                              background: isTrackActive ? 'var(--blue)' : 'var(--paper-deep)',
                              color: isTrackActive ? '#fff' : 'var(--ink)',
                              border: '1px solid var(--line)',
                              borderRadius: '2px',
                              cursor: 'pointer',
                            }}
                            title="Play 30-second audio preview"
                          >
                            {isTrackActive ? '⏸ Pause' : '▶ Preview'}
                          </button>
                        )}
                      </div>

                      <div style={{ color: 'var(--quiet)', fontSize: '11px', marginTop: '3px' }}>
                        {track.artist} {track.bpmEstimate ? `· ${track.bpmEstimate} BPM` : ''} · {track.moment}
                      </div>

                      {/* External Listening Links */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {links.verifiedCatalogUrl && (
                          <a
                            href={links.verifiedCatalogUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--mono)',
                              padding: '2px 6px',
                              background: 'rgba(21, 87, 232, 0.08)',
                              color: 'var(--blue)',
                              border: '1px solid rgba(21, 87, 232, 0.25)',
                              borderRadius: '2px',
                              textDecoration: 'none',
                            }}
                            title="Open verified store record"
                          >
                            Catalog ↗
                          </a>
                        )}
                        <a
                          href={links.primarySearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--mono)',
                            padding: '2px 6px',
                            background: 'var(--paper-deep)',
                            color: 'var(--ink)',
                            border: '1px solid var(--line)',
                            borderRadius: '2px',
                            textDecoration: 'none',
                          }}
                          title={`Search "${track.artist} ${track.title}" on Spotify`}
                        >
                          Spotify ↗
                        </a>
                        <a
                          href={links.appleMusicSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--mono)',
                            padding: '2px 6px',
                            background: 'var(--paper-deep)',
                            color: 'var(--ink)',
                            border: '1px solid var(--line)',
                            borderRadius: '2px',
                            textDecoration: 'none',
                          }}
                          title={`Search "${track.artist} ${track.title}" on Apple Music`}
                        >
                          Apple ↗
                        </a>
                        <a
                          href={links.youtubeMusicSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--mono)',
                            padding: '2px 6px',
                            background: 'var(--paper-deep)',
                            color: 'var(--ink)',
                            border: '1px solid var(--line)',
                            borderRadius: '2px',
                            textDecoration: 'none',
                          }}
                          title={`Search "${track.artist} ${track.title}" on YouTube Music`}
                        >
                          YouTube ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'brief' && (
            <div>
              <span className="eyebrow">Architectural Brief</span>
              <p style={{ fontSize: '12px', lineHeight: '1.6', margin: '10px 0' }}>
                Export a full architectural specification document containing room geometry, acoustic parameters, material schedule, lighting plan, and generative soundtrack curation.
              </p>
              <button
                suppressHydrationWarning
                type="button"
                onClick={handleDownloadBrief}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--ink)',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                Download Design Brief (.md) ↗
              </button>
            </div>
          )}

          {activeTab === 'sourcing' && (
            <div>
              <span className="eyebrow">Pricing & Sourcing (BOQ)</span>
              <p style={{ fontSize: '12px', lineHeight: '1.6', margin: '8px 0' }}>
                Object-level purchase, rental, and custom-fabrication options with vendor catalog matching and bill-of-quantities budget rollup.
              </p>

              {/* Currency & Location selectors */}
              <div style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
                <select
                  value={budgetConfig.currency}
                  onChange={(e) => setBudgetConfig({ ...budgetConfig, currency: e.target.value as any })}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
                <input
                  type="text"
                  value={budgetConfig.location}
                  onChange={(e) => setBudgetConfig({ ...budgetConfig, location: e.target.value })}
                  placeholder="Location..."
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                  }}
                />
              </div>

              {/* Summary Stats */}
              <div style={{ padding: '10px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '11px', fontFamily: 'var(--mono)', margin: '10px 0' }}>
                <div>BOQ Items: {procurementList.length}</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>
                  Est. Total: {formatCurrency(
                    procurementList.reduce((acc, item) => acc + (item.lineTotalInCurrency || 0), 0),
                    budgetConfig.currency
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--quiet)', marginTop: '4px' }}>
                  Target Budget: {formatCurrency(budgetConfig.totalBudget, budgetConfig.currency)}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setStageViewMode(stageViewMode === 'procurement' ? 'viewport' : 'procurement')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    background: stageViewMode === 'procurement' ? 'var(--blue)' : 'var(--paper)',
                    color: stageViewMode === 'procurement' ? '#fff' : 'inherit',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {stageViewMode === 'procurement' ? 'View in 3D Space' : 'Open Full BOQ Sheet'}
                </button>

                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={handleDownloadBOQ}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--ink)',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Download BOQ (.md) ↗
                </button>
              </div>
            </div>
          )}

          {/* Live Qloo Status Indicator */}
          <div className="studio-sidebar__status">
            <span
              className="status-dot"
              style={{
                background:
                  health?.source === 'live'
                    ? '#1557e8'
                    : health?.source === 'sample' || health?.source === 'fixture'
                    ? '#4d4d48'
                    : '#66665f',
                boxShadow:
                  health?.source === 'live'
                    ? '0 0 0 4px rgba(21, 87, 232, 0.18)'
                    : 'none',
              }}
            />
            <span>
              {health === null
                ? 'Checking Qloo telemetry…'
                : health.ok && health.source === 'live'
                ? `Qloo Live · ${health.latencyMs}ms`
                : health.source === 'sample' || health.source === 'fixture'
                ? 'Qloo · Sample fixture'
                : 'Qloo · Fallback heuristic'}
            </span>
          </div>
        </div>

        <div className="studio-sidebar__foot">
          <Link href="/about">Methodology ↗</Link>
          <a href="https://github.com/shayspace04/sonic-architecture" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </aside>

      {/* Main Studio Stage */}
      <section className="studio-stage" aria-label="3D architectural viewport stage">
        <div className="studio-stage__top">
          <div>
            <span className="eyebrow">Spatial Stage / 3D Viewport</span>
            <p>
              {currentPrompt} · {scene?.roomDimensions?.width ?? 14}m × {scene?.roomDimensions?.depth ?? 10}m · RT60{' '}
              {scene?.acousticTarget?.targetRT60Seconds ?? 0.85}s
            </p>
          </div>
          <div className="studio-stage__actions">
            {!sidebarOpen && (
              <button suppressHydrationWarning type="button" onClick={() => setSidebarOpen(true)}>
                Show Tools
              </button>
            )}
            {activeTab === 'sourcing' && (
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setStageViewMode(stageViewMode === 'procurement' ? 'viewport' : 'procurement')}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--ink)',
                  background: stageViewMode === 'procurement' ? 'var(--ink)' : 'transparent',
                  color: stageViewMode === 'procurement' ? 'var(--paper)' : 'inherit',
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                  textTransform: 'uppercase',
                }}
              >
                {stageViewMode === 'procurement' ? '3D View' : 'BOQ Sheet'}
              </button>
            )}
            {comparison && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  border: '1px solid var(--line)',
                  padding: '2px',
                  background: 'var(--paper)',
                  borderRadius: '2px',
                }}
              >
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    setSceneViewMode('grounded');
                    setStageViewMode('viewport');
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    background: sceneViewMode === 'grounded' && stageViewMode === 'viewport' ? 'var(--blue)' : 'transparent',
                    color: sceneViewMode === 'grounded' && stageViewMode === 'viewport' ? '#fff' : 'inherit',
                  }}
                  title="View full-screen scene with Qloo taste grounding"
                >
                  With Qloo
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    setSceneViewMode('baseline');
                    setStageViewMode('viewport');
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    background: sceneViewMode === 'baseline' && stageViewMode === 'viewport' ? 'var(--ink)' : 'transparent',
                    color: sceneViewMode === 'baseline' && stageViewMode === 'viewport' ? 'var(--paper)' : 'inherit',
                  }}
                  title="View full-screen baseline LLM scene without Qloo grounding"
                >
                  Without Qloo
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    setSceneViewMode('split');
                    setStageViewMode('viewport');
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    background: sceneViewMode === 'split' && stageViewMode === 'viewport' ? 'var(--blue)' : 'transparent',
                    color: sceneViewMode === 'split' && stageViewMode === 'viewport' ? '#fff' : 'inherit',
                  }}
                  title="Open interactive side-by-side split wipe comparison"
                >
                  Split Compare
                </button>
              </div>
            )}
            <Link href="/">Exit Studio ↗</Link>
          </div>
        </div>

        {/* Viewport Frame with hairline border */}
        <div className="studio-stage__viewport-frame">
          {stageViewMode === 'procurement' && scene ? (
            <div className="w-full h-full overflow-y-auto bg-[#EEE8DC]">
              <ProcurementWorkspacePanel
                sceneSpec={scene}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
                budgetConfig={budgetConfig}
                onUpdateBudgetConfig={setBudgetConfig}
                procurementList={procurementList}
                onUpdateProcurementList={setProcurementList}
              />
            </div>
          ) : isGenerating ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b0b0e] text-[#aaa9a2] font-mono text-xs uppercase tracking-widest gap-3">
              <div className="w-8 h-8 rounded-full border border-[var(--blue)] border-t-transparent animate-spin" />
              <span>Grounding taste signals & rendering space…</span>
            </div>
          ) : sceneViewMode === 'split' && comparison ? (
            <CompareSplitViewer
              baselineSpec={comparison.baseline}
              groundedSpec={comparison.grounded}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              showCeiling={true}
              cameraPreset={cameraPreset}
              onCloseCompare={() => setSceneViewMode('grounded')}
            />
          ) : scene ? (
            <div className="relative w-full h-full">
              <DynamicVenue3D
                sceneSpec={{
                  ...(sceneViewMode === 'baseline' && comparison ? comparison.baseline : scene),
                  timeOfDay: daylightMode,
                }}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
                showCeiling={true}
                cameraPreset={cameraPreset}
              />
              {/* Scene View Mode Badge Indicator */}
              <div className="absolute top-3 left-3 pointer-events-none z-10">
                <div className="bg-black/85 border border-neutral-700 text-neutral-300 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded shadow-md backdrop-blur-sm flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      sceneViewMode === 'grounded' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                    }`}
                  />
                  <span>
                    {sceneViewMode === 'grounded'
                      ? 'With Qloo Grounding'
                      : 'Without Qloo (Baseline LLM)'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="studio-stage__footer">
          <span>Drag to orbit · Shift+drag to pan · Scroll to zoom</span>
          <span>
            Source: {sceneSource} · Field: {daylightMode}
          </span>
        </div>
      </section>
    </main>
  );
}

export function StudioEditorialWorkspace() {
  return (
    <Suspense
      fallback={
        <main className="studio-workspace studio-workspace--loading">
          <span className="eyebrow">Loading spatial studio workbench…</span>
        </main>
      }
    >
      <StudioEditorialWorkspaceInner />
    </Suspense>
  );
}
export default StudioEditorialWorkspace;
