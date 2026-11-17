import { changeWarehouses, validateWarehouseDraft } from '../get-warehouses/get-warehouses.service'
import type { CreateWarehouseInput } from './create-warehouse.types'

export function createWarehouse(input: CreateWarehouseInput) {
  const draft = validateWarehouseDraft(input)
  return changeWarehouses(rows => [{ id: crypto.randomUUID(), ...draft }, ...rows])
}
