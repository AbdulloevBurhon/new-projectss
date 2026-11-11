<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal, BaseTable } from '@obshaya/ui'

interface Note { id: string; client: string; amount: number | null; description: string; createdAt: string }

const notes = ref<Note[]>([])
const editing = ref<Note | null>(null)
const deleting = ref<Note | null>(null)
const client = ref('')
const amount = ref('')
const description = ref('')
const modalOpen = ref(false)
const error = ref('')
const columns = [
  { key: 'client', label: 'Клиент' },
  { key: 'amount', label: 'Сумма' },
  { key: 'description', label: 'Описание' },
  { key: 'createdAt', label: 'Дата' },
  { key: 'actions', label: 'Действия' },
]

onMounted(() => {
  try { notes.value = JSON.parse(localStorage.getItem('obshaya-admin-demo-notes') || '[]') } catch { notes.value = [] }
})

function persist() { localStorage.setItem('obshaya-admin-demo-notes', JSON.stringify(notes.value)) }
function asNote(row: object) { return row as Note }
function formatAmount(row: object) {
  const value = asNote(row).amount
  return value === null ? '—' : `${value.toLocaleString('ru-RU')} сом`
}
function openCreate() {
  editing.value = null
  client.value = ''
  amount.value = ''
  description.value = ''
  error.value = ''
  modalOpen.value = true
}
defineExpose({ openCreate })
function openEdit(note: Note) {
  editing.value = note
  client.value = note.client
  amount.value = note.amount?.toString() || ''
  description.value = note.description
  error.value = ''
  modalOpen.value = true
}
function saveNote() {
  if (!client.value.trim() || !description.value.trim()) {
    error.value = 'Заполните имя клиента и описание.'
    return
  }
  const parsedAmount = amount.value.trim() ? Number(amount.value) : null
  if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
    error.value = 'Введите корректную сумму.'
    return
  }
  if (editing.value) {
    notes.value = notes.value.map(note => note.id === editing.value?.id ? { ...note, client: client.value.trim(), amount: parsedAmount, description: description.value.trim() } : note)
  } else {
    notes.value.unshift({ id: crypto.randomUUID(), client: client.value.trim(), amount: parsedAmount, description: description.value.trim(), createdAt: new Date().toLocaleString('ru-RU') })
  }
  persist()
  modalOpen.value = false
}
function removeNote() {
  if (!deleting.value) return
  notes.value = notes.value.filter(note => note.id !== deleting.value?.id)
  persist()
  deleting.value = null
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="border-b border-slate-200 px-5 py-3">
      <h2 class="text-lg font-semibold">Заметки клиентов</h2>
    </header>
    <div v-if="notes.length" class="p-4 sm:p-5">
      <BaseTable :columns="columns" :rows="notes" row-key="id">
        <template #cell-amount="{ row }">{{ formatAmount(row) }}</template>
        <template #cell-description="{ value }"><span class="max-w-md whitespace-pre-wrap">{{ value }}</span></template>
        <template #cell-createdAt="{ value }"><span class="whitespace-nowrap text-slate-500">{{ value }}</span></template>
        <template #cell-actions="{ row }"><div class="flex gap-2">
            <button type="button" class="grid size-9 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50" :aria-label="`Изменить заметку клиента ${asNote(row).client}`" title="Изменить" @click="openEdit(asNote(row))"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m15.5 5.5 3 3M4 20l4.5-.9L19 8a2.12 2.12 0 0 0-3-3L5.5 15.5 4 20Z" /></svg></button>
            <button type="button" class="grid size-9 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50" :aria-label="`Удалить заметку клиента ${asNote(row).client}`" title="Удалить" @click="deleting = asNote(row)"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
        </div></template>
      </BaseTable>
    </div>
    <div v-else class="px-5 py-16 text-center">
      <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">✎</div>
      <h3 class="mt-3 font-semibold">Заметок пока нет</h3>
      <p class="mt-1 text-sm text-slate-500">Добавь первую запись, чтобы посмотреть таблицу.</p>
      <p class="mt-4 text-sm text-slate-500">Нажми «Добавить заметку» рядом с вкладками.</p>
    </div>
  </section>
  <BaseModal :open="modalOpen" :title="editing ? 'Изменить заметку' : 'Новая заметка'" @close="modalOpen = false">
    <form class="space-y-4" @submit.prevent="saveNote">
      <BaseInput v-model="client" label="Имя клиента" placeholder="Например, Бохтар" />
      <BaseInput v-model="amount" label="Сумма, сом (необязательно)" type="number" placeholder="0" />
      <div><label for="note-description" class="mb-1.5 block text-sm font-medium text-slate-700">Описание</label><textarea id="note-description" v-model="description" rows="4" maxlength="1000" placeholder="Текст заметки" class="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <footer class="flex justify-end gap-2 pt-2"><BaseButton type="button" @click="modalOpen = false">Отмена</BaseButton><BaseButton type="submit" variant="primary">Сохранить</BaseButton></footer>
    </form>
  </BaseModal>
  <BaseModal :open="Boolean(deleting)" title="Удалить заметку?" @close="deleting = null">
    <p class="text-sm text-slate-600">Заметка клиента «{{ deleting?.client }}» будет удалена из этого браузера.</p>
    <template #footer><BaseButton @click="deleting = null">Отмена</BaseButton><BaseButton variant="danger" @click="removeNote">Удалить</BaseButton></template>
  </BaseModal>
</template>
