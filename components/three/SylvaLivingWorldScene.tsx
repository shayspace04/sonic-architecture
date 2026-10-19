"use client";

/**
 * Sylva — Living Green — procedural moss-root world, adapted for Next.js.
 *
 * Compatibility changes vs. the authored `@designcodeio/threeui` source:
 *
 *  1. The authored component imported its two large text assets with Vite's
 *     `?raw` suffix:
 *
 *       import innerGreenSource from "./sources/inner-green-3d.html?raw";
 *       import threeRuntime from "./sources/inner-green-assets/three.min.js?raw";
 *
 *     That mechanism does not exist in this Next.js app, and the brief forbids
 *     adding Vite or downgrading the app. Instead the exact same two files are
 *     shipped verbatim under `public/sylva/` (byte-for-byte, LF, verified by
 *     size — inner-green-3d.html 197914 B, three.min.js 608081 B) and are read
 *     once at runtime with `fetch()`. No source content was altered.
 *
 *  2. This variant is mounted as a decorative full-viewport background behind a
 *     live UI, so the host is marked `aria-hidden` and click-through
 *     (`pointerEvents: "none"`). A click-through iframe receives no pointer
 *     events of its own, so the authored scene would never see the cursor. To
 *     keep the cursor-reactive moss, the parent forwards its pointer position
 *     over `postMessage`, and a small inlined bridge (POINTER_BRIDGE) re-emits
 *     it as synthetic `pointermove` / `pointerleave` events on the scene's own
 *     window — exactly what the authored listeners expect. Clicks still belong
 *     to the page, never the scene.
 *
 * Everything else — the scene-only document splice, the injected styles, the
 * variant transforms, the reduced-motion loop guard, the IntersectionObserver +
 * `visibilitychange` + matchMedia gating, the sandboxed `srcDoc` iframe — is
 * preserved from the authored source.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export const SYLVA_LIVING_WORLD_VARIANTS = ["living-green", "sakura-sunset", "maple-autumn", "sequoia-mist"] as const;
export type SylvaLivingWorldVariant = (typeof SYLVA_LIVING_WORLD_VARIANTS)[number];

export type SylvaLivingWorldSceneProps = {
  variant?: SylvaLivingWorldVariant;
  className?: string;
  style?: CSSProperties;
};

const SCENE_ONLY_MARKUP = (label: string) => `<main class="hero" id="hero">
  <canvas id="scene" role="img" aria-label="${label}"></canvas>
  <div class="stage" id="stage" aria-hidden="true"></div>
</main>`;

const SCENE_ONLY_STYLE = `<style data-threeui-sylva-scene>
html,
body {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

body {
  position: relative !important;
  background: #4a4d44 !important;
}

.hero {
  height: 100% !important;
  min-height: 0 !important;
}

#scene {
  pointer-events: auto !important;
}
</style>`;

export const SAKURA_SUNSET_STYLE = `<style data-threeui-sylva-sakura-sunset>
html,
body {
  background: #3c2c36 !important;
}

.hero {
  background:
    radial-gradient(66% 56% at 26% 90%, rgba(255, 226, 212, 0.125) 0%, rgba(255, 226, 212, 0) 74%),
    radial-gradient(74% 64% at 92% 2%, rgba(18, 10, 18, 0.30) 0%, rgba(18, 10, 18, 0) 72%),
    #3c2c36 !important;
}

.hero::after {
  background:
    radial-gradient(76% 48% at 44% 118%, rgba(255, 218, 208, 0.28) 0%, rgba(255, 208, 200, 0.095) 44%, rgba(255, 202, 196, 0) 86%),
    linear-gradient(180deg, rgba(255, 214, 206, 0) 56%, rgba(255, 210, 202, 0.030) 78%, rgba(255, 214, 206, 0.078) 100%) !important;
}
</style>`;

export const MAPLE_AUTUMN_STYLE = `<style data-threeui-sylva-maple-autumn>
html,
body {
  background: #313a41 !important;
}

.hero {
  background:
    radial-gradient(66% 56% at 26% 90%, rgba(255, 216, 176, 0.115) 0%, rgba(255, 216, 176, 0) 74%),
    radial-gradient(74% 64% at 92% 2%, rgba(10, 15, 20, 0.30) 0%, rgba(10, 15, 20, 0) 72%),
    #313a41 !important;
}

.hero::after {
  background:
    radial-gradient(76% 48% at 44% 118%, rgba(255, 206, 158, 0.24) 0%, rgba(255, 194, 150, 0.08) 44%, rgba(255, 188, 146, 0) 86%),
    linear-gradient(180deg, rgba(255, 206, 160, 0) 56%, rgba(255, 200, 156, 0.028) 78%, rgba(255, 206, 160, 0.070) 100%) !important;
}
</style>`;

export const SEQUOIA_MIST_STYLE = `<style data-threeui-sylva-sequoia-mist>
html,
body {
  background: #5f6d63 !important;
}

.hero {
  background:
    radial-gradient(66% 56% at 26% 90%, rgba(214, 226, 208, 0.115) 0%, rgba(214, 226, 208, 0) 74%),
    radial-gradient(74% 64% at 92% 2%, rgba(14, 20, 18, 0.28) 0%, rgba(14, 20, 18, 0) 72%),
    #5f6d63 !important;
}

.hero::after {
  background:
    radial-gradient(76% 48% at 44% 118%, rgba(206, 220, 200, 0.20) 0%, rgba(200, 216, 196, 0.07) 44%, rgba(200, 216, 196, 0) 86%),
    linear-gradient(180deg, rgba(206, 220, 200, 0) 56%, rgba(202, 218, 198, 0.026) 78%, rgba(206, 220, 200, 0.066) 100%) !important;
}
</style>`;

const VARIANT_LABELS: Record<SylvaLivingWorldVariant, string> = {
  "living-green": "Interactive procedural moss root world",
  "sakura-sunset": "Interactive mossy Sakura boughs in blossom at dusk",
  "maple-autumn": "Interactive mossy Maple boughs in autumn leaf at dusk",
  "sequoia-mist": "Interactive mossy Sequoia boughs in foliage through grove fog",
};

const VARIANT_BACKGROUNDS: Record<SylvaLivingWorldVariant, string> = {
  "living-green": "#4a4d44",
  "sakura-sunset": "#3c2c36",
  "maple-autumn": "#313a41",
  "sequoia-mist": "#5f6d63",
};

const VARIANT_STYLES: Partial<Record<SylvaLivingWorldVariant, string>> = {
  "sakura-sunset": SAKURA_SUNSET_STYLE,
  "maple-autumn": MAPLE_AUTUMN_STYLE,
  "sequoia-mist": SEQUOIA_MIST_STYLE,
};

function replaceRequired(source: string, needle: string, replacement: string, label: string) {
  if (!source.includes(needle)) {
    throw new Error(`Sylva ${label} adapter no longer matches the canonical scene.`);
  }
  return source.replace(needle, replacement);
}

export function applySakuraSunsetVariant(source: string) {
  void source;
  return source;
}

/**
 * Click-through iframes get no pointer events, so the authored `pointermove`
 * listeners would never fire. This bridge (injected into the scene document)
 * listens for the parent's forwarded coordinates and re-emits them as synthetic
 * events on the scene's own `window`. Because `window` listeners see events
 * dispatched on `window` regardless of origin, the authored parallax + moss
 * cursor code runs unchanged.
 */
