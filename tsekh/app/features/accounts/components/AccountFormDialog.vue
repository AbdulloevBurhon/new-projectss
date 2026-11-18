<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ account?: { id: string; name: string } | null }>()
const emit = defineEmits<{ save: [draft: { name: string }] }>()
const name = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.account?.name ?? ''
})

function submit() {
  const trimmedName = name.value.trim()
  if (!trimmedName) return
  emit('save', { name: trimmedName })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ props.account ? 'Изменить счёт' : 'Добавить счёт' }}</DialogTitle>
        <DialogDescription>Укажите название счёта.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="account-name">Название</Label>
          <Input id="account-name" v-model="name" required maxlength="100" autofocus placeholder="Например, Касса" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Отмена</Button>
          <Button type="submit" :disabled="!name.trim()">{{ props.account ? 'Сохранить' : 'Добавить счёт' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
