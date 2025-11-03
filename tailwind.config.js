/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'digital-lavender': '#BE95FF',
        'peach-fuzz': '#FF6B9D',
        'mint-green': '#00D084',
        'cyber-lime': '#FFD700',
        'electric-purple': '#7C3AED',
      },
    },
  },
  plugins: [],
}
