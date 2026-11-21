<script setup lang="ts">
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, toast } from '@obshaya/ui'
import { computed, ref, watch } from 'vue'
import { isTelegramInterval, MAX_TELEGRAM_INTERVAL_MINUTES } from '@obshaya/contracts/telegram-schedule'
import { editClient } from '../../../../admin-endpoints/clients/clients.service'
import type { ClientRow } from '../../../../admin-endpoints/clients/clients.types'

const props = defineProps<{ client: ClientRow | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()
const name = ref('')
const until = ref('')
const amount = ref<number | string>(0)
const unit = ref(1)
const saving = ref(false)
const workshop = computed(() => props.client?.productId === 'tsekh')

watch(open, value => {
  if (!value || !props.client) return
  name.value = props.client.client
  until.value = props.client.licenseUntil
  const minutes = props.client.telegramIntervalMinutes
  unit.value = minutes > 0 && minutes % 60 === 0 ? 60 : 1
  amount.value = minutes / unit.value
})

function changeUnit(next: number) {
  if (amount.value !== '') amount.value = Number(amount.value) * unit.value / next
  unit.value = next
}

async function save() {
  if (!props.client || saving.value) return
  if (!name.value.trim() || !until.value) return toast.error('Заполните имя и срок лицензии')
  const inputMinutes = Number(amount.value) * unit.value
  const minutes = Math.round(inputMinutes)
  if (workshop.value && (amount.value === '' || Math.abs(inputMinutes - minutes) > 0.000001 || !isTelegramInterval(minutes))) {
    return toast.error('Интервал должен составлять от 0 до 10 080 целых минут')
  }
  saving.value = true
  try {
    await editClient(props.client.id, {
      clientName: name.value.trim(), licenseUntil: new Date(until.value).toISOString(),
      ...(workshop.value && minutes !== props.client.telegramIntervalMinutes ? { telegramIntervalMinutes: minutes } : {}),
    })
    open.value = false
    emit('saved')
    toast.success('Данные клиента обновлены')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Не удалось сохранить клиента')
  } finally { saving.value = false }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Редактировать клиента</DialogTitle>
        <DialogDescription class="sr-only">Настройки лицензии клиента</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="save">
        <div class="space-y-2">
          <Label for="client-edit-name">Имя клиента</Label>
          <Input id="client-edit-name" v-model="name" :disabled="saving" required />
        </div>
        <div class="space-y-2">
          <Label for="client-edit-until">Лицензия до</Label>
          <Input id="client-edit-until" v-model="until" type="date" :disabled="saving" required />
        </div>
        <div v-if="workshop" class="space-y-2">
          <Label for="client-edit-telegram">Интервал отправки в Telegram</Label>
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <Input id="client-edit-telegram" v-model="amount" type="number" min="0"
              :max="MAX_TELEGRAM_INTERVAL_MINUTES / unit" :step="unit === 1 ? 1 : 'any'" :disabled="saving" required />
            <select class="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Единица интервала"
              :value="unit" :disabled="saving" @change="changeUnit(Number(($event.target as HTMLSelectElement).value))">
              <option :value="1">Минуты</option>
              <option :value="60">Часы</option>
            </select>
          </div>
          <p class="text-sm text-muted-foreground">0 отключает отправку по расписанию.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Отмена</Button>
          <Button type="submit" :disabled="saving">Сохранить</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
