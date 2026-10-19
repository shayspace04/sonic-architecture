/**
 * SkyFallback — a pure-CSS dreamlike sky.
 *
 * Used in three situations, all of which must look intentional and beautiful:
 *  1. the brief window before the WebGL `CloudWorld` chunk has loaded/initialised;
 *  2. when WebGL is unsupported or context creation fails;
 *  3. as the static composition when the visitor prefers reduced motion.
 *
 * It deliberately mirrors the palette and depth layering of `CloudWorld`
 * (sky gradient -> sun wash -> drifting cloud blobs -> a distant floating
 * structure on the horizon) so the transition between the two is seamless.
 * No JS, no animation beyond the two CSS keyframes that the global
 * reduced-motion rule already disables.
 */
export default function SkyFallback({
  note,
  className = "",
}: {
  note?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(180deg, #a9d6ec 0%, #c6e6f4 26%, #ddeff6 48%, #eef7f9 66%, #f7fbfc 80%, #fdf3e9 100%)",
      }}
    >
      {/* Sunlight diffusion from the upper right. */}
      <div
        className="absolute"
        style={{
          inset: 0,
          background:
            "radial-gradient(52% 44% at 78% 12%, rgba(255,225,203,0.85) 0%, rgba(255,236,220,0.32) 34%, rgba(255,255,255,0) 70%)",
        }}
      />
      {/* Iridescent lavender haze low in the sky. */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(220,216,244,0) 0%, rgba(220,216,244,0.4) 58%, rgba(170,169,239,0.22) 100%)",
        }}
      />

      {/* Foreground / midground cloud banks. */}
      <div className="sa-cloud-a left-[-14%] top-[46%] h-[42vh] w-[62vw]" />
      <div className="sa-cloud-b right-[-12%] top-[30%] h-[36vh] w-[52vw]" />
      <div className="sa-cloud-c left-[8%] top-[16%] h-[26vh] w-[44vw]" />
      <div className="sa-cloud-a right-[14%] top-[58%] h-[34vh] w-[46vw] [animation-delay:-22s]" />
      <div className="sa-cloud-b left-[26%] top-[68%] h-[40vh] w-[58vw] [animation-delay:-48s]" />

      {/* Distant floating architecture — a faint pavilion silhouette on the horizon. */}
      <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 opacity-45">
        <svg width="360" height="120" viewBox="0 0 360 120" fill="none" className="drop-shadow-[0_18px_40px_rgba(38,54,74,0.18)]">
          <rect x="40" y="96" width="280" height="6" rx="3" fill="#dfeaf2" />
          <rect x="60" y="44" width="8" height="54" rx="4" fill="#e6eef4" />
          <rect x="292" y="44" width="8" height="54" rx="4" fill="#e6eef4" />
          <rect x="140" y="30" width="8" height="68" rx="4" fill="#eaf1f6" />
          <rect x="212" y="30" width="8" height="68" rx="4" fill="#eaf1f6" />
          <rect x="34" y="22" width="292" height="10" rx="5" fill="#eef4f8" />
          <path d="M40 22h280" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        </svg>
      </div>

      {/* Very soft base wash so tips of the copy stay legible. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: "linear-gradient(180deg, rgba(247,251,252,0) 0%, rgba(247,251,252,0.55) 100%)",
        }}
      />

      {note ? (
        <p className="absolute right-5 bottom-5 font-mono text-[9px] tracking-[0.2em] text-[#26364a]/55 uppercase">
          {note}
        </p>
      ) : null}
    </div>
  );
}
