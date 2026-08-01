/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        secondary: '#FF6B6B',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}