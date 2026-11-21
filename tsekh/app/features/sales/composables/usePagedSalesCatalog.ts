import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { catalogBarcode, catalogPage, type SaleGoods } from '../../../../endpoints/sales/service'
import { barcodeKey } from '../../../components/barcode/barcode'

export function usePagedSalesCatalog(warehouse: Ref<string>, search: Ref<string>) {
  const rows = shallowRef<SaleGoods[]>([])
  const pending = ref(false)
  const more = ref(false)
  const error = ref('')
  let sequence = 0
  let cursor: SaleGoods | undefined
  let delayed: ReturnType<typeof setTimeout> | undefined
  const byBarcode = new Map<string, Promise<SaleGoods[]>>()

  async function loadMore() {
    if (pending.value || !more.value || !warehouse.value) return
    const version = sequence
    pending.value = true
    error.value = ''
    try {
      const page = await catalogPage(warehouse.value, search.value.trim(), cursor)
      if (version !== sequence) return
      const seen = new Set(rows.value.map(row => row.id))
      rows.value = [...rows.value, ...page.rows.filter(row => !seen.has(row.id))]
      cursor = page.rows.at(-1)
      more.value = page.more && !!cursor
    } catch {
      if (version === sequence) error.value = 'Не удалось загрузить товары.'
    } finally {
      if (version === sequence) pending.value = false
    }
  }

  function reset(wait = false) {
    sequence++
    clearTimeout(delayed)
    rows.value = []
    cursor = undefined
    pending.value = false
    error.value = ''
    more.value = !!warehouse.value
    if (wait && more.value) delayed = setTimeout(loadMore, 150)
    else void loadMore()
  }

  function refresh() {
    byBarcode.clear()
    reset()
  }

  function lookup(rawCode: string) {
    const code = barcodeKey(rawCode)
    const cached = byBarcode.get(code)
    if (cached) return cached
    const request = catalogBarcode(warehouse.value, code)
    byBarcode.set(code, request)
    const forget = () => { if (byBarcode.get(code) === request) byBarcode.delete(code) }
    void request.then(found => { if (!found.length) forget() }, forget)
    return request
  }

  watch(warehouse, refresh, { flush: 'sync' })
  watch(search, () => reset(true), { flush: 'sync' })
  onBeforeUnmount(() => { clearTimeout(delayed); sequence++ })
  return { rows, pending, more, error, loadMore, refresh, lookup }
}
