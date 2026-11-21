<script setup lang="ts">
import { Button, Input, Label } from '@obshaya/ui'
import { useTelegramDelivery } from '../composables/useTelegramDelivery'

const props = defineProps<{ apiBase: string; allowed: boolean; online: boolean; pinRequired?: boolean }>()
const { phone, interval, delivery, busy, error, status, bound, scheduleError, check, send, checkConfirmation } = useTelegramDelivery(props)
</script>

<template>
  <section class="space-y-3 rounded-2xl border bg-card p-5 shadow-sm" aria-label="Отправка в Telegram">
    <h2 class="font-semibold">Отправка в Telegram</h2>
    <form class="space-y-3" @submit.prevent="check">
      <div class="grid gap-1.5">
        <Label for="telegram-phone">Номер телефона с кодом страны</Label>
        <Input id="telegram-phone" v-model="phone" type="tel" autocomplete="tel" placeholder="+992 …"
          maxlength="32" :disabled="busy || !allowed || bound || status === 'sending'" required />
      </div>
      <div class="grid gap-1.5">
        <Label for="telegram-interval">Интервал отправки, мин</Label>
        <Input id="telegram-interval" :model-value="interval ?? ''" type="number" disabled />
      </div>
      <div v-if="!bound" class="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" :disabled="busy || !allowed || !online || !phone.trim() || status === 'sending'">Проверить номер</Button>
        <Button v-if="status === 'verified'" type="button" :disabled="busy || !allowed || !online" @click="send">Одобрить и отправить</Button>
      </div>
    </form>
    <div class="space-y-2 text-sm" aria-live="polite">
      <p :class="online ? 'text-green-700' : 'text-muted-foreground'">{{ online ? 'Интернет подключён' : 'Нет подключения к интернету' }}</p>
      <p v-if="pinRequired" class="text-muted-foreground">Сохраните постоянный PIN-код, чтобы включить отправку в Telegram.</p>
      <p v-else-if="!allowed" class="text-muted-foreground">Администратор отключил отправку данных за пределы устройства.</p>
      <template v-else-if="online && status === 'pending'">
        <p>Передайте ссылку получателю. В боте нужно нажать «Запустить», затем «Подтвердить мой номер».</p>
        <a :href="delivery.botUrl" target="_blank" rel="noopener noreferrer" class="inline-block text-primary underline">Открыть бота в Telegram</a>
        <Button type="button" variant="ghost" size="sm" :disabled="busy" @click="checkConfirmation">Проверить подтверждение</Button>
      </template>
      <p v-else-if="status === 'verified'">Номер подтверждён. Бэкап включает сведения о клиентах и финансовых операциях.</p>
      <p v-else-if="status === 'sending'">Отправляем сверку и бэкап…</p>
      <p v-else-if="status === 'unknown'">Проверьте чат в Telegram перед повторной отправкой.</p>
      <p v-if="error || (online && scheduleError)" class="text-destructive" role="alert">{{ error || scheduleError }}</p>
    </div>
  </section>
</template>
