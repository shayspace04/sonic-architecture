import type { Field, QlooBundle, Provenance, SceneBrief, SceneElement } from './types';

export function bundleIds(bundle?: QlooBundle): Set<string> {
  const ids = new Set<string>();
  if (!bundle) return ids;
  const groups = [bundle.entities, bundle.relatedVenues, bundle.relatedArtists, bundle.relatedFilms, bundle.relatedBrands];
  for (const group of groups) for (const item of group || []) ids.add(item.id);
  return ids;
}

export function validateField<T>(field: Field<T>, bundle?: QlooBundle): Field<T> {
  if (field.provenance !== 'qloo-evidence') return field;
  const known = bundleIds(bundle);
  const validIds = field.derivedFrom.filter((id) => known.has(id));
  if (validIds.length === field.derivedFrom.length && validIds.length > 0) return field;
  return {
    ...field,
    provenance: 'inferred',
    derivedFrom: validIds,
    because: `${field.because} Qloo provenance was downgraded because one or more source IDs were not present in the runtime bundle.`,
  };
}

export function validateSceneBrief(brief: SceneBrief, bundle?: QlooBundle): SceneBrief {
  const fields = Object.fromEntries(
    Object.entries(brief.fields).map(([key, value]) => [key, validateField(value as Field<unknown>, bundle)]),
  ) as SceneBrief['fields'];
  return { ...brief, fields, bundleHash: bundle?.bundleHash || brief.bundleHash };
}

export function elementCounts(elements: SceneElement[]) {
  return elements.reduce((counts, element) => {
    counts[element.provenance] += 1;
    return counts;
  }, { 'qloo-evidence': 0, inferred: 0, fallback: 0 } as Record<Provenance, number>);
}

export function qlooExplanation(element: SceneElement, bundle?: QlooBundle): string {
  if (element.provenance !== 'qloo-evidence') return `${element.kind}: ${element.provenance}. ${element.because}`;
  const names = bundleIds(bundle);
  const found = element.sourceIds.filter((id) => names.has(id));
  return `Added because Qloo returned ${found.join(', ') || 'a runtime source record'}. ${element.because}`;
}
