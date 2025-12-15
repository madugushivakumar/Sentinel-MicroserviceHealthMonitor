/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jet-black': '#022b3aff',
        'teal': '#1f7a8cff',
        'pale-sky': '#bfdbf7ff',
        'lavender': '#e1e5f2ff',
        'white': '#ffffffff',
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'scan': 'scanline 4s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.5', boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
          '100%': { transform: 'scale(1.3)', opacity: '0', boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
        },
      },
    },
  },
  plugins: [],
}

