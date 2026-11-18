import { validateWarehouseDraft } from '../get-warehouses/get-warehouses.service'
import type { CreateWarehouseInput } from './create-warehouse.types'
import type { Warehouse } from '../get-warehouses/get-warehouses.types'

export function createWarehouse(input: CreateWarehouseInput) {
  const draft = validateWarehouseDraft(input)
  return $fetch<Warehouse>('/api/warehouses', { method: 'POST', body: draft })
}
