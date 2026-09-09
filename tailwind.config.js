/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0E27",
        panel: "#1E2A4A",
        accent: {
          from: "#2FE8B0",
          to: "#18A6E0",
        },
        warn: "#E14D5C",
        accent2: "#6B6FE0",
        text: "#FFFFFF",
        textMuted: "#C8D0E0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(47, 232, 176, 0.35)",
        glowSm: "0 0 12px 0 rgba(47, 232, 176, 0.25)",
      },
    },
  },
  plugins: [],
}
