/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Star Trek LCARS-inspired colors
        'lcars-orange': '#FF9900',
        'lcars-tan': '#FFCC99',
        'lcars-blue': '#9999FF',
        'lcars-purple': '#CC99CC',
        'lcars-red': '#CC6666',
        'lcars-yellow': '#FFCC00',
        'lcars-bg': '#000000',
        'lcars-panel': '#1a1a1a',
      },
      fontFamily: {
        'lcars': ['Antonio', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