const POINTER_BRIDGE = `<script data-threeui-pointer-bridge>
(function () {
  var last = { x: 0, y: 0 };
  function emit(type, x, y) {
    try {
      var e = new PointerEvent(type, {
        clientX: x, clientY: y, pointerType: 'mouse', bubbles: true, cancelable: true,
      });
    } catch (err) {
      e = document.createEvent('MouseEvents');
      e.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
    }
    window.dispatchEvent(e);
  }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.__threeuiPointer !== true) return;
    if (d.leave) { emit('pointerleave', 0, 0); return; }
    last.x = d.x; last.y = d.y;
    emit('pointermove', d.x, d.y);
  });
})();
</script>`;

const ASSET_BASE = "/sylva";
const HTML_SRC = `${ASSET_BASE}/sources/inner-green-3d.html`;
const RUNTIME_SRC = `${ASSET_BASE}/sources/inner-green-assets/three.min.js`;

type SylvaSources = { html: string; runtime: string };

let sourcesPromise: Promise<SylvaSources> | null = null;

function loadSources(): Promise<SylvaSources> {
  if (!sourcesPromise) {
    sourcesPromise = Promise.all([
      fetch(HTML_SRC).then((res) => {
        if (!res.ok) throw new Error(`Sylva scene HTML failed to load (${res.status}).`);
        return res.text();
      }),
      fetch(RUNTIME_SRC).then((res) => {
        if (!res.ok) throw new Error(`Sylva runtime failed to load (${res.status}).`);
        return res.text();
      }),
    ]).then(([html, runtime]) => ({ html, runtime }));
  }
  return sourcesPromise;
}

