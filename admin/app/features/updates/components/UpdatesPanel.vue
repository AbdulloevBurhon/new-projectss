<script setup lang="ts">
import { BaseButton, BaseModal, BaseTable } from '@obshaya/ui'

interface UpdateRow { id: string; product: string; version: string; file: string; published: string; status: string; notes: string }

const columns = [{ key: 'product', label: 'Направление' }, { key: 'version', label: 'Версия' }, { key: 'file', label: 'Файл' }, { key: 'notes', label: 'Заметка' }, { key: 'published', label: 'Опубликована' }, { key: 'status', label: 'Статус' }, { key: 'actions', label: 'Действия' }]
const rows = ref<UpdateRow[]>([
  { id: 'demo-tsekh', product: 'Цех', version: '1.0.1', file: 'tsekh-demo.exe', published: 'Сегодня', status: 'Демо', notes: '' },
  { id: 'demo-shawarma', product: 'Шаурма', version: '1.0.1', file: 'shawarma-demo.exe', published: 'Сегодня', status: 'Демо', notes: '' },
])
const modalOpen = ref(false)
const product = ref('Цех')
const version = ref('')
const notes = ref('')
const selectedFile = ref<File | null>(null)
const error = ref('')
const loading = ref(false)
const selectedUpdate = ref<UpdateRow | null>(null)
const detailsOpen = ref(false)
const deleteOpen = ref(false)

function showDetails(row: UpdateRow) {
  selectedUpdate.value = row
  detailsOpen.value = true
}

function askDelete(row: UpdateRow) {
  selectedUpdate.value = row
  deleteOpen.value = true
}

function deleteUpdate() {
  if (!selectedUpdate.value) return
  rows.value = rows.value.filter(row => row.id !== selectedUpdate.value?.id)
  deleteOpen.value = false
  selectedUpdate.value = null
}

function openPublish() {
  product.value = 'Цех'
  version.value = ''
  notes.value = ''
  selectedFile.value = null
  error.value = ''
  modalOpen.value = true
}

defineExpose({ openPublish })

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  error.value = ''
}

