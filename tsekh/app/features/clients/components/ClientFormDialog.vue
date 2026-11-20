<script setup lang="ts">
import { ref } from 'vue'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'

const props = defineProps<{ client?: { name: string; phone: string } }>()
const emit = defineEmits<{ close: []; save: [name: string, phone: string] }>()
const name = ref(props.client?.name ?? '')
const phone = ref(props.client?.phone ?? '')
function submit() {
  if (name.value.trim() && phone.value.trim()) emit('save', name.value.trim(), phone.value.trim())
}
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open) emit('close') }">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ client ? 'Редактировать клиента' : 'Новый клиент' }}</DialogTitle></DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2"><Label for="client-name">Имя</Label><Input id="client-name" v-model="name" maxlength="120" required /></div>
        <div class="grid gap-2"><Label for="client-phone">Телефон</Label><Input id="client-phone" v-model="phone" type="tel" maxlength="32" required /></div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">Отмена</Button>
          <Button type="submit" :disabled="!name.trim() || !phone.trim()">Сохранить</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
