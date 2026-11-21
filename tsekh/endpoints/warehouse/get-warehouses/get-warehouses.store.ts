import { reactive } from 'vue'
import { getLegacyWarehouses, getWarehouses, saveWarehouses } from './get-warehouses.service'
import type { GetWarehousesResult } from './get-warehouses.types'

export function useGetWarehousesStore() {
  const employee = useCookie<string | null>('tsekh_employee_session')
  const state = reactive({ rows: [] as GetWarehousesResult, loading: true, error: '' })

  async function load() {
    try {
      state.rows = await getWarehouses()
      if (!employee.value && !state.rows.length && typeof window !== 'undefined') {
        const legacy = getLegacyWarehouses()
        if (legacy.length) {
          await $fetch('/api/warehouses/migrate', { method: 'POST', body: { warehouses: legacy } })
          state.rows = await getWarehouses()
        }
      }
      if (!employee.value && typeof window !== 'undefined') saveWarehouses(state.rows)
      state.error = ''
    } catch {
      state.error = 'Не удалось загрузить склады.'
    } finally {
      state.loading = false
    }
  }

  return { state, load }
}
