# Sonic Architecture — Fair-Test Comparison & Magnitude Specification

This module implements the **With Qloo vs. Without Qloo** fair-test comparison engine. Its mission is to prove to hackathon judges that Qloo cultural grounding is load-bearing and architecturally structural—not a cosmetic label.

---

## 1. The Fair-Test Rule

To guarantee that the baseline is not a strawman:
- **Same seed, same model, same typology list, same renderer settings, and same post-processing.**
- The **Baseline** is not degraded: it is given the full architectural system prompt and may use whatever cultural knowledge it already possesses.
- Both scenes are produced through a single deterministic pipeline function:
  ```typescript
  generateScene({ prompt, seed, qlooContext?: QlooContext }): SceneSpec
  ```
  The **only variable** is the presence of the typed Qloo context.

---

## 2. Mathematical Magnitude Formulas (Normalized to [0, 1])

All `magnitude` values in `diffScenes` are computed mathematically in pure code without LLM generation or hallucination:

### 2.1 Palette: CIEDE2000 Perceptual Color Delta ($\Delta E_{00}$)
Perceptual distance between dominant surface swatches (Floor, Wall, Accent) converted from sRGB to CIE $L^*a^*b^*$ under a $D_{65}$ illuminant:
$$\Delta E_{\text{avg}} = \frac{\Delta E_{00}(\text{floor}_b, \text{floor}_g) + \Delta E_{00}(\text{wall}_b, \text{wall}_g) + \Delta E_{00}(\text{accent}_b, \text{accent}_g)}{3}$$
$$\text{magnitude}_{\text{palette}} = \min\left(1.0, \frac{\Delta E_{\text{avg}}}{55.0}\right)$$
*Where $\Delta E_{00} \approx 2.3$ represents a Just Noticeable Difference (JND), and $55+$ represents completely contrasting color domains.*

### 2.2 Lighting: Color Temperature & Key/Fill Contrast Ratio
Combines Kelvin temperature shift with directional/ambient light ratio variance:
$$\Delta K = |K_{\text{grounded}} - K_{\text{baseline}}|$$
$$\Delta R_{\text{key/fill}} = \left|\frac{\text{Key}_g}{\max(0.01, \text{Fill}_g)} - \frac{\text{Key}_b}{\max(0.01, \text{Fill}_b)}\right|$$
$$\text{magnitude}_{\text{lighting}} = \min\left(1.0, 0.65 \cdot \frac{\Delta K}{2500} + 0.35 \cdot \min\left(1.0, \frac{\Delta R_{\text{key/fill}}}{3.0}\right)\right)$$

### 2.3 Materials: Structural Surface Substitution Count
Evaluates the 5 primary architectural surface slots (`floor`, `wall`, `ceiling`, `primaryFurniture`, `secondaryAccent`):
$$\text{magnitude}_{\text{materials}} = \frac{\sum_{i=1}^{5} \mathbb{I}(\text{slot}_{b,i} \neq \text{slot}_{g,i})}{5.0}$$

### 2.4 Geometry & Architectural Massing
Normalized variance across the 3 room dimensions plus ceiling structural kit changes:
$$\Delta \text{dim} = \frac{|W_g - W_b|}{\max(W_b, W_g)} + \frac{|D_g - D_b|}{\max(D_b, D_g)} + \frac{|H_g - H_b|}{\max(H_b, H_g)}$$
$$\text{magnitude}_{\text{geometry}} = \min\left(1.0, \frac{\Delta \text{dim}}{3.0} \cdot 0.70 + \mathbb{I}(\text{ceilingKit}_b \neq \text{ceilingKit}_g) \cdot 0.30\right)$$

### 2.5 Acoustics: Sabine Reverberation Time ($\text{RT}_{60}$)
Calculated ISO 3382 acoustic reverberation variance:
$$\text{magnitude}_{\text{acoustics}} = \min\left(1.0, \frac{|\text{RT}_{60, g} - \text{RT}_{60, b}|}{1.40}\right)$$

### 2.6 Soundtrack & Musical Profile: Jaccard Set Distance
Jaccard distance across genres, era, instrumentation, and mood tags:
$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
$$\text{magnitude}_{\text{soundtrack}} = 1.0 - J(S_{\text{grounded}}, S_{\text{baseline}})$$

### 2.7 Furniture & Programmatic Archetypes: Jaccard Set Distance
Measures the change in placed 3D object archetypes (e.g. turntable console vs. conference table):
$$\text{magnitude}_{\text{furniture}} = 1.0 - J(\text{archetypes}_g, \text{archetypes}_b)$$

---

## 3. Strict Provenance Taxonomy

Labels must never be invented:
- `"qloo-evidence"`: Direct match from a live Qloo API response.
- `"inferred"`: Derived by the LLM from explicit Qloo evidence (always cites the source entity).
- `"fallback"`: Procedural default with no Qloo data behind it.
- `"sample-fixture"`: Placeholder data from `/lib/fixtures/qlooSamples.ts` when Qloo API is not connected. Displays a visible `"Sample data - not live Qloo"` badge in the UI.

---

## 4. How to Connect the Live Qloo Backend Locally

When ready to connect live Qloo API credentials, update the following files:

1. **`.env.local`**:
   Set your Qloo API key:
   ```bash
   QLOO_API_KEY=your_actual_qloo_api_key_here
   ```

2. **`/app/api/vibe/route.ts` (lines 40–110)**:
   - The route currently queries `https://hackathon.api.qloo.com/search`.
   - When `resp.ok`, entities are mapped with:
     ```typescript
     provenance: "qloo-evidence"
     ```
   - No UI changes are needed: the UI automatically hides the `"Sample data - not live Qloo"` badge and displays `"qloo-evidence"` badges in green.
