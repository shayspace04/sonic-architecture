import type { RenderableScene, SceneElement } from './types';

export type SceneDiff = {
  added: SceneElement[];
  removed: SceneElement[];
  changed: Array<{ baseline: SceneElement; grounded: SceneElement; reasons: string[] }>;
  unchanged: SceneElement[];
  summary: { totalCompared: number; differing: number; qlooTracedChanges: number; qlooTraceShare: number };
};

function signature(element: SceneElement) {
  return JSON.stringify({ kind: element.kind, transform: element.transform, rendererData: element.rendererData });
}

function canonicalId(id: string): string {
  return id.replace(/^(baseline|grounded)-/, '');
}

export function compareScenes(baseline: RenderableScene, grounded: RenderableScene): SceneDiff {
  const baselineByCid = new Map(baseline.elements.map((item) => [canonicalId(item.id), item]));
  const groundedByCid = new Map(grounded.elements.map((item) => [canonicalId(item.id), item]));
  const added: SceneElement[] = [];
  const removed: SceneElement[] = [];
  const changed: SceneDiff['changed'] = [];
  const unchanged: SceneElement[] = [];

  for (const element of grounded.elements) {
    const cid = canonicalId(element.id);
    const previous = baselineByCid.get(cid);
    if (!previous) {
      added.push(element);
    } else if (signature(previous) !== signature(element)) {
      const reasons = [
        previous.kind !== element.kind ? 'kind' : '',
        JSON.stringify(previous.transform) !== JSON.stringify(element.transform) ? 'transform' : '',
        JSON.stringify(previous.rendererData) !== JSON.stringify(element.rendererData) ? 'rendererData' : '',
      ].filter(Boolean);
      changed.push({ baseline: previous, grounded: element, reasons });
    } else {
      unchanged.push(element);
    }
  }

  for (const element of baseline.elements) {
    const cid = canonicalId(element.id);
    if (!groundedByCid.has(cid)) {
      removed.push(element);
    }
  }

  const allDifferingElements = [...added, ...removed, ...changed.map((item) => item.grounded)];
  const qlooTracedChanges = allDifferingElements.filter((item) => item.provenance === 'qloo-evidence').length;
  const differing = added.length + removed.length + changed.length;
  const totalCompared = Math.max(baseline.elements.length, grounded.elements.length, 1);
  const qlooTraceShare = differing > 0 ? qlooTracedChanges / differing : 0;

  return {
    added,
    removed,
    changed,
    unchanged,
    summary: {
      totalCompared,
      differing,
      qlooTracedChanges,
      qlooTraceShare,
    },
  };
}

export type PixelMetrics = { pixelDiffPercent: number; ssim: number; cameraId: string; timestamp: string };
export type RenderPair = { baselineImagePath: string; groundedImagePath: string; cameraId: string; timeOfDay: string; exposure: number };

/** Plug in Playwright, Three.js readPixels, or an external image metric tool here. */
export interface RenderMetricsAdapter {
  capturePair(pair: RenderPair): Promise<PixelMetrics>;
}
