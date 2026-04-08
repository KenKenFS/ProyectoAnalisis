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
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        ceviche: {
          primary: '#0891b2',
          secondary: '#1e40af',
          accent: '#06b6d4',
          neutral: '#1e293b',
          'base-100': '#f8fafc',
          info: '#0ea5e9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      {
        cevicheDark: {
          primary: '#7f1d1d',
          'primary-content': '#fecaca',
          secondary: '#3f3f46',
          accent: '#991b1b',
          neutral: '#27272a',
          'base-100': '#09090b',
          'base-200': '#18181b',
          'base-300': '#27272a',
          'base-content': '#f4f4f5',
          info: '#0ea5e9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
    darkTheme: false,
  },
}
