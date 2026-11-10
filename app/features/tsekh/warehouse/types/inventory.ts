interface NamedEntry {
  id: string
  name: string
}

export type WarehouseKind = 'materials' | 'finished'

export interface Warehouse extends NamedEntry {
  kind?: WarehouseKind
}

export interface Product extends NamedEntry {
  unit: string
  contentUnit?: string
  quantityPerPiece?: number
}

export interface ProductDraft {
  name: string
  unit: string
  packaged: boolean
  contentUnit: string
  quantityPerPiece: number | string
}

export interface TechCard extends NamedEntry {
  cost: number
  price: number
  photo?: string
  materials?: TechCardMaterial[]
}

export interface TechCardMaterial {
  productId: string
  name: string
  unit: string
  quantity: number
  pieces?: number
}

export type MaterialDraft = Omit<TechCardMaterial, 'quantity' | 'pieces'> & {
  quantity: number | string
  pieces?: number | string
}

export interface TechCardDraft {
  name: string
  cost: number | string
  price: number | string
  photo: string
  materials: MaterialDraft[]
}

export interface ReceiptLine {
  productId: string
  productName: string
  unit: string
  quantity: number
  unitPrice: number
  sum: number
  stockQuantity?: number
  stockUnit?: string
}

export interface Receipt {
  id: string
  date: string
  warehouseId: string
  warehouseName: string
  accountId?: string
  lines: ReceiptLine[]
}

export interface OpeningBalance {
  warehouseId: string | null
  productId: string
  quantity: number
}

export interface Inventory {
  warehouses: Warehouse[]
  products: Product[]
  techcards: TechCard[]
  receipts: Receipt[]
  openingBalances: OpeningBalance[]
}

export type Catalog = 'warehouses' | 'products' | 'techcards'
