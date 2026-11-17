<script setup lang="ts">
import { Save } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import type { BackupSchedule } from '../types'

const emit = defineEmits<{ save: [schedule: BackupSchedule]; downloadLast: [] }>()
const props = withDefaults(defineProps<{ schedule?: BackupSchedule; lastBackup?: string; productName?: string }>(), {
  productName: 'Цех',
})
const cloudCopy = ref(false)
const hours = ref<number | string>(0)
const minutes = ref<number | string>(0)
const intervalValid = computed(() => {
  const h = Number(hours.value)
  const m = Number(minutes.value)
  return Number.isInteger(h) && h >= 0
    && Number.isInteger(m) && m >= 0 && m <= 59
    && h * 60 + m <= 1440
})

watch(() => props.schedule, (schedule) => {
  if (!schedule) return
  cloudCopy.value = schedule.cloudCopy
  const interval = schedule.intervalMinutes
  hours.value = Math.floor(interval / 60)
  minutes.value = interval % 60
}, { immediate: true })

function saveSchedule() {
  if (!intervalValid.value) return

  emit('save', {
    intervalMinutes: Number(hours.value) * 60 + Number(minutes.value),
    cloudCopy: cloudCopy.value,
  })
}
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>Резервные копии</CardTitle><CardDescription>Копии создаются по расписанию, пока открыто приложение «{{ productName }}». Пропущенная копия создаётся после входа.</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Интервал между копиями</legend>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="backup-interval-hours">Часы</Label>
            <Input id="backup-interval-hours" v-model="hours" type="number" min="0" max="24" step="1" />
          </div>
          <div class="space-y-1">
            <Label for="backup-interval-minutes">Минуты</Label>
            <Input id="backup-interval-minutes" v-model="minutes" type="number" min="0" max="59" step="1" />
          </div>
        </div>
        <p v-if="!intervalValid" class="text-xs text-red-600" role="alert">Укажите интервал до 24 часов и от 0 до 59 минут.</p>
      </fieldset>
      <label class="flex items-center gap-2 text-sm"><input v-model="cloudCopy" type="checkbox" class="size-4 accent-lime-500">Копировать в облако</label>
      <Button :disabled="!intervalValid" @click="saveSchedule"><Save :size="16" />Сохранить расписание</Button>
      <p v-if="lastBackup" class="text-sm text-slate-600">Последняя копия · {{ lastBackup }}</p>
      <Button v-if="lastBackup" variant="outline" @click="emit('downloadLast')">Скачать последнюю копию</Button>
    </CardContent>
  </Card>
</template>
