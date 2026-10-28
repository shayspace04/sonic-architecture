"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { EditorialRouteConfig, PromptChip } from "@/lib/editorial-routes";
import {
  getHeroStaggerContainerVariants,
  getHeroMaskLineVariants,
  getSubmitHeroLiftVariants,
  useReducedMotionSafe,
} from "@/lib/motion";

export interface EditorialHeroSectionProps {
  /** Route configuration containing copy, kicker, placeholders, chips */
  readonly routeConfig: EditorialRouteConfig;
  /** Optional controlled input value */
  readonly promptValue?: string;
  /** Optional controlled input change handler */
  readonly onChangePrompt?: (nextValue: string) => void;
  /** Whether the generation / submit transition is currently executing */
  readonly isSubmitting?: boolean;
  /** Whether the interruptible submit lift/zoom transition is active */
  readonly isEnteringTransition?: boolean;
  /** Callback invoked when the user submits a prompt */
  readonly onSubmitPrompt: (prompt: string) => void;
  /** Optional cancellation callback */
  readonly onCancelSubmit?: () => void;
  /** Optional status notification callback for aria-live toast */
  readonly onNotifyStatus?: (message: string) => void;
  /** Active synthesized scene title to jump directly to the 3D stage */
  readonly activeSceneTitle?: string;
  /** Provenance badge label for active 3D scene */
  readonly provenanceBadgeLabel?: string;
  /** Scroll/jump handler to focus the 3D studio workbench */
  readonly onScrollToStudioStage?: () => void;
  /** Optional explicit reduced-motion override */
  readonly prefersReducedMotionOverride?: boolean;
}

/**
 * Editorial Hero Section (`components/editorial/EditorialHeroSection.tsx`)
 *
 * Implements the single-viewport brutalist-editorial hero layout:
 * - Left-aligned block (left ~9vw, top ~17vh, max-width ~52rem)
 * - Red kicker with hairline rule
 * - Fraunces 400 H1 with line-height .77 and calligraphic italic red accent
 * - Manrope subtitle & description
 * - Hairline-underlined input with red mono "ENTER YOUR WORLD ↗" action
 * - 4 interactive prompt chips that populate and refocus the input
 * - WCAG AA accessible form controls, inline validation, and aria-live announcements
 */
