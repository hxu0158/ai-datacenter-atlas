/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // analyst "terminal" palette
        ink: {
          900: '#0a0e14',
          800: '#0f1622',
          700: '#16202e',
          600: '#1d2a3a',
          500: '#27384c',
          400: '#3a4f68',
        },
        accent: {
          DEFAULT: '#3fb6ff',
          dim: '#2a7fb8',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
