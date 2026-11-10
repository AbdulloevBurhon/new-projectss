<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { Archive } from '../types/settings'
import { downloadArchive, restoreArchive, snapshotArchive } from '../services/archive'
import { parseArchive } from '../services/archive-validation'

const input = useTemplateRef<HTMLInputElement>('archive-input')
const pending = shallowRef<Archive>()
const busy = ref(false)
const error = ref('')
const notice = ref('')

async function exportData() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    downloadArchive(await snapshotArchive())
    notice.value = 'Архив подготовлен к скачиванию.'
  } catch {
    error.value = 'Не удалось подготовить архив.'
  } finally {
    busy.value = false
  }
}

async function importData(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  field.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    pending.value = parseArchive(await file.text())
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось прочитать архив.'
  } finally {
    busy.value = false
  }
}

async function restore() {
  if (busy.value || !pending.value) return
  busy.value = true
  error.value = ''
  try {
    await restoreArchive(pending.value)
    window.location.reload()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось восстановить архив.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="inventory-panel settings-card" aria-label="Архив данных">
    <h2>Архив данных</h2>
    <p class="inventory-muted">Склад, рабочие, счета, продажи и клиенты в одном файле JSON.</p>
    <input ref="archive-input" type="file" accept=".json,application/json" hidden @change="importData" />
    <div class="settings-actions">
      <button type="button" class="inventory-button primary" :disabled="busy" @click="exportData"><WorkshopIcon name="receipts" /> Экспорт</button>
      <button type="button" class="inventory-button secondary" :disabled="busy" @click="input?.click()"><WorkshopIcon name="upload" /> Импорт</button>
    </div>
    <p v-if="notice" class="inventory-muted" role="status">{{ notice }}</p>
    <p v-if="error && !pending" class="inventory-message error" role="alert">{{ error }}</p>
    <WorkshopDialog v-if="pending" title="Восстановить данные?" :busy="busy" @close="pending = undefined">
      <div class="dialog-content">
        <p>Данные из архива от {{ new Date(pending.createdAt).toLocaleString('ru-RU') }} заменят текущие записи цеха.</p>
        <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
        <div class="dialog-actions">
          <button type="button" class="inventory-button secondary" :disabled="busy" autofocus @click="pending = undefined">Отмена</button>
          <button type="button" class="inventory-button destructive" :disabled="busy" @click="restore">Восстановить</button>
        </div>
      </div>
    </WorkshopDialog>
  </section>
</template>
