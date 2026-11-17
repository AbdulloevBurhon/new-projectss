import type { Warehouse, WarehouseDraft } from '../get-warehouses/get-warehouses.types'

export type UpdateWarehouseInput = WarehouseDraft & { id: Warehouse['id'] }
