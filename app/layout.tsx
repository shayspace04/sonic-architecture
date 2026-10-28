import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, DM_Mono } from "next/font/google";
import "./globals.css";

/**
 * Brutalist-Editorial Display Serif: Fraunces
 * Loaded as a variable font with the optical-size (`opsz`) axis (weights 100–900 supported natively),
 * and BOTH `normal` and `italic` styles so the red second-word H1 italic is a true
 * calligraphic italic glyph rather than browser-synthesized oblique.
 * Preloaded with `display: "swap"`, `adjustFontFallback: true` (zero CLS on swap).
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/**
 * Editorial Sans-Serif: Manrope (400–700)
 * Used for the hero subtitle, body copy, inputs, and studio workspace UI.
 */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/**
 * Technical Architectural Monospace: DM Mono (400/500)
 * Used for uppercase tracked kickers, nav links, prompt chips, telemetry, and footer labels.
 */
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  variable: "--font-dm-mono",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "Sonic Architecture — Cultural Intelligence to Spatial Form",
    template: "%s | Sonic Architecture",
  },
  description:
    "Translate music, cinema, and cultural signals into inhabitable 3D architectural spaces, acoustic telemetry, and spatial soundtracks.",
};

export const viewport: Viewport = {
  themeColor: "#111312",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${fraunces.variable} ${manrope.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body className="sa-body bg-[var(--dark)] text-[var(--ink)] antialiased selection:bg-[var(--red)] selection:text-[var(--ink)] min-h-[100svh]">
        <a href="#main-content" className="sa-skip-link">
          Skip to main content
        </a>
        <a
          href="#sonic-3d-studio-stage"
          className="sa-skip-link sa-skip-link--secondary"
        >
          Skip to 3D studio workbench
        </a>
        {children}
      </body>
    </html>
  );
}
