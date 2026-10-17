
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#111111',
        secondary:'#666666',
        background:'#FFFFFF',
        surface: 'F7F7F7',
        accent: 'FF4C3B',
        border: 'EEEEEE',
      }
    },
  },
  plugins: [],
};
