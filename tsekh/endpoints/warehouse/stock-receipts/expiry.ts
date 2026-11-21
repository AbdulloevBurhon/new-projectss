export type StockExpiryRow = {
  id: string
  warehouse: string
  warehouseName: string
  name: string
  barcode: string | null
  unit: string
  quantity: number
  expiresOn: string | null
  postedAt: number | null
  receiptId: string | null
  lot: string | null
}

export const loadStockExpiry = () => $fetch<StockExpiryRow[]>('/api/stock-expiry')
export const saveStockExpiry = (receipt: string, lot: string, expiresOn: string | null, previous: string | null) =>
  $fetch<{ expiresOn: string | null }>('/api/stock-expiry', { method: 'PATCH', body: { receipt, lot, expiresOn, previous } })
