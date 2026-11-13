<script setup lang="ts">
import { MessageSquare, Send } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { ProductId } from '@obshaya/contracts'
import { clientApi } from '@obshaya/contracts/client-api'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Textarea } from '../ui/textarea'

interface Message { id: string; sender: 'client' | 'admin'; body: string; status: 'sent' | 'read'; createdAt: string }
const props = defineProps<{ product: ProductId; apiBase: string }>()
const open = ref(false); const items = ref<Message[]>([]); const draft = ref(''); const busy = ref(false); const unread = ref(0)

async function load(peek = false) {
  try {
    if (peek) { const data = await clientApi<{ unread: number }>(props.apiBase, '/api/client/messages?peek=1', {}, props.product); unread.value = data.unread; return }
    items.value = await clientApi<Message[]>(props.apiBase, '/api/client/messages', {}, props.product)
    unread.value = 0
  } catch (error) { if (open.value) toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сообщения.') }
}

async function send() {
  if (busy.value || !draft.value.trim()) return
  busy.value = true
  try {
    await clientApi(props.apiBase, '/api/client/messages', { method: 'POST', body: JSON.stringify({ body: draft.value.trim() }) }, props.product)
    draft.value = ''; await load(); toast.success('Сообщение отправлено.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось отправить сообщение.') }
  finally { busy.value = false }
}

watch(open, value => { if (value) void load() })
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void load(true); timer = setInterval(() => { if (!open.value) void load(true) }, 15000) })
onBeforeUnmount(() => clearInterval(timer))
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
    <Textarea v-model="draft" maxlength="1000" rows="3" placeholder="Новое сообщение" />
    <DialogFooter><Button :disabled="busy || !draft.trim()" @click="send"><Send :size="16" />{{ busy ? 'Отправка…' : 'Отправить' }}</Button></DialogFooter>
  </DialogContent></Dialog>
</template>
