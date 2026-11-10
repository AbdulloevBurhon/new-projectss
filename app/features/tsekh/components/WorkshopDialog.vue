<script setup lang="ts">
import InventoryIcon from './WorkshopIcon.vue'

defineProps<{ title: string; busy?: boolean; wide?: boolean }>()
defineEmits<{ close: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog ref="dialog" class="inventory-dialog" :class="{ 'is-wide': wide }" :aria-labelledby="titleId" @close="$emit('close')" @cancel="busy && $event.preventDefault()">
    <div class="dialog-heading">
      <h2 :id="titleId">{{ title }}</h2>
      <button type="button" class="icon-button" aria-label="Закрыть" :disabled="busy" @click="dialog?.close()"><InventoryIcon name="close" /></button>
    </div>
    <slot />
  </dialog>
</template>
