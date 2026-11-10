export const productLabels = { tsekh: 'Цех', shawarma: 'Шаурма' } as const
export type ProductId = keyof typeof productLabels

export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && value in productLabels
}
