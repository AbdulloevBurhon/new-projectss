<script setup lang="ts">
import { Save } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import type { BackupSchedule } from '../types'

const emit = defineEmits<{ save: [schedule: BackupSchedule] }>()
const enabled = ref(false)
const cloudCopy = ref(false)
const time = ref('18:00')
const intervalHours = ref(1)
const intervalMinutes = ref(0)
const days = ref<string[]>([])
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const intervalValid = computed(() => intervalHours.value >= 0 && intervalMinutes.value >= 0 && intervalMinutes.value <= 59 && intervalHours.value * 60 + intervalMinutes.value > 0)

function toggleDay(day: string) {
  days.value = days.value.includes(day) ? days.value.filter(item => item !== day) : [...days.value, day]
}

function saveSchedule() {
  emit('save', {
    enabled: enabled.value,
    days: [...days.value],
    time: time.value,
    cloudCopy: cloudCopy.value,
    intervalHours: intervalHours.value,
    intervalMinutes: intervalMinutes.value,
  })
}
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>Резервные копии</CardTitle><CardDescription>Создание копий по расписанию.</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <label class="flex items-center gap-2 text-sm"><input v-model="enabled" type="checkbox" class="size-4 accent-lime-500">Включить расписание</label>
      <div class="flex flex-wrap gap-2"><label v-for="day in weekdays" :key="day" class="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 text-xs"><input type="checkbox" :checked="days.includes(day)" class="accent-lime-500" @change="toggleDay(day)">{{ day }}</label></div>
      <div class="space-y-2">
        <Label>Интервал автосохранения</Label>
        <div class="flex items-center gap-3">
          <label class="flex min-w-0 flex-1 items-center gap-2 text-sm"><Input v-model.number="intervalHours" type="number" min="0" max="999" step="1" aria-label="Часы интервала" /><span>ч</span></label>
          <label class="flex min-w-0 flex-1 items-center gap-2 text-sm"><Input v-model.number="intervalMinutes" type="number" min="0" max="59" step="1" aria-label="Минуты интервала" /><span>мин</span></label>
        </div>
        <p v-if="!intervalValid" class="text-xs text-red-600" role="alert">Укажите интервал больше нуля; минуты — от 0 до 59.</p>
      </div>
      <div class="flex items-end gap-3"><div class="flex-1 space-y-2"><Label for="backup-time">Время</Label><Input id="backup-time" v-model="time" type="time" /></div><label class="mb-2 flex items-center gap-2 text-xs"><input v-model="cloudCopy" type="checkbox" class="size-4 accent-lime-500">Копировать в облако</label></div>
      <Button :disabled="!intervalValid || (enabled && !days.length)" @click="saveSchedule"><Save :size="16" />Сохранить расписание</Button>
    </CardContent>
  </Card>
</template>
