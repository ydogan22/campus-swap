/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#002147',
          crimson: '#C8102E',
          light:   '#E8F0F8',
          muted:   '#8FA3BF',
        },
        surface: {
          DEFAULT: '#F7F9FC',
          card:    '#FFFFFF',
          border:  '#E2E8F0',
        },
        dark: {
          bg:     '#0D1117',
          card:   '#161B22',
          border: '#30363D',
          text:   '#C9D1D9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:   '0 2px 12px 0 rgba(0,33,71,0.08)',
        'card-hover': '0 8px 30px 0 rgba(0,33,71,0.16)',
        input:  '0 0 0 3px rgba(0,33,71,0.12)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 },                         to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.4)', opacity: 0.5 } },
      },
    },
  },
  plugins: [],
}
