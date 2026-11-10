<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'

defineProps<{ label: string; info?: boolean }>()
defineEmits<{ info: []; edit: []; delete: [] }>()
</script>

<template>
  <div class="inventory-actions">
    <button v-if="info" type="button" class="icon-button" :aria-label="`Инфо: ${label}`" title="Инфо" @click="$emit('info')">
      <WorkshopIcon name="info" />
    </button>
    <button type="button" class="icon-button" :aria-label="`Изменить: ${label}`" title="Изменить" @click="$emit('edit')">
      <WorkshopIcon name="edit" />
    </button>
    <button type="button" class="icon-button danger" :aria-label="`Удалить: ${label}`" title="Удалить" @click="$emit('delete')">
      <WorkshopIcon name="trash" />
    </button>
  </div>
</template>
