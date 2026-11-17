import type { Product, ProductUnit } from '../products/products.types'

export interface TechCardMaterial {
  productId: string
  name: string
  unit: ProductUnit
  quantity: number
  pieces?: number
  packageUnit?: ProductUnit
}

export type TechCardMaterialDraft = Omit<TechCardMaterial, 'quantity' | 'pieces'> & {
  quantity: number | string
  pieces?: number | string
}

export interface TechCard {
  id: string
  name: string
  cost: number
  price: number
  photo?: string
  materials: TechCardMaterial[]
}

export interface TechCardDraft {
  name: string
  cost: number | string
  price: number | string
  photo: string
  materials: TechCardMaterialDraft[]
}

export type GetTechCardsResult = TechCard[]
export type { Product }
