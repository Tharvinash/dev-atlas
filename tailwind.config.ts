import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0b0d10",
          panel: "#11141a",
          subtle: "#161a22",
          hover: "#1c2129",
        },
        border: {
          subtle: "#222831",
          strong: "#2c3340",
        },
        fg: {
          primary: "#e6e8eb",
          secondary: "#a4abb6",
          muted: "#6b7280",
        },
        accent: {
          DEFAULT: "#5b8def",
          hover: "#7aa3f5",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 0 0 1px rgba(255,255,255,0.02)",
      },
    },
  },
  plugins: [],
};

export default config;
