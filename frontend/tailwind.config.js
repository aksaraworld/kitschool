/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Source Sans 3', 'sans-serif'],
      },
      colors: {
        // Cognifa brand (Primary Blue, Dark Blue, Light Blue)
        primary: {
          50: '#E8F2FA',   // Light Blue – background sections
          100: '#d4e6f5',
          200: '#a8cceb',
          300: '#7bb3e0',
          400: '#4f99d6',
          500: '#2D74A8',  // Primary Blue – buttons, links, headings
          600: '#2D74A8',
          700: '#1F5E8A',  // Dark Blue – hover, active
          800: '#1F5E8A',
          900: '#184a6d',
        },
        // Accent system (from logo nodes) – use 2–3 per page
        cognifa: {
          blue: '#2D74A8',
          orange: '#F28C28',  // CTAs, highlights
          pink: '#C93A8B',   // Feature icons, badges
          yellow: '#F2C230', // Warnings, highlights
          green: '#4CAF50', // Success
          teal: '#3DB7B3',  // Secondary buttons, info
        },
        // Neutrals – premium/modern
        cognifaNeutral: {
          dark: '#1A1A1A',    // Main body text
          secondary: '#5F6B7A', // Subtext
          border: '#E5EAF0',   // Cards, dividers
          bg: '#FFFFFF',
          altBg: '#F7F9FC',    // Section separation
        },
      },
    },
  },
  plugins: [],
}


