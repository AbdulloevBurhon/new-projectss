<script setup lang="ts">
import { Cloud, Folder } from '@lucide/vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'

withDefaults(defineProps<{ localPath?: string; cloudPath?: string }>(), { localPath: '', cloudPath: '' })
const emit = defineEmits<{ chooseLocal: []; chooseCloud: [] }>()
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>Папки хранения</CardTitle><CardDescription>Выберите места для резервных копий.</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <div class="space-y-2"><Label>Папка на устройстве</Label><div class="flex gap-2"><Input :model-value="localPath" readonly placeholder="Не выбрана" /><Button variant="outline" aria-label="Выбрать папку на устройстве" @click="emit('chooseLocal')"><Folder :size="16" /></Button></div></div>
      <div class="space-y-2"><Label>Дополнительная папка / облако</Label><div class="flex gap-2"><Input :model-value="cloudPath" readonly placeholder="Не выбрана" /><Button variant="outline" aria-label="Выбрать облачную папку" @click="emit('chooseCloud')"><Cloud :size="16" /></Button></div></div>
    </CardContent>
  </Card>
</template>
