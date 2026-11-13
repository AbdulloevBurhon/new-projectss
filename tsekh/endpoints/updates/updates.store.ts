import { reactive } from 'vue'
import type { UpdateManifest } from './updates.types'

export const updatesStore = reactive({ available: null as UpdateManifest | null, loading: false })
