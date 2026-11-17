import type { Warehouse } from '../get-warehouses/get-warehouses.types'

export type DeleteWarehouseInput = Pick<Warehouse, 'id'>
