import { reactive } from 'vue'
import { getWarehouses } from './get-warehouses.service'
import type { GetWarehousesResult } from './get-warehouses.types'

export function useGetWarehousesStore() {
  const state = reactive({ rows: [] as GetWarehousesResult, loading: true, error: '' })

  function load() {
    try {
      state.rows = getWarehouses()
      state.error = ''
    } catch {
      state.error = 'Не удалось загрузить склады.'
    } finally {
      state.loading = false
    }
  }

  return { state, load }
}
