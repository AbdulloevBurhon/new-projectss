import { reactive } from 'vue'
import type { LicenseSnapshot } from './license.types'

export const licenseStore = reactive({ snapshot: null as LicenseSnapshot | null, loading: false })
