"use client";

import { useState } from "react";
import type { VibePayload } from "@/lib/types";
import { buildDesignBrief, downloadBrief } from "@/lib/brief";

interface FinalCtaProps {
  vibe: VibePayload;
  onReset: () => void;
}

export default function FinalCta({ vibe, onReset }: FinalCtaProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildDesignBrief(vibe));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2400);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2400);
    }
  };

  return (
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D5FF3F]/50 to-transparent" />
      <div className="mx-auto w-full max-w-4xl px-6 text-center">
        <p className="sa-label mb-6">A cultural profile is just the beginning.</p>
        <h2 className="text-4xl font-light tracking-tight text-[#F4F0E8] md:text-6xl">
          Step inside your taste.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#A6A0AA]">
          {vibe.concept.title} is ready to explore — walk the venue above, or take the full brief
          with you.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#venue"
            className="rounded-sm bg-[#D5FF3F] px-7 py-3.5 text-sm font-semibold tracking-[0.18em] text-[#0B0A0D] transition-transform hover:-translate-y-0.5"
          >
            ENTER VENUE
          </a>
          <button
            type="button"
            onClick={() => downloadBrief(vibe)}
            className="rounded-sm border border-[#F4F0E8]/20 px-7 py-3.5 text-sm tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#D5FF3F]/60"
          >
            Export brief
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-sm border border-[#F4F0E8]/20 px-7 py-3.5 text-sm tracking-[0.18em] text-[#F4F0E8] uppercase transition-colors hover:border-[#8B5CF6]/70"
          >
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy brief"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="text-xs tracking-[0.2em] text-[#A6A0AA] uppercase underline-offset-8 hover:text-[#F4F0E8] hover:underline"
          >
            Create another concept
          </button>
        </div>
        <p role="status" className="mt-4 min-h-[1.25rem] text-xs text-[#A6A0AA]" aria-live="polite">
          {copyState === "copied" && "Design brief copied to clipboard."}
          {copyState === "failed" && "Clipboard unavailable — use Export brief instead."}
        </p>
      </div>
    </section>
  );
}
