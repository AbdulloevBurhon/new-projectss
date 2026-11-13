<script setup lang="ts">
import { Pencil, Plus, Search, Trash2 } from '@lucide/vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea, toast } from '@obshaya/ui'
import { computed, onMounted, ref } from 'vue'
import { listNotes, removeNote, saveNote } from '../../../../admin-endpoints/notes/notes.service'
import type { NoteRow } from '../../../../admin-endpoints/notes/notes.types'

const notes = ref<NoteRow[]>([])
const query = ref('')
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const editingId = ref<string | null>(null)
const selectedNote = ref<NoteRow | null>(null)
const client = ref('')
const amount = ref('')
const description = ref('')
const filteredNotes = computed(() => notes.value.filter(note => `${note.clientName} ${note.description}`.toLowerCase().includes(query.value.toLowerCase())))
const columns = [{ key: 'number', label: '№' }, { key: 'clientName', label: 'Клиент' }, { key: 'amount', label: 'Сумма' }, { key: 'description', label: 'Описание' }, { key: 'createdAt', label: 'Дата' }, { key: 'actions', label: 'Действия', align: 'right' as const }]

onMounted(() => { void refreshNotes() })
async function refreshNotes() {
  try { notes.value = await listNotes() }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить заметки') }
}
function clearForm() { client.value = ''; amount.value = ''; description.value = ''; editingId.value = null }
function openAdd() { clearForm(); dialogOpen.value = true }
function openEdit(note: NoteRow) { editingId.value = note.id; client.value = note.clientName; amount.value = note.amount; description.value = note.description; dialogOpen.value = true }
async function save() {
  if (!client.value.trim() || !description.value.trim()) return toast.error('Заполните клиента и описание')
  const wasEditing = Boolean(editingId.value)
  try {
    await saveNote({ clientName: client.value.trim(), amount: amount.value.trim(), description: description.value.trim() }, editingId.value ?? undefined)
    dialogOpen.value = false; clearForm(); await refreshNotes(); toast.success(wasEditing ? 'Изменения сохранены' : 'Заметка добавлена')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось сохранить заметку') }
}
async function remove() {
  if (!selectedNote.value) return
  try { await removeNote(selectedNote.value.id); deleteDialogOpen.value = false; selectedNote.value = null; await refreshNotes(); toast.success('Заметка удалена') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить заметку') }
}
function formatDate(value: string) { return new Date(value).toLocaleString('ru-RU') }
</script>

<template>
  <section class="notes-layout space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="notes-search relative w-full"><Search class="notes-search-icon size-4 text-muted-foreground" /><Input v-model="query" placeholder="Найти заметку" class="notes-search-input" /></div>
      <Button class="sm:ml-auto" @click="openAdd"><Plus class="size-4" />Заметка</Button>
    </div>
    <DataTable :columns="columns" :rows="filteredNotes" row-key="id" empty-text="Заметки не найдены">
      <template #cell-number="{ index }"><span class="text-muted-foreground">{{ index + 1 }}</span></template>
      <template #cell-clientName="{ row }"><span class="font-medium">{{ row.clientName }}</span></template>
      <template #cell-amount="{ value }">{{ value || '—' }}</template>
      <template #cell-description="{ value }"><span class="block min-w-56">{{ value }}</span></template>
      <template #cell-createdAt="{ value }"><span class="whitespace-nowrap">{{ formatDate(value) }}</span></template>
      <template #cell-actions="{ row }"><div class="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Редактировать заметку" @click="openEdit(row)"><Pencil class="size-4 text-blue-600" /></Button><Button size="icon" variant="ghost" aria-label="Удалить заметку" @click="selectedNote = row; deleteDialogOpen = true"><Trash2 class="size-4 text-destructive" /></Button></div></template>
    </DataTable>
    <Dialog v-model:open="dialogOpen"><DialogContent><DialogHeader><DialogTitle>{{ editingId ? 'Редактировать заметку' : 'Новая заметка' }}</DialogTitle><DialogDescription>Заполните данные заметки.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="note-client">Клиент</Label><Input id="note-client" v-model="client" placeholder="Имя клиента" /></div><div class="space-y-2"><Label for="note-amount">Сумма</Label><Input id="note-amount" v-model="amount" placeholder="Необязательно" /></div><div class="space-y-2"><Label for="note-description">Описание</Label><Textarea id="note-description" v-model="description" placeholder="Текст заметки" /></div></div>
      <DialogFooter><Button variant="outline" @click="dialogOpen = false; clearForm()">Отмена</Button><Button @click="save">Сохранить</Button></DialogFooter>
    </DialogContent></Dialog>
    <AlertDialog v-model:open="deleteDialogOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить заметку?</AlertDialogTitle><AlertDialogDescription>Заметка «{{ selectedNote?.clientName }}» будет удалена.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel @click="selectedNote = null">Отмена</AlertDialogCancel><AlertDialogAction @click="remove">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>

<style scoped>
.notes-layout { min-width: 0; }
.notes-search-icon { position: absolute; left: 0.75rem; top: 50%; z-index: 1; transform: translateY(-50%); }
.notes-search-input { padding-left: 2.5rem; }
@media (min-width: 640px) { .notes-search { max-width: 18rem; } }
</style>
