<script setup lang="ts">
import WorkshopDialog from '~/features/shawarma/components/ShawarmaDialog.vue'
import WorkshopIcon from '~/features/shawarma/components/ShawarmaIcon.vue'
import { createShawarmaArchive, downloadShawarmaArchive, parseShawarmaArchive, restoreShawarmaArchive, type ShawarmaArchive } from '../services/shawarma-archive'

const input = useTemplateRef<HTMLInputElement>('archive-input')
const pending = shallowRef<ShawarmaArchive>()
const error = ref('')
const notice = ref('')

function exportData() {
  error.value = ''
  try { downloadShawarmaArchive(createShawarmaArchive()); notice.value = 'Архив шаурмичной скачан.' }
  catch { error.value = 'Не удалось подготовить архив.' }
}

async function importData(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  field.value = ''
  if (!file) return
  error.value = ''
  try { pending.value = parseShawarmaArchive(await file.text()) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось прочитать архив.' }
}

function restore() {
  if (!pending.value) return
  try { restoreShawarmaArchive(pending.value); window.location.reload() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось восстановить данные.' }
}
</script>

<template>
  <section class="inventory-panel settings-card" aria-label="Архив данных шаурмичной">
    <h2>Архив данных</h2>
    <p class="inventory-muted">Экспорт и восстановление данных только шаурмичной. Данные «Цеха» не затрагиваются.</p>
    <input ref="archive-input" type="file" accept=".json,application/json" hidden @change="importData" />
    <div class="settings-actions">
      <button type="button" class="inventory-button primary" @click="exportData"><WorkshopIcon name="receipts" /> Экспорт</button>
      <button type="button" class="inventory-button secondary" @click="input?.click()"><WorkshopIcon name="upload" /> Импорт</button>
    </div>
    <p v-if="notice" class="inventory-muted" role="status">{{ notice }}</p>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
    <WorkshopDialog v-if="pending" title="Восстановить данные шаурмичной?" @close="pending = undefined">
      <div class="dialog-content">
        <p>Данные шаурмичной из архива от {{ new Date(pending.createdAt).toLocaleString('ru-RU') }} заменят её текущие данные. Данные «Цеха» останутся без изменений.</p>
        <div class="dialog-actions">
          <button type="button" class="inventory-button secondary" autofocus @click="pending = undefined">Отмена</button>
          <button type="button" class="inventory-button destructive" @click="restore">Восстановить</button>
        </div>
      </div>
    </WorkshopDialog>
  </section>
</template>
