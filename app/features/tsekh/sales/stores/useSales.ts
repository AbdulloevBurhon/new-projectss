import { createId } from '~/features/license/utils/createId'
import { useAccounts } from '~/features/tsekh/accounts/stores/useAccounts'
import { accountBalances, newestFirst, parseAmount } from '~/features/tsekh/accounts/utils/ledger'
import { readClients } from '~/features/tsekh/clients/services/clients-storage'
import { emptyInventory, readInventory, storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import { localDate } from '~/features/tsekh/warehouse/utils/format'
import { readWorkers, workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'
import type { Worker } from '~/features/tsekh/workers/types/workers'
import type { CartLine, SaleLine } from '../types/sales'
import { removeSale, saleCatalog } from '../utils/sales'

export function useSales() {
  const { ledger, ready, error, load: loadAccounts, sync: syncAccounts, change } = useAccounts()
  const inventory = shallowRef(emptyInventory())
  const workers = ref<Worker[]>([])
  const sourceError = ref('')
  const products = computed(() => saleCatalog(inventory.value, workers.value, ledger.value))
  const history = computed(() => newestFirst(ledger.value.movements.filter(item => item.sale)))

  function loadSources() {
    try {
      inventory.value = readInventory()
      workers.value = readWorkers()
      sourceError.value = ''
    } catch {
      sourceError.value = 'Не удалось загрузить техкарты и выполненные работы.'
    }
  }

  function load() {
    loadSources()
    loadAccounts()
  }

  function sync(event: StorageEvent) {
    syncAccounts(event)
    if (event.key === storageKey || event.key === workersStorageKey || event.key === null) loadSources()
  }

  function checkout(accountId: string, cart: CartLine[], amount: number | string, clientId = '', price?: number | string) {
    return change(data => {
      const balance = accountBalances(data).get(accountId)
      if (balance === undefined) throw new Error('Выберите существующий счёт.')
      if (!cart.length) throw new Error('Добавьте изделия в корзину.')
      const cents = parseAmount(amount, 0, Infinity)
      if (!Number.isSafeInteger(balance + cents)) throw new Error('Сумма продажи слишком велика.')
      const catalog = saleCatalog(readInventory(), readWorkers(), data)
      const seen = new Set<string>()
      const sale = cart.map(({ item, quantity }): SaleLine => {
        const product = catalog.find(entry => entry.id === item.id)
        if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > product.available || seen.has(item.id)) {
          throw new Error(`Проверьте доступное количество изделия «${item.name}».`)
        }
        if (!Number.isSafeInteger(product.unitCents) || product.unitCents < 0 || product.unitCents !== item.unitCents) {
          throw new Error(`Цена изделия «${item.name}» изменилась. Проверьте корзину.`)
        }
        seen.add(item.id)
        return { techcardId: product.techcardId, name: product.name, quantity, unitCents: product.unitCents,
          warehouseId: product.warehouseId, warehouseName: product.warehouseName }
      })
      const description = sale.map(item => `${item.name} × ${item.quantity}`).join(', ')
      if (clientId && !readClients().some(client => client.id === clientId)) throw new Error('Выберите существующего клиента.')
      const agreedCents = price === undefined ? cents : parseAmount(price, 0, Infinity)
      const singleLine = price !== undefined && sale.length === 1 ? sale[0] : undefined
      const totalCents = singleLine ? singleLine.quantity * agreedCents : agreedCents
      if (!Number.isSafeInteger(totalCents) || cents > totalCents) throw new Error('Проверьте сумму оплаты и стоимость заказа.')
      if (!clientId && cents < totalCents) throw new Error('Выберите клиента для продажи с долгом.')
      if (singleLine) singleLine.unitCents = agreedCents
      const createdAt = new Date().toISOString()
      data.movements.push({
        id: createId(),
        kind: 'income',
        accountId,
        date: localDate(createdAt),
        createdAt,
        note: `Продажа · ${description}`,
        cents,
        sale,
        clientSale: clientId ? { clientId, totalCents } : undefined,
      })
    })
  }

  function cancelSale(id: string) {
    return change(data => removeSale(data, id))
  }

  return { ledger, ready, error, sourceError, products, history, load, loadSources, sync, checkout, cancelSale }
}
