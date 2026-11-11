import { onMounted, onUnmounted, readonly, ref } from 'vue'

export function useOnlineStatus() {
  const isOnline = ref(true)

  function updateStatus() {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateStatus)
    window.removeEventListener('offline', updateStatus)
  })

  return { isOnline: readonly(isOnline) }
}