function buildSceneDocument(
  innerGreenSource: string,
  threeRuntime: string,
  reducedMotion: boolean,
  variant: SylvaLivingWorldVariant,
) {
  const presentationStart = innerGreenSource.indexOf('<main class="hero" id="hero">');
  const runtimeStart = innerGreenSource.indexOf('<script src="inner-green-assets/three.min.js"></script>');

  if (presentationStart < 0 || runtimeStart < 0 || runtimeStart <= presentationStart) {
    throw new Error("Sylva scene adapter could not isolate the authored Three.js scene.");
  }

  let documentSource = `${innerGreenSource.slice(0, presentationStart)}${SCENE_ONLY_MARKUP(VARIANT_LABELS[variant])}\n\n${innerGreenSource.slice(runtimeStart)}`
    .replace("<title>Sylva — Into the living world</title>", `<title>${VARIANT_LABELS[variant]}</title>`)
    .replace("</head>", `${SCENE_ONLY_STYLE}${VARIANT_STYLES[variant] ?? ""}</head>`)
    .replace(
      '<script src="inner-green-assets/three.min.js"></script>',
      `${POINTER_BRIDGE}\n<script data-threeui-three-runtime>${threeRuntime}</script>`,
    );

  if (reducedMotion) {
    documentSource = replaceRequired(
      documentSource,
      "(function loop() { requestAnimationFrame(loop); tick(); })();",
      "(function loop() { if (!REDUCED) requestAnimationFrame(loop); tick(); })();",
      "reduced-motion loop guard",
    );
  }

  return documentSource;
}

export function SylvaLivingWorldScene({
  variant = "living-green",
  className = "",
  style,
}: SylvaLivingWorldSceneProps) {
  const safeVariant = SYLVA_LIVING_WORLD_VARIANTS.includes(variant) ? variant : "living-green";
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [sources, setSources] = useState<SylvaSources | null>(null);
  const [hostVisible, setHostVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(() => (
    typeof document === "undefined" || !document.hidden
  ));
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSources()
      .then((loaded) => {
        if (!cancelled) setSources(loaded);
      })
      .catch((error: unknown) => {
        console.warn("Sylva scene sources unavailable; background stays static.", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setHostVisible(entry?.isIntersecting ?? true));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const source = useMemo(
    () => (sources ? buildSceneDocument(sources.html, sources.runtime, reducedMotion, safeVariant) : null),
    [sources, reducedMotion, safeVariant],
  );
  const mounted = hostVisible && documentVisible && source !== null;
  const label = VARIANT_LABELS[safeVariant];
  const background = VARIANT_BACKGROUNDS[safeVariant];
  const frameKey = `${safeVariant}-${reducedMotion ? "reduced" : "motion"}`;

  // Reset readiness when the iframe is torn down or remounted. Adjusting state
  // during render (rather than in an effect) is React's documented pattern for
  // "state derived from a changed input".
  const [readyKey, setReadyKey] = useState(frameKey);
  if (readyKey !== frameKey) {
    setReadyKey(frameKey);
    setReady(false);
  }

  // Forward the page's pointer position into the scene so the cursor-reactive
  // moss still parts under the cursor even though the iframe is click-through.
  useEffect(() => {
    if (!mounted) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;

    const forward = (event: PointerEvent) => {
      const win = frame.contentWindow;
      if (!win) return;
      if (event.pointerType === "touch") return;
      const rect = frame.getBoundingClientRect();
      win.postMessage(
        {
          __threeuiPointer: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        "*",
      );
    };

    const leave = () => {
      frame.contentWindow?.postMessage({ __threeuiPointer: true, leave: true }, "*");
    };

    window.addEventListener("pointermove", forward, { passive: true });
    window.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", forward);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [mounted, ready, safeVariant, reducedMotion]);

  return (
    <div
      ref={hostRef}
      className={`threeui-background sylva-living-world-scene${className ? ` ${className}` : ""}`}
      aria-hidden
      data-variant={safeVariant}
      data-state={ready ? "ready" : "loading"}
      style={{ background, pointerEvents: "none", ...style }}
    >
      {mounted ? (
        <iframe
          ref={frameRef}
          key={frameKey}
          title={label}
          srcDoc={source}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => setReady(true)}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            border: 0,
            background,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}
