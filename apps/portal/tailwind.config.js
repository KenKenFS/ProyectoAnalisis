/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../../shared/**/*.{js,jsx}',
    '../../shared/styles/**/*.css',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
      },
      colors: {
        ceviche: {
          black: '#0a0a0a',
          dark: '#141414',
          surface: '#1c1c1c',
          red: '#991b1b',
          'red-light': '#b91c1c',
          'red-dim': '#7f1d1d',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-right': 'slideRight 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        portal: {
          primary: '#991b1b',
          'primary-content': '#ffffff',
          secondary: '#1c1c1c',
          'secondary-content': '#ffffff',
          accent: '#b91c1c',
          'accent-content': '#ffffff',
          neutral: '#141414',
          'neutral-content': '#ffffff',
          'base-100': '#0a0a0a',
          'base-200': '#141414',
          'base-300': '#1c1c1c',
          'base-content': '#f5f5f5',
          info: '#3b82f6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
    darkTheme: false,
  },
}
