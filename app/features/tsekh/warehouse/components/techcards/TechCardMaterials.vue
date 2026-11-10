<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { MaterialDraft, Product } from '../../types/inventory'
import { matchesName, quantity } from '../../utils/format'
import { stockUnit } from '../../utils/products'
import TechCardMaterialRow from './TechCardMaterialRow.vue'

const props = defineProps<{ products: Product[]; disabled?: boolean }>()
const materials = defineModel<MaterialDraft[]>({ required: true })
const search = ref('')
const picker = useTemplateRef<HTMLDetailsElement>('picker')
const visible = computed(() => props.products.filter(product => matchesName(product.name, search.value)))
const chosen = computed(() => new Set(materials.value.map(item => item.productId)))
const available = computed(() => new Map(props.products.map(product => [product.id, product])))
const rows = computed(() => materials.value.map(item => ({ item, product: available.value.get(item.productId) })))

function remove(id: string) {
  materials.value = materials.value.filter(item => item.productId !== id)
}

function select(product: Product, checked: boolean) {
  if (!checked) {
    remove(product.id)
  } else if (!chosen.value.has(product.id)) {
    const amount = Math.min(1, product.quantityPerPiece ?? 1)
    materials.value = [...materials.value, {
      productId: product.id,
      name: product.name,
      unit: stockUnit(product),
      quantity: amount,
      pieces: product.quantityPerPiece ? 1 : undefined,
    }]
  }
}

function closePicker() {
  if (!picker.value) return
  picker.value.open = false
  picker.value.querySelector('summary')?.focus()
}
</script>

<template>
  <section class="techcard-materials" aria-label="Состав техкарты">
    <h3>Материалы <span class="inventory-tag">{{ materials.length }}</span></h3>
    <details ref="picker" class="techcard-picker">
      <summary><WorkshopIcon name="plus" /> Выбрать товары <WorkshopIcon name="chevron" /></summary>
      <div class="techcard-options">
        <label class="inventory-search">
          <WorkshopIcon name="search" />
          <input v-model="search" type="search" aria-label="Поиск товара" placeholder="Поиск товара" />
        </label>
        <div class="techcard-option-list">
          <label v-for="product in visible" :key="product.id" class="techcard-option">
            <span>{{ product.name }}</span>
            <span class="inventory-tag">{{ product.quantityPerPiece ? `1 шт · ${quantity(product.quantityPerPiece)} ${product.contentUnit}` : product.unit }}</span>
            <input type="checkbox" :aria-label="`Выбрать: ${product.name}`" :checked="chosen.has(product.id)" :disabled="disabled"
              @change="select(product, ($event.target as HTMLInputElement).checked)" />
          </label>
          <p v-if="!visible.length" class="techcard-empty">
            {{ products.length ? 'Совпадений не найдено' : 'В каталоге пока нет товаров. Добавьте их во вкладке «Товары».' }}
          </p>
        </div>
        <button type="button" class="inventory-button secondary" @click="closePicker">Готово</button>
      </div>
    </details>

    <div class="techcard-material-list">
      <WorkshopTable :rows="rows" v-slot="{ pageRows }">
        <thead><tr><th scope="col">Товар</th><th scope="col">Штук</th><th scope="col">Расход</th><th scope="col"><span class="sr-only">Действия</span></th></tr></thead>
        <tbody>
          <TechCardMaterialRow v-for="{ item, product } in pageRows" :key="item.productId"
            :item="item" :product="product" :disabled="disabled" @remove="remove(item.productId)" />
          <tr v-if="!materials.length"><td colspan="4" class="table-empty">Выберите товары для состава техкарты.</td></tr>
        </tbody>
      </WorkshopTable>
    </div>
  </section>
</template>
