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
            DEFAULT: '#d4af37',
            light: '#f4d03f', 
            dark: '#b8941f',
          },
          bronze: {
            DEFAULT: '#8b6f47',
            light: '#a88d5f',
            dark: '#6b5537',
          },
          dark: {
            DEFAULT: '#1a1410',
            light: '#2d2620',
            darker: '#0f0d0a',
          },
          cream: {
            DEFAULT: '#f5f1e8',
            dark: '#d4cfc6',
          },
          accent: '#c9a961',
          copper: '#b87333',
        }
      },
      backgroundImage: {
        'orbit-gradient': 'linear-gradient(135deg, #1a1410 0%, #2d2620 50%, #1a1410 100%)',
        'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)',
        'card-gradient': 'linear-gradient(135deg, #2d2620 0%, #1f1a16 100%)',
      },
      fontFamily: {
        'orbit': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      boxShadow: {
        'neumorphic': '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05)',
        'neumorphic-inset': 'inset 6px 6px 12px rgba(0, 0, 0, 0.5), inset -6px -6px 12px rgba(255, 255, 255, 0.05)',
        'glow-gold': '0 0 20px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.2)',
      },
    },
  },
  plugins: [],
}