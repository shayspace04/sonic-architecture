import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        dark: "var(--dark)",
        page: "var(--page)",
        red: "var(--red)",
        "red-text": "var(--red-text)",
        muted: "var(--muted)",
        "muted-strong": "var(--muted-strong)",
        line: "var(--line)",
        "line-subtle": "var(--line-subtle)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: [
          "var(--font-manrope)",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "var(--font-dm-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      fontSize: {
        floor: ["var(--text-floor)", { lineHeight: "1.35" }],
      },
      transitionTimingFunction: {
        "editorial-submit": "cubic-bezier(0.2, 0.8, 0.25, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
