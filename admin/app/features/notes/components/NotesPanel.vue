<script setup lang="ts">
import { Pencil, Plus, Search, Trash2 } from '@lucide/vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, toast } from '@obshaya/ui'
import { computed, ref, watch } from 'vue'
import TablePagination from '../../shared/components/TablePagination.vue'

type Note = { id: number; client: string; amount: string; description: string; date: string }
const notes = ref<Note[]>([
  { id: 1, client: 'Бохтар', amount: '—', description: 'Уточнить срок продления лицензии.', date: '12.11.2026, 09:15' },
  { id: 2, client: 'Шаурма Центр', amount: '250 сомони', description: 'Получена оплата за обслуживание.', date: '11.11.2026, 16:40' },
])
const query = ref('')
const page = ref(1)
const pageSize = ref(10)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const editingId = ref<number | null>(null)
const selectedNote = ref<Note | null>(null)
const client = ref('')
const amount = ref('')
const description = ref('')
const filteredNotes = computed(() => notes.value.filter(note => `${note.client} ${note.description}`.toLowerCase().includes(query.value.toLowerCase())))
const visibleNotes = computed(() => filteredNotes.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch(query, () => { page.value = 1 })

function clearForm() { client.value = ''; amount.value = ''; description.value = ''; editingId.value = null }
function openAdd() { clearForm(); dialogOpen.value = true }
function openEdit(note: Note) {
  editingId.value = note.id; client.value = note.client; amount.value = note.amount === '—' ? '' : note.amount
  description.value = note.description; dialogOpen.value = true
}
function saveNote() {
  if (!client.value.trim() || !description.value.trim()) return toast.error('Заполните клиента и описание')
  const fields = { client: client.value.trim(), amount: amount.value.trim() || '—', description: description.value.trim() }
  const current = notes.value.find(note => note.id === editingId.value)
  if (current) { Object.assign(current, fields); toast.success('Изменения сохранены') }
  else { notes.value.unshift({ id: Date.now(), ...fields, date: new Date().toLocaleString('ru-RU') }); toast.success('Заметка добавлена') }
  dialogOpen.value = false; page.value = 1; clearForm()
}
function deleteNote() {
  if (selectedNote.value) notes.value = notes.value.filter(note => note.id !== selectedNote.value?.id)
  page.value = Math.min(page.value, Math.max(1, Math.ceil(filteredNotes.value.length / pageSize.value)))
  selectedNote.value = null; deleteDialogOpen.value = false; toast.success('Заметка удалена')
}
</script>

<template>
  <section class="notes-layout space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="notes-search relative w-full"><Search class="notes-search-icon size-4 text-muted-foreground" /><Input v-model="query" placeholder="Найти заметку" class="notes-search-input" /></div>
      <Button class="sm:ml-auto" @click="openAdd"><Plus /> Заметка</Button>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader><TableRow class="h-11"><TableHead>№</TableHead><TableHead>Клиент</TableHead><TableHead>Сумма</TableHead><TableHead>Описание</TableHead><TableHead>Дата</TableHead><TableHead class="text-right">Действия</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="(note, index) in visibleNotes" :key="note.id" class="h-14">
            <TableCell class="text-muted-foreground">{{ (page - 1) * pageSize + index + 1 }}</TableCell><TableCell class="font-medium">{{ note.client }}</TableCell><TableCell>{{ note.amount }}</TableCell><TableCell class="min-w-56">{{ note.description }}</TableCell><TableCell class="whitespace-nowrap">{{ note.date }}</TableCell>
            <TableCell><div class="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Редактировать заметку" style="background-color: #eff6ff; color: #1d4ed8" @click="openEdit(note)"><Pencil class="size-4" style="color: #2563eb" /></Button><Button size="icon" variant="ghost" aria-label="Удалить заметку" @click="selectedNote = note; deleteDialogOpen = true"><Trash2 class="size-4 text-destructive" /></Button></div></TableCell>
          </TableRow>
          <TableRow v-if="!filteredNotes.length"><TableCell colspan="6" class="h-20 text-center text-muted-foreground">Заметки не найдены</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filteredNotes.length" />

    <Dialog v-model:open="dialogOpen"><DialogContent>
      <DialogHeader><DialogTitle>{{ editingId ? 'Редактировать заметку' : 'Новая заметка' }}</DialogTitle><DialogDescription>Заполните данные заметки.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="note-client">Клиент</Label><Input id="note-client" v-model="client" placeholder="Имя клиента" /></div><div class="space-y-2"><Label for="note-amount">Сумма</Label><Input id="note-amount" v-model="amount" placeholder="Необязательно" /></div><div class="space-y-2"><Label for="note-description">Описание</Label><Textarea id="note-description" v-model="description" placeholder="Текст заметки" /></div></div>
      <DialogFooter><Button variant="outline" @click="dialogOpen = false; clearForm()">Отмена</Button><Button @click="saveNote">Сохранить</Button></DialogFooter>
    </DialogContent></Dialog>
    <AlertDialog v-model:open="deleteDialogOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить заметку?</AlertDialogTitle><AlertDialogDescription>Заметка «{{ selectedNote?.client }}» будет удалена.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel @click="selectedNote = null">Отмена</AlertDialogCancel><AlertDialogAction @click="deleteNote">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>

<style scoped>
.notes-layout { min-width: 0; }
.notes-search-icon { position: absolute; left: 0.75rem; top: 50%; z-index: 1; transform: translateY(-50%); }
.notes-search-input { padding-left: 2.5rem; }
@media (min-width: 640px) {
  .notes-search { max-width: 18rem; }
}
</style>
