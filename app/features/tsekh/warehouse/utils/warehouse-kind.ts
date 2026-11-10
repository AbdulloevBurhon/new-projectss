import type { Warehouse, WarehouseKind } from '../types/inventory'

export const warehouseKinds = { materials: 'Материалы', finished: 'Готовая продукция' } satisfies Record<WarehouseKind, string>

export function warehouseKind(warehouse?: Warehouse): WarehouseKind {
  return warehouse?.kind ?? 'materials'
}
