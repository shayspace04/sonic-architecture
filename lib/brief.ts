import type { VibePayload } from "./types";

export function buildDesignBrief(vibe: VibePayload): string {
  const lines: string[] = [];
  lines.push(`# ${vibe.concept.title} — Sonic Architecture Design Brief`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Provenance: ${vibe.reasoning.source}${vibe.fallback ? " (local fallback — no live Qloo data)" : ""}`);
  lines.push("");
  lines.push("## Cultural references (as entered)");
  for (const t of vibe.submittedTerms) lines.push(`- ${t}`);
  if (vibe.unresolvedTerms.length > 0) {
    lines.push("");
    lines.push("## Unresolved references");
    for (const t of vibe.unresolvedTerms) lines.push(`- ${t}`);
  }
  lines.push("");
  lines.push("## Entities recognized by Qloo");
  if (vibe.entities.length === 0) lines.push("- None");
  for (const e of vibe.entities) lines.push(`- ${e.name} (${e.type.replace("urn:entity:", "")}) — resolved from "${e.searchTerm}"`);
  lines.push("");
  lines.push("## Affinity evidence returned by Qloo");
  const ev = vibe.evidence;
  const group = (label: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push(`### ${label}`);
    for (const i of items) lines.push(`- ${i}`);
  };
  group("Genres", ev.genreTags);
  group("Styles", ev.styleTags);
  group("Themes", ev.themeTags);
  group("Adjectives", ev.adjectives);
  group("Characteristics", ev.characteristics);
  if (ev.genreTags.length + ev.styleTags.length + ev.themeTags.length + ev.adjectives.length + ev.characteristics.length === 0) {
    lines.push("- None returned");
  }
  lines.push("");
  lines.push("## Spatial design direction (Sonic Architecture interpretation)");
  lines.push(`**Thesis:** ${vibe.concept.thesis}`);
  lines.push("");
  lines.push(`- **Atmosphere:** ${vibe.concept.atmosphere}`);
  lines.push(`- **Spatial composition:** ${vibe.concept.spatialComposition}`);
  lines.push(`- **Lighting direction:** ${vibe.concept.lightingDirection}`);
  lines.push(`- **Primary color:** ${vibe.primaryColorHex}`);
  lines.push(`- **Accent color:** ${vibe.accentColorHex}`);
  lines.push(`- **Lighting temperature:** ${vibe.lightingTemperatureK}K`);
  lines.push(`- **Flooring:** ${vibe.flooringMaterial}`);
  lines.push(`- **Seating:** ${vibe.seatingFabric}`);
  lines.push("");
  lines.push("## Mapping rules applied");
  for (const [field, rule] of Object.entries(vibe.reasoning.rules)) {
    lines.push(`- **${field}:** ${rule}`);
  }
  lines.push("");
  lines.push("## Soundtrack (artist entities via Qloo insights)");
  if (vibe.artists.length === 0) lines.push("- None returned");
  for (const a of vibe.artists) {
    lines.push(`- ${a.name}${a.sourceEntity ? ` (affinity to ${a.sourceEntity})` : ""}`);
  }
  lines.push("");
  lines.push("## Limitations");
  for (const l of vibe.limitations) lines.push(`- ${l}`);
  for (const e of vibe.errors) lines.push(`- Note: ${e}`);
  lines.push("");
  lines.push("---");
  lines.push("Cultural evidence by Qloo. Spatial translation by Sonic Architecture.");
  return lines.join("\n");
}

export function downloadBrief(vibe: VibePayload): void {
  const blob = new Blob([buildDesignBrief(vibe)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sonic-architecture-${vibe.concept.title.toLowerCase().replace(/\s+/g, "-")}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSceneSpec(spec: unknown, title: string = "scene-spec"): void {
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sonic-architecture-${title.toLowerCase().replace(/\s+/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function captureViewportSnapshot(
  canvas: HTMLCanvasElement | null,
  title: string = "venue-3d"
): void {
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `sonic-architecture-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("Could not capture viewport snapshot:", err);
  }
}
