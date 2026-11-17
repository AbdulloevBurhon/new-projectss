import { ref } from 'vue'
import { deleteWarehouse } from './delete-warehouse.service'
import type { DeleteWarehouseInput } from './delete-warehouse.types'

export function useDeleteWarehouseStore() {
  const pending = ref(false)
  const error = ref('')

  async function execute(input: DeleteWarehouseInput) {
    if (pending.value) return false
    pending.value = true
    error.value = ''
    try {
      await deleteWarehouse(input)
      return true
    } catch {
      error.value = 'Не удалось удалить склад.'
      return false
    } finally {
      pending.value = false
    }
  }

  return { pending, error, execute }
}
