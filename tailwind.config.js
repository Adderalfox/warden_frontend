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
          bg: "#0b0f14",
          panel: "#121821",
          border: "#1f2733",
          accent: "#3ddc97",
          danger: "#ef4444",
          warn: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
