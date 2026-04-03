/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1d4ed8', // Blue accent
          foreground: '#ffffff', // White
        },
        background: '#f8fafc', // Light grayish white for app background
        card: '#ffffff', // Pure white for cards
      }
    },
  },
  plugins: [],
}
