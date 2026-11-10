<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'

const props = defineProps<{ saleId: string; cancel: (id: string) => Promise<void> }>()
const emit = defineEmits<{ close: [] }>()
const error = ref('')
const busy = ref(false)

async function remove() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await props.cancel(props.saleId)
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось отменить продажу.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog title="Отменить продажу?" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="remove">
      <p>Изделия вернутся в наличие. Оплата и долг по продаже будут убраны из учёта.</p>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" autofocus @click="$emit('close')">Оставить продажу</button>
        <button type="submit" class="inventory-button destructive" :disabled="busy">Отменить продажу</button>
      </div>
    </form>
  </WorkshopDialog>
</template>
