export const stockReceiptDelaySeconds = 30

export interface StockReceiptAmounts {
  quantity: number | null
  unitPrice: number | null
  salePrice: number | null
  expiresOn?: string | null
}

export interface PostedStockReceiptEdit extends StockReceiptAmounts {
  accountId?: string
}

export interface StockReceiptDraft extends StockReceiptAmounts {
  warehouseId: string
  accountId: string
}

export interface StockReceipt extends StockReceiptDraft {
  id: string
  productId: string
  productName: string
  warehouseName: string
  unit: string
  contentUnit: string | null
  quantityPerPiece: number | null
  total: number | null
  dueAt: number
  postedAt: number | null
  status: 'pending' | 'posted' | 'failed'
  error: string | null
}

export interface StockReceiptsResult {
  rows: StockReceipt[]
  serverTime: number
}
