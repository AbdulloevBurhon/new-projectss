export const warehouseTypeLabels = {
  'finished-goods': 'Готовая продукция',
  materials: 'Материалы',
} as const

export type WarehouseType = keyof typeof warehouseTypeLabels

export interface WarehouseDraft {
  name: string
  type: WarehouseType
}

export interface Warehouse {
  id: string
  name: string
  type?: WarehouseType
}

export type GetWarehousesResult = Warehouse[]
