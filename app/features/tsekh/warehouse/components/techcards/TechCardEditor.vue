<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import TechCardMaterials from './TechCardMaterials.vue'
import TechCardPhoto from './TechCardPhoto.vue'
import { useInventory } from '../../stores/useInventory'
import type { TechCard, TechCardDraft } from '../../types/inventory'
import { materialPieces } from '../../utils/techcards'

const props = defineProps<{ card?: TechCard }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { inventory, saveTechCard } = useInventory()
const draft = reactive<TechCardDraft>({
  name: props.card?.name ?? '',
  cost: props.card?.cost ?? '',
  price: props.card?.price ?? '',
  photo: props.card?.photo ?? '',
  materials: props.card?.materials?.map(material => {
    const capacity = inventory.value.products.find(product => product.id === material.productId)?.quantityPerPiece
    return { ...material, pieces: capacity ? materialPieces(material, capacity) : undefined }
  }) ?? [],
})
const saving = ref(false)
const loadingPhoto = ref(false)
const error = ref('')
const busy = computed(() => saving.value || loadingPhoto.value)

async function submit() {
  if (busy.value) return
  saving.value = true
  error.value = ''
  try {
    await saveTechCard(props.card?.id, draft)
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить техкарту.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <WorkshopDialog wide class="techcard-dialog" :title="card ? 'Изменить техкарту' : 'Добавить техкарту'" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <label class="inventory-field">
        Название техкарты
        <input v-model="draft.name" required maxlength="100" autofocus :disabled="saving" placeholder="Например, Дари Сурх" />
      </label>

      <div class="techcard-grid">
        <div class="techcard-details">
          <TechCardPhoto v-model="draft.photo" v-model:loading="loadingPhoto" :disabled="saving" />
          <div class="techcard-prices">
            <label class="inventory-field">Цена продажи, сом
              <input v-model="draft.price" type="number" min="0" max="1000000" step="0.01" required :disabled="saving" />
            </label>
            <label class="inventory-field">Цена производства, сом
              <input v-model="draft.cost" type="number" min="0" max="1000000" step="0.01" required :disabled="saving" />
            </label>
          </div>
        </div>
        <TechCardMaterials v-model="draft.materials" :products="inventory.products" :disabled="saving" />
      </div>

      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy">Сохранить</button>
      </div>
    </form>
  </WorkshopDialog>
</template>

