import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  // Every file that contains Tailwind class names, including the ones built in
  // services/ (smart link colours) and constants.tsx (theme backgrounds).
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Theme tokens (themes.css): ink is the tinted near-black text colour of the chosen theme
      colors: {
        ink: 'var(--theme-ink)',
        muted: 'var(--theme-muted)',
        paper: 'var(--theme-paper)',
        sheet: 'var(--theme-sheet)',
        line: 'var(--theme-line)',
        accent: 'var(--theme-primary)',
        'on-accent': 'var(--theme-on-primary)',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      }
    }
  },
  // Provides the animate-in / fade-in / slide-in-from-* / zoom-in classes used across the app
  plugins: [animate],
};
