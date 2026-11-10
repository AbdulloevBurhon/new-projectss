<script setup lang="ts">
import { appVersionFor, readStoredLicense, syncStoredLicense } from '~/features/license/services/license-client'

const online = ref(false)
const syncing = ref(false)
const notice = ref('')
const error = ref('')
const license = ref<ReturnType<typeof readStoredLicense>>()

const expires = computed(() => license.value ? new Date(license.value.payload.expiresAt * 1000).toLocaleDateString('ru-RU') : 'Не активирована')
const remaining = computed(() => license.value ? Math.max(0, Math.ceil((license.value.payload.expiresAt * 1000 - Date.now()) / 86400000)) : 0)
function updateOnline() {
  online.value = navigator.onLine
}
async function syncLicense() {
  if (syncing.value || !navigator.onLine) return
  syncing.value = true
  notice.value = ''
  error.value = ''
  try {
    const updated = await syncStoredLicense()
    license.value = updated
    notice.value = 'Лицензия синхронизирована.'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось получить изменения лицензии.'
  } finally {
    syncing.value = false
  }
}
onMounted(() => {
  license.value = readStoredLicense()
  updateOnline()
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<template>
  <section class="inventory-panel settings-card license-settings-card" aria-label="Лицензия">
    <div class="license-settings-heading"><h2>Лицензия</h2><span class="license-globe-status" :class="{ online }" :title="online ? 'Интернет подключён' : 'Нет интернета'">🌐 {{ online ? 'Онлайн' : 'Офлайн' }}</span></div>
    <p class="inventory-muted">Доступ к приложению на этом устройстве.</p>
    <dl class="license-details">
      <div><dt>Клиент</dt><dd>{{ license?.payload.clientName || '—' }}</dd></div>
      <div><dt>Версия программы</dt><dd>{{ appVersionFor(readStoredLicense()?.payload.productId || 'tsekh') }}</dd></div>
      <div><dt>Действует до</dt><dd>{{ expires }}</dd></div>
      <div v-if="license"><dt>Осталось</dt><dd>{{ remaining }} дн.</dd></div>
    </dl>
    <button class="inventory-button secondary" type="button" :disabled="!online || syncing || !license" @click="syncLicense">
      {{ syncing ? 'Синхронизация…' : 'Получить изменения лицензии' }}
    </button>
    <p v-if="notice" class="inventory-muted" role="status">{{ notice }}</p>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.license-settings-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%; }
.license-globe-status { color:#a26712; font-size:11px; font-weight:750; }
.license-globe-status.online { color:#397a3e; }
.license-details { display:grid; gap:8px; width:100%; margin:0; }
.license-details div { display:flex; justify-content:space-between; gap:12px; font-size:12px; }
.license-details dt { color:#68768b; }
.license-details dd { margin:0; font-weight:700; text-align:right; }
</style>
