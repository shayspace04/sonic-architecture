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

## Animated character (protagonist)

| Asset | File | Source | Creator | License | Notes |
| --- | --- | --- | --- | --- | --- |
| Animated Fox | `char/fox.glb` | https://quaternius.com/ | Quaternius | CC0 | Skinned, animated fox (`AnimalArmature`; clips `Idle`, `Walk`, `Gallop`, `Attack`, `Death`, `Eating`, …). FBX2glTF v0.9.7 binary glTF, 1848 tris, no embedded textures. Used as the meadow protagonist via `Character.tsx` (`Idle`↔`Walk` blend). |

## Nature / environment models

| Asset | Source | Creator | License | Notes |
| --- | --- | --- | --- | --- |
| Gobkit free library — nature props (`meadow/*.glb`: `TreeHigh001`, `TreeMed001`, `TreeLow001`, `Bush001`, `Bush002`, `Reed001`, `Rock001`, `Hill001`, `Mountain001`, `MountainFar001`; `Cloud001`/`Cloud002` bundled but currently unused) | https://gobkit.com/freebies | Gobkit (Alsomind Tech Co., Ltd.) | CC0 1.0 | Static props, ~15 KB each, authored in centimetres and normalised to metres at load time in `assets.ts` (`UNIT`). Fetched via the unauthenticated `https://gobkit.com/api/urls?kind=props` endpoint. |

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

## Superseded / removed

- The earlier **Kenney Nature Kit** GLTFs (`nature/*.glb`, CC0) and the
  **Quaternius Ultimate Animated Character Pack** walker (`char/character.fbx`,
  CC0) were removed during the meadow redesign — they are no longer referenced by
  any code. Their licences (CC0) placed no attribution obligation on them.

## Not used / unavailable

- **Sketchfab** and **Mixamo** require an account to download; no no-login direct
  download was available, so no assets from them are included.
- No executable, script, or untrusted package was downloaded during asset
  acquisition — only model/texture archives from the sources above.
