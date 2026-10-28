"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface EditorialFooterProps {
  /** Left mono tracked label (e.g., "01-04 / THE EXPERIENCE") */
  readonly leftLabel?: string;
  /** Right mono telemetry label (e.g., "48°51'24\"N 2°21'07\"E / PARIS — STUDIO") */
  readonly rightLabel?: string;
}

/**
 * Editorial Viewport Footer (`components/editorial/EditorialFooter.tsx`)
 *
 * Brutalist-Editorial Design:
 * - Left: Tracked mono section marker
 * - Center: Full-bleed hairline divider stretching between telemetry blocks
 * - Right: Studio coordinates & practice link
 * - Mobile (<800px): Hides "About the practice ↗" link per spec
 */
export const EditorialFooter: React.FC<EditorialFooterProps> = ({
  leftLabel = "01-04 / THE EXPERIENCE",
  rightLabel = "48°51'24\"N 2°21'07\"E / PARIS — STUDIO",
}) => {
  const pathname = usePathname() || "/";
  const isAboutActive = pathname === "/about";

  return (
    <footer
      role="contentinfo"
      aria-label="Viewport Telemetry"
      className="sonic-footer"
    >
      {/* Left Monospace Indicator */}
      <span className="whitespace-nowrap">{leftLabel}</span>

      {/* Hairline Divider Rule */}
      <div className="sonic-footer__line" aria-hidden="true" />

      {/* Right Monospace Studio Coordinates */}
      <span className="whitespace-nowrap">{rightLabel}</span>

      {/* About the Practice Link (Hidden on mobile <800px per layout spec) */}
      <Link
        href="/about"
        aria-current={isAboutActive ? "page" : undefined}
        className={`sonic-about-link sa-hide-mobile ${
          isAboutActive ? "is-active" : ""
        }`}
      >
        <span>About the practice ↗</span>
      </Link>
    </footer>
  );
};

export default EditorialFooter;
