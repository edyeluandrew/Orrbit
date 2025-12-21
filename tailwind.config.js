/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'orbit': {
          gold: {
            DEFAULT: '#F7931A',
            light: '#FFB347', 
            dark: '#CC7A00',
            muted: '#F7931A20',
          },
          bronze: {
            DEFAULT: '#8b6f47',
            light: '#a88d5f',
            dark: '#6b5537',
          },
          dark: {
            DEFAULT: '#0D0D0F',
            light: '#1A1A1F',
            lighter: '#252530',
            card: '#14141A',
          },
          gray: {
            DEFAULT: '#8A8A9A',
            light: '#B0B0BE',
            dark: '#4A4A5A',
          },
          cream: {
            DEFAULT: '#f5f1e8',
            dark: '#d4cfc6',
          },
          accent: '#c9a961',
          copper: '#b87333',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
        }
      },
      backgroundImage: {
        'orbit-gradient': 'linear-gradient(135deg, #0D0D0F 0%, #1A1A1F 50%, #0D0D0F 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F7931A 0%, #FFB347 50%, #F7931A 100%)',
        'card-gradient': 'linear-gradient(160deg, #1A1A1F 0%, #14141A 100%)',
        'glow-radial': 'radial-gradient(ellipse at center, rgba(247, 147, 26, 0.15) 0%, transparent 70%)',
      },
      fontFamily: {
        'sans': ['Chakra Petch', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'display': ['Chakra Petch', 'Roboto', 'sans-serif'],
        'body': ['Roboto', 'Chakra Petch', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      boxShadow: {
        'neumorphic': '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'neumorphic-lg': '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'neumorphic-inset': 'inset 0 2px 10px rgba(0, 0, 0, 0.5)',
        'glow-gold': '0 0 40px rgba(247, 147, 26, 0.35), 0 0 80px rgba(247, 147, 26, 0.15), 0 0 120px rgba(247, 147, 26, 0.05)',
        'glow-gold-sm': '0 0 20px rgba(247, 147, 26, 0.3)',
        'glow-gold-lg': '0 0 60px rgba(247, 147, 26, 0.4), 0 0 100px rgba(247, 147, 26, 0.2)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(247, 147, 26, 0.15)',
        'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        'fire': '0 0 30px rgba(247, 147, 26, 0.5), 0 0 60px rgba(255, 107, 0, 0.3), 0 0 90px rgba(247, 147, 26, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(247, 147, 26, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(247, 147, 26, 0.4)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}