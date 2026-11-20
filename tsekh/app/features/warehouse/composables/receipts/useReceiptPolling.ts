import { onMounted,onBeforeUnmount } from 'vue'
import { loadStockReceipts } from '../../../../../endpoints/warehouse/stock-receipts/service'
import type { useReceiptState } from './useReceiptState'
export function useReceiptPolling(state:ReturnType<typeof useReceiptState>,refreshAccounts:()=>Promise<unknown>){
const {rows,lines,errors,busy,loadError,now,saving,posted,latest,fields,revision,nextPoll}=state
  let serverOffset = 0
  let loaded = false
  let interval: ReturnType<typeof setInterval> | undefined
  let refreshing = false
  async function reload() {
    if (refreshing) return
    refreshing = true
    const requestedRevision = revision.value
    try {
      const result = await loadStockReceipts()
      if (requestedRevision !== revision.value || saving.size || Object.values(busy).some(Boolean)) return
      serverOffset = result.serverTime - Date.now()
      now.value = Date.now() + serverOffset
      const previous = latest.value
      const postedCount = posted.value.length
      rows.value = result.rows
      for (const row of Object.values(latest.value)) {
        if (row.status === 'posted') {
          if (previous[row.productId]?.status === 'pending') {
            delete lines[row.productId]
            delete errors[row.productId]
          }
        } else if (previous[row.productId]?.id !== row.id || !lines[row.productId]) {
          lines[row.productId] = fields(row)
        }
      }
      if (loaded && posted.value.length !== postedCount) {
        try { await refreshAccounts() } catch { loadError.value = 'Не удалось обновить остаток счёта.'; return }
      }
      loaded = true
      loadError.value = ''
    } catch {
      loadError.value = 'Не удалось загрузить поступления.'
    } finally {
      refreshing = false
    }
  }
  onMounted(() => {
    void reload()
    interval = setInterval(() => {
      now.value = Date.now() + serverOffset
      if (Date.now() < nextPoll.value) return
      const pending = rows.value.some(row => row.status === 'pending')
      nextPoll.value = Date.now() + (pending ? 750 : 5000)
      void reload()
    }, 250)
  })
  onBeforeUnmount(() => clearInterval(interval))
}
