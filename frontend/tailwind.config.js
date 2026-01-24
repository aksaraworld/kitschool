/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',   // Very light blue
          100: '#dbeafe',  // Light blue
          200: '#bfdbfe',  // Light blue
          300: '#93c5fd',  // Light blue
          400: '#60a5fa',  // Medium light blue
          500: '#3b82f6',  // Medium blue
          600: '#2563eb',  // Dark blue
          700: '#1d4ed8',  // Darker blue
          800: '#1e40af',  // Dark blue
          900: '#1e3a8a',  // Very dark blue
        },
      },
    },
  },
  plugins: [],
}


