<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { useAccounts } from '../stores/useAccounts'
import type { Account } from '../types/accounts'

const props = defineProps<{ account?: Account }>()
const emit = defineEmits<{ close: [] }>()
const { saveAccount } = useAccounts()
const name = ref(props.account?.name ?? '')
const opening = ref<number | string>((props.account?.openingCents ?? 0) / 100)
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await saveAccount(name.value, opening.value, props.account?.id)
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить счёт.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog :title="account ? 'Изменить счёт' : 'Добавить счёт'" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <label class="inventory-field">Название
        <input v-model="name" required maxlength="100" placeholder="Например, Касса склада" :disabled="busy" autofocus />
      </label>
      <label class="inventory-field">Начальный остаток, сом
        <input v-model="opening" type="number" min="0" max="1000000" step="0.01" required :disabled="busy" />
      </label>
      <p v-if="error" role="alert" class="inventory-message error">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy">Сохранить</button>
      </div>
    </form>
  </WorkshopDialog>
</template>
