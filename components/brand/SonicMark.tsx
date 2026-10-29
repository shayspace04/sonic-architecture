import React, { type SVGProps } from "react";

export interface SonicMarkProps extends SVGProps<SVGSVGElement> {
  height?: number | string;
  width?: number | string;
  size?: number | string;
  className?: string;
}

/**
 * SonicMark — Official Vector Glyph for Sonic Architecture
 *
 * Inlines the brand glyph with fill="currentColor" so it dynamically adapts to
 * light paper (#f6f6f1) or dark panels (#171716, #0F141C).
 */
export function SonicMark({
  height = 24,
  width,
  size,
  className = "",
  style,
  "aria-hidden": ariaHidden = true,
  ...props
}: SonicMarkProps) {
  const resolvedHeight = size ?? height;
  const numericHeight =
    typeof resolvedHeight === "number"
      ? resolvedHeight
      : parseFloat(String(resolvedHeight)) || 24;
  const resolvedWidth = width ?? Math.round(numericHeight * (662 / 635));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 662 635"
      width={resolvedWidth}
      height={resolvedHeight}
      fill="currentColor"
      aria-hidden={ariaHidden}
      role="img"
      className={`sonic-mark-glyph ${className}`.trim()}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M593,105 L549,66 L499,40 L435,24 L383,24 L324,36 L274,59 L188,132 L164,126 L125,179 L99,242 L36,507 L25,608 L33,610 L156,331 L188,273 L229,235 L288,214 L338,219 L336,234 L370,274 L372,314 L344,353 L350,370 L264,386 L234,377 L167,402 L143,425 L129,454 L128,489 L139,517 L170,546 L241,573 L286,572 L363,548 L407,545 L462,580 L456,602 L509,602 L635,437 L634,427 L536,431 L457,451 L430,440 L283,511 L242,523 L212,521 L198,502 L196,478 L221,443 L265,423 L482,398 L535,381 L576,355 L610,315 L635,242 L629,169Z M453,50 L459,70 L459,133 L455,141 L451,145 L447,147 L444,147 L443,148 L440,147 L421,147 L403,141 L397,138 L393,138 L387,136 L321,136 L320,137 L311,138 L300,142 L288,144 L279,149 L276,149 L275,150 L259,150 L254,148 L249,142 L249,135 L251,131 L258,124 L265,111 L274,98 L278,94 L287,79 L297,70 L315,60 L355,46 L366,45 L375,42 L385,41 L386,40 L394,40 L395,39 L436,39 L445,42 L448,44Z"
      />
    </svg>
  );
}

export default SonicMark;
