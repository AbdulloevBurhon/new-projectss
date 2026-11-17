import { changeWarehouses } from '../get-warehouses/get-warehouses.service'
import type { DeleteWarehouseInput } from './delete-warehouse.types'

export function deleteWarehouse({ id }: DeleteWarehouseInput) {
  return changeWarehouses(rows => rows.filter(row => row.id !== id))
}
