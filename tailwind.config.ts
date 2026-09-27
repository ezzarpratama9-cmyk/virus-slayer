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
        "brutal-yellow": "#FFE600",
        "brutal-green": "#00FF66",
        "brutal-red": "#FF0055",
        "brutal-cyan": "#00E5FF",
        "brutal-black": "#000000",
        "brutal-white": "#FFFFFF",
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        body: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        brutal: "6px 6px 0px 0px rgba(0,0,0,1)",
        "brutal-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        "brutal-lg": "10px 10px 0px 0px rgba(0,0,0,1)",
        "brutal-xl": "14px 14px 0px 0px rgba(0,0,0,1)",
        "brutal-cyan": "6px 6px 0px 0px rgba(0,229,255,1)",
        "brutal-red": "6px 6px 0px 0px rgba(255,0,85,1)",
        "brutal-green": "6px 6px 0px 0px rgba(0,255,102,1)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0,0)", filter: "hue-rotate(0deg)" },
          "20%": { transform: "translate(-2px,2px)" },
          "40%": { transform: "translate(-2px,-2px)" },
          "60%": { transform: "translate(2px,2px)" },
          "80%": { transform: "translate(2px,-2px)", filter: "hue-rotate(20deg)" },
        },
        "pulse-brutal": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        marquee: "marquee 16s linear infinite",
        glitch: "glitch 0.28s infinite",
        "pulse-brutal": "pulse-brutal 1.1s ease-in-out infinite",
        "spin-slow": "spin-slow 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
