import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // WebGL scenes are imperative by design: uniforms, cameras and the
    // renderer canvas are mutated every frame inside useFrame/useEffect.
    // React Compiler's immutability rule cannot model that pattern, so it is
    // disabled only for the three.js layer.
    files: ["components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Compiled test output (tsconfig.test.json outDir):
    ".test-dist/**",
    // Vendored runtime kept byte-for-byte under public/ (Three.js r149 UMD):
    "public/sylva/**",
  ]),
]);

export default eslintConfig;
