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
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
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
        // Paleta personalizada de ParkiU basada en RGB(22, 147, 227)
        parkiu: {
          50: '#f0f8ff',   // Muy claro
          100: '#e0f2fe',  // Claro
          200: '#bae6fd',  // Claro medio
          300: '#7dd3fc',  // Medio claro
          400: '#38bdf8',  // Medio
          500: '#1693e3',  // Base RGB(22, 147, 227)
          600: '#0284c7',  // Medio oscuro
          700: '#0369a1',  // Oscuro
          800: '#075985',  // Muy oscuro
          900: '#0c4a6e',  // Más oscuro
          950: '#082f49',  // Más oscuro aún
        },
        primary: {
          50: '#f0f8ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#1693e3',  // Color base de ParkiU
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
          DEFAULT: '#1693e3'
        },
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
    // Utilidad para ocultar scrollbar manteniendo scroll funcional
    plugin(({ addUtilities }) => {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    }),
  ],
}
