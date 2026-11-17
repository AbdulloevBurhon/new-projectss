import type { SaleProduct } from '../types/sale.types'

// Временный каталог для макета. Позже заменится данными техкарт и остатков.
export const saleCatalog: SaleProduct[] = [
  { id: 'asicola', name: 'Асикола', category: 'Напитки', stock: 92, unit: 'шт', price: 10 },
  { id: 'classic', name: 'Шаурма классическая', category: 'Шаурма', stock: 18, unit: 'шт', price: 180 },
  { id: 'spicy', name: 'Шаурма острая', category: 'Шаурма', stock: 12, unit: 'шт', price: 200 },
  { id: 'water', name: 'Вода', category: 'Напитки', stock: 35, unit: 'шт', price: 25 },
]
