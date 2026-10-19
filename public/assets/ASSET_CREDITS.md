# Asset Credits

All third-party assets bundled in `public/assets/` are **CC0 / public domain** (no
attribution legally required). Credits are recorded here anyway, as good practice
and so provenance is auditable.

Nothing in this folder contains API keys, tokens, or user data. No paywalled,
login-gated, or license-unclear content was used.

## Environment map

| Asset | File | Source | Creator | License | Notes |
| --- | --- | --- | --- | --- | --- |
| Kloofendal 48d (Partly Cloudy) — Pure Sky, 1k | `env/sky_1k.hdr` | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | Greg Zaal / Poly Haven | CC0 | Radiance `.hdr`, used as `scene.environment` (image-based lighting) via `PMREMGenerator`. 1.4 MB, unmodified. |

## Animated character

| Asset | File | Source | Creator | License | Notes |
| --- | --- | --- | --- | --- | --- |
| Ultimate Animated Character Pack (Nov 2019) | `char/character.fbx` | https://opengameart.org/content/animated-characters-pack | Quaternius | CC0 | One character ("Casual_Male") extracted from the pack. Contains a skinned rig with `Idle`/`Walk`/`Run`/`Sit`/`Stand`/`Victory` clips. 1.5 MB. |

## Nature / environment models

| Asset | Source | Creator | License | Notes |
| --- | --- | --- | --- | --- |
| Nature Kit — GLTF models (53 selected: trees, bushes, plants, grass tufts, flowers, rocks, stones, logs, stumps, mushrooms, column/ring/obelisk/block statue pieces, wood bridge sections, floating platforms, cliff chunks) | https://kenney.nl/assets/nature-kit | Kenney | CC0 | `nature/*.glb`. Selected subset of the 329-model pack, kept in the kit's single cohesive low-poly style. ~474 KB total. |

## PBR surface textures

All from [ambientCG](https://ambientcg.com/) (CC0), 1K-JPG PBR sets. Only the
`Color`, `NormalGL` and `Roughness` maps are bundled; resolution/encoding was
**reduced for the web** (Color/Normal 1024px q82, Roughness 512px q78):

| Asset | Folder | Source | Files |
| --- | --- | --- | --- |
| Grass 003 | `textures/grass/` | https://ambientcg.com/a/Grass003 | `grass_Color`, `grass_NormalGL`, `grass_Roughness` |
| Ground 003 | `textures/ground/` | https://ambientcg.com/a/Ground003 | `ground_Color`, `ground_NormalGL`, `ground_Roughness` |
| Concrete 010 | `textures/concrete/` | https://ambientcg.com/a/Concrete010 | `concrete_Color`, `concrete_NormalGL`, `concrete_Roughness` |
| Wood 013 | `textures/wood/` | https://ambientcg.com/a/Wood013 | `wood_Color`, `wood_NormalGL`, `wood_Roughness` |

## Not used / unavailable

- **Sketchfab** and **Mixamo** require an account to download; no no-login direct
  download was available, so no assets from them are included.
- No executable, script, or untrusted package was downloaded during asset
  acquisition — only model/texture archives from the sources above.
