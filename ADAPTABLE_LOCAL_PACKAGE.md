# Adaptable local package

Source repository: https://github.com/shayspace04/sonic-architecture

This package is a copy of the repository at the source revision included in the ZIP, with an additional `adaptation/` layer. It is intended for local work with Gemini Flash and a renderer you control.

Gemini Flash does not need to visualize the whole application. Give it the files in `adaptation/prompts/`, then ask it to read the repository scene types and connect `adaptation/renderer/adapter.ts` to your existing Three.js or React Three Fiber renderer.

The adaptation layer does not replace the existing renderer. It provides the contracts needed to:

- create the same baseline and Qloo-grounded brief with one designer;
- validate provenance against runtime IDs;
- convert briefs into renderer-neutral scene elements;
- mount those elements through one adapter interface;
- compare actual elements and calculate Qloo trace share;
- attach hover explanations and Qloo-layer styling;
- leave pixel difference and SSIM measurement to a deterministic renderer capture adapter.

## Local start

```bash
npm install
npm run dev
```

Then read:

```text
adaptation/ADAPTATION_GUIDE.md
adaptation/prompts/gemini-flash-adapter.md
adaptation/prompts/designer-system.md
adaptation/evaluation-protocol.md
```

Do not place Qloo keys in the browser or in this ZIP. Supply live Qloo results only at runtime through a server-side adapter.
