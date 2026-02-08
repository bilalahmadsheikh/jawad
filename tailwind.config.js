/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./sidebar.html', './src/sidebar/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark layered surfaces — 0 is deepest
        dark: {
          0: '#0a0e1a',
          1: '#0d1321',
          2: '#111827',
          3: '#151d2e',
          4: '#1a2236',
          5: '#1f2b40',
          6: '#263044',
          7: '#2d3a52',
        },
        // Accent palette
        accent: '#f97316',
        'accent-hover': '#fb923c',
        'accent-dim': '#c2410c',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
