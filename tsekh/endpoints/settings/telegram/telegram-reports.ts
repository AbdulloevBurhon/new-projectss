export type StockRow = {
  warehouse: string
  warehouseName: string
  productId?: string
  name: string
  unit: string
  stock: number
  contentUnit: string | null
  factor: number
}

type SalesTotals = { count: number; total: number; paid: number }
export type Reconciliation = {
  database: unknown
  stock: StockRow[]
  sales: SalesTotals & { repayments?: number }
  today?: SalesTotals
  yesterday?: SalesTotals
}

const moneyFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantityFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 })
const dateFormat = new Intl.DateTimeFormat('ru-RU')
const money = (value: number) => `${moneyFormat.format(value / 100)} сом`
const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

const dayTotals = (label: string, date: Date, day: SalesTotals) =>
  `${label}, ${dateFormat.format(date)}: ${money(day.total)} · оплачено ${money(day.paid)} · продано в долг ${money(day.total - day.paid)} · чеков: ${day.count}`

export function formatTelegramSales({ sales, today, yesterday }: Reconciliation, start: Date, previous: Date) {
  const difference = today && yesterday ? today.total - yesterday.total : 0
  return [
    'Отчёт по продажам «Цех»',
    '',
    'За всё время',
    `Продажи: ${money(sales.total)}`,
    `Оплачено: ${money(sales.paid)}`,
    `Погашено долга: ${money(sales.repayments ?? 0)}`,
    `Текущий долг: ${money(sales.total - sales.paid - (sales.repayments ?? 0))}`,
    `Количество продаж: ${sales.count}`,
    ...(today && yesterday ? [
      '',
      'Продажи по дням',
      dayTotals('Сегодня', start, today),
      dayTotals('Вчера', previous, yesterday),
      `Разница по продажам: ${difference > 0 ? '+' : ''}${money(difference)}`,
    ] : []),
  ].join('\n')
}

export const LOW_STOCK_LIMIT = 50

function comparableStock(row: StockRow) {
  const hasContent = (row.unit === 'шт' || row.unit === 'уп')
    && (row.contentUnit === 'шт' || row.contentUnit === 'кг' || row.contentUnit === 'г')
  const unit = hasContent ? row.contentUnit : row.unit
  const qty = row.stock * (hasContent ? row.factor : 1)
  if (!Number.isFinite(qty)) return null
  if (unit === 'шт') return { unit, qty }
  if (unit === 'кг' || unit === 'г') return { unit: 'кг' as const, qty: unit === 'г' ? qty / 1_000 : qty }
  return null
}

type LowStockProduct = { name: string; unit: string; stock: number; comparableQty: number }

export function formatTelegramLowStock(stock: StockRow[]) {
  const warehouses = new Map<string, { name: string; products: Map<string, LowStockProduct> }>()
  for (const row of stock) {
    const actual = comparableStock(row)
    if (!actual) continue
    let warehouse = warehouses.get(row.warehouse)
    if (!warehouse) {
      warehouse = { name: clean(row.warehouseName), products: new Map() }
      warehouses.set(row.warehouse, warehouse)
    }
    const key = JSON.stringify([row.productId ?? row.name, row.unit, actual.unit])
    const product = warehouse.products.get(key) ?? { name: clean(row.name), unit: row.unit, stock: 0, comparableQty: 0 }
    product.stock += row.stock
    product.comparableQty += actual.qty
    warehouse.products.set(key, product)
  }

  const groups = [`Малые остатки по складам · меньше ${LOW_STOCK_LIMIT} шт. или ${LOW_STOCK_LIMIT} кг`]
  for (const warehouse of warehouses.values()) {
    const low = [...warehouse.products.values()]
      .filter(row => Number(row.comparableQty.toFixed(6)) < LOW_STOCK_LIMIT)
      .sort((a, b) => a.unit.localeCompare(b.unit, 'ru') || a.stock - b.stock || a.name.localeCompare(b.name, 'ru'))
    if (low.length) groups.push([warehouse.name, ...low.map(row =>
      `• ${row.name} — ${quantityFormat.format(Math.max(0, row.stock))} ${row.unit}`,
    )].join('\n'))
  }
  if (groups.length === 1) groups.push(`Товаров с остатком меньше ${LOW_STOCK_LIMIT} шт. или ${LOW_STOCK_LIMIT} кг нет.`)
  return groups.join('\n\n')
}
