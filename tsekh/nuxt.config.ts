import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['@obshaya/ui/styles/base.css'],
  build: { transpile: ['@obshaya/ui'] },
  vite: { plugins: [tailwindcss()] },
})
