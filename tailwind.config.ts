import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0b0d",
          800: "#121216",
          700: "#1a1a20",
          600: "#24242c",
          500: "#34343f",
          400: "#4a4a57",
          300: "#6a6a78",
          200: "#9a9aa8",
          100: "#d4d4dc",
        },
        accent: {
          500: "#ef6c4e",
          400: "#f58a70",
        },
      },
    },
  },
  plugins: [],
};

export default config;
