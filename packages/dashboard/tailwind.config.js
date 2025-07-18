const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['"Inter Var"', 'Inter', ...defaultTheme.fontFamily.sans],
      mono: ['"Jetbrains Mono"', ...defaultTheme.fontFamily.mono],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar')({nocompatible: true}),
  ],
};
