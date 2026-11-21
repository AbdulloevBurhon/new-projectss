export interface ClientHistoryItem {
  name: string
  qty: number
  unit: string
}

export interface ClientHistoryRow {
  id: string
  kind: 'sale' | 'payment'
  date: string
  paid: number
  debt: number
  remainingDebt: number
  employee: string
  account: string | null
  items: ClientHistoryItem[]
}

interface ClientDetails {
  totals: { purchases: number; debt: number }
  rows: ClientHistoryRow[]
}

export async function getClientDetails(id: string, signal?: AbortSignal): Promise<ClientDetails> {
  const result = await $fetch<Omit<ClientDetails, 'rows'> & {
    rows: (Omit<ClientHistoryRow, 'items'> & { items: string })[]
  }>(`/api/sales/clients/${encodeURIComponent(id)}`, { signal })
  return { totals: result.totals, rows: result.rows.map(row => ({ ...row, items: JSON.parse(row.items) })) }
}

export function payClientDebt(client: string, id: string, account: string, amount: number) {
  return $fetch<{ id: string }>(`/api/sales/clients/${encodeURIComponent(client)}/payments`, {
    method: 'POST',
    body: { id, account, amount },
  })
}
