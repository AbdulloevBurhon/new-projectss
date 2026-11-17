export interface SaleProduct {
  id: string
  name: string
  category: string
  stock: number
  unit: string
  price: number
  photo?: string
}

export interface SaleCartLine extends SaleProduct {
  quantity: number
}
