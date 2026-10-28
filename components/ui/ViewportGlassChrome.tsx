/**
 * Sonic Architecture — Step 1 Updated ViewportGlassChrome.tsx
 * Uses centralized tokens and 1.5px stroke ArchitecturalIcon from /lib/motion.ts
 * (replaces all emoji chips with uniform 1.5px line icons).
 * Strict TypeScript, zero `any`.
 */

import React from "react";
import type { CameraChapterId, CameraChapterSpec } from "../three/CameraChaptersRig";
import type { SceneInteractionSpec } from "../three/InteractionsAndHoverLayers";
import type { ArchitecturalSetting } from "../three/AtmosphereAndSetting";
import {
  ArchitecturalIcon,
  type ArchitecturalIconName,
  DESIGN_TOKENS,
  MOTION_DURATIONS_MS,
  MOTION_EASINGS_CSS
} from "../../lib/motion";

export const SONIC_GLASS_CHROME_CSS = `
.glass-hud {
  background: linear-gradient(165deg, ${DESIGN_TOKENS.colors.obsidian.glassHover} 0%, ${DESIGN_TOKENS.colors.obsidian.glass} 100%);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid ${DESIGN_TOKENS.colors.borders.hairline};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  border-radius: 6px;
}

.small-caps-label {
  font-family: ${DESIGN_TOKENS.typography.fonts.mono};
  font-variant: all-small-caps;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.v-chap-dot {
  transition: transform ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo},
              opacity ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo},
              background-color ${MOTION_DURATIONS_MS.fast}ms ease,
              border-color ${MOTION_DURATIONS_MS.fast}ms ease;
}

.v-chap-dot.active {
  background-color: ${DESIGN_TOKENS.colors.accents.warmAmber};
  border-color: ${DESIGN_TOKENS.colors.alabaster.primary};
  color: ${DESIGN_TOKENS.colors.obsidian.base};
  box-shadow: 0 0 12px ${DESIGN_TOKENS.colors.accents.amberGlow};
}

.hotspot-chip {
  transition: transform ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo},
              opacity ${MOTION_DURATIONS_MS.fast}ms ${MOTION_EASINGS_CSS.easeOutExpo},
              background-color ${MOTION_DURATIONS_MS.fast}ms ease,
              border-color ${MOTION_DURATIONS_MS.fast}ms ease;
}

.hotspot-chip.active {
  background-color: rgba(61, 107, 88, 0.28);
  color: ${DESIGN_TOKENS.colors.alabaster.primary};
  border-color: rgba(212, 140, 86, 0.55);
}
`;

export type TimeOfDayPreset = "morning" | "afternoon" | "sunset" | "midnight";
export type QualityTierPreset = "low" | "medium" | "high" | "ultra";

export interface ViewportGlassChromeProps {
  chapters: CameraChapterSpec[];
  activeChapterId: CameraChapterId;
  onSelectChapter: (chapterId: CameraChapterId) => void;
  scrollTourEnabled: boolean;
  onToggleScrollTour: () => void;
  splineProgressPct: number;
  onScrubSplinePct: (pct: number) => void;
  setting: ArchitecturalSetting;
  onChangeSetting: (setting: ArchitecturalSetting) => void;
  hoverIsolateEnabled: boolean;
  onToggleHoverIsolate: () => void;
  interactions: SceneInteractionSpec[];
  onToggleInteraction: (interactionId: string) => void;
  activeLivingDetailsSummary: string;
  timeOfDay: TimeOfDayPreset;
  onChangeTimeOfDay: (tod: TimeOfDayPreset) => void;
  focalPointName: string;
  colorTemperatureK: number;
  qualityTier: QualityTierPreset;
  onChangeQualityTier: (tier: QualityTierPreset) => void;
  showCeiling: boolean;
  onToggleCeiling: () => void;
  showWalls: boolean;
  onToggleWalls: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  showCones: boolean;
  onToggleCones: () => void;
}

const HOTSPOT_ICON_NAMES: Record<string, ArchitecturalIconName> = {
  flame: "flame",
  practicals: "lamp",
  water: "sparkles",
  curtain: "building",
  door: "door"
};

const TOD_ICON_NAMES: Record<TimeOfDayPreset, ArchitecturalIconName> = {
  morning: "sunrise",
  afternoon: "sun",
  sunset: "sunset",
  midnight: "moon"
};

