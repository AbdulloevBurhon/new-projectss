<script setup lang="ts">
import type { AdminMessage } from '../types/admin.types'
import { useAdminApi } from '../services/adminApi'
import { useAdminStore } from '../stores/admin.store'

const store = useAdminStore()
const api = useAdminApi()
const messages = ref<AdminMessage[]>([])
const authorized = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const productLabel = { tsekh: 'Цех', shawarma: 'Шаурма' }
const dateLabel = (value: number) => new Date(value * 1000).toLocaleString('ru-RU')

async function refresh() {
  loading.value = true; error.value = ''
  try { messages.value = (await api.messages()).messages }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сообщения.' }
  finally { loading.value = false }
}
async function reply(row: AdminMessage) {
  const text = prompt(`Ответ клиенту ${row.client_name}:`)?.trim()
  if (!text) return
  try { await api.replyToMessage(row.id, text); notice.value = 'Ответ отправлен клиенту.'; await refresh() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось отправить ответ.' }
}
async function remove(row: AdminMessage) {
  if (!confirm('Удалить это сообщение?')) return
  try { await api.deleteMessage(row.id); messages.value = messages.value.filter(item => item.id !== row.id); notice.value = 'Сообщение удалено.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось удалить сообщение.' }
}
onMounted(() => { authorized.value = !!sessionStorage.getItem('obshaya-admin-key'); if (authorized.value) void refresh() })
</script>

<template>
  <main class="mx-auto max-w-7xl p-5 md:p-8">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p class="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">Управление лицензиями</p><h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Сообщения клиентов</h1><p class="mt-1 text-sm text-slate-500">Переписка и статусы доставки ответов.</p></div>
      <div class="flex gap-2"><button class="rounded-lg border border-slate-300 bg-white px-4 py-2" :disabled="loading" @click="refresh">Обновить</button><button class="rounded-lg border border-slate-300 bg-white px-4 py-2" @click="store.logout(); navigateTo('/admin/login')">Выйти</button></div>
    </header>
    <p v-if="error" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="notice" role="status" class="mb-4 rounded-lg bg-lime-50 p-3 text-sm text-lime-800">{{ notice }}</p>
    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p v-if="loading" class="p-6 text-center text-slate-500">Загружаю сообщения…</p>
      <p v-else-if="!authorized" class="p-6 text-center text-slate-600">Войдите в админ-панель, чтобы увидеть сообщения.</p>
      <p v-else-if="!messages.length" class="p-6 text-center text-slate-500">Сообщений пока нет.</p>
      <article v-for="row in messages" :key="row.id" class="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><strong>{{ row.client_name }}</strong><span class="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{{ productLabel[row.product_id] }}</span><p class="mt-1 text-xs text-slate-500">{{ dateLabel(row.created_at) }} · {{ row.sender === 'client' ? 'Клиент' : 'Администратор' }} · {{ row.read_at ? 'Просмотрено' : 'Не просмотрено' }}</p></div>
          <div class="flex gap-2"><button v-if="row.sender === 'client'" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" @click="reply(row)">Ответить</button><button class="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700" @click="remove(row)">Удалить</button></div>
        </div>
        <p class="mt-3 whitespace-pre-wrap text-sm">{{ row.message }}</p>
      </article>
    </section>
  </main>
</template>
