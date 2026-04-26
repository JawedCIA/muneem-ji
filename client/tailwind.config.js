/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2b5e',
          50: '#eef1f9',
          100: '#dde3f2',
          200: '#b3bedf',
          300: '#8696c8',
          400: '#5b6fb1',
          500: '#3a4f97',
          600: '#293d7b',
          700: '#1a2b5e',
          800: '#0f1f4a',
          900: '#091537',
        },
        amber: {
          DEFAULT: '#f5a623',
          50: '#fff8eb',
          100: '#fdebc7',
          200: '#fbd585',
          300: '#f9be43',
          400: '#f5a623',
          500: '#e09410',
          600: '#b9770a',
          700: '#925b07',
          800: '#6a4205',
          900: '#422a03',
        },
        sidebar: {
          bg: '#1a2b5e',
          text: '#93a8d4',
          'active-bg': '#0f1f4a',
          'active-text': '#f5a623',
        },
        page: '#f8fafc',
        cardBorder: '#e2e8f0',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26,43,94,0.08)',
        'card-lg': '0 4px 16px rgba(26,43,94,0.10)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
