export const productUnits = ['шт', 'уп', 'г', 'кг', 'м', 'м²', 'м³', 'л', 'т'] as const

export type ProductUnit = typeof productUnits[number]

export interface ProductDraft {
  name: string
  unit: ProductUnit
  packaged: boolean
  contentUnit: ProductUnit
  quantityPerPiece: number | string
}

export interface Product {
  id: string
  name: string
  unit: ProductUnit
  contentUnit?: ProductUnit
  quantityPerPiece?: number
}

export type GetProductsResult = Product[]
