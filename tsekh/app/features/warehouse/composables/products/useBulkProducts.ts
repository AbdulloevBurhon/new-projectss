import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Product, ProductDraft, ProductUnit } from '../../../../../endpoints/warehouse/products/products.types'
type EntryMode = 'editing' | 'countdown' | 'saved'
interface Entry {
  id: number; name: string; barcode: string
  unit: ProductUnit; contentUnit: ProductUnit
  quantityPerPiece: string | number
  productId: string | null; mode: EntryMode; seconds: number | null; deadline: number | null; queued: boolean; error: string
}
export function useBulkProducts(props: { save: (draft:ProductDraft,id?:string)=>Promise<Product|null>; error?:string }) {
let nextId = 0
let queue = Promise.resolve()
const pageSizeOptions = [10, 25, 50, 100]
const pageSize = ref(10)
const rows = ref<Entry[]>(Array.from({ length: pageSize.value }, blank))
const visibleRows = computed(() => rows.value.slice(0, pageSize.value))

function resizeRows(size: number) {
  while (rows.value.length < size) rows.value.push(blank())
  pageSize.value = size
}
function blank(): Entry {
  return { id: nextId++, name: '', barcode: '', unit: 'шт', contentUnit: 'г', quantityPerPiece: '', productId: null, mode: 'editing', seconds: null, deadline: null, queued: false, error: '' }
}

function clearRow(row: Entry) {
  Object.assign(row, { name: '', barcode: '', unit: 'шт', contentUnit: 'г', quantityPerPiece: '', productId: null, mode: 'editing', seconds: null, deadline: null, queued: false, error: '' })
}

function changed(row: Entry) {
  row.error = ''
}

function quantitySummary(row: Entry) {
  const quantity = String(row.quantityPerPiece ?? '').trim()
  return `${row.unit} → ${quantity ? `${quantity} ${row.contentUnit}` : '—'}`
}

function editRow(row: Entry) {
  if (row.queued) return
  row.deadline = null
  row.seconds = null
  row.mode = 'editing'
  row.error = ''
}

function acceptRow(row: Entry) {
  if (row.queued || !row.name.trim()) return
  if (row.mode === 'countdown') return editRow(row)
  if (row.productId) return saveRow(row, true)
  row.deadline = Date.now() + 20_000
  row.seconds = 20
  row.mode = 'countdown'
}

function saveRow(row: Entry, update = false) {
  if ((!update && row.mode !== 'countdown') || row.queued || !row.name.trim()) return
  const isNew = !row.productId
  row.queued = true
  row.error = ''
  if (!update) {
    row.deadline = null
    row.seconds = null
  }
  queue = queue.then(async () => {
    const quantity = String(row.quantityPerPiece ?? '').trim()
    const hasContents = quantity !== ''
    const draft: ProductDraft = {
      name: row.name,
      barcode: row.barcode,
      unit: row.unit,
      packaged: hasContents,
      contentUnit: row.contentUnit,
      quantityPerPiece: quantity,
    }
    try {
      const saved = await props.save(draft, row.productId ?? undefined)
      if (!saved) {
        row.error = props.error || 'Не удалось сохранить товар. Проверьте данные и попробуйте ещё раз.'
        row.queued = false
        row.mode = 'editing'
        return
      }
      if (isNew) clearRow(row)
      else {
        row.productId = saved.id
        row.queued = false
        row.mode = 'saved'
      }
    } catch {
      row.error = 'Не удалось сохранить товар. Проверьте соединение с локальной базой.'
      row.queued = false
      row.mode = 'editing'
    }
  })
}

let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => {
    const now = Date.now()
    for (const row of rows.value) {
      if (row.deadline === null || row.mode !== 'countdown' || row.queued) continue
      row.seconds = Math.max(0, Math.ceil((row.deadline - now) / 1000))
      if (row.seconds === 0) saveRow(row)
    }
  }, 250)
})

onBeforeUnmount(() => { if (timer !== undefined) window.clearInterval(timer) })
return { rows, visibleRows, pageSizeOptions, resizeRows, changed, quantitySummary, acceptRow, editRow }
}
