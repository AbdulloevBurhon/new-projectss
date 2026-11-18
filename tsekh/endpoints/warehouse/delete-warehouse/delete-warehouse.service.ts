import type { DeleteWarehouseInput } from './delete-warehouse.types'

export function deleteWarehouse({ id }: DeleteWarehouseInput) {
  return $fetch<{ success: boolean }>(`/api/warehouses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
