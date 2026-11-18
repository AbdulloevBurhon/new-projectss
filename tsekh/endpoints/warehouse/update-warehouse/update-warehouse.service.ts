import { validateWarehouseDraft } from '../get-warehouses/get-warehouses.service'
import type { UpdateWarehouseInput } from './update-warehouse.types'
import type { Warehouse } from '../get-warehouses/get-warehouses.types'

export function updateWarehouse(input: UpdateWarehouseInput) {
  const draft = validateWarehouseDraft(input)
  return $fetch<Warehouse>(`/api/warehouses/${encodeURIComponent(input.id)}`, { method: 'PATCH', body: draft })
}
