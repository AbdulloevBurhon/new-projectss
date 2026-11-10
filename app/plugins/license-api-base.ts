import { configureLicenseApiBase } from '~/features/license/services/license-client'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  configureLicenseApiBase(String(config.public.licenseApiBase))
})
