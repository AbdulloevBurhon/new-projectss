<script setup lang="ts">
import { Button } from '../button'
import ErrorMessage from '../alert/ErrorMessage.vue'
import Modal from './Modal.vue'

defineProps<{ title?: string; message: string }>()
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <Modal v-model="open" :title="title || 'Ошибка'" close-on-backdrop>
    <ErrorMessage>{{ message }}</ErrorMessage>
    <template #footer="{ close }"><Button variant="outline" @click="close">Закрыть</Button></template>
  </Modal>
</template>
