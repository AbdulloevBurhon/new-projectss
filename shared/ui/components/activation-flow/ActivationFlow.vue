<script setup lang="ts">
import { Check, LoaderCircle, MessageSquare, Send, ShieldCheck } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Textarea } from '../ui/textarea'

const props = withDefaults(defineProps<{
  brandName: string
  logoText?: string
  phase?: 'ready' | 'waiting' | 'approved' | 'rejected'
  submitting?: boolean
  initialPin?: string
  submitSupport?: (message: string) => Promise<void>
}>(), { phase: 'ready', submitting: false, initialPin: '' })
const emit = defineEmits<{ request: []; continue: [] }>()
const supportOpen = ref(false)
const supportMessage = ref('')
const supportSubmitting = ref(false)

async function sendSupport() {
  const message = supportMessage.value.trim()
  if (!message || !props.submitSupport || supportSubmitting.value) return
  supportSubmitting.value = true
  try {
    await props.submitSupport(message)
    supportMessage.value = ''
    supportOpen.value = false
    toast.success('Сообщение отправлено администратору.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Не удалось отправить сообщение.')
  } finally { supportSubmitting.value = false }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 text-slate-900">
    <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" aria-live="polite">
      <div class="mb-7 flex items-center gap-3">
        <span class="grid size-10 place-items-center rounded-xl bg-lime-400 font-bold">{{ logoText || brandName.slice(0, 1) }}</span>
        <div><p class="text-sm font-semibold">{{ brandName }}</p><p class="text-xs text-slate-500">Доступ к программе</p></div>
        <ShieldCheck class="ml-auto text-slate-400" :size="20" aria-hidden="true" />
      </div>
      <template v-if="phase === 'ready' || phase === 'rejected'">
        <h1 class="text-2xl font-semibold tracking-tight">Активация программы</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">{{ phase === 'rejected' ? 'Заявка отклонена. Отправьте её повторно.' : 'Отправьте заявку администратору для получения доступа.' }}</p>
        <Button class="mt-6 w-full bg-lime-400 text-slate-950 hover:bg-lime-500" :disabled="submitting" @click="emit('request')">
          <LoaderCircle v-if="submitting" class="mr-2 animate-spin" :size="17" aria-hidden="true" />
          {{ submitting ? 'Отправка заявки…' : phase === 'rejected' ? 'Отправить заявку заново' : 'Отправить заявку' }}
        </Button>
      </template>
      <template v-else-if="phase === 'waiting'">
        <h1 class="text-2xl font-semibold tracking-tight">Заявка отправлена</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">Ожидаем решения администратора…</p>
        <div class="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-5 text-sm text-slate-600"><LoaderCircle class="animate-spin" :size="19" aria-hidden="true" /> Проверяем статус заявки</div>
      </template>
      <template v-else>
        <h1 class="text-2xl font-semibold tracking-tight">Лицензия одобрена</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">Доступ одобрен для этого устройства.</p>
        <div v-if="initialPin" class="mt-5 rounded-xl border border-lime-200 bg-lime-50 px-4 py-4">
          <p class="text-sm text-green-800">Ваш PIN-код для входа</p>
          <p class="mt-2 select-all font-mono text-3xl font-semibold tracking-[0.3em] text-slate-900">{{ initialPin }}</p>
          <p class="mt-2 text-xs text-green-800">Запишите его перед продолжением.</p>
        </div>
        <div v-else class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">Ожидаем PIN-код от сервера. Если он не появился, попросите администратора выдать новый PIN.</div>
        <Button class="mt-4 w-full bg-lime-400 text-slate-950 hover:bg-lime-500" :disabled="!initialPin" @click="emit('continue')">{{ initialPin ? 'Перейти ко входу' : 'Ожидание PIN-кода…' }}</Button>
      </template>
    </section>
    <Button v-if="props.submitSupport" type="button" aria-label="Написать в поддержку" title="Написать в поддержку" class="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-lime-400 p-0 text-slate-950 shadow-md hover:bg-lime-500" @click="supportOpen = true"><MessageSquare :size="20" aria-hidden="true" /></Button>
    <Dialog v-if="supportOpen" v-model:open="supportOpen">
      <DialogContent>
        <DialogHeader><DialogTitle>Сообщение в поддержку</DialogTitle><DialogDescription>Опишите вопрос для службы поддержки.</DialogDescription></DialogHeader>
        <Textarea v-model="supportMessage" maxlength="1000" rows="5" placeholder="Напишите сообщение..." />
        <p class="text-right text-xs text-muted-foreground">{{ supportMessage.length }}/1000</p>
        <DialogFooter><Button type="button" variant="outline" @click="supportOpen = false">Закрыть</Button><Button type="button" :disabled="supportSubmitting || !supportMessage.trim()" @click="sendSupport"><Send :size="16" />{{ supportSubmitting ? 'Отправка…' : 'Отправить' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>
</template>
