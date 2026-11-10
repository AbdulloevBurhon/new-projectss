<script setup lang="ts">
import WorkshopIcon from '~/features/shawarma/components/ShawarmaIcon.vue'
import { clearShawarmaSchedule, downloadLastShawarmaBackup, readLastShawarmaBackup, readShawarmaSchedule, runShawarmaBackup, saveShawarmaSchedule, type ShawarmaBackupStatus } from '../services/shawarma-backup'

const dayOptions = [{ value: 1, label: 'Пн' }, { value: 2, label: 'Вт' }, { value: 3, label: 'Ср' }, { value: 4, label: 'Чт' }, { value: 5, label: 'Пт' }, { value: 6, label: 'Сб' }, { value: 0, label: 'Вс' }]
const days = ref<number[]>([])
const time = ref('18:00')
const enabled = ref(false)
const status = ref<ShawarmaBackupStatus>()
const error = ref('')
const notice = ref('')
const busy = ref(false)
let timer: number | undefined

function toggleDay(day: number) { days.value = days.value.includes(day) ? days.value.filter(value => value !== day) : [...days.value, day] }
function save() {
  try { saveShawarmaSchedule(days.value, time.value); enabled.value = true; error.value = ''; notice.value = 'Расписание сохранено.'; void checkBackup() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить расписание.' }
}
function reset() { clearShawarmaSchedule(); enabled.value = false; days.value = []; time.value = '18:00'; notice.value = 'Расписание отключено.'; error.value = '' }
async function checkBackup() {
  if (busy.value) return
  busy.value = true
  try {
    const next = await runShawarmaBackup()
    if (next) status.value = next
    else status.value = (await readLastShawarmaBackup()).status
  } catch { error.value = 'Не удалось создать резервную копию в хранилище шаурмичной.' }
  finally { busy.value = false }
}
async function download() {
  try { await downloadLastShawarmaBackup() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось скачать резервную копию.' }
}

onMounted(async () => {
  const schedule = readShawarmaSchedule()
  if (schedule) { enabled.value = true; days.value = schedule.days; time.value = schedule.time }
  await checkBackup()
  timer = window.setInterval(() => void checkBackup(), 30_000)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="inventory-panel settings-card" aria-label="Резервные копии шаурмичной">
    <h2>Резервные копии</h2>
    <p class="inventory-muted">Копии содержат только данные шаурмичной и сохраняются локально в приложении.</p>
    <div class="shawarma-days" role="group" aria-label="Дни резервного копирования">
      <button v-for="day in dayOptions" :key="day.value" type="button" class="inventory-button" :class="days.includes(day.value) ? 'primary' : 'secondary'" :aria-pressed="days.includes(day.value)" @click="toggleDay(day.value)">{{ day.label }}</button>
    </div>
    <label class="inventory-field">Время<input v-model="time" type="time" /></label>
    <div class="settings-actions">
      <button type="button" class="inventory-button secondary settings-icon" title="Отключить расписание" aria-label="Отключить расписание" :disabled="!enabled" @click="reset"><WorkshopIcon name="reset" /></button>
      <button type="button" class="inventory-button primary settings-icon" title="Сохранить расписание" aria-label="Сохранить расписание" @click="save"><WorkshopIcon name="save" /></button>
    </div>
    <p class="inventory-muted" role="status">{{ enabled ? 'Расписание включено' : 'Расписание отключено' }}<span v-if="busy"> · Проверка…</span></p>
    <template v-if="status">
      <small class="inventory-muted">Последняя копия: {{ new Date(status.createdAt).toLocaleString('ru-RU') }}</small>
      <button type="button" class="inventory-button secondary" @click="download">Скачать последнюю копию</button>
    </template>
    <p v-if="notice" class="inventory-muted" role="status">{{ notice }}</p>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.shawarma-days { display:flex; flex-wrap:wrap; gap:6px; }
.shawarma-days button { min-width:42px; padding-inline:9px; }
</style>
