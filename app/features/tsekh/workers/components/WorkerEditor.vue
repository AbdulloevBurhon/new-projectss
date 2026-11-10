<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { useWorkers } from '../stores/useWorkers'
import type { Worker } from '../types/workers'

const props = defineProps<{ worker?: Worker; deleting?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { saveWorker, deleteWorker } = useWorkers()
const name = ref(props.worker?.name ?? '')
const error = ref('')
const busy = ref(false)
const title = computed(() => {
  if (props.deleting) return 'Удалить рабочего?'
  return props.worker ? 'Изменить имя' : 'Добавить рабочего'
})

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (props.deleting && props.worker) await deleteWorker(props.worker.id)
    else await saveWorker(props.worker?.id, name.value)
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить изменения.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog :title="title" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <p v-if="deleting">
        Удалить «{{ worker?.name }}»? Вместе с сотрудником будут удалены все его работы и начисления.
        <template v-if="worker?.records.some(record => record.payment)">Оплаченные суммы вернутся на счета.</template>
      </p>
      <label v-else class="inventory-field">
        Имя<input v-model="name" maxlength="100" required autofocus :disabled="busy" placeholder="Например, Ахмад" />
      </label>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :autofocus="deleting" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button" :class="deleting ? 'destructive' : 'primary'" :disabled="busy">
          {{ deleting ? 'Удалить' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </WorkshopDialog>
</template>