export const EditorialHeroSection: React.FC<EditorialHeroSectionProps> = ({
  routeConfig,
  promptValue,
  onChangePrompt,
  isSubmitting = false,
  isEnteringTransition = false,
  onSubmitPrompt,
  onCancelSubmit,
  onNotifyStatus,
  activeSceneTitle,
  provenanceBadgeLabel,
  onScrollToStudioStage,
  prefersReducedMotionOverride,
}) => {
  const [internalInputValue, setInternalInputValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { prefersReducedMotion: osReducedMotion } = useReducedMotionSafe();
  const effectiveReducedMotion = Boolean(
    prefersReducedMotionOverride ?? osReducedMotion
  );

  const currentInput =
    promptValue !== undefined ? promptValue : internalInputValue;

  const setInput = (val: string) => {
    setInternalInputValue(val);
    onChangePrompt?.(val);
  };

  // Focus input on route change
  useEffect(() => {
    inputRef.current?.focus();
  }, [routeConfig.routeKey]);

  const handleChipClick = (chip: PromptChip) => {
    if (isEnteringTransition && onCancelSubmit) {
      onCancelSubmit();
    }
    setInput(chip.prompt);
    setValidationError(null);
    const msg = `Selected prompt preset "${chip.label}". Press Enter to synthesize.`;
    setStatusMessage(msg);
    onNotifyStatus?.(msg);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = currentInput.trim();
    if (!trimmed) {
      const errMsg = "Begin with a reference, a feeling, or a place.";
      setValidationError(errMsg);
      setStatusMessage(`Validation error: ${errMsg}`);
      onNotifyStatus?.(errMsg);
      inputRef.current?.focus();
      return;
    }
    setValidationError(null);
    const synthMsg = `Synthesizing spatial architecture and acoustic score for "${trimmed}"...`;
    setStatusMessage(synthMsg);
    onNotifyStatus?.(synthMsg);
    onSubmitPrompt(trimmed);
  };

  const containerVariants = useMemo(
    () => getHeroStaggerContainerVariants(effectiveReducedMotion),
    [effectiveReducedMotion]
  );
  const lineVariants = useMemo(
    () => getHeroMaskLineVariants(effectiveReducedMotion),
    [effectiveReducedMotion]
  );
  const liftVariants = useMemo(
    () => getSubmitHeroLiftVariants(effectiveReducedMotion),
    [effectiveReducedMotion]
  );

  const hasError = Boolean(validationError);

  return (
    <motion.section
      aria-labelledby="hero-title"
      className="sonic-hero hero-content"
      variants={liftVariants}
      initial="idle"
      animate={isEnteringTransition ? "submitting" : "idle"}
    >
      <motion.div
        key={routeConfig.routeKey}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 1. Masked Line Reveal: Red Kicker with Short Hairline Rule */}
        <div className="sonic-line-mask">
          <motion.p className="sonic-kicker eyebrow" variants={lineVariants}>
            <span aria-hidden="true" />
            <span>{routeConfig.kicker}</span>
          </motion.p>
        </div>

        {/* 2. Masked Line Reveal: H1 Heading in Fraunces 400 with Real Italic Red Accent */}
        <h1
          id="hero-title"
          className="sa-hero-h1"
          aria-label={`${routeConfig.headingLine1} ${routeConfig.headingLine2Accent}`}
        >
          <span className="sonic-line-mask sonic-h1-mask">
            <motion.span className="block" variants={lineVariants}>
              {routeConfig.headingLine1}
            </motion.span>
          </span>
          <span className="sonic-line-mask sonic-h1-mask">
            <motion.em
              className="block sa-hero-accent"
              variants={lineVariants}
            >
              {routeConfig.headingLine2Accent}
            </motion.em>
          </span>
        </h1>

        {/* 3. Masked Line Reveal: Subtitle & One-Line Description */}
        <div className="hero-copy">
          <div className="sonic-line-mask">
            <motion.p
              className="sonic-subtitle lead"
              variants={lineVariants}
            >
              {routeConfig.subtitle}
            </motion.p>
          </div>
          <div className="sonic-line-mask">
            <motion.p
              className="sonic-description sublead"
              variants={lineVariants}
            >
              {routeConfig.description}
            </motion.p>
          </div>
        </div>

        {/* 4. Masked Line Reveal: Hairline-Underlined Input Form */}
        <div className="sonic-line-mask">
          <motion.div variants={lineVariants}>
            <form
              className="sonic-form world-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <label htmlFor="world-input" className="sr-only">
                Describe a cultural reference, artist, film, place, or feeling
              </label>
              <input
                ref={inputRef}
                id="world-input"
                name="world"
                type="text"
                value={currentInput}
                onChange={(e) => {
                  if (isEnteringTransition && onCancelSubmit) {
                    onCancelSubmit();
                  }
                  setInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder={routeConfig.placeholder}
                disabled={isSubmitting}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={hasError ? "true" : "false"}
                aria-describedby={
                  hasError
                    ? "world-input-helper world-input-error"
                    : "world-input-helper"
                }
              />
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting ? "true" : "false"}
                className="enter-button"
              >
                <span>
                  {isSubmitting ? "SYNTHESIZING…" : routeConfig.ctaText}
                </span>
              </button>
            </form>

            {/* Helper Line + Honest Inline Validation Feedback */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p id="world-input-helper" className="sonic-helper form-helper">
                {routeConfig.helperText}
              </p>

              {hasError && (
                <p
                  id="world-input-error"
                  role="alert"
                  className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--red-text)] m-0 mt-2"
                >
                  {validationError}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* 5. Masked Line Reveal: 4 Interactive Prompt Chips */}
        <div className="sonic-line-mask">
          <motion.div
            variants={lineVariants}
            role="group"
            aria-label="Example cultural prompts"
            className="sonic-chips prompt-Directives"
          >
            {routeConfig.promptChips.map((chip, idx) => {
              const isSelected =
                currentInput.trim().toLowerCase() === chip.prompt.toLowerCase() ||
                currentInput.trim().toLowerCase() === chip.label.toLowerCase();

              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  disabled={isSubmitting}
                  data-selected={isSelected ? "true" : "false"}
                  aria-pressed={isSelected}
                  aria-label={`Preset ${idx + 1}: ${chip.label}`}
                  className="sa-prompt-chip prompt-chip"
                >
                  <span className="text-[var(--red-text)] opacity-80 mr-1.5">
                    0{idx + 1}
                  </span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* 6. Active 3D World Jump Anchor */}
        {activeSceneTitle && onScrollToStudioStage && (
          <div className="sonic-line-mask mt-4">
            <motion.div
              className="flex flex-wrap items-center gap-3"
              variants={lineVariants}
            >
              <button
                type="button"
                onClick={onScrollToStudioStage}
                className="inline-flex items-center gap-2.5 text-left font-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--muted-strong)] hover:text-[var(--ink)] transition-colors py-1"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--red)]"
                  aria-hidden="true"
                />
                <span>Active 3D World: {activeSceneTitle}</span>
                {provenanceBadgeLabel && (
                  <span className="text-[var(--red-text)]">
                    [{provenanceBadgeLabel}]
                  </span>
                )}
                <span aria-hidden="true">↓</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* ARIA Live Status Announcement */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>
      </motion.div>
    </motion.section>
  );
};

export default EditorialHeroSection;
