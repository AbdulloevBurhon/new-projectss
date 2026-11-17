<script setup lang="ts">
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button,
} from '@obshaya/ui'

const open = defineModel<boolean>('open', { required: true })
defineProps<{ name: string; pending: boolean; error: string }>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent @escape-key-down="pending && $event.preventDefault()">
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
        <AlertDialogDescription>Товар «{{ name }}» будет удалён.</AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">Отмена</AlertDialogCancel>
        <Button variant="destructive" :disabled="pending" @click="emit('confirm')">
          {{ pending ? 'Удаление…' : 'Удалить' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
