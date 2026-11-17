import { ref } from 'vue'
import { updateWarehouse } from './update-warehouse.service'
import type { UpdateWarehouseInput } from './update-warehouse.types'

export function useUpdateWarehouseStore() {
  const pending = ref(false)
  const error = ref('')

  async function execute(input: UpdateWarehouseInput) {
    if (pending.value) return false
    pending.value = true
    error.value = ''
    try {
      await updateWarehouse(input)
      return true
    } catch {
      error.value = 'Не удалось изменить склад.'
      return false
    } finally {
      pending.value = false
    }
  }

  return { pending, error, execute }
}
