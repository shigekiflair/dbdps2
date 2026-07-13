import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0A0A0C",
        ash: "#151517",
        ash2: "#1E1E20",
        bone: "#F1EFE8",
        "bone-muted": "#888780",
        blood: {
          DEFAULT: "#C4342F",
          dark: "#4A1B0C",
        },
        "fog-teal": {
          DEFAULT: "#2B7A68",
          dark: "#04342C",
        },
        amber: {
          DEFAULT: "#BA7517",
        },
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "Georgia", "serif"],
        body: ["var(--font-inter)", "-apple-system", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