async function publishUpdate() {
  const file = selectedFile.value
  if (!version.value.trim() || !file || !notes.value.trim()) {
    error.value = 'Укажите версию, выберите EXE и добавьте описание обновления.'
    return
  }
  if (!file.name.toLowerCase().endsWith('.exe')) {
    error.value = 'Выберите файл с расширением .exe.'
    return
  }

  loading.value = true
  error.value = ''
  await new Promise(resolve => setTimeout(resolve, 900))
  rows.value.unshift({
    id: crypto.randomUUID(),
    product: product.value,
    version: version.value.trim(),
    file: file.name,
    published: new Date().toLocaleString('ru-RU'),
    status: 'Демо',
    notes: notes.value.trim(),
  })
  loading.value = false
  modalOpen.value = false
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="border-b border-slate-200 px-5 py-4"><h2 class="text-lg font-semibold">Обновления</h2></header>
    <div class="p-4 sm:p-5">
      <BaseTable :columns="columns" :rows="rows" row-key="id">
        <template #cell-file="{ value }"><span class="font-mono text-xs">{{ value }}</span></template>
        <template #cell-notes="{ value }"><span class="block max-w-xs truncate" :title="String(value || '')">{{ value || '—' }}</span></template>
        <template #cell-status="{ value }"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{{ value }}</span></template>
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2">
            <button type="button" class="inline-grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" :aria-label="`Информация об обновлении ${row.version}`" title="Информация" @click="showDetails(row)">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
            </button>
            <button type="button" class="inline-grid size-9 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" :aria-label="`Удалить обновление ${row.version}`" title="Удалить" @click="askDelete(row)">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16m-10 4v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3" /></svg>
            </button>
          </div>
        </template>
      </BaseTable>
    </div>
  </section>

  <BaseModal :open="modalOpen" title="Опубликовать обновление" @close="!loading && (modalOpen = false)">
    <form class="space-y-4" @submit.prevent="publishUpdate">
      <div>
        <label for="update-product" class="mb-1.5 block text-sm font-medium text-slate-700">Направление</label>
        <select id="update-product" v-model="product" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :disabled="loading">
          <option value="Цех">Цех</option>
          <option value="Шаурма">Шаурма</option>
        </select>
      </div>
      <div>
        <label for="update-version" class="mb-1.5 block text-sm font-medium text-slate-700">Версия</label>
        <input id="update-version" v-model="version" required placeholder="Например, 1.0.2" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :disabled="loading" />
      </div>
      <div>
        <label for="update-file" class="mb-1.5 block text-sm font-medium text-slate-700">Файл EXE</label>
        <input id="update-file" type="file" accept=".exe,application/vnd.microsoft.portable-executable" required class="block w-full rounded-lg border border-slate-300 bg-white text-sm file:mr-3 file:border-0 file:bg-slate-50 file:px-3 file:py-2.5 file:font-medium" :disabled="loading" @change="onFileChange" />
        <p v-if="selectedFile" class="mt-1.5 truncate text-xs text-slate-500">{{ selectedFile.name }}</p>
      </div>
      <div>
        <label for="update-notes" class="mb-1.5 block text-sm font-medium text-slate-700">Что нового</label>
        <textarea id="update-notes" v-model="notes" required rows="3" maxlength="1000" placeholder="Краткое описание обновления" class="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :disabled="loading" />
      </div>
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
      <p class="text-xs leading-5 text-slate-500">В демо-режиме файл не отправляется на сервер; в таблицу добавятся его имя и данные версии.</p>
      <footer class="flex justify-end gap-2 pt-1">
        <BaseButton type="button" :disabled="loading" @click="modalOpen = false">Отмена</BaseButton>
        <BaseButton type="submit" variant="primary" :disabled="loading">
          <span class="inline-flex items-center gap-2">
            <svg v-if="loading" aria-hidden="true" class="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" /></svg>
            {{ loading ? 'Загружаю…' : 'Обновить' }}
          </span>
        </BaseButton>
      </footer>
    </form>
  </BaseModal>
  <BaseModal :open="detailsOpen" title="Информация об обновлении" @close="detailsOpen = false">
    <dl v-if="selectedUpdate" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
      <dt class="text-slate-500">Направление</dt><dd class="font-medium text-slate-900">{{ selectedUpdate.product }}</dd>
      <dt class="text-slate-500">Версия</dt><dd class="font-medium text-slate-900">{{ selectedUpdate.version }}</dd>
      <dt class="text-slate-500">Файл</dt><dd class="break-all font-mono text-xs text-slate-800">{{ selectedUpdate.file }}</dd>
      <dt class="text-slate-500">Опубликована</dt><dd class="text-slate-800">{{ selectedUpdate.published }}</dd>
      <dt class="text-slate-500">Статус</dt><dd class="text-slate-800">{{ selectedUpdate.status }}</dd>
      <dt class="text-slate-500">Заметка</dt><dd class="whitespace-pre-wrap text-slate-800">{{ selectedUpdate.notes || '—' }}</dd>
    </dl>
    <template #footer><BaseButton @click="detailsOpen = false">Закрыть</BaseButton></template>
  </BaseModal>

  <BaseModal :open="deleteOpen" title="Удалить обновление?" @close="deleteOpen = false">
    <p class="text-sm leading-6 text-slate-600">Удалить версию <span class="font-semibold text-slate-900">{{ selectedUpdate?.version }}</span> для направления <span class="font-semibold text-slate-900">{{ selectedUpdate?.product }}</span> из списка?</p>
    <template #footer>
      <BaseButton @click="deleteOpen = false">Отмена</BaseButton>
      <BaseButton variant="danger" @click="deleteUpdate">Удалить</BaseButton>
    </template>
  </BaseModal>
</template>
