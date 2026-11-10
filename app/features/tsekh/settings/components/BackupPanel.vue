<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { Archive, BackupStatus } from '../types/settings'
import { downloadArchive } from '../services/archive'
import { chooseBackupFolder, clearBackupFolder, readBackupFolder } from '../services/backup-folder'
import { readBackupValue } from '../services/backup-storage'
import { readSchedule, resetSchedule, saveSchedule } from '../services/backup-schedule'
import { readBackupStatus } from '../services/scheduled-backup'
import BackupDaysSelect from './BackupDaysSelect.vue'

const last = useState<BackupStatus | undefined>('workshop-backup-last', () => undefined)
const runtimeError = useState('workshop-backup-error', () => '')
const days = ref<number[]>([])
const time = ref('18:00')
const folder = ref('')
const enabled = ref(false)
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const schedule = readSchedule()
    if (schedule) {
      enabled.value = true
      days.value = schedule.days
      time.value = schedule.time
    }
    const [handle, status] = await Promise.all([readBackupFolder(), readBackupStatus()])
    folder.value = handle?.name ?? ''
    if (status && (!last.value || status.slot >= last.value.slot)) last.value = status
  } catch {
    error.value = 'Не удалось загрузить настройки резервного копирования.'
  }
})

async function action(task: () => void | Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await task()
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
      error.value = cause instanceof Error ? cause.message : 'Не удалось выполнить действие.'
    }
  } finally {
    busy.value = false
  }
}

function save() {
  saveSchedule(days.value, time.value)
  enabled.value = true
}

function reset() {
  resetSchedule()
  enabled.value = false
  days.value = []
  time.value = '18:00'
}

async function downloadLast() {
  const archive = await readBackupValue<Archive>('archive')
  if (archive) downloadArchive(archive)
}
</script>

<template>
  <section class="inventory-panel settings-card" aria-label="Резервные копии">
    <h2>Резервные копии</h2>
    <p class="inventory-muted">Копии создаются в выбранные дни по времени браузера. Пропущенная копия создаётся после открытия приложения.</p>
    <form class="settings-fields" @submit.prevent="action(save)">
      <BackupDaysSelect v-model="days" />
      <label class="inventory-field">Время<input v-model="time" type="time" required /></label>
      <div class="settings-actions">
        <button type="button" class="inventory-button secondary settings-icon" title="Отключить расписание" aria-label="Отключить расписание" :disabled="busy || !enabled" @click="action(reset)"><WorkshopIcon name="reset" /></button>
        <button type="submit" class="inventory-button primary settings-icon" title="Сохранить расписание" aria-label="Сохранить расписание" :disabled="busy"><WorkshopIcon name="save" /></button>
      </div>
    </form>
    <p class="inventory-muted" role="status">{{ enabled ? 'Расписание включено' : 'Расписание отключено' }}</p>
    <div class="settings-folder">
      <span class="inventory-muted">Папка резервных копий</span>
      <strong>{{ folder || 'Хранилище браузера' }}</strong>
      <div class="settings-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="action(async () => { folder = (await chooseBackupFolder())?.name ?? folder })">Выбрать папку</button>
        <button v-if="folder" type="button" class="icon-button secondary" title="Сбросить папку" aria-label="Сбросить папку" :disabled="busy" @click="action(async () => { await clearBackupFolder(); folder = '' })"><WorkshopIcon name="reset" /></button>
      </div>
    </div>
    <template v-if="last">
      <small class="inventory-muted">Последняя копия · {{ new Date(last.createdAt).toLocaleString('ru-RU') }} · {{ last.destination === 'folder' ? 'в папке' : 'в браузере' }}</small>
      <button type="button" class="inventory-button secondary" :disabled="busy" @click="action(downloadLast)">Скачать последнюю копию</button>
    </template>
    <p v-if="error || runtimeError" class="inventory-message error" role="alert">{{ error || runtimeError }}</p>
  </section>
</template>
