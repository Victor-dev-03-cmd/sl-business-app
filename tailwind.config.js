/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["Outfit"],
        sans: ["Outfit"], // Set Outfit as default sans font
      },
      colors: {
        brand: {
          dark: "#053765",
          blue: "#2a7db4",
          gold: "#b4863b",
          "gold-light": "#c09a54",
          sand: "#dfb85d",
          text: "#124272",
        },
      },
    },
  },
  plugins: [],
};
