import { readInventory, storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import { readWorkers } from '~/features/tsekh/workers/services/workers-storage'
import type { AccountMovement, Ledger } from '../types/accounts'
import { validDate } from '../utils/ledger'
import { receiptMovements } from '../utils/receipt-movements'
import { workMovements } from '../utils/work-movements'

export const accountsStorageKey = 'workshop-accounts-v1'
export const emptyLedger = (): Ledger => ({ accounts: [], movements: [] })

function validSale(item: AccountMovement) {
  if (item.sale === undefined) return item.clientSale === undefined && item.cents > 0
  if (item.clientSale !== undefined && (!item.clientSale || typeof item.clientSale.clientId !== 'string'
    || !Number.isSafeInteger(item.clientSale.totalCents) || item.clientSale.totalCents < item.cents)) return false
  return item.kind === 'income' && item.cents >= 0 && Array.isArray(item.sale) && item.sale.length > 0
    && item.sale.every(line => typeof line?.techcardId === 'string' && typeof line.name === 'string'
      && (line.warehouseId === undefined || typeof line.warehouseId === 'string')
      && (line.warehouseName === undefined || typeof line.warehouseName === 'string')
      && Number.isSafeInteger(line.quantity) && line.quantity > 0 && Number.isSafeInteger(line.unitCents) && line.unitCents >= 0)
}

export function validateLedger(value: unknown): Ledger {
  const data = value as Ledger | null
  if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.movements)
    || data.accounts.some(account => typeof account?.id !== 'string' || typeof account.name !== 'string'
      || !Number.isSafeInteger(account.openingCents))
    || data.movements.some(item => typeof item?.id !== 'string' || typeof item.accountId !== 'string'
      || typeof item.note !== 'string' || !['income', 'expense'].includes(item.kind)
      || typeof item.date !== 'string' || !validDate(item.date) || !Number.isSafeInteger(item.cents) || !validSale(item))) {
    throw new Error('Не удалось прочитать счета и операции.')
  }
  return data
}

export function readStoredLedger() {
  const saved = localStorage.getItem(accountsStorageKey)
  return saved === null ? emptyLedger() : validateLedger(JSON.parse(saved))
}

export function readLedger(): Ledger {
  const data = readStoredLedger()
  return { ...data, movements: [...data.movements, ...receiptMovements(readInventory().receipts), ...workMovements(readWorkers())] }
}

export async function writeLedger(update: (ledger: Ledger) => void) {
  const commit = () => {
    const ledger = readLedger()
    update(ledger)
    try {
      const movements = ledger.movements.filter(item => !item.receiptId && !item.workPaymentId)
      localStorage.setItem(accountsStorageKey, JSON.stringify({ ...ledger, movements }))
    } catch {
      throw new Error('Не удалось сохранить изменения в браузере.')
    }
    return ledger
  }
  // Use the same write queue as paid receipts and work payments.
  return navigator.locks ? navigator.locks.request(storageKey, commit) : commit()
}
