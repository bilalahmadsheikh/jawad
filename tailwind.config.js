/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./sidebar.html', './src/sidebar/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep layered surfaces
        base:   '#0e1525',
        panel:  '#131b2c',
        card:   '#151e30',
        raised: '#1d2840',
        hover:  '#24324e',
        muted:  '#2a3448',
        line:   '#293548',
        'line-light': '#364966',
        // Text
        'text-primary':   '#eef2f7',
        'text-secondary': '#8899ad',
        'text-tertiary':  '#5d6f85',
        'text-dim':       '#3d4d65',
        // Accent
        accent: '#e8792b',
        'accent-light': '#f0a050',
        'accent-dim': '#b85e1a',
      },
    },
  },
  plugins: [],
};
