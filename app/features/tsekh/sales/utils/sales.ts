import type { Ledger } from '~/features/tsekh/accounts/types/accounts'
import type { Inventory } from '~/features/tsekh/warehouse/types/inventory'
import { finishedStock, finishedWarehouseName } from '~/features/tsekh/warehouse/utils/finished-stock'
import { warehouseKind } from '~/features/tsekh/warehouse/utils/warehouse-kind'
import type { Worker } from '~/features/tsekh/workers/types/workers'
import type { SaleItem } from '../types/sales'

export function removeSale(ledger: Ledger, id: string) {
  const index = ledger.movements.findIndex(item => item.id === id && item.sale)
  if (index === -1) throw new Error('Продажа уже удалена.')
  ledger.movements.splice(index, 1)
}

export function saleCatalog(inventory: Inventory, workers: Worker[], ledger: Ledger): SaleItem[] {
  const cards = new Map(inventory.techcards.map(card => [card.id, card]))
  const finishedIds = new Set(inventory.warehouses.filter(item => warehouseKind(item) === 'finished').map(item => item.id))
  return [...finishedStock(workers, ledger.movements).values()].flatMap(position => {
    const card = cards.get(position.techcardId)
    if (!card || (position.warehouseId && !finishedIds.has(position.warehouseId))) return []
    return [{
      ...position,
      name: card.name,
      photo: card.photo,
      warehouseName: finishedWarehouseName(position.warehouseId, inventory.warehouses),
      available: Math.max(0, position.available),
      unitCents: Math.round(card.price * 100),
    }]
  })
}
