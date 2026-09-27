/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cor escolhida no painel (Configurações). Aceita opacidade: bg-cor/10
        cor: 'rgb(var(--cor-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        entrar: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        aparecer: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        tremer: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        desenhar: {
          from: { strokeDashoffset: '48' },
          to: { strokeDashoffset: '0' },
        },
        barra: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        entrar: 'entrar 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        aparecer: 'aparecer 0.3s ease-out both',
        pop: 'pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        tremer: 'tremer 0.4s ease-in-out',
        desenhar: 'desenhar 0.45s ease-out 0.25s both',
        barra: 'barra 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
