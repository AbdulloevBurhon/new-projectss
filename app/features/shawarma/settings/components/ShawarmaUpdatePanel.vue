<script setup lang="ts">
import { appVersionFor, checkForUpdate, getDeviceId, readStoredLicense, updateDownloadUrl } from '~/features/license/services/license-client'

const busy = ref(false)
const progress = ref(0)
const message = ref('')
const error = ref('')
const update = shallowRef<Awaited<ReturnType<typeof checkForUpdate>>>()
const online = ref(false)

function setOnline() { online.value = navigator.onLine }
async function check() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  update.value = undefined
  try {
    if (!navigator.onLine) throw new Error('Подключитесь к интернету для проверки обновления.')
    update.value = await checkForUpdate()
    message.value = update.value.updateAvailable ? 'Доступна версия ' + update.value.version : 'Установлена последняя версия.'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось проверить обновление.'
  } finally {
    busy.value = false
  }
}
async function download() {
  if (!update.value?.downloadUrl || busy.value) return
  busy.value = true
  progress.value = 0
  error.value = ''
  message.value = 'Подготовка загрузки…'
  try {
    const url = updateDownloadUrl(update.value.downloadUrl)
    const host = window as typeof window & { workshopUpdate?: { install: (url: string, sha256: string, version: string, deviceId: string, licenseId: string) => Promise<unknown> } }
    const license = readStoredLicense()
    if (host.workshopUpdate && license) {
      message.value = 'Загрузка и проверка обновления…'
      await host.workshopUpdate.install(url, update.value.sha256!, update.value.version!, getDeviceId(), license.payload.licenseId)
      message.value = 'Обновление проверено. Программа перезапустится.'
      return
    }

    const response = await fetch(url)
    if (!response.ok || !response.body) throw new Error('Не удалось скачать обновление.')
    const total = Number(response.headers.get('content-length')) || 0
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      progress.value = total ? Math.min(99, Math.round(loaded * 100 / total)) : 0
      message.value = total ? 'Загрузка ' + progress.value + '%' : 'Загрузка обновления…'
    }
    const blob = new Blob(chunks, { type: 'application/octet-stream' })
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
    const actualHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    if (actualHash !== update.value.sha256) throw new Error('Контрольная сумма не совпала. Обновление отменено.')
    progress.value = 100
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = update.value.fileName || 'Shawarma-update.exe'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
    message.value = 'Файл проверен и скачан. Закройте браузер и запустите новый установщик.'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось установить обновление.'
  } finally {
    busy.value = false
  }
}
function handleNativeProgress(event: Event) {
  const detail = (event as CustomEvent<{ percent: number }>).detail
  progress.value = detail?.percent || 0
  message.value = progress.value ? 'Загрузка ' + progress.value + '%' : 'Загрузка обновления…'
}
onMounted(() => {
  setOnline()
  window.addEventListener('workshop:update-progress', handleNativeProgress)
  window.addEventListener('online', setOnline)
  window.addEventListener('offline', setOnline)
})
onBeforeUnmount(() => {
  window.removeEventListener('workshop:update-progress', handleNativeProgress)
  window.removeEventListener('online', setOnline)
  window.removeEventListener('offline', setOnline)
})
</script>

<template>
  <section class="inventory-panel settings-card update-settings-card" aria-label="Обновление программы">
    <div class="update-heading"><h2>Обновление программы</h2><span class="license-globe-status" :class="{ online }">🌐 {{ online ? 'Интернет есть' : 'Офлайн' }}</span></div>
    <p class="inventory-muted">Текущая версия: <strong>{{ appVersionFor(readStoredLicense()?.payload.productId || 'tsekh') }}</strong></p>
    <button class="inventory-button secondary" type="button" :disabled="busy || !online" @click="check">{{ busy && !update ? 'Проверяем…' : 'Проверить обновление' }}</button>
    <div v-if="update?.updateAvailable" class="update-available">
      <strong>Версия {{ update.version }}</strong>
      <p class="inventory-muted">{{ update.notes || 'Описание изменений не указано.' }}</p>
      <button class="inventory-button primary" type="button" :disabled="busy" @click="download">{{ busy ? 'Загрузка…' : 'Скачать обновление' }}</button>
      <progress v-if="busy" :value="progress" max="100"></progress>
    </div>
    <p v-if="message" class="inventory-muted" role="status">{{ message }}</p>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.update-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%; }
.license-globe-status { color:#a26712; font-size:11px; font-weight:750; }
.license-globe-status.online { color:#397a3e; }
.update-available { display:grid; gap:8px; width:100%; padding-top:10px; border-top:1px solid var(--line); }
.update-available p { margin:0; }
.update-available progress { width:100%; height:8px; accent-color:#91c341; }
</style>
