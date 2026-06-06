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
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: '#7bb3e0',
          400: '#4f99d6',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-700)',
          900: '#184a6d',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          500: 'var(--color-accent)',
        },
        cognifa: {
          blue: '#2D74A8',
          orange: '#F28C28',
          pink: '#C93A8B',
          yellow: '#F2C230',
          green: '#4CAF50',
          teal: '#3DB7B3',
        },
        cognifaNeutral: {
          dark: '#1A1A1A',
          secondary: '#5F6B7A',
          border: '#E5EAF0',
          bg: '#FFFFFF',
          altBg: 'var(--cognifa-alt-bg)',
        },
      },
    },
  },
  plugins: [],
}
