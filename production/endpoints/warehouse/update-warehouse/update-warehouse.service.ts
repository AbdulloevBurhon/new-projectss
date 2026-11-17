import { changeWarehouses, validateWarehouseDraft } from '../get-warehouses/get-warehouses.service'
import type { UpdateWarehouseInput } from './update-warehouse.types'

export function updateWarehouse(input: UpdateWarehouseInput) {
  const draft = validateWarehouseDraft(input)
  return changeWarehouses(rows => {
    if (!rows.some(row => row.id === input.id)) throw new Error('Склад не найден.')
    return rows.map(row => row.id === input.id ? { ...row, ...draft } : row)
  })
}
