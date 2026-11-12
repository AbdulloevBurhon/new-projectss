<script setup lang="ts">
import { Download, Info, PackagePlus, Pencil, Trash2, Upload } from '@lucide/vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, toast } from '@obshaya/ui'
import { computed, ref, watch } from 'vue'
import TablePagination from '../../shared/components/TablePagination.vue'
import { clients } from '../../admin-state'

type UpdatePackage = { id: number; name: string; direction: string; version: string; fileName: string; size: number; note: string; uploadedAt: string; fileUrl?: string }

const packages = ref<UpdatePackage[]>([
  { id: 1, name: 'Обновление Цех 0.2.0', direction: 'Цех', version: '0.2.0', fileName: 'tsekh-0.2.0.exe', size: 18.4 * 1024 * 1024, note: 'Демо-пакет обновления Цеха', uploadedAt: '12.11.2026, 09:00' },
  { id: 2, name: 'Обновление Шаурма 0.1.0', direction: 'Шаурма', version: '0.1.0', fileName: 'shawarma-0.1.0.exe', size: 14.8 * 1024 * 1024, note: 'Демо-пакет обновления Шаурмы', uploadedAt: '11.11.2026, 16:20' },
])
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
const packagePage = ref(1)
const packagePageSize = ref(10)
const infoPage = ref(1)
const infoPageSize = ref(10)
const visiblePackages = computed(() => packages.value.slice((packagePage.value - 1) * packagePageSize.value, packagePage.value * packagePageSize.value))
const updatedClients = computed(() => clients.value.filter(client => client.direction === selectedPackage.value?.direction && client.version === selectedPackage.value?.version))
const visibleInfoClients = computed(() => updatedClients.value.slice((infoPage.value - 1) * infoPageSize.value, infoPage.value * infoPageSize.value))
watch(packagePageSize, () => { packagePage.value = 1 })
watch(infoOpen, () => { infoPage.value = 1 })

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file.value && !name.value) name.value = file.value.name.replace(/\.exe$/i, '')
}
function fileSize(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} МБ` }
function openInfo(row: UpdatePackage) { selectedPackage.value = row; infoOpen.value = true }
function openEdit(row: UpdatePackage) { selectedPackage.value = row; editName.value = row.name; editVersion.value = row.version; editNote.value = row.note; editOpen.value = true }
function saveEdit() {
  if (!selectedPackage.value || !editName.value.trim() || !editVersion.value.trim()) return toast.error('Заполните название и версию')
  selectedPackage.value.name = editName.value.trim(); selectedPackage.value.version = editVersion.value.trim(); selectedPackage.value.note = editNote.value.trim()
  editOpen.value = false; toast.success('Обновление изменено')
}
function downloadPackage(row: UpdatePackage) {
  if (!row.fileUrl) return toast.error('В демо-записи файл недоступен для скачивания')
  const link = document.createElement('a'); link.href = row.fileUrl; link.download = row.fileName; link.click()
}
function removePackage() {
  if (!selectedPackage.value) return
  if (selectedPackage.value.fileUrl) URL.revokeObjectURL(selectedPackage.value.fileUrl)
  packages.value = packages.value.filter(row => row.id !== selectedPackage.value?.id)
  deleteOpen.value = false; toast.success('Пакет удалён')
}
function addPackage() {
  if (!file.value || !name.value.trim() || !version.value.trim()) return toast.error('Укажите название и версию, затем выберите EXE-файл')
  packages.value.unshift({ id: Date.now(), name: name.value.trim(), direction: direction.value, version: version.value.trim(), fileName: file.value.name, size: file.value.size, note: note.value.trim(), uploadedAt: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }), fileUrl: URL.createObjectURL(file.value) })
  addOpen.value = false; file.value = null; name.value = ''; version.value = ''; note.value = ''
  toast.success('Пакет добавлен в демо-список')
}
</script>

<template>
  <section class="space-y-5">
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-semibold">Пакеты обновлений</h2><Button @click="addOpen = true"><PackagePlus class="size-4" />Добавить обновление</Button></div>
      <div class="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader><TableRow class="h-12"><TableHead>№</TableHead><TableHead>Название</TableHead><TableHead>Направление</TableHead><TableHead>Версия</TableHead><TableHead>EXE-файл</TableHead><TableHead>Размер</TableHead><TableHead>Заметка</TableHead><TableHead>Добавлено</TableHead><TableHead class="text-right">Действия</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="(row, index) in visiblePackages" :key="row.id" class="h-14"><TableCell class="text-muted-foreground">{{ (packagePage - 1) * packagePageSize + index + 1 }}</TableCell><TableCell class="font-medium">{{ row.name }}</TableCell><TableCell>{{ row.direction }}</TableCell><TableCell>{{ row.version }}</TableCell><TableCell class="font-mono text-xs">{{ row.fileName }}</TableCell><TableCell class="whitespace-nowrap">{{ fileSize(row.size) }}</TableCell><TableCell class="max-w-56 truncate">{{ row.note || '—' }}</TableCell><TableCell class="whitespace-nowrap">{{ row.uploadedAt }}</TableCell><TableCell><div class="flex justify-end"><Button size="icon" variant="ghost" :disabled="!row.fileUrl" :aria-label="`Скачать ${row.fileName}`" title="Скачать EXE" @click="downloadPackage(row)"><Download class="size-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Редактировать ${row.name}`" title="Редактировать" @click="openEdit(row)"><Pencil class="size-4 text-blue-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Информация о версии ${row.version}`" title="Клиенты на версии" @click="openInfo(row)"><Info class="size-4 text-sky-600" /></Button><Button size="icon" variant="ghost" :aria-label="`Удалить ${row.name}`" title="Удалить" @click="selectedPackage = row; deleteOpen = true"><Trash2 class="size-4 text-rose-600" /></Button></div></TableCell></TableRow>
            <TableRow v-if="!packages.length"><TableCell colspan="9" class="h-24 text-center text-muted-foreground">Пакеты ещё не добавлены</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
      <TablePagination v-model:page="packagePage" v-model:page-size="packagePageSize" :total="packages.length" />
    </div>

    <Dialog v-model:open="addOpen"><DialogContent><DialogHeader><DialogTitle>Добавить обновление</DialogTitle><DialogDescription>Выберите направление, EXE-файл и укажите версию с заметкой.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="update-direction">Направление</Label><select id="update-direction" v-model="direction" class="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>Цех</option><option>Шаурма</option></select></div><div class="space-y-2"><Label for="update-name">Название обновления</Label><Input id="update-name" v-model="name" placeholder="Например, Обновление Цеха" /></div><div class="space-y-2"><Label for="update-version">Версия</Label><Input id="update-version" v-model="version" placeholder="Например, 1.2.0" /></div><div class="space-y-2"><Label for="update-exe">EXE-файл</Label><Input id="update-exe" type="file" accept=".exe,application/vnd.microsoft.portable-executable" class="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1" @change="chooseFile" /><p v-if="file" class="text-xs text-muted-foreground"><Upload class="mr-1 inline size-3" />{{ file.name }} · {{ fileSize(file.size) }}</p></div><div class="space-y-2"><Label for="update-note">Заметка</Label><Textarea id="update-note" v-model="note" placeholder="Что изменилось в этой версии?" /></div><p class="text-xs text-muted-foreground">Загруженный файл хранится только в этой сессии демо.</p></div>
      <DialogFooter><Button variant="outline" @click="addOpen = false">Отмена</Button><Button :disabled="!file || !name.trim() || !version.trim()" @click="addPackage">Добавить пакет</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog v-model:open="infoOpen"><DialogContent><DialogHeader><DialogTitle>Клиенты на версии {{ selectedPackage?.version }}</DialogTitle><DialogDescription>{{ selectedPackage?.direction }} · {{ selectedPackage?.fileName }} · {{ fileSize(selectedPackage?.size ?? 0) }}</DialogDescription></DialogHeader><p v-if="selectedPackage?.note" class="rounded-md bg-muted/50 p-3 text-sm">{{ selectedPackage.note }}</p><div class="max-h-64 overflow-y-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Клиент</TableHead><TableHead>Устройство</TableHead><TableHead>Версия</TableHead><TableHead>Обновлено</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="row in visibleInfoClients" :key="row.id"><TableCell class="font-medium">{{ row.client }}</TableCell><TableCell class="font-mono text-xs">{{ row.device }}</TableCell><TableCell>{{ row.version }}</TableCell><TableCell class="whitespace-nowrap">{{ row.versionUpdatedAt }}</TableCell></TableRow><TableRow v-if="!updatedClients.length"><TableCell colspan="4" class="h-20 text-center text-muted-foreground">Клиенты ещё не обновлялись этим пакетом</TableCell></TableRow></TableBody></Table></div><TablePagination v-if="updatedClients.length" v-model:page="infoPage" v-model:page-size="infoPageSize" :total="updatedClients.length" /><DialogFooter><Button variant="outline" @click="infoOpen = false">Закрыть</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="editOpen"><DialogContent><DialogHeader><DialogTitle>Редактировать обновление</DialogTitle><DialogDescription>Измените название, версию и заметку пакета.</DialogDescription></DialogHeader><div class="space-y-4 py-2"><div class="space-y-2"><Label for="edit-update-name">Название</Label><Input id="edit-update-name" v-model="editName" /></div><div class="space-y-2"><Label for="edit-update-version">Версия</Label><Input id="edit-update-version" v-model="editVersion" /></div><div class="space-y-2"><Label for="edit-update-note">Заметка</Label><Textarea id="edit-update-note" v-model="editNote" /></div></div><DialogFooter><Button variant="outline" @click="editOpen = false">Отмена</Button><Button @click="saveEdit">Сохранить</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog v-model:open="deleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить пакет обновления?</AlertDialogTitle><AlertDialogDescription>«{{ selectedPackage?.name }}» будет удалён из списка.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="removePackage">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>
