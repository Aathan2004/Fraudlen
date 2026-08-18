/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d1117',
          surface: '#161b22',
          elevated: '#1f2937',
          border: '#30363d',
        },
        accent: {
          amber: '#f59e0b',
          'amber-light': '#fcd34d',
          'amber-dim': '#92400e',
        },
        risk: {
          low: '#64748b',
          medium: '#d97706',
          high: '#ea580c',
          vhigh: '#991b1b',
          'low-bg': 'rgba(100,116,139,0.15)',
          'medium-bg': 'rgba(217,119,6,0.15)',
          'high-bg': 'rgba(234,88,12,0.15)',
          'vhigh-bg': 'rgba(153,27,27,0.15)',
        },
        text: {
          primary: '#f0f6fc',
          secondary: '#c9d1d9',
          muted: '#8b949e',
          dim: '#6e7681',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(48,54,61,0.8)',
        glow: '0 0 20px rgba(245,158,11,0.15)',
        'glow-risk': '0 0 20px rgba(153,27,27,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
