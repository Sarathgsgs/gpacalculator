import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070B0E",
        surface: "#0B1116",
        panel: "#0F1A21",
        border: "rgba(148, 163, 184, 0.16)",

        text: "rgba(255,255,255,0.92)",
        muted: "rgba(255,255,255,0.62)",

        accent: "#22D3EE",
        accent2: "#14B8A6"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.18), 0 10px 30px rgba(0,0,0,0.45)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"]
      }
    }
  },
  plugins: [forms]
} satisfies Config;