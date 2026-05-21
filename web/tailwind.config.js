/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e1a',
        panel: '#141a2e',
        border: '#1f2740',
        accent: '#4ade80',
      },
    },
  },
  plugins: [],
};
