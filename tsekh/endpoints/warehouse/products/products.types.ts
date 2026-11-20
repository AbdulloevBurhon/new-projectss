export const productUnits = ['шт', 'уп', 'г', 'кг', 'м', 'м²', 'м³', 'л', 'т'] as const

export type ProductUnit = typeof productUnits[number]
export const barcodeMaxLength = 128

export function normalizeBarcode(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value
  if (typeof value !== 'string' || value.trim().length > barcodeMaxLength) {
    throw new Error(`Введите штрихкод длиной до ${barcodeMaxLength} символов.`)
  }
  return value.trim() || null
}

export interface ProductDraft {
  name: string
  barcode?: string
  unit: ProductUnit
  packaged: boolean
  contentUnit: ProductUnit
  quantityPerPiece: number | string
}

export interface Product {
  id: string
  name: string
  barcode?: string | null
  unit: ProductUnit
  contentUnit?: ProductUnit
  quantityPerPiece?: number
}

export type GetProductsResult = Product[]
