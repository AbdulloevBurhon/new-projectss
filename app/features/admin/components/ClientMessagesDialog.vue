<script setup lang="ts">
import type { AdminMessage, License } from '../types/admin.types'
import { useAdminApi } from '../services/adminApi'
import { formatDate } from '../utils/format'

const props = defineProps<{ license: License }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const api = useAdminApi()
const messages = ref<AdminMessage[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const replyTo = ref('')
const replyText = ref('')

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    messages.value = (await api.licenseMessages(props.license.id)).messages
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сообщения.'
  } finally {
    loading.value = false
  }
}

async function sendReply() {
  const text = replyText.value.trim()
  if (!text || !replyTo.value) return
  busy.value = true
  error.value = ''
  try {
    await api.replyToMessage(replyTo.value, text)
    replyText.value = ''
    replyTo.value = ''
    await refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось отправить ответ.'
  } finally {
    busy.value = false
  }
}

async function removeMessage(row: AdminMessage) {
  if (!confirm('Удалить это сообщение?')) return
  busy.value = true
  error.value = ''
  try {
    await api.deleteMessage(row.id)
    messages.value = messages.value.filter(message => message.id !== row.id)
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить сообщение.'
  } finally {
    busy.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void refresh()
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" @click.self="emit('close')">
    <section role="dialog" aria-modal="true" aria-labelledby="client-messages-title" class="flex max-h-[min(86vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-lime-700">Сообщения клиента</p>
          <h2 id="client-messages-title" class="mt-1 text-xl font-semibold text-slate-900">{{ license.client_name }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ messages.length }} сообщений · {{ license.device_id.slice(0, 16) }}…</p>
        </div>
        <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" aria-label="Закрыть окно сообщений" @click="emit('close')">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <p v-if="error" role="alert" class="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">{{ error }}</p>
      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
        <p v-if="loading" class="py-10 text-center text-sm text-slate-500">Загружаю сообщения…</p>
        <p v-else-if="!messages.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">У этого клиента пока нет сообщений.</p>
        <article v-for="row in messages" :key="row.id" class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="row.sender === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-lime-100 text-lime-800'">{{ row.sender === 'client' ? 'Клиент' : 'Администратор' }}</span>
              <time class="text-xs text-slate-500">{{ formatDate(row.created_at) }}</time>
            </div>
            <span class="text-xs font-medium" :class="row.read_at ? 'text-emerald-700' : 'text-amber-700'">{{ row.sender === 'client' ? (row.read_at ? 'Просмотрено' : 'Новое') : (row.read_at ? 'Просмотрено клиентом' : 'Отправлено') }}</span>
          </div>
          <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{{ row.message }}</p>
          <div class="mt-3 flex justify-end gap-2">
            <button v-if="row.sender === 'client'" type="button" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100" :disabled="busy" @click="replyTo = row.id; replyText = ''">Ответить</button>
            <button type="button" class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50" :disabled="busy" @click="removeMessage(row)">Удалить</button>
          </div>
          <form v-if="replyTo === row.id" class="mt-4 border-t border-slate-200 pt-3" @submit.prevent="sendReply">
            <label class="block text-xs font-semibold text-slate-600">Ваш ответ<textarea v-model="replyText" rows="3" maxlength="1000" required autofocus class="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-lime-500 focus:ring-2 focus:ring-lime-100" placeholder="Напишите сообщение клиенту" /></label>
            <div class="mt-2 flex justify-end gap-2">
              <button type="button" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700" @click="replyTo = ''; replyText = ''">Отмена</button>
              <button type="submit" class="rounded-lg bg-lime-300 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-lime-400 disabled:opacity-50" :disabled="busy || !replyText.trim()">{{ busy ? 'Отправка…' : 'Отправить' }}</button>
            </div>
          </form>
        </article>
      </div>
      <footer class="flex justify-end border-t border-slate-200 px-5 py-3 sm:px-6">
        <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" @click="emit('close')">Закрыть</button>
      </footer>
    </section>
  </div>
</template>
