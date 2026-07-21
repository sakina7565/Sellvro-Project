/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef1fe',
          100: '#dfe4fd',
          200: '#c1cbfb',
          300: '#9facf7',
          400: '#7182f2',
          500: '#4a5aed',
          600: '#3d4fe0',
          DEFAULT: '#3d4fe0',
          700: '#3340c4',
          800: '#2c37a0',
          900: '#28327f',
        },
        surface: {
          bg: '#ffffff',
          card: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 45px -20px rgba(30, 41, 84, 0.25)',
        soft: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
