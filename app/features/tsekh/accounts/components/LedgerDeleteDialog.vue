<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { useAccounts } from '../stores/useAccounts'

const props = defineProps<{ kind: 'account' | 'movement'; id: string; label: string }>()
const emit = defineEmits<{ close: [] }>()
const { deleteAccount, deleteMovement } = useAccounts()
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (props.kind === 'account') await deleteAccount(props.id)
    else await deleteMovement(props.id)
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить запись.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog :title="kind === 'account' ? 'Удалить счёт?' : 'Удалить операцию?'" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <p v-if="kind === 'account'">Удалить счёт «{{ label }}»?</p>
      <p v-else>Удалить операцию «{{ label }}»? Остаток счёта будет пересчитан.</p>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" autofocus :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button destructive" :disabled="busy">Удалить</button>
      </div>
    </form>
  </WorkshopDialog>
</template>
