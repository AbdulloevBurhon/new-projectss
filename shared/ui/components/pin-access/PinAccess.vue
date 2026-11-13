<script setup lang="ts">
import { AlertCircle, Eye, EyeOff, MessageSquare, ShieldCheck } from '@lucide/vue'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { toast } from 'vue-sonner'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ brandName: string; logoText?: string; error?: string }>(), { error: '' })
const emit = defineEmits<{ submit: [pin: string]; support: [message: string]; clearError: [] }>()
const pin = ref('')
const pinVisible = ref(false)
const submitting = ref(false)
const supportOpen = ref(false)
const supportMessage = ref('')
const pinInput = computed({
  get: () => pin.value,
  set: (value: string | number) => {
    pin.value = String(value).replace(/\D/g, '').slice(0, 5)
    emit('clearError')
    if (pin.value.length === 5) submitPin()
  },
})
watch(() => props.error, value => { if (value) submitting.value = false })

function submitPin() {
  if (submitting.value || pin.value.length !== 5) return
  submitting.value = true
  emit('submit', pin.value)
}

function sendSupport() {
  if (!supportMessage.value.trim()) return toast.error('Напишите сообщение для поддержки.')
  emit('support', supportMessage.value.trim())
  supportMessage.value = ''
  supportOpen.value = false
}
</script>

<template>
  <main class="relative grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900">
    <form class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" @submit.prevent="submitPin">
      <div class="mb-7 flex items-center gap-3">
        <span class="grid size-10 place-items-center rounded-xl bg-lime-400 font-bold text-slate-900">{{ logoText || brandName.slice(0, 1) }}</span>
        <div><p class="text-sm font-semibold">{{ brandName }}</p><p class="text-xs text-slate-500">Доступ к программе</p></div>
        <ShieldCheck class="ml-auto text-slate-400" :size="20" aria-hidden="true" />
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">Введите PIN-код</h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">Введите пятизначный код, чтобы открыть рабочее пространство.</p>
      <div class="mt-6 space-y-2">
        <Label for="access-pin">PIN-код</Label>
        <div class="relative">
          <Input id="access-pin" v-model="pinInput" :type="pinVisible ? 'text' : 'password'" inputmode="numeric" autocomplete="one-time-code" maxlength="5" placeholder="Пять цифр" autofocus class="pr-12" />
          <Button type="button" variant="ghost" size="icon" class="absolute right-1 top-1/2 -translate-y-1/2" :aria-label="pinVisible ? 'Скрыть PIN-код' : 'Показать PIN-код'" @click="pinVisible = !pinVisible"><EyeOff v-if="pinVisible" :size="18" /><Eye v-else :size="18" /></Button>
        </div>
      </div>
      <p v-if="error" class="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert"><AlertCircle :size="16" />{{ error }}</p>
      <Button type="submit" class="mt-4 w-full bg-lime-400 text-slate-950 hover:bg-lime-500" :disabled="submitting || pin.length !== 5">{{ submitting ? 'Проверка…' : 'Войти' }}</Button>
    </form>
    <Button type="button" aria-label="Написать в поддержку" title="Написать в поддержку" class="fixed bottom-5 right-5 grid size-12 place-items-center rounded-full bg-lime-400 p-0 text-slate-950 shadow-md hover:bg-lime-500" @click="supportOpen = true"><MessageSquare :size="20" aria-hidden="true" /></Button>
    <Dialog v-model:open="supportOpen">
      <DialogContent>
        <DialogHeader><DialogTitle>Сообщение в поддержку</DialogTitle><DialogDescription>Опишите вопрос для службы поддержки.</DialogDescription></DialogHeader>
        <Label for="support-message">Сообщение</Label>
        <Textarea id="support-message" v-model="supportMessage" maxlength="1000" rows="5" placeholder="Напишите сообщение..." />
        <p class="text-right text-xs text-muted-foreground">{{ supportMessage.length }}/1000</p>
        <DialogFooter><Button type="button" variant="outline" @click="supportOpen = false">Закрыть</Button><Button type="button" @click="sendSupport">Отправить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>
</template>
