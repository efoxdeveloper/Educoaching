import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        scholar: {
          50: "#EEF2F7",
          100: "#D6E0EB",
          200: "#AFC3D9",
          300: "#7E9BBC",
          400: "#4E6E93",
          500: "#2F507A",
          600: "#1E3A5F",
          700: "#182F4C",
          800: "#13243B",
          900: "#0D1A2A",
        },
        marigold: {
          50: "#FDF4E6",
          100: "#FAE4BE",
          200: "#F5CE8C",
          300: "#EFB65B",
          400: "#E8A33D",
          500: "#D68F26",
          600: "#B3741C",
        },
        paper: "#F7F5F0",
        ink: "#171A21",
        success: {
          50: "#E9F7EF",
          500: "#1F9D66",
          600: "#188050",
        },
        danger: {
          50: "#FCEBEA",
          500: "#D64545",
          600: "#B93636",
        },
        warn: {
          50: "#FFF6E5",
          500: "#DB9A1F",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,26,42,0.04), 0 1px 8px rgba(13,26,42,0.06)",
        popover: "0 8px 30px rgba(13,26,42,0.12)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};
export default config;
