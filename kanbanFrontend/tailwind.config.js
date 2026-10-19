
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        theme: {
          background: "rgb(var(--color-theme-background) / <alpha-value>)",
          backgroundDark: "rgb(var(--color-theme-background-dark) / <alpha-value>)",
          surface: "rgb(var(--color-theme-surface) / <alpha-value>)",
          surfaceLight: "rgb(var(--color-theme-surface-light) / <alpha-value>)",
          primary: "rgb(var(--color-theme-primary) / <alpha-value>)",
          primaryDark: "rgb(var(--color-theme-primary-dark) / <alpha-value>)",
          text: "rgb(var(--color-theme-text) / <alpha-value>)",
          textLight: "rgb(var(--color-theme-text-light) / <alpha-value>)",
          textMuted: "rgb(var(--color-theme-text-muted) / <alpha-value>)",
          border: "rgb(var(--color-theme-border) / <alpha-value>)",
          borderDark: "rgb(var(--color-theme-border-dark) / <alpha-value>)",
          accent: "rgb(var(--color-theme-accent) / <alpha-value>)",
          success: "rgb(var(--color-theme-success) / <alpha-value>)",
          error: "rgb(var(--color-theme-error) / <alpha-value>)",
          logoSepia: "rgb(var(--color-theme-logo-sepia) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

