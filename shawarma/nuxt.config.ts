import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: { public: { licenseApiBase: process.env.NUXT_PUBLIC_LICENSE_API_BASE || 'https://obshaya-programma-api.burhon-2001-tjk.workers.dev' } },
  css: ['@obshaya/ui/styles/base.css'],
  build: { transpile: ['@obshaya/ui'] },
  vite: { plugins: [tailwindcss()] },
})
