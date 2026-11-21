<script setup lang="ts">
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, Button,
} from '@obshaya/ui'

defineProps<{ action: 'post' | 'cancel' | null; skipped: number }>()
defineEmits<{ close: []; confirm: [action: 'post' | 'cancel'] }>()
</script>

<template>
  <AlertDialog :open="!!action" @update:open="!$event && $emit('close')">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ action === 'post' ? 'Провести ревизию?' : 'Отменить ревизию?' }}</AlertDialogTitle>
        <AlertDialogDescription v-if="action === 'post'">
          По посчитанным позициям запишем недостачу и излишек в историю склада. Счета не затрагиваются.
          <span v-if="skipped"> Позиций без подсчёта, которые будут пропущены: {{ skipped }}.</span>
        </AlertDialogDescription>
        <AlertDialogDescription v-else>Ревизия закроется без изменения остатков.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Назад</AlertDialogCancel>
        <Button v-if="action" :variant="action === 'post' ? 'default' : 'destructive'" @click="$emit('confirm', action)">
          {{ action === 'post' ? 'Провести' : 'Отменить ревизию' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
