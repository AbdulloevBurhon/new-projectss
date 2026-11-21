import { computed, reactive, type Ref } from 'vue'
import type { HistoryProductOption, HistoryRow } from '../types/history'

const emptyFilters = { warehouse: '', from: '', to: '', operation: '', product: '' }
export const historyOperations = ['Приход', 'Продажа', 'Перемещение · расход', 'Перемещение · приход', 'Корректировка', 'Ревизия']
const alphabetical = new Intl.Collator('ru', { numeric: true })
export const historySearchText = (text: string) => text.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
const datePart = (value: number) => String(value).padStart(2, '0')

export function useHistoryFilters(rows: Readonly<Ref<HistoryRow[]>>, productNames: () => readonly { id: string; name: string }[]) {
  const filters = reactive({ ...emptyFilters })
  const products = computed(() => {
    const catalog = new Map(productNames().map(product => [product.id, product.name]))
    const idsByName = new Map<string, string | null>()
    for (const row of rows.value) {
      if (!row.productId) continue
      const previous = idsByName.get(row.productName)
      idsByName.set(row.productName, previous === undefined || previous === row.productId ? row.productId : null)
    }

    const options = new Map<string, { name: string; aliases: Set<string> }>()
    const keys = new Map<string, string>()
    for (const row of rows.value) {
      const id = row.productId || idsByName.get(row.productName)
      const key = id ? `id:${id}` : `name:${row.productName}`
      const option = options.get(key) ?? { name: (id && catalog.get(id)) || row.productName, aliases: new Set() }
      option.aliases.add(row.productName)
      options.set(key, option)
      keys.set(row.rowKey, key)
    }

    const entries: HistoryProductOption[] = [...options].map(([key, { name, aliases }]) => ({
      key, name, searchText: historySearchText([name, ...aliases].join('\n')),
    }))
    entries.sort((first, second) => alphabetical.compare(first.name, second.name))
    return { entries, keys }
  })

  const filterKey = computed(() => JSON.stringify(filters))
  const filteredRows = computed(() => {
    const { warehouse, from, to, operation, product } = filters
    const productKeys = product ? products.value.keys : undefined
    return rows.value.filter(row => {
      if (warehouse && row.warehouseId !== warehouse || operation && row.operation !== operation
        || product && productKeys?.get(row.rowKey) !== product) return false
      if (!from && !to) return true
      const date = new Date(row.postedAt!)
      const day = `${date.getFullYear()}-${datePart(date.getMonth() + 1)}-${datePart(date.getDate())}`
      return (!from || day >= from) && (!to || day <= to)
    })
  })

  return {
    filters, filterKey, filteredRows, productOptions: computed(() => products.value.entries),
    reset: () => Object.assign(filters, emptyFilters),
  }
}
