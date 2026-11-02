import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171126",
        plum: "#372447",
        rose: "#e5a6bf",
        cream: "#fbf5ee",
        gold: "#d8b878",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
