<script setup lang="ts">
import { Download, Upload } from '@lucide/vue'
import { ref } from 'vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'

const props = withDefaults(defineProps<{ cloudCopyEnabled?: boolean; online?: boolean; uploading?: boolean }>(), { cloudCopyEnabled: false, online: false, uploading: false })
const emit = defineEmits<{ export: []; import: [file: File]; toggleCloudCopy: [enabled: boolean] }>()
const fileInput = ref<HTMLInputElement>()

function importFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('import', file)
}
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>Архив данных</CardTitle><CardDescription>Ручная копия JSON. При включённой облачной копии файл появится в админке.</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="size-4 accent-lime-500" :checked="props.cloudCopyEnabled" :disabled="!props.online" @change="emit('toggleCloudCopy', ($event.target as HTMLInputElement).checked)">После экспорта отправлять копию в облако</label>
      <div class="flex gap-2">
      <Button :disabled="props.uploading" @click="emit('export')"><Download :size="16" />{{ props.uploading ? 'Сохраняем…' : 'Экспорт' }}</Button>
      <Button variant="outline" @click="fileInput?.click()"><Upload :size="16" />Импорт</Button>
      </div>
      <input ref="fileInput" class="hidden" type="file" accept="application/json,.json" @change="importFile">
    </CardContent>
  </Card>
</template>
