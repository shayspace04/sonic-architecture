# Adaptation package

This is a focused bridge for adapting Sonic Architecture locally. The original repository remains the visual product; this package makes the Qloo-grounded baseline/compare workflow easier to connect to a custom 3D renderer.

Start with `ADAPTATION_GUIDE.md`, then give `prompts/gemini-flash-adapter.md` to Gemini Flash together with the repository. Implement the runtime Qloo adapter and the renderer adapter first. Keep Qloo credentials server-side and provide only normalized runtime bundle data to the scene designer and renderer.

The package intentionally does not depend on Three.js. `renderer/adapter.ts` is the seam where your existing Three.js, React Three Fiber, Babylon, Unity, Blender, or custom renderer receives scene elements. `lib/diff.ts` contains the truth-preserving compare summary and an explicit interface for pixel/SSIM tooling.
