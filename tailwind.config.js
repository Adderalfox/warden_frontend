/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warden: {
          bg: "#070c0e",
          panel: "#0b1215",
          raised: "#0f191c",
          border: "#16232a",
          accent: "#2fbfae",
          danger: "#ef5b6b",
          warn: "#e8c547",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
