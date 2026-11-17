import { ref } from 'vue'
import { createWarehouse } from './create-warehouse.service'
import type { CreateWarehouseInput } from './create-warehouse.types'

export function useCreateWarehouseStore() {
  const pending = ref(false)
  const error = ref('')

  async function execute(input: CreateWarehouseInput) {
    if (pending.value) return false
    pending.value = true
    error.value = ''
    try {
      await createWarehouse(input)
      return true
    } catch {
      error.value = 'Не удалось добавить склад.'
      return false
    } finally {
      pending.value = false
    }
  }

  return { pending, error, execute }
}
