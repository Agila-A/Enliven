/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core theme values mapped to CSS variables
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",

        success: "var(--success)",
        warning: "var(--warning)",
        destructive: "var(--destructive)",

        // ------- ENLIVEN FULL BRAND COLORS -------
        enliven: {
          primary: "var(--enliven-primary)",
          "primary-light": "var(--enliven-primary-light)",
          "primary-dark": "var(--enliven-primary-dark)",

          purple: "var(--enliven-purple)",
          "dark-purple": "var(--enliven-dark-purple)",
          "deep-purple": "var(--enliven-deep-purple)",

          mauve: "var(--enliven-mauve)",
          pink: "var(--enliven-pink)",
          cream: "var(--enliven-cream)",
        },

        // Legacy (keep for safety)
        purple: {
          DEFAULT: "var(--enliven-purple)",
          dark: "var(--enliven-dark-purple)",
        },
      },

      borderColor: {
        DEFAULT: "var(--border)",
      },
    },
  },
  plugins: [],
};
