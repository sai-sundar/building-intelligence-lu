/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // SECO dashboard palette — dark, professional (see CLAUDE.md)
        bg: "#0f1117",
        surface: "#1a1d27",
        border: "#2a2d3a",
        accent: "#3b82f6",
        risk: {
          low: "#22c55e",
          medium: "#f59e0b",
          high: "#ef4444",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};
