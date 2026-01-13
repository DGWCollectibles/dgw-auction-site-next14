import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'dgw-gold': {
          DEFAULT: '#C9A962',
          light: '#D4BC7D',
          dark: '#A68B4B',
        },
        'obsidian': {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b8c1',
          400: '#91919f',
          500: '#747484',
          600: '#5d5d6a',
          700: '#4c4c56',
          800: '#1e1e22',
          900: '#141417',
          950: '#0a0a0c',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breathe': 'breathe 8s ease-in-out infinite',
        'float': 'gentleFloat 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'pulse-live': 'pulseLive 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
