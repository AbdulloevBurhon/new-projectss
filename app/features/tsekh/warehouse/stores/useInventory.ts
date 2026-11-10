import { createId } from '~/features/license/utils/createId'
import { emptyInventory, readInventory, writeInventory } from '../services/inventory-storage'
import type { Catalog, Inventory, ProductDraft, TechCardDraft, Warehouse, WarehouseKind } from '../types/inventory'
import { makeProduct, productInRecipe, tracksMaterialUsage } from '../utils/products'
import { addPaidReceipt } from '../services/paid-receipt'
import type { ReceiptLineDraft } from '../utils/receipts'
import { makeTechCard } from '../utils/techcards'
import { warehouseKind } from '../utils/warehouse-kind'
import { techcardHasProduction, warehouseHasOperations } from '../services/warehouse-operations'

function put<T extends Warehouse>(items: T[], record: T, id?: string) {
  if (!id) {
    items.push(record)
    return
  }
  const index = items.findIndex(item => item.id === id)
  if (index === -1) throw new Error('Запись уже удалена.')
  items[index] = record
}

function namedEntry(input: string, id?: string): Warehouse {
  const name = input.trim()
  if (!name || name.length > 100) throw new Error('Введите название до 100 символов.')
  return { id: id ?? createId(), name }
}

export function useInventory() {
  const inventory = useState('warehouse-inventory', emptyInventory)
  const ready = useState('warehouse-ready', () => false)
  const storageError = useState('warehouse-storage-error', () => '')

  function load() {
    try {
      inventory.value = readInventory()
      storageError.value = ''
    } catch {
      storageError.value = 'Хранилище склада недоступно. Проверьте настройки браузера и обновите страницу.'
    } finally {
      ready.value = true
    }
  }

  async function change(update: (current: Inventory) => void) {
    inventory.value = await writeInventory(update)
  }

  function saveEntry(catalog: Exclude<Catalog, 'techcards'>, id: string | undefined, draft: ProductDraft, kind: WarehouseKind = 'materials') {
    return change(current => {
      const entry = namedEntry(draft.name, id)
      if (catalog === 'warehouses') {
        if (kind !== 'materials' && kind !== 'finished') throw new Error('Выберите тип склада.')
        const previous = current.warehouses.find(item => item.id === id)
        if (previous && warehouseKind(previous) !== kind && warehouseHasOperations(current, previous.id)) {
          throw new Error('У склада есть операции. Тип склада изменить нельзя.')
        }
        put(current.warehouses, { ...entry, kind }, id)
      }
      if (catalog === 'products') put(current.products, makeProduct(entry, draft, current), id)
    })
  }

  function saveTechCard(id: string | undefined, draft: TechCardDraft) {
    return change(current => {
      const previous = current.techcards.find(card => card.id === id)
      const card = makeTechCard(namedEntry(draft.name, id), draft, current.products, previous)
      put(current.techcards, card, id)
    })
  }

  function deleteEntry(catalog: Catalog, id: string) {
    return change(current => {
      if (catalog === 'warehouses') {
        if (warehouseHasOperations(current, id)) {
          throw new Error('На складе есть остатки или операции. Удаление недоступно.')
        }
        current.warehouses = current.warehouses.filter(item => item.id !== id)
      }
      if (catalog === 'products') {
        if (current.products.some(item => item.id === id && tracksMaterialUsage(item)) && productInRecipe(current, id)) {
          throw new Error('Товар используется в техкарте. Сначала уберите его из состава.')
        }
        if (current.openingBalances.some(line => line.productId === id)
          || current.receipts.some(receipt => receipt.lines.some(line => line.productId === id))) {
          throw new Error('У товара есть остатки или поступления. Удаление недоступно.')
        }
        current.products = current.products.filter(item => item.id !== id)
      }
      if (catalog === 'techcards') {
        if (techcardHasProduction(id)) throw new Error('У техкарты есть выпуск или продажи со склада.')
        current.techcards = current.techcards.filter(item => item.id !== id)
      }
    })
  }

  function saveReceipt(warehouseId: string, accountId: string, draft: ReceiptLineDraft) {
    return change(current => addPaidReceipt(current, warehouseId, accountId, draft))
  }

  return { inventory, ready, storageError, load, saveEntry, saveTechCard, deleteEntry, saveReceipt }
}
