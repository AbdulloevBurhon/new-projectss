<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { useClients } from '../stores/useClients'
import type { Client, ClientDraft } from '../types/clients'

const props = defineProps<{ client?: Client; deleting: boolean }>()
const emit = defineEmits<{ close: []; saved: [id: string] }>()
const { saveClient, deleteClient } = useClients()
const draft = reactive<ClientDraft>({ name: props.client?.name ?? '', phone: props.client?.phone ?? '' })
const busy = ref(false)
const error = ref('')
const title = computed(() => props.deleting ? 'Удалить клиента?' : props.client ? 'Изменить клиента' : 'Добавить клиента')

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (props.deleting && props.client) await deleteClient(props.client.id)
    else emit('saved', await saveClient(draft, props.client?.id))
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
      <p v-if="deleting">Удалить клиента «{{ client?.name }}»?</p>
      <template v-else>
        <label class="inventory-field">Имя
          <input v-model="draft.name" type="text" maxlength="100" required autofocus :disabled="busy" />
        </label>
        <label class="inventory-field">Телефон
          <input v-model="draft.phone" type="tel" maxlength="40" autocomplete="tel" required :disabled="busy" />
        </label>
      </template>
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
