import { warehouseTypeLabels, type GetWarehousesResult, type Warehouse, type WarehouseDraft } from './get-warehouses.types'

export const warehousesKey = 'obshaya:data:tsekh:warehouses'

export function getLegacyWarehouses(): GetWarehousesResult {
  const raw = localStorage.getItem(warehousesKey)
  if (raw === null) return []

  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string'
      || typeof row.name !== 'string'
      || (row.type != null && !Object.hasOwn(warehouseTypeLabels, row.type)))) {
    throw new Error('Не удалось прочитать сохранённые склады.')
  }
  return rows
}

export function validateWarehouseDraft(draft: WarehouseDraft): WarehouseDraft {
  const name = draft.name.trim()
  const { type } = draft
  if (!name || name.length > 120) throw new Error('Название склада должно содержать от 1 до 120 символов.')
  if (!Object.hasOwn(warehouseTypeLabels, type)) throw new Error('Выберите тип склада.')
  return { name, type }
}

export function saveWarehouses(rows: GetWarehousesResult) {
  const value = JSON.stringify(rows)
  if (localStorage.getItem(warehousesKey) !== value) localStorage.setItem(warehousesKey, value)
}

export function getWarehouses() {
  return $fetch<GetWarehousesResult>('/api/warehouses')
}
