/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        sky: colors.sky,
        stone: colors.stone,
        neutral: colors.neutral,
        gray: colors.gray,
        slate: colors.slate,
        primary: { ...colors.sky, DEFAULT: colors.sky[500] },
        secondary: { ...colors.gray, DEFAULT: colors.gray[800] },
        background: { ...colors.gray, DEFAULT: colors.gray[50] },
        'dark-green': {
          pine: '#2E7D32',
          emerald: '#1B5E20',
          moss: '#33691E',
        },
        'dark-red': {
          crimson: '#B71C1C',
          garnet: '#8B0000',
          wine: '#7B1F1F',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        foreground: 'hsl(var(--foreground))',
        primaryForeground: 'hsl(var(--primary-foreground))',
        secondaryForeground: 'hsl(var(--secondary-foreground))',
        destructive: 'hsl(var(--destructive))',
        destructiveForeground: 'hsl(var(--destructive-foreground))',
        muted: 'hsl(var(--muted))',
        mutedForeground: 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        accentForeground: 'hsl(var(--accent-foreground))',
        popover: 'hsl(var(--popover))',
        popoverForeground: 'hsl(var(--popover-foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
      },
      zIndex: {
        60: '60',
      },
      height: {
        '128': '32rem',
      },
    },
  },
  plugins: [
    plugin(({ theme, addUtilities }) => {
      const patternUtilities = {};
      const themeColors = theme('colors');
      for (const color in themeColors) {
        if (typeof themeColors[color] === 'object') {
          patternUtilities[`.bg-boxes-${color}`] = {
            backgroundColor: themeColors[color][950],
            backgroundImage: `linear-gradient(${themeColors[color][900]} 0.1rem, transparent 0.1rem), linear-gradient(to right, ${themeColors[color][900]} 0.1rem, ${themeColors[color][950]} 0.1rem)`,
            backgroundSize: '1.5rem 1.5rem',
          };
        }
      }
      addUtilities(patternUtilities);
    }),
    plugin(({ theme, addUtilities }) => {
      const textShadowUtilities = {};
      const themeColors = theme('colors');
      for (const color in themeColors) {
        if (typeof themeColors[color] === 'object') {
          textShadowUtilities[`.text-shadow-${color}`] = {
            textShadow: `0 0 1rem ${themeColors[color][500]}`,
          };
        }
      }
      addUtilities(textShadowUtilities);
    }),
  ],
}
