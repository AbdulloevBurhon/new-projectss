import type { Inventory } from '../types/inventory'
import { normalizeInventory } from './normalize-inventory'

export const storageKey = 'workshop-inventory-v1'

export function emptyInventory(): Inventory {
  return { warehouses: [], products: [], techcards: [], receipts: [], openingBalances: [] }
}

export function readInventory(): Inventory {
  const saved = localStorage.getItem(storageKey)
  const empty = emptyInventory()
  if (saved !== null) {
    const parsed = JSON.parse(saved)
    if (!parsed || !Object.keys(empty).every(key => Array.isArray(parsed[key]))) {
      throw new Error('Не удалось прочитать складские данные.')
    }
    return normalizeInventory(parsed)
  }

  const legacy = ['warehouses', 'products', 'techcards', 'receipts'] as const
  const hasLegacy = legacy.some(key => localStorage.getItem(`workshop-${key}`) !== null)
  const defaultWarehouse = { id: 'sample-warehouse', name: 'Основной склад' }
  const products = [
    { id: 'sample-1', name: 'Арматура', unit: 'шт' },
    { id: 'sample-2', name: 'Профиль стальной', unit: 'шт' },
    { id: 'sample-3', name: 'Лист оцинкованный', unit: 'шт' },
  ]
  const inventory: Inventory = {
    ...empty,
    warehouses: hasLegacy ? [] : [defaultWarehouse],
    products,
    techcards: [{ id: 'sample-card-1', name: 'Дар Классика Сурх', cost: 20, price: 220 }],
  }

  for (const key of legacy) {
    const value = localStorage.getItem(`workshop-${key}`)
    if (value === null) continue
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error('Не удалось прочитать данные прототипа.')
    Object.assign(inventory, { [key]: parsed })
  }

  if (hasLegacy) {
    const amounts = [16, 3, 29]
    inventory.openingBalances = products.flatMap((product, index) =>
      inventory.products.some(item => item.id === product.id)
        ? [{ productId: product.id, quantity: amounts[index]!, warehouseId: null }]
        : [],
    )
  }
  return normalizeInventory(inventory)
}

export async function writeInventory(change: (inventory: Inventory) => void) {
  const commit = () => {
    const inventory = readInventory()
    change(inventory)
    try {
      localStorage.setItem(storageKey, JSON.stringify(inventory))
    } catch {
      throw new Error('Не удалось сохранить изменения в браузере.')
    }
    return inventory
  }
  return navigator.locks ? navigator.locks.request(storageKey, commit) : commit()
}
