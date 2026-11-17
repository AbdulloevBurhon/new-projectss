import { warehouseTypeLabels, type GetWarehousesResult, type Warehouse, type WarehouseDraft } from './get-warehouses.types'

export const warehousesKey = 'obshaya:data:production:warehouses'

export function getWarehouses(): GetWarehousesResult {
  const raw = localStorage.getItem(warehousesKey)
  if (raw === null) return []

  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string'
      || typeof row.name !== 'string'
      || (row.type !== undefined && !Object.hasOwn(warehouseTypeLabels, row.type)))) {
    throw new Error('Не удалось прочитать сохранённые склады.')
  }
  return rows
}

export function validateWarehouseDraft(draft: WarehouseDraft): WarehouseDraft {
  const name = draft.name.trim()
  const { type } = draft
  if (!name) throw new Error('Введите название склада.')
  if (!Object.hasOwn(warehouseTypeLabels, type)) throw new Error('Выберите тип склада.')
  return { name, type }
}

export async function changeWarehouses(change: (rows: Warehouse[]) => Warehouse[]): Promise<void> {
  function save() {
    const next = change(getWarehouses())
    localStorage.setItem(warehousesKey, JSON.stringify(next))
  }

  return navigator.locks ? navigator.locks.request(warehousesKey, save) : save()
}
