<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Input, Label,
} from '@obshaya/ui'
import { barcodeMaxLength, type Product, type ProductDraft, type ProductUnit } from '../../../../endpoints/warehouse/products/products.types'
import ProductUnitSelect from './ProductUnitSelect.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ product: Product | null; saving: boolean; error: string }>()
const emit = defineEmits<{ save: [draft: ProductDraft] }>()
const name = ref('')
const barcode = ref('')
const unit = ref<ProductUnit>('шт')
const packaged = ref(false)
const contentUnit = ref<ProductUnit>('л')
const quantityPerPiece = ref<number | string>('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.product?.name ?? ''
  barcode.value = props.product?.barcode ?? ''
  unit.value = props.product?.unit ?? 'шт'
  packaged.value = props.product?.quantityPerPiece !== undefined
  contentUnit.value = props.product?.contentUnit ?? (props.product?.unit === 'кг' ? 'г' : 'л')
  quantityPerPiece.value = props.product?.quantityPerPiece ?? (unit.value === 'кг' ? 1000 : '')
})
watch(unit, (value, previous) => {
  if (value !== 'шт' && value !== 'кг' && value !== 'уп') packaged.value = false
  if (value === 'кг' && previous !== 'кг') {
    contentUnit.value = 'г'
    quantityPerPiece.value = 1000
  }
}, { flush: 'sync' })

function submit() {
  if (!name.value.trim()) return
  emit('save', { name: name.value, barcode: barcode.value, unit: unit.value, packaged: packaged.value, contentUnit: contentUnit.value, quantityPerPiece: quantityPerPiece.value })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="!saving"
      @escape-key-down="saving && $event.preventDefault()"
      @interact-outside="saving && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>{{ product ? 'Изменить товар' : 'Добавить товар' }}</DialogTitle>
        <DialogDescription>Укажите название, единицу измерения и параметры содержимого.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="product-name">Название</Label>
          <Input id="product-name" v-model="name" maxlength="100" required :disabled="saving" placeholder="Например, Мука" />
        </div>
        <div class="space-y-2">
          <Label for="product-barcode">Штрих</Label>
          <Input id="product-barcode" v-model="barcode" :maxlength="barcodeMaxLength" :disabled="saving" autocomplete="off" spellcheck="false" />
        </div>
        <div class="space-y-2">
          <Label for="product-unit">Единица измерения</Label>
          <ProductUnitSelect id="product-unit" v-model="unit" :disabled="saving" />
        </div>
        <fieldset class="space-y-3" :disabled="saving || (unit !== 'шт' && unit !== 'кг' && unit !== 'уп')">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="packaged" type="checkbox" class="size-4 accent-primary" />
            Учитывать содержимое упаковки
          </label>
          <div v-if="packaged" class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="product-content-unit">Единица содержимого</Label>
              <ProductUnitSelect id="product-content-unit" v-model="contentUnit" :disabled="saving || (unit !== 'шт' && unit !== 'кг' && unit !== 'уп')" />
            </div>
            <div class="space-y-2">
              <Label for="product-content-quantity">Количество в 1 {{ unit }}</Label>
              <Input id="product-content-quantity" v-model="quantityPerPiece" type="number" min="0.001" max="1000000" step="0.001" required placeholder="Например, 5" />
            </div>
          </div>
        </fieldset>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Отмена</Button>
          <Button type="submit" :disabled="saving || !name.trim()">{{ saving ? 'Сохранение…' : 'Сохранить' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
