/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      colors: {
        // Spaceship theme - dark with cyan accents
        cockpit: {
          bg: 'rgba(0, 0, 0, 0.8)',
          surface: 'rgba(0, 0, 0, 0.6)',
          card: 'rgba(0, 0, 0, 0.5)',
          border: 'rgba(255, 255, 255, 0.3)',
          'border-subtle': 'rgba(255, 255, 255, 0.2)',
        },
        cyber: {
          cyan: '#06b6d4',
          'cyan-dim': 'rgba(6, 182, 212, 0.3)',
          green: '#22c55e',
          'green-dim': 'rgba(34, 197, 94, 0.2)',
          yellow: '#fbbf24',
          'yellow-dim': 'rgba(251, 191, 36, 0.2)',
          red: '#ef4444',
          'red-dim': 'rgba(239, 68, 68, 0.2)',
        },
        // Legacy colors for compatibility
        primary: {
          50: '#f0f9ff',
          100: 'rgba(6, 182, 212, 0.1)',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
        success: {
          50: 'rgba(34, 197, 94, 0.1)',
          100: 'rgba(34, 197, 94, 0.2)',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        warning: {
          50: 'rgba(251, 191, 36, 0.1)',
          100: 'rgba(251, 191, 36, 0.2)',
          500: '#fbbf24',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        },
        danger: {
          50: 'rgba(239, 68, 68, 0.1)',
          100: 'rgba(239, 68, 68, 0.2)',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      borderRadius: {
        'none': '0',
      },
    },
  },
  plugins: [],
}
