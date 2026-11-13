<script setup lang="ts">
import { Download, Info, PackagePlus, Pencil, Trash2, Upload } from '@lucide/vue'
import { DataTable, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea, toast } from '@obshaya/ui'
import { onMounted, ref } from 'vue'
import { downloadUpdate, editUpdate, listUpdateReceipts, listUpdates, publishUpdate, removeUpdate } from '../../../../admin-endpoints/updates/updates.service'
import type { UpdateReceipt } from '../../../../admin-endpoints/updates/updates.types'

type UpdatePackage = { id: string; name: string; direction: string; version: string; fileName: string; size: number; note: string; uploadedAt: string; fileUrl?: string }

const packages = ref<UpdatePackage[]>([])
const addOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)
const infoOpen = ref(false)
const direction = ref('Цех')
const name = ref('')
const version = ref('')
const note = ref('')
const file = ref<File | null>(null)
const selectedPackage = ref<UpdatePackage | null>(null)
const editName = ref('')
const editVersion = ref('')
const editNote = ref('')
const updatedClients = ref<UpdateReceipt[]>([])
const packageColumns = [{ key: 'number', label: '№' }, { key: 'name', label: 'Название' }, { key: 'direction', label: 'Направление' }, { key: 'version', label: 'Версия' }, { key: 'fileName', label: 'EXE-файл' }, { key: 'size', label: 'Размер' }, { key: 'note', label: 'Заметка' }, { key: 'uploadedAt', label: 'Добавлено' }, { key: 'actions', label: 'Действия', align: 'right' as const }]
const infoColumns = [{ key: 'client', label: 'Клиент' }, { key: 'device', label: 'Устройство' }, { key: 'version', label: 'Версия' }, { key: 'installedAt', label: 'Статус' }]

