/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          foreground: '#ffffff',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        muted: '#64748B',
        bg: '#0B1220',
        card: '#111827',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        soft: '0 10px 25px -10px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};