export const ViewportGlassChrome: React.FC<ViewportGlassChromeProps> = ({
  chapters,
  activeChapterId,
  onSelectChapter,
  scrollTourEnabled,
  onToggleScrollTour,
  splineProgressPct,
  onScrubSplinePct,
  setting,
  onChangeSetting,
  hoverIsolateEnabled,
  onToggleHoverIsolate,
  interactions,
  onToggleInteraction,
  activeLivingDetailsSummary,
  timeOfDay,
  onChangeTimeOfDay,
  focalPointName,
  colorTemperatureK,
  qualityTier,
  onChangeQualityTier,
  showCeiling,
  onToggleCeiling,
  showWalls,
  onToggleWalls,
  showDimensions,
  onToggleDimensions,
  showCones,
  onToggleCones
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3">
      {/* TOP GLASS BAR: SHELL TOGGLES & QUALITY TIER */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="glass-hud pointer-events-auto px-2.5 py-1.5 flex flex-wrap items-center gap-1.5">
          <span className="small-caps-label text-[10px] text-[#A39E93] px-1">Envelope:</span>
          <button
            type="button"
            onClick={onToggleCeiling}
            className={`small-caps-label text-[10px] px-2 py-1 rounded border motion-interactive ${
              showCeiling
                ? "bg-[#3D6B58] text-[#F4EFE6] border-[#F4EFE6]/25"
                : "bg-white/5 text-[#A39E93] border-white/10"
            }`}
          >
            Ceiling: {showCeiling ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={onToggleWalls}
            className={`small-caps-label text-[10px] px-2 py-1 rounded border motion-interactive ${
              showWalls
                ? "bg-[#3D6B58] text-[#F4EFE6] border-[#F4EFE6]/25"
                : "bg-white/5 text-[#A39E93] border-white/10"
            }`}
          >
            Walls: {showWalls ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={onToggleDimensions}
            className={`small-caps-label text-[10px] px-2 py-1 rounded border motion-interactive ${
              showDimensions
                ? "bg-[#3D6B58] text-[#F4EFE6] border-[#F4EFE6]/25"
                : "bg-white/5 text-[#A39E93] border-white/10"
            }`}
          >
            3D Dims: {showDimensions ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={onToggleCones}
            className={`small-caps-label text-[10px] px-2 py-1 rounded border motion-interactive ${
              showCones
                ? "bg-[#3D6B58] text-[#F4EFE6] border-[#F4EFE6]/25"
                : "bg-white/5 text-[#A39E93] border-white/10"
            }`}
          >
            Cones: {showCones ? "ON" : "OFF"}
          </button>
          <select
            value={qualityTier}
            onChange={(e) => onChangeQualityTier(e.target.value as QualityTierPreset)}
            aria-label="3D Detail Budget Quality Tier"
            className="small-caps-label text-[10px] px-2 py-1 rounded bg-[#D48C56] text-[#0B0B0E] font-semibold border border-white/20 focus:outline-none cursor-pointer"
          >
            <option value="low">Tier: Low (Fast)</option>
            <option value="medium">Tier: Medium (60fps)</option>
            <option value="high">Tier: High (PBR Detail)</option>
            <option value="ultra">Tier: Ultra (Photoreal)</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
              if (canvas) {
                const dataUrl = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `sonic-architecture-photoreal-${Date.now()}.png`;
                a.click();
              }
            }}
            title="Render Pristine High-Res Photographic Still"
            className="small-caps-label text-[10px] px-2.5 py-1 rounded bg-[#C89D55] text-black font-semibold border border-white/30 hover:bg-[#E5B874] transition-all flex items-center gap-1 cursor-pointer shadow-md"
          >
            <ArchitecturalIcon name="camera" size={11} />
            <span>Render Still</span>
          </button>
        </div>
      </div>

      {/* RIGHT-EDGE VERTICAL GLASS CHAPTER NAVIGATOR */}
      <nav
        aria-label="CatmullRom Spline Camera Chapters"
        className="glass-hud pointer-events-auto self-end my-auto p-2.5 flex flex-col items-stretch gap-2 w-[138px]"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1">
          <span className="small-caps-label text-[10px] text-[#F4EFE6]/80">Chapters</span>
          <span className="font-tech text-[9px] text-[#D48C56]">{Math.round(splineProgressPct)}%</span>
        </div>

        <div className="relative flex flex-col gap-1.5 pl-2 border-l border-white/15">
          {chapters.map((chap, idx) => {
            const isActive = chap.id === activeChapterId;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => onSelectChapter(chap.id)}
                title={chap.subtitle ?? chap.label}
                className={`v-chap-dot text-left px-2 py-1 rounded font-tech text-[9px] uppercase border ${
                  isActive
                    ? "active font-semibold"
                    : "border-white/10 text-[#A39E93] hover:border-[#D48C56]/60 hover:text-[#F4EFE6]"
                }`}
              >
                <span className="opacity-65 mr-1">0{idx + 1}</span>
                {chap.id}
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-1.5 flex flex-col gap-1.5">
          <label className="small-caps-label text-[9px] text-[#A39E93]">Setting Backdrop</label>
          <select
            value={setting}
            onChange={(e) => onChangeSetting(e.target.value as ArchitecturalSetting)}
            className="bg-[#111216] text-[#F4EFE6] font-tech text-[9px] uppercase px-1.5 py-1 rounded border border-white/15 focus:outline-none"
          >
            <option value="valley">Valley Ridge</option>
            <option value="coast">Coastal Water</option>
            <option value="desert">Desert Mesa</option>
            <option value="city">City Skyline</option>
            <option value="interior-only">Interior Only</option>
          </select>

          <button
            type="button"
            onClick={onToggleHoverIsolate}
            className={`small-caps-label text-[9px] px-1.5 py-1 rounded border border-white/15 motion-interactive ${
              hoverIsolateEnabled ? "bg-[#3D6B58] text-[#F4EFE6]" : "bg-white/5 text-[#A39E93]"
            }`}
          >
            Isolate: {hoverIsolateEnabled ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={onToggleScrollTour}
            className={`small-caps-label text-[9px] px-1.5 py-1 rounded border border-white/15 motion-interactive ${
              scrollTourEnabled ? "bg-[#D48C56] text-[#0B0B0E] font-semibold" : "bg-white/5 text-[#A39E93]"
            }`}
          >
            Scroll Tour: {scrollTourEnabled ? "ON" : "OFF"}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(splineProgressPct)}
            onChange={(e) => onScrubSplinePct(Number(e.target.value))}
            aria-label="Scrub CatmullRom Camera Path"
            className="w-full accent-[#D48C56] cursor-pointer"
          />
        </div>
      </nav>

      {/* BOTTOM STACK: INTERACTIVE HOTSPOTS STRIP + SOLAR TIME-OF-DAY & TELEMETRY */}
      <div className="space-y-2">
        <div className="glass-hud pointer-events-auto px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="small-caps-label text-[10px] text-[#D48C56] pr-1">
              Interactive Hotspots:
            </span>
            {interactions.map((inter) => {
              const iconName: ArchitecturalIconName = HOTSPOT_ICON_NAMES[inter.targetType] ?? "sparkles";
              return (
                <button
                  key={inter.id}
                  type="button"
                  onClick={() => onToggleInteraction(inter.id)}
                  className={`hotspot-chip inline-flex items-center gap-1.5 font-tech text-[9px] uppercase px-2.5 py-1 rounded-full border border-white/15 ${
                    inter.active ? "active" : "text-[#A39E93]"
                  }`}
                >
                  <ArchitecturalIcon name={iconName} size={12} />
                  <span>{inter.label}</span>
                </button>
              );
            })}
          </div>
          <div className="small-caps-label text-[9px] text-[#A39E93] hidden sm:block">
            {activeLivingDetailsSummary}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="glass-hud pointer-events-auto p-1.5 flex items-center gap-1.5">
            <span className="small-caps-label text-[10px] text-[#A39E93] px-1.5">Solar / Time:</span>
            {(["morning", "afternoon", "sunset", "midnight"] as const).map((tod) => (
              <button
                key={tod}
                type="button"
                onClick={() => onChangeTimeOfDay(tod)}
                className={`tod-btn inline-flex items-center gap-1 small-caps-label text-[10px] px-2.5 py-1 rounded border border-white/10 motion-interactive ${
                  timeOfDay === tod ? "active bg-[#D48C56] text-[#0B0B0E] font-semibold" : "text-[#A39E93]"
                }`}
              >
                <ArchitecturalIcon name={TOD_ICON_NAMES[tod]} size={11} />
                <span>{tod}</span>
              </button>
            ))}
          </div>

          <div className="glass-hud pointer-events-auto px-3 py-1.5 font-tech text-[10px] text-[#F4EFE6] flex items-center gap-2.5">
            <span className="small-caps-label text-[10px] text-[#A39E93]">Focal:</span>
            <span>{focalPointName}</span>
            <span className="text-[#D48C56]">•</span>
            <span>
              {colorTemperatureK}K • {timeOfDay.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewportGlassChrome;
