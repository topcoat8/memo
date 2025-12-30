/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151e2e',
          950: '#020617', // Deeper background
        },
        enterprise: {
          dark: '#05050A',
          card: '#0A0A12',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#00F0FF', // Cyber/Enterprise Cyan
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 2s linear infinite',
      },
      keyframes: {
        shine: {
          'from': { backgroundPosition: '0 0' },
          'to': { backgroundPosition: '-200% 0' },
        }
      }
    },
  },
  plugins: [],
}

