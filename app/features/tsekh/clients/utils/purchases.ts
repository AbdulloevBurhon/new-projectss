import type { AccountMovement } from '~/features/tsekh/accounts/types/accounts'
import { newestFirst } from '~/features/tsekh/accounts/utils/ledger'
import { matchesName } from '~/features/tsekh/warehouse/utils/format'
import type { Client } from '../types/clients'

export function matchesClient(client: Client, query: string) {
  const digits = query.replace(/\D/g, '')
  return matchesName(client.name, query) || matchesName(client.phone, query)
    || (/^[\d\s+().-]+$/.test(query) && !!digits && client.phone.replace(/\D/g, '').includes(digits))
}

export function clientPurchases(movements: AccountMovement[]) {
  const purchases = new Map<string, ReturnType<typeof purchase>[]>()
  for (const movement of newestFirst(movements)) {
    const { clientSale, sale } = movement
    if (!clientSale || !sale) continue
    const rows = purchases.get(clientSale.clientId) ?? []
    rows.push(purchase(movement, sale, clientSale.totalCents))
    purchases.set(clientSale.clientId, rows)
  }
  return purchases
}

function purchase(movement: AccountMovement, lines: NonNullable<AccountMovement['sale']>, total: number) {
  return { ...movement, lines, total, debt: total - movement.cents, doors: lines.reduce((sum, line) => sum + line.quantity, 0) }
}

export type ClientPurchase = ReturnType<typeof purchase>

export function purchaseTotals(rows: ClientPurchase[]) {
  return rows.reduce((sum, row) => ({ doors: sum.doors + row.doors, total: sum.total + row.total, debt: sum.debt + row.debt }),
    { doors: 0, total: 0, debt: 0 })
}
