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
          background: "#8f7257",
          backgroundDark: "#6f5742",

          surface: "#f3e7d0",
          surfaceLight: "#f9f0e1",

          primary: "#5c4633",
          primaryDark: "#4b3828",

          text: "#4b3828",
          textLight: "#fff5e6",
          textMuted: "#80664b",

          border: "#d7c3a7",
          borderDark: "#95765a",

          accent: "#a08361",

          success: "#557a5a",
          error: "#a34d43",
        },
      },
    },
  },
  plugins: [],
};
