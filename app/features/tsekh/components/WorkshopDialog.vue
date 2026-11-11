<script setup lang="ts">
import SharedModal from '~/shared/modal/Modal.vue'
import InventoryIcon from './WorkshopIcon.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ title: string; busy?: boolean; wide?: boolean }>()
defineEmits<{ close: [] }>()
const attrs = useAttrs()
const isOpen = ref(true)
const dialogClass = computed(() => ['inventory-dialog', props.wide && 'is-wide', attrs.class as string].filter(Boolean).join(' '))
</script>

<template>
  <SharedModal v-model="isOpen" :title="title" :busy="busy" :close-on-backdrop="false" :dialog-class="dialogClass" header-class="dialog-heading" body-class="workshop-modal-body" close-button-class="icon-button" @close="$emit('close')">
    <slot />
    <template #close><InventoryIcon name="close" /></template>
  </SharedModal>
</template>