onMounted(() => { void refreshPackages() })
async function refreshPackages() {
  try { packages.value = await listUpdates() }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить обновления') }
}

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file.value && !name.value) name.value = file.value.name.replace(/\.exe$/i, '')
}
function fileSize(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} МБ` }
async function openInfo(row: UpdatePackage) {
  selectedPackage.value = row; infoOpen.value = true; updatedClients.value = []
  try { updatedClients.value = await listUpdateReceipts(row.id) }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить статус клиентов') }
}
function openEdit(row: UpdatePackage) { selectedPackage.value = row; editName.value = row.name; editVersion.value = row.version; editNote.value = row.note; editOpen.value = true }
async function saveEdit() {
  if (!selectedPackage.value || !editName.value.trim() || !editVersion.value.trim()) return toast.error('Заполните название и версию')
  try { await editUpdate(selectedPackage.value.id, { name: editName.value.trim(), version: editVersion.value.trim(), note: editNote.value.trim() }); editOpen.value = false; await refreshPackages(); toast.success('Обновление сохранено') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось изменить обновление') }
}
async function downloadPackage(row: UpdatePackage) {
  try { await downloadUpdate(row.id, row.fileName) }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось скачать EXE') }
}
async function removePackage() {
  if (!selectedPackage.value) return
  try { await removeUpdate(selectedPackage.value.id); deleteOpen.value = false; await refreshPackages(); toast.success('Пакет удалён') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить пакет') }
}
async function addPackage() {
  if (!file.value || !name.value.trim() || !version.value.trim()) return toast.error('Укажите название и версию, затем выберите EXE-файл')
  try { await publishUpdate({ direction: direction.value, name: name.value.trim(), version: version.value.trim(), note: note.value.trim(), file: file.value }); addOpen.value = false; file.value = null; name.value = ''; version.value = ''; note.value = ''; await refreshPackages(); toast.success('Обновление опубликовано для направления') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить обновление') }
}
</script>

<template>
  <section class="space-y-5">
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-end gap-3"><Button @click="addOpen = true"><PackagePlus class="size-4" />Добавить обновление</Button></div>
      <DataTable :columns="packageColumns" :rows="packages" row-key="id" empty-text="Пакеты ещё не добавлены">
        <template #cell-number="{ index }"><span class="text-muted-foreground">{{ index + 1 }}</span></template>
        <template #cell-name="{ value }"><span class="font-medium">{{ value }}</span></template>
        <template #cell-fileName="{ value }"><span class="font-mono text-xs">{{ value }}</span></template>
        <template #cell-size="{ value }"><span class="whitespace-nowrap">{{ fileSize(value) }}</span></template>
        <template #cell-note="{ value }"><span class="block max-w-56 truncate">{{ value || '—' }}</span></template>
        <template #cell-uploadedAt="{ value }"><span class="whitespace-nowrap">{{ value }}</span></template>
        <template #cell-actions="{ row }"><div class="flex justify-end"><Button size="icon" variant="ghost" :aria-label="`Скачать ${row.fileName}`" title="Скачать EXE" @click="downloadPackage(row)"><Download class="size-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Редактировать ${row.name}`" title="Редактировать" @click="openEdit(row)"><Pencil class="size-4 text-blue-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Информация о версии ${row.version}`" title="Клиенты на версии" @click="openInfo(row)"><Info class="size-4 text-sky-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Удалить ${row.name}`" title="Удалить" @click="selectedPackage = row; deleteOpen = true"><Trash2 class="size-4 text-rose-600" /></Button></div></template>
      </DataTable>
    </div>
    <Dialog v-model:open="addOpen"><DialogContent><DialogHeader><DialogTitle>Добавить обновление</DialogTitle><DialogDescription>Выберите направление, EXE-файл и укажите версию с заметкой.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="update-direction">Направление</Label><select id="update-direction" v-model="direction" class="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>Цех</option><option>Шаурма</option></select></div><div class="space-y-2"><Label for="update-name">Название обновления</Label><Input id="update-name" v-model="name" placeholder="Например, Обновление Цеха" /></div><div class="space-y-2"><Label for="update-version">Версия</Label><Input id="update-version" v-model="version" placeholder="Например, 1.2.0" /></div><div class="space-y-2"><Label for="update-exe">EXE-файл</Label><Input id="update-exe" type="file" accept=".exe,application/vnd.microsoft.portable-executable" class="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1" @change="chooseFile" /><p v-if="file" class="text-xs text-muted-foreground"><Upload class="mr-1 inline size-3" />{{ file.name }} · {{ fileSize(file.size) }}</p></div><div class="space-y-2"><Label for="update-note">Заметка</Label><Textarea id="update-note" v-model="note" placeholder="Что изменилось в этой версии?" /></div></div>
      <DialogFooter><Button variant="outline" @click="addOpen = false">Отмена</Button><Button :disabled="!file || !name.trim() || !version.trim()" @click="addPackage">Опубликовать</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog v-model:open="infoOpen"><DialogContent><DialogHeader><DialogTitle>Статус клиентов по версии {{ selectedPackage?.version }}</DialogTitle><DialogDescription>{{ selectedPackage?.direction }} · {{ selectedPackage?.fileName }} · {{ fileSize(selectedPackage?.size ?? 0) }}</DialogDescription></DialogHeader><p v-if="selectedPackage?.note" class="rounded-md bg-muted/50 p-3 text-sm">{{ selectedPackage.note }}</p><DataTable v-if="updatedClients.length" :columns="infoColumns" :rows="updatedClients" row-key="id" empty-text="Нет клиентов этого направления"><template #cell-client="{ row }"><span class="font-medium">{{ row.client }}</span></template><template #cell-device="{ value }"><span class="font-mono text-xs">{{ value }}</span></template><template #cell-installedAt="{ row }"><span :class="row.installedAt ? 'text-emerald-700' : 'text-amber-700'">{{ row.installedAt ? 'Установлено' : row.downloadedAt ? 'Скачано' : 'Ожидает' }}</span></template></DataTable><p v-else class="rounded-lg border py-8 text-center text-sm text-muted-foreground">Клиентов этого направления пока нет</p><DialogFooter><Button variant="outline" @click="infoOpen = false">Закрыть</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="editOpen"><DialogContent><DialogHeader><DialogTitle>Редактировать обновление</DialogTitle><DialogDescription>Измените название, версию и заметку пакета.</DialogDescription></DialogHeader><div class="space-y-4 py-2"><div class="space-y-2"><Label for="edit-update-name">Название</Label><Input id="edit-update-name" v-model="editName" /></div><div class="space-y-2"><Label for="edit-update-version">Версия</Label><Input id="edit-update-version" v-model="editVersion" /></div><div class="space-y-2"><Label for="edit-update-note">Заметка</Label><Textarea id="edit-update-note" v-model="editNote" /></div></div><DialogFooter><Button variant="outline" @click="editOpen = false">Отмена</Button><Button @click="saveEdit">Сохранить</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog v-model:open="deleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить пакет обновления?</AlertDialogTitle><AlertDialogDescription>«{{ selectedPackage?.name }}» будет удалён из списка.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="removePackage">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>
