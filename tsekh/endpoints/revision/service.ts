export type RevisionHeader = {
  id: string
  status: 'draft' | 'posted' | 'cancelled'
  created: number
  closed: number | null
  actor: string | null
  version: number
}

export type RevisionRow = {
  id: string
  name: string
  barcode: string | null
  unit: string
  contentUnit: string | null
  factor: number
  current: number | null
  book: number | null
  actual: number | null
  stale: 0 | 1
}

export type RevisionSnapshot = {
  header: RevisionHeader | null
  history: RevisionHeader[]
  rows: RevisionRow[]
}

type RevisionAction = { action: 'start' }
  | { action: 'count'; id: string; version: number; lot: string; actual: number | null; book: number | null }
  | { action: 'post' | 'cancel'; id: string; version: number }

export const readRevision = (warehouse: string, id?: string) =>
  $fetch<RevisionSnapshot>('/api/stock-revision', { query: { warehouse, id } })

export const changeRevision = (warehouse: string, action: RevisionAction) =>
  $fetch<{ id: string; version: number }>('/api/stock-revision', { method: 'POST', body: { warehouse, ...action } })
