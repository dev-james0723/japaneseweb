import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: { brand: "#C8E53A" },
        sakura: "#F9A8D4",
        amber: { brand: "#FBBF24" },
        sky: { brand: "#7DD3FC" },
        success: "#4ADE80",
        danger: "#F87171",
        warning: "#FACC15",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-tc)", "system-ui", "sans-serif"],
        jp: ["var(--font-noto-jp)", "var(--font-noto-tc)", "serif"],
        tc: ["var(--font-noto-tc)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        glass: "20px",
      },
      backdropBlur: {
        glass: "24px",
      },
      keyframes: {
        subtlePan: {
          from: { backgroundPosition: "48% 50%" },
          to: { backgroundPosition: "52% 50%" },
        },
        glassFadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(125, 211, 252, 0.45)" },
          "100%": { boxShadow: "0 0 0 12px rgba(125, 211, 252, 0)" },
        },
      },
      animation: {
        subtlePan: "subtlePan 30s ease-in-out infinite alternate",
        glassFadeIn: "glassFadeIn 0.38s ease-out both",
        pulseRing: "pulseRing 1.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
