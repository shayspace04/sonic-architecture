import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, DM_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./sonic-theme.css";

/**
 * Editorial Serif Accent: Playfair Display
 * Loaded with italic styles for editorial italic accent headings and em tags.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/**
 * Brutalist-Editorial Display Serif: Fraunces
 * Preserved for backward compatibility with existing scenes and badges.
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
  themeColor: "#f6f6f1",
  colorScheme: "light",
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
      className={`${playfair.variable} ${manrope.variable} ${dmMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="sonic-theme font-sans bg-[var(--paper)] text-[var(--ink)] antialiased selection:bg-[var(--blue)] selection:text-[var(--paper)] min-h-[100svh]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--ink)] focus:text-[var(--paper)] focus:font-mono focus:text-xs">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
