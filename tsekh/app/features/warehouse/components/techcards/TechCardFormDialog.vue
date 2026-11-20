<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'
import type { Product } from '../../../../../endpoints/warehouse/products/products.types'
import type { TechCard, TechCardDraft, TechCardMaterialDraft } from '../../../../../endpoints/warehouse/techcards/techcards.types'
import { materialPieces, stockUnit } from '../../../../../endpoints/warehouse/techcards/techcards.service'
import TechCardProductPicker from './TechCardProductPicker.vue'
import TechCardMaterialRow from './TechCardMaterialRow.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ card: TechCard | null; products: Product[]; saving: boolean; error: string }>()
const emit = defineEmits<{ save: [draft: TechCardDraft] }>()
const name = ref('')
const cost = ref<number | string>('')
const price = ref<number | string>('')
const photo = ref('')
const materials = ref<TechCardMaterialDraft[]>([])
const photoError = ref('')
const fileInput = ref<HTMLInputElement>()
const selectedIds = computed(() => new Set(materials.value.map(item => item.productId)))

watch(open, (value) => {
  if (!value) return
  name.value = props.card?.name ?? ''
  cost.value = props.card?.cost ?? 0
  price.value = props.card?.price ?? ''
  photo.value = props.card?.photo ?? ''
  materials.value = (props.card?.materials ?? []).map(item => {
    const product = props.products.find(row => row.id === item.productId)
    return { ...item, pieces: product?.quantityPerPiece ? materialPieces(item, product.quantityPerPiece, product.unit) : undefined }
  })
  photoError.value = ''
})

function toggleProduct(product: Product) {
  const index = materials.value.findIndex(item => item.productId === product.id)
  if (index >= 0) { materials.value.splice(index, 1); return }
  const initialQuantity = product.quantityPerPiece
    ? product.unit === 'кг' ? product.quantityPerPiece : Math.min(1, product.quantityPerPiece)
    : 1
  materials.value.push({ productId: product.id, name: product.name, unit: stockUnit(product), quantity: initialQuantity, pieces: product.quantityPerPiece ? 1 : undefined })
}

async function choosePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoError.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { photoError.value = 'Выберите JPEG, PNG или WebP до 12 МБ.'; return }
  try {
    const image = await createImageBitmap(file)
    const scale = Math.min(1, 960 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.close()
    const result = canvas.toDataURL('image/webp', 0.78)
    if (result.length > 500_000) throw new Error()
    photo.value = result
  } catch { photoError.value = 'Не удалось обработать фото. Выберите другое изображение.' }
  finally { (event.target as HTMLInputElement).value = '' }
}

function submit() {
  emit('save', { name: name.value, cost: cost.value, price: price.value, photo: photo.value, materials: materials.value })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="h-[39.5rem] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-3xl" :show-close-button="!saving" @escape-key-down="saving && $event.preventDefault()" @interact-outside="saving && $event.preventDefault()">
      <DialogHeader><DialogTitle>{{ card ? 'Изменить техкарту' : 'Добавить техкарту' }}</DialogTitle><DialogDescription>Укажите цены и состав на одну техкарту.</DialogDescription></DialogHeader>
      <form class="flex min-h-0 flex-col gap-5" @submit.prevent="submit">
        <div class="grid shrink-0 gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <div class="space-y-2">
            <Label>Фото блюда</Label>
            <button type="button" class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted" :disabled="saving" @click="fileInput?.click()">
              <img v-if="photo" :src="photo" alt="Фото блюда" class="size-full object-cover">
              <span v-else class="px-2 text-center">Добавить фото</span>
            </button>
            <div class="flex justify-center gap-2 text-xs"><button v-if="photo" type="button" class="text-primary hover:underline" :disabled="saving" @click="fileInput?.click()">Изменить</button><button v-if="photo" type="button" class="text-destructive hover:underline" :disabled="saving" @click="photo = ''">Удалить</button></div>
            <input ref="fileInput" class="hidden" type="file" accept="image/jpeg,image/png,image/webp" @change="choosePhoto">
          </div>
          <div class="grid content-start gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div class="space-y-2"><Label for="techcard-name">Название</Label><Input id="techcard-name" v-model="name" required maxlength="100" :disabled="saving" placeholder="Например, Шаурма классическая" /></div>
            <div class="space-y-2"><Label for="techcard-price">Цена продажи</Label><Input id="techcard-price" v-model="price" type="number" min="0" max="1000000" step="0.01" required :disabled="saving" /></div>
            <div class="sm:col-span-2"><TechCardProductPicker :products="products" :selected-ids="selectedIds" :disabled="saving" @toggle="toggleProduct" /></div>
          </div>
        </div>
        <p v-if="photoError" class="text-sm text-destructive" role="alert">{{ photoError }}</p>
        <div class="min-h-0 flex-1 border-t pt-4">
          <div v-if="materials.length" class="space-y-2">
            <div class="grid max-h-[16.5rem] gap-2 overflow-y-auto pr-1">
              <TechCardMaterialRow v-for="(line, index) in materials" :key="line.productId" :line="line" :product="products.find(item => item.id === line.productId)" :disabled="saving" @update:line="materials[index] = $event" />
            </div>
          </div>
        </div>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter><Button type="button" variant="outline" :disabled="saving" @click="open = false">Отмена</Button><Button type="submit" :disabled="saving || !name.trim()">{{ saving ? 'Сохранение…' : 'Сохранить техкарту' }}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
