/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        darkBg: '#14171A',
        lessDarkBg: 'rgba(20, 23, 26, 0.99)',
        greyBg: '#22252C',
        wheat: '#EDE7DA',
        purpleContrast: '#674FF8',
      },
      fontFamily: {
        somerton: ['"Somerton Dense"', 'sans-serif'],
        europa: ['Europa', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      lineClamp: {
        10: '10',
      },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      'xxl': '1400px',
    },
  },
  plugins: [],
}
