import type { DesignReasoning } from "@/lib/types";

const LABELS: Record<DesignReasoning["source"], { text: string; classes: string }> = {
  qloo: {
    text: "LIVE QLOO DATA",
    classes: "border-[#D5FF3F]/50 text-[#D5FF3F]",
  },
  "qloo-partial": {
    text: "QLOO — PARTIAL",
    classes: "border-[#8B5CF6]/60 text-[#B39DDB]",
  },
  "local-fallback": {
    text: "LOCAL FALLBACK",
    classes: "border-[#A6A0AA]/40 text-[#A6A0AA]",
  },
};

const DESCRIPTIONS: Record<DesignReasoning["source"], string> = {
  qloo: "Entities and affinity tags were returned by Qloo; spatial decisions are Sonic Architecture's interpretation of that evidence.",
  "qloo-partial": "Qloo responded, but some references or affinity tags were missing; defaults were used where evidence was absent.",
  "local-fallback": "Live cultural intelligence was unavailable; this concept is deterministic and local. No Qloo results are claimed.",
};

export default function ProvenanceIndicator({ source }: { source: DesignReasoning["source"] }) {
  const { text, classes } = LABELS[source];
  return (
    <span
      title={DESCRIPTIONS[source]}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.22em] ${classes}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}
