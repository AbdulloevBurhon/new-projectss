<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Input, Label,
} from '@obshaya/ui'
import { warehouseTypeLabels, type Warehouse, type WarehouseDraft, type WarehouseType } from '../../../../../endpoints/warehouse/get-warehouses/get-warehouses.types'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ warehouse: Warehouse | null; saving: boolean; error: string }>()
const emit = defineEmits<{ save: [draft: WarehouseDraft] }>()
const name = ref('')
const type = ref<WarehouseType>()

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.warehouse?.name ?? ''
  type.value = props.warehouse?.type
})

function submit() {
  if (!props.saving && type.value && name.value.trim()) emit('save', { name: name.value, type: type.value })
}

function close() {
  if (!props.saving) open.value = false
}
</script>

<template>
  <Dialog :open="open" @update:open="!$event && close()">
    <DialogContent
      :show-close-button="!saving"
      @escape-key-down="saving && $event.preventDefault()"
      @interact-outside="saving && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>{{ warehouse ? 'Редактировать склад' : 'Новый склад' }}</DialogTitle>
        <DialogDescription>Укажите название и тип склада.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="warehouse-name">Название</Label>
          <Input id="warehouse-name" v-model="name" required maxlength="120" :disabled="saving" />
        </div>
        <fieldset class="space-y-2" :disabled="saving">
          <legend class="text-sm font-medium">Тип склада</legend>
          <div class="flex flex-wrap gap-x-5 gap-y-2">
            <label v-for="(label, value) in warehouseTypeLabels" :key="value" class="flex items-center gap-2 text-sm">
              <input v-model="type" type="radio" name="warehouse-type" :value="value" class="size-4 accent-primary" required />
              {{ label }}
            </label>
          </div>
        </fieldset>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="close">Отмена</Button>
          <Button type="submit" class="min-w-32" :aria-busy="saving" :disabled="saving || !name.trim() || !type">
            <LoaderCircle v-if="saving" class="size-4 motion-safe:animate-spin" aria-hidden="true" />
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
