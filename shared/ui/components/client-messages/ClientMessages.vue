<script setup lang="ts">
import { MessageSquare, Send } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { ProductId } from '@obshaya/contracts'
import { ClientApiError, clientApi, getClientPin } from '@obshaya/contracts/client-api'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Textarea } from '../ui/textarea'

interface Message { id: string; sender: 'client' | 'admin'; body: string; status: 'sent' | 'read'; createdAt: string }
const props = defineProps<{ product: ProductId; apiBase: string; onPinRejected?: () => void }>()
const open = ref(false); const items = ref<Message[]>([]); const draft = ref(''); const busy = ref(false); const unread = ref(0)
const online = ref(true)
let rejected = false

function handlePinRejection(error: unknown, requestPin: string) {
  if (!(error instanceof ClientApiError) || error.status !== 401 || !props.onPinRejected) return false
  if (!rejected && requestPin && requestPin === getClientPin()) {
    rejected = true
    props.onPinRejected()
  }
  return true
}

async function load(peek = false) {
  if (rejected || !navigator.onLine) return
  const requestPin = getClientPin()
  if (!requestPin) return
  try {
    if (peek) { const data = await clientApi<{ unread: number }>(props.apiBase, '/api/client/messages?peek=1', {}, props.product); if (!open.value) unread.value = data.unread; return }
    items.value = await clientApi<Message[]>(props.apiBase, '/api/client/messages', {}, props.product)
    unread.value = 0
  } catch (error) {
    if (!handlePinRejection(error, requestPin) && !peek && open.value && navigator.onLine) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сообщения.')
    }
  }
}

async function send() {
  if (rejected || !navigator.onLine || busy.value || !draft.value.trim()) return
  const requestPin = getClientPin()
  if (!requestPin) return
  busy.value = true
  try {
    await clientApi(props.apiBase, '/api/client/messages', { method: 'POST', body: JSON.stringify({ body: draft.value.trim() }) }, props.product)
    draft.value = ''; await load(); toast.success('Сообщение отправлено.')
  } catch (error) {
    if (!handlePinRejection(error, requestPin)) toast.error(error instanceof Error ? error.message : 'Не удалось отправить сообщение.')
  }
  finally { busy.value = false }
}

watch(open, value => { if (value) void load() })
let timer: ReturnType<typeof setInterval> | undefined
function updateConnection() {
  online.value = navigator.onLine
  if (online.value) void load(!open.value)
}
onMounted(() => {
  updateConnection()
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
  timer = setInterval(() => { if (!open.value) void load(true) }, 15000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('online', updateConnection)
  window.removeEventListener('offline', updateConnection)
})
</script>

<template>
  <Button class="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-lime-400 p-0 text-slate-950 shadow-lg hover:bg-lime-500" aria-label="Сообщения администратору" @click="open = true">
    <MessageSquare :size="20" /><span v-if="unread" class="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{{ unread }}</span>
  </Button>
  <Dialog v-model:open="open"><DialogContent class="max-h-[85vh] sm:max-w-lg">
    <DialogHeader><DialogTitle>Сообщения</DialogTitle><DialogDescription>Ваши сообщения и ответы администратора.</DialogDescription></DialogHeader>
    <div class="max-h-[42vh] space-y-3 overflow-y-auto py-2">
      <p v-if="!items.length" class="py-4 text-sm text-slate-500">Сообщений пока нет.</p>
      <article v-for="message in items" :key="message.id" class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div class="flex justify-between gap-3 text-xs text-slate-500"><strong>{{ message.sender === 'admin' ? 'Администратор' : 'Вы' }}</strong><time>{{ new Date(message.createdAt).toLocaleString() }}</time></div>
        <p class="mt-2 whitespace-pre-wrap text-sm">{{ message.body }}</p><p v-if="message.sender === 'client'" class="mt-2 text-xs text-emerald-700">{{ message.status === 'read' ? 'Просмотрено' : 'Отправлено' }}</p>
      </article>
    </div>
    <p v-if="!online" class="text-sm text-muted-foreground" role="status">Нет интернета. Сообщения обновятся после подключения.</p>
    <Textarea v-model="draft" maxlength="1000" rows="3" placeholder="Новое сообщение" />
    <DialogFooter><Button :disabled="!online || busy || !draft.trim()" @click="send"><Send :size="16" />{{ busy ? 'Отправка…' : 'Отправить' }}</Button></DialogFooter>
  </DialogContent></Dialog>
</template>
