/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        fg: "var(--fg)",
        fg2: "var(--fg2)",
        fg3: "var(--fg3)",
        fg4: "var(--fg4)",
        line: "var(--border)",
        "alert-bg": "var(--alert-bg)",
        "alert-border": "var(--alert-border)",
        "alert-fg": "var(--alert-fg)",
        "alert-fg2": "var(--alert-fg2)",
        "dot-yes": "var(--dot-yes)",
        "dot-maybe": "var(--dot-maybe)",
        "dot-brrr": "var(--dot-brrr)",
        "dot-no-border": "var(--dot-no-border)",
        spark: "var(--spark)",
        "bar-bg": "var(--bar-bg)",
        "tip-bg": "var(--tip-bg)",
        "tip-fg": "var(--tip-fg)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
