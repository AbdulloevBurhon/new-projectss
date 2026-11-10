import { validateLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { validDate } from '~/features/tsekh/accounts/utils/ledger'
import type { Archive } from '../types/settings'

type Row = Record<string, unknown>
const isObject = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value)
const string = (value: unknown) => typeof value === 'string'
const optionalString = (value: unknown) => value === undefined || string(value)
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const optionalNumber = (value: unknown) => value === undefined || number(value)
const dateTime = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const rows = (value: unknown, check: (row: Row) => boolean) => Array.isArray(value) && value.every(row => isObject(row) && check(row))
const named = (row: Row) => string(row.id) && string(row.name)

function material(row: Row) {
  return string(row.productId) && string(row.name) && string(row.unit) && number(row.quantity) && optionalNumber(row.pieces)
}

function work(row: Row) {
  const usage = row.materialUsage
  const payment = row.payment
  return string(row.id) && typeof row.date === 'string' && validDate(row.date)
    && string(row.techcardId) && string(row.techcardName) && Number.isSafeInteger(row.wageCents)
    && (row.quantity === undefined || (typeof row.quantity === 'number' && Number.isSafeInteger(row.quantity) && row.quantity > 0))
    && optionalString(row.finishedWarehouseId)
    && (usage === undefined || (isObject(usage) && string(usage.warehouseId)
      && optionalString(usage.warehouseName) && optionalString(usage.workerName)
      && rows(usage.lines, line => material(line) && optionalNumber(line.costCents))))
    && (payment === undefined || (isObject(payment) && string(payment.id) && string(payment.accountId)
      && typeof payment.date === 'string' && validDate(payment.date) && string(payment.workerName)))
}

function inventory(value: unknown) {
  return isObject(value)
    && rows(value.warehouses, row => named(row) && [undefined, 'materials', 'finished'].includes(row.kind as string | undefined))
    && rows(value.products, row => named(row) && string(row.unit) && optionalString(row.contentUnit) && optionalNumber(row.quantityPerPiece))
    && rows(value.techcards, row => named(row) && number(row.cost) && number(row.price) && optionalString(row.photo)
      && (row.materials === undefined || rows(row.materials, material)))
    && rows(value.receipts, row => string(row.id) && dateTime(row.date) && string(row.warehouseId) && string(row.warehouseName)
      && optionalString(row.accountId) && rows(row.lines, line => string(line.productId) && string(line.productName) && string(line.unit)
        && number(line.quantity) && number(line.unitPrice) && number(line.sum) && optionalNumber(line.stockQuantity) && optionalString(line.stockUnit)))
    && rows(value.openingBalances, row => (row.warehouseId === null || string(row.warehouseId)) && string(row.productId) && number(row.quantity))
}

export function parseArchive(text: string): Archive {
  try {
    const data: unknown = JSON.parse(text)
    if (isObject(data) && data.format === 'workshop-04' && data.version === 1 && dateTime(data.createdAt)
      && inventory(data.inventory) && rows(data.workers, row => named(row) && rows(row.records, work))
      && rows(data.clients, row => named(row) && string(row.phone))) {
      const ledger = validateLedger(data.ledger)
      if (ledger.movements.every(item => item.receiptId === undefined && item.workPaymentId === undefined)) return data as unknown as Archive
    }
  } catch {
    // Report malformed JSON and invalid records consistently.
  }
  throw new Error('Файл не соответствует формату архива «Цех-4».')
}
