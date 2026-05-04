import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "#ffffff",
        "bg-section": "#f1f5f9",
        "bg-card": "rgba(255, 255, 255, 0.7)",
        "bg-sidebar": "#020617",
        "accent-lime": "#a0e509",
        "accent-teal": "#2ed3ad",
        "accent-purple": "#8484f5",
        "accent-green": "#16a34a",
        "accent-red": "#dc2626",
        "accent-amber": "#d97706",
        navy: "#020617",
        "text-primary": "#020618",
        "text-secondary": "#475569",
        "text-muted": "#94a3b8",
        border: "#e2e8f0",
      },
      fontFamily: {
        heading: ["var(--font-jakarta)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "1rem",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.06)",
        md: "0 4px 20px rgba(0,0,0,0.06)",
        lg: "0 8px 30px rgba(0,0,0,0.1)",
        glass: "0 8px 32px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out",
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
