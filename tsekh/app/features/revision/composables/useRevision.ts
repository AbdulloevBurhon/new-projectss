import { computed, onMounted, ref, watch } from 'vue'
import { changeRevision, readRevision, type RevisionRow, type RevisionSnapshot } from '../../../../endpoints/revision/service'

type Warehouse = { id: string; name: string }
const empty = (): RevisionSnapshot => ({ header: null, history: [], rows: [] })
const message = (error: unknown) => {
  const cause = error as { statusMessage?: string; data?: { statusMessage?: string; message?: string; data?: { message?: string } } }
  return cause.data?.data?.message ?? cause.data?.statusMessage ?? cause.data?.message ?? cause.statusMessage ?? 'Не удалось сохранить или загрузить ревизию.'
}

export function useRevision() {
  const warehouses = ref<Warehouse[]>([])
  const warehouse = ref('')
  const selected = ref('')
  const tab = ref('count')
  const snapshot = ref(empty())
  const error = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const pending = ref(0)
  const draft = computed(() => snapshot.value.header?.status === 'draft')
  let queue = Promise.resolve()
  let loadSequence = 0
  let failedCount = false

  async function load() {
    if (!warehouse.value || pending.value) return
    const seq = ++loadSequence
    loading.value = true
    error.value = ''
    try {
      const result = await readRevision(warehouse.value, selected.value || undefined)
      if (seq === loadSequence) { snapshot.value = result; failedCount = false }
    } catch (cause) { if (seq === loadSequence) error.value = message(cause) }
    finally { if (seq === loadSequence) loading.value = false }
  }

  async function loadWarehouses() {
    loading.value = true
    error.value = ''
    try {
      warehouses.value = await $fetch<Warehouse[]>('/api/warehouses')
      warehouse.value = warehouses.value[0]?.id ?? ''
    } catch (cause) { error.value = message(cause) }
    finally { loading.value = false }
  }

  watch(warehouse, () => { selected.value = ''; tab.value = 'count'; snapshot.value = empty(); void load() })
  watch(tab, value => {
    if (value === 'result' && draft.value) void queue.then(() => { if (!failedCount) return load() })
  })
  onMounted(loadWarehouses)

  async function open(id: string) {
    selected.value = id
    snapshot.value = { ...snapshot.value, header: null, rows: [] }
    await load()
    tab.value = id ? 'result' : 'count'
  }

  function save(row: RevisionRow, actual: number | null) {
    const id = snapshot.value.header?.id
    if (!id || !draft.value || saving.value || loading.value) return Promise.resolve(false)
    pending.value++
    const task = queue.then(async () => {
      const header = snapshot.value.header
      if (!header || header.id !== id || failedCount) return false
      try {
        const result = await changeRevision(warehouse.value, { action: 'count', id, version: header.version, lot: row.id, actual, book: row.current })
        header.version = result.version
        row.actual = actual == null ? null : Number((actual / row.factor).toFixed(9))
        row.book = actual == null ? null : row.current
        row.stale = 0
        if (row.current == null && actual == null) snapshot.value.rows = snapshot.value.rows.filter(item => item.id !== row.id)
        error.value = ''
        return true
      } catch (cause) { failedCount = true; error.value = message(cause); return false }
    })
    queue = task.then(() => { pending.value-- })
    return task
  }

  async function change(action: 'start' | 'post' | 'cancel') {
    if (saving.value || loading.value || pending.value || (failedCount && action === 'post')) return
    const header = snapshot.value.header
    if (action !== 'start' && !header) return
    saving.value = true
    error.value = ''
    try {
      const result = await changeRevision(warehouse.value, action === 'start' ? { action }
        : { action, id: header!.id, version: header!.version })
      await open(action === 'start' ? '' : result.id)
    } catch (cause) {
      await load()
      error.value = message(cause)
    } finally { saving.value = false }
  }

  return { warehouses, warehouse, selected, tab, snapshot, error, loading, saving, pending, draft,
    load, loadWarehouses, open, save, change }
}
