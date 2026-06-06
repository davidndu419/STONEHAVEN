/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        stone: "#F5F5F4",
        charcoal: "#1F2937",
        gold: "#C8A55A",
        forest: "#2F6B4F",
        burgundy: "#6D2836",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        heritage: "0 20px 60px rgba(2, 6, 23, 0.18)",
        gold: "0 12px 35px rgba(200, 165, 90, 0.18)",
      },
    },
  },
  plugins: [],
};
