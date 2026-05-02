/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CARBAZAR brand palette — mirrors the Flutter app.
        brand: {
          50: '#e8eef9',
          100: '#c5d3ee',
          200: '#9cb5e0',
          300: '#7497d2',
          400: '#5681c8',
          500: '#386bbf',
          600: '#2c5da9',
          700: '#1f4a8d',
          800: '#143670',
          900: '#0d47a1', // primary
        },
        accent: {
          400: '#ffc640',
          500: '#ffb300', // accent
          600: '#e6a000',
        },
        ink: {
          DEFAULT: '#1a1f2c',
          soft: '#4a5468',
          muted: '#8a93a6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
