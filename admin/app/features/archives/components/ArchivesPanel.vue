<script setup lang="ts">
import { Download, Search, Trash2 } from '@lucide/vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, DataTable, Input, toast } from '@obshaya/ui'
import { computed, onMounted, ref } from 'vue'
import type { ArchiveRow } from '../../../../admin-endpoints/archives/archives.types'
import { downloadArchive, listArchives, removeArchive } from '../../../../admin-endpoints/archives/archives.service'

const archives = ref<ArchiveRow[]>([])
const query = ref('')
const selected = ref<ArchiveRow | null>(null)
const deleteOpen = ref(false)
const rows = computed(() => archives.value.filter(row => `${row.client} ${row.direction}`.toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'))))
const columns = [{ key: 'client', label: 'Клиент' }, { key: 'direction', label: 'Направление' }, { key: 'size', label: 'Размер архива' }, { key: 'updatedAt', label: 'Последнее обновление архива' }, { key: 'actions', label: 'Действия', align: 'right' as const }]

onMounted(() => { void refresh() })
async function refresh() {
  try { archives.value = await listArchives() }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить архивы') }
}
function formatSize(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(2)} МБ` }
async function download(row: ArchiveRow) {
  try { await downloadArchive(row.id, row.fileName) }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось скачать архив') }
}
async function remove() {
  if (!selected.value) return
  try { await removeArchive(selected.value.id); deleteOpen.value = false; selected.value = null; await refresh(); toast.success('Архив удалён') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить архив') }
}
</script>

<template>
  <section class="space-y-4">
    <div class="relative w-full sm:max-w-xs"><Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input v-model="query" class="pl-9" placeholder="Найти клиента или направление" /></div>
    <DataTable :columns="columns" :rows="rows" row-key="id" empty-text="Архивы не найдены">
      <template #cell-client="{ row }"><span class="font-medium">{{ row.client }}</span></template>
      <template #cell-direction="{ value }"><Badge variant="secondary" class="rounded-full">{{ value }}</Badge></template>
      <template #cell-size="{ value }"><span class="whitespace-nowrap">{{ formatSize(value) }}</span></template>
      <template #cell-updatedAt="{ value }"><span class="whitespace-nowrap">{{ new Date(value).toLocaleString('ru-RU') }}</span></template>
      <template #cell-actions="{ row }"><div class="flex justify-end gap-1"><Button size="icon" variant="ghost" :aria-label="`Скачать архив ${row.client}`" title="Скачать архив" @click="download(row)"><Download class="size-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Удалить архив ${row.client}`" title="Удалить архив" @click="selected = row; deleteOpen = true"><Trash2 class="size-4 text-rose-600" /></Button></div></template>
    </DataTable>
    <AlertDialog v-model:open="deleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить архив?</AlertDialogTitle><AlertDialogDescription>Архив клиента «{{ selected?.client }}» будет удалён из облачного хранилища.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel @click="selected = null">Отмена</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="remove">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>
