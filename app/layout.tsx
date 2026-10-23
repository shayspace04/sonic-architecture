import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonic Architecture — Spatial Design from Cultural Resonance",
  description:
    "An AI-assisted spatial design application that transforms natural-language descriptions into interactive 3D environments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0A0E1A] text-[#EEE8DC]">
        {children}
      </body>
    </html>
  );
}
