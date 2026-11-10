import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      licenseApiBase: process.env.NUXT_PUBLIC_LICENSE_API_BASE || 'https://tsekh4-license-api.burhon-2001-tjk.workers.dev',
    },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
