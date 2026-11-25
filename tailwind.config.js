/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saas: {
          bg: '#F7F8FA',
          sidebar: '#171A21',
          'sidebar-hover': '#21252F',
          'sidebar-active': '#262B37',
          'sidebar-border': '#282C37',
          primary: '#20242C',
          secondary: '#7B8494',
          accent: '#5277A8',
          'accent-hover': '#436490',
          'accent-light': '#EEF3F8',
          success: '#2F8A65',
          'success-light': '#EDF7F2',
          warning: '#C18A3C',
          'warning-light': '#FDF7EC',
          error: '#C65C5C',
          'error-light': '#FDF2F2',
          border: '#E5E8ED',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px -1px rgba(16, 24, 40, 0.05)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
