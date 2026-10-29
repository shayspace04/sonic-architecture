import type { Metadata } from "next";
import dynamic from "next/dynamic";

const StudioEditorialWorkspace = dynamic(
  () => import("@/components/studio/StudioEditorialWorkspace"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Spatial Studio — Sonic Architecture",
  description:
    "Interactive 3D spatial studio workbench translating cultural taste signals into architectural form, acoustic telemetry, and generative soundtracks.",
};

export default function StudioPage() {
  return <StudioEditorialWorkspace />;
}
