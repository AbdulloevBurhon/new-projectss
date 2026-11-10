export interface SaleLine {
  techcardId: string
  name: string
  quantity: number
  unitCents: number
  warehouseId?: string
  warehouseName?: string
}

export interface SaleItem {
  id: string
  techcardId: string
  name: string
  warehouseId?: string
  warehouseName: string
  photo?: string
  available: number
  unitCents: number
}

export interface CartLine {
  item: SaleItem
  quantity: number
}
