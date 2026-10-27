/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10b981', // emerald-500
          light: '#34d399',   // emerald-400
          dark: '#059669',    // emerald-600
        },
        ink: {
          950: '#0b0f19', // sleek dark canvas
          900: '#111827', // slate-900 / gray-900
          850: '#161f30', // custom card surface
          800: '#1f2937', // slate-800
          700: '#374151', // slate-700
          600: '#4b5563', // slate-600
        },
      },
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
        heading: ['Anton', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(16,185,129,0.35)',
        card: '0 4px 20px -2px rgba(2, 6, 23, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
