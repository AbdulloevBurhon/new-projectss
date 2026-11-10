<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { localDate } from '~/features/tsekh/warehouse/utils/format'
import { useAccounts } from '../stores/useAccounts'
import type { AccountMovement, MovementDraft, MovementKind } from '../types/accounts'
import { movementLabels } from '../utils/ledger'

const props = defineProps<{ kind: MovementKind; movement?: AccountMovement }>()
const emit = defineEmits<{ close: [] }>()
const { ledger, saveMovement } = useAccounts()
const busy = ref(false)
const error = ref('')
const draft = reactive<MovementDraft>({
  kind: props.kind,
  date: props.movement?.date ?? localDate(new Date().toISOString()),
  accountId: props.movement?.accountId ?? (ledger.value.accounts.length === 1 ? ledger.value.accounts[0]!.id : ''),
  amount: props.movement ? props.movement.cents / 100 : '',
  note: props.movement?.note ?? '',
})

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await saveMovement({ ...draft }, props.movement?.id)
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить операцию.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog :title="`${movement ? 'Изменить' : 'Добавить'} ${movementLabels[kind].toLowerCase()}`" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <label class="inventory-field">Счёт
        <select v-model="draft.accountId" required :disabled="busy" autofocus>
          <option value="" disabled>Выберите счёт</option>
          <option v-for="account in ledger.accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
        </select>
      </label>
      <div class="form-grid">
        <label class="inventory-field">Дата
          <input v-model="draft.date" type="date" required :disabled="busy" />
        </label>
        <label class="inventory-field">Сумма, сом
          <input v-model="draft.amount" type="number" min="0.01" max="1000000" step="0.01" required :disabled="busy" />
        </label>
      </div>
      <label class="inventory-field">Заметка / цель
        <textarea v-model="draft.note" class="account-note" maxlength="240" rows="3" placeholder="Например, оплата Ахмаду" :disabled="busy" />
      </label>
      <p v-if="error" role="alert" class="inventory-message error">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy || !ledger.accounts.length">Сохранить</button>
      </div>
    </form>
  </WorkshopDialog>
</template>
