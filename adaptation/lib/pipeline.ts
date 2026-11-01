import type { QlooBundle, RenderableScene, SceneBrief } from './types';
import { validateSceneBrief } from './provenance';
import { briefToSceneElements } from '../renderer/adapter';

export interface QlooRuntimeAdapter {
  resolve(prompt: string): Promise<QlooBundle | undefined>;
}

export interface DesignBriefProvider {
  designBrief(input: { prompt: string; qlooBundle?: QlooBundle; seed: number }): Promise<SceneBrief>;
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashPromptBundle(prompt: string, seed: number, bundle?: QlooBundle) {
  return stableHash(JSON.stringify({ prompt, seed, bundleHash: bundle?.bundleHash || null }));
}

export async function buildBaselineAndGrounded({ prompt, seed, qloo, designer }: { prompt: string; seed: number; qloo: QlooRuntimeAdapter; designer: DesignBriefProvider }) {
  // Both runs call the same designer with the same seed. The only allowed input difference is the runtime Qloo bundle.
  const bundle = await qloo.resolve(prompt);
  const baselineBrief = validateSceneBrief(await designer.designBrief({ prompt, seed }), undefined);
  const groundedBrief = validateSceneBrief(await designer.designBrief({ prompt, seed, qlooBundle: bundle }), bundle);
  const baseline: RenderableScene = sceneFromBrief(baselineBrief, 'baseline');
  const grounded: RenderableScene = sceneFromBrief(groundedBrief, 'grounded');
  return { bundle, cacheKey: hashPromptBundle(prompt, seed, bundle), baseline, grounded };
}

export function sceneFromBrief(brief: SceneBrief, mode: RenderableScene['mode']): RenderableScene {
  const elements = briefToSceneElements(brief, mode);
  return {
    sceneId: `${mode}-${hashPromptBundle(brief.prompt, brief.seed, brief.bundleHash ? { bundleHash: brief.bundleHash, entities: [] } : undefined)}`,
    prompt: brief.prompt,
    mode,
    elements,
    metadata: {
      bundleHash: brief.bundleHash,
      qlooElementCount: elements.filter((item) => item.provenance === 'qloo-evidence').length,
      inferredElementCount: elements.filter((item) => item.provenance === 'inferred').length,
      fallbackElementCount: elements.filter((item) => item.provenance === 'fallback').length,
    },
  };
}

export const emptyQlooAdapter: QlooRuntimeAdapter = { async resolve() { return undefined; } };
