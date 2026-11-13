<script setup lang="ts">
import { Globe, RefreshCw } from '@lucide/vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'

withDefaults(defineProps<{ currentVersion?: string; online?: boolean; updateAvailable?: { id: string; version: string; note: string } | null }>(), { currentVersion: '0.1.0', online: false, updateAvailable: null })
const emit = defineEmits<{ check: []; download: [id: string] }>()
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>Обновление программы</CardTitle><CardDescription>Текущая версия: {{ currentVersion }}</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <p class="flex items-center gap-2 text-sm" :class="online ? 'text-emerald-700' : 'text-red-600'"><Globe :size="16" />{{ online ? 'Интернет доступен' : 'Нет подключения к интернету' }}</p>
      <Button variant="outline" :disabled="!online" @click="emit('check')"><RefreshCw :size="16" />Проверить обновление</Button>
      <div v-if="updateAvailable" class="rounded-lg border border-lime-200 bg-lime-50 p-3 text-sm">
        <p class="font-semibold">Доступна версия {{ updateAvailable.version }}</p><p v-if="updateAvailable.note" class="mt-1 text-slate-600">{{ updateAvailable.note }}</p>
        <Button class="mt-3" :disabled="!online" @click="emit('download', updateAvailable.id)">Скачать обновление</Button>
      </div>
    </CardContent>
  </Card>
</template>
