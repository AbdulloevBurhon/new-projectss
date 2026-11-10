<script setup lang="ts">
import InventoryDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import CatalogTable from './CatalogTable.vue'
import WarehouseMetrics from './WarehouseMetrics.vue'
import TechCardEditor from './techcards/TechCardEditor.vue'
import TechCardInfo from './techcards/TechCardInfo.vue'
import ProductFields from './ProductFields.vue'
import { useInventory } from '../stores/useInventory'
import type { Catalog, Product, ProductDraft, TechCard, Warehouse } from '../types/inventory'
import { matchesName } from '../utils/format'
import { warehouseKind, warehouseKinds } from '../utils/warehouse-kind'

const props = defineProps<{ catalog: Catalog }>()
const { inventory, saveEntry, deleteEntry } = useInventory()
type Entry = Warehouse | Product | TechCard

const copy = {
  warehouses: { add: 'Добавить склад', edit: 'Изменить склад', empty: 'Складов пока нет', placeholder: 'Например, Склад материалов' },
  products: { add: 'Добавить товар', edit: 'Изменить товар', empty: 'Товаров пока нет', placeholder: 'Например, Арматура' },
  techcards: { add: 'Добавить техкарту', edit: 'Изменить техкарту', empty: 'Техкарт пока нет', placeholder: 'Название изделия' },
}
const labels = computed(() => copy[props.catalog])
const query = ref('')
const visible = computed(() => inventory.value[props.catalog].filter(item => matchesName(item.name, query.value)))

const dialog = ref<'form' | 'delete' | 'info'>()
const selected = ref<Entry>()
const selectedCard = computed(() => selected.value && 'cost' in selected.value ? selected.value : undefined)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const draft = ref<ProductDraft>({ name: '', unit: 'шт', packaged: false, contentUnit: 'л', quantityPerPiece: '' })
const kind = ref(warehouseKind())

function open(mode: NonNullable<typeof dialog.value>, item?: Entry) {
  selected.value = item
  kind.value = warehouseKind(item)
  const product = item && 'unit' in item ? item : undefined
  draft.value = {
    name: item?.name ?? '',
    unit: product?.unit ?? 'шт',
    packaged: !!product?.quantityPerPiece,
    contentUnit: product?.contentUnit ?? 'л',
    quantityPerPiece: product?.quantityPerPiece ?? '',
  }
  error.value = ''
  notice.value = ''
  dialog.value = mode
}

function saved() {
  notice.value = 'Изменения сохранены.'
  dialog.value = undefined
}

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (dialog.value === 'delete' && selected.value) {
      await deleteEntry(props.catalog, selected.value.id)
      notice.value = 'Запись удалена.'
    } else if (props.catalog !== 'techcards') {
      await saveEntry(props.catalog, selected.value?.id, draft.value, kind.value)
      saved()
    }
    dialog.value = undefined
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось выполнить действие.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport defer to="#warehouse-tab-action">
    <button type="button" class="inventory-button primary" @click="open('form')"><InventoryIcon name="plus" /> {{ labels.add }}</button>
  </Teleport>
  <WarehouseMetrics v-if="catalog === 'warehouses'" />
  <p v-if="notice" role="status" class="inventory-message success"><InventoryIcon name="check" /> {{ notice }}</p>
  <section class="inventory-panel">
    <div class="panel-filters">
      <label class="inventory-search">
        <InventoryIcon name="search" />
        <input v-model="query" type="search" aria-label="Поиск по названию" placeholder="Поиск по названию" />
      </label>
    </div>
    <CatalogTable :catalog="catalog" :visible="visible" :reset-key="query" :empty="query.trim() ? 'Совпадений не найдено' : labels.empty" @action="open" />
  </section>

  <TechCardEditor v-if="dialog === 'form' && catalog === 'techcards'" :card="selectedCard" @close="dialog = undefined" @saved="saved" />
  <InventoryDialog v-else-if="dialog === 'form'" :title="selected ? labels.edit : labels.add" :busy="busy" @close="dialog = undefined">
    <form class="dialog-content" @submit.prevent="submit">
      <label class="inventory-field">Название<input v-model="draft.name" maxlength="100" required autofocus :placeholder="labels.placeholder" /></label>
      <ProductFields v-if="catalog === 'products'" v-model="draft" :disabled="busy" />
      <label v-else class="inventory-field">Тип склада
        <select v-model="kind" :disabled="busy"><option v-for="(name, value) in warehouseKinds" :key="value" :value="value">{{ name }}</option></select>
      </label>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="dialog = undefined">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy">Сохранить</button>
      </div>
    </form>
  </InventoryDialog>
  <InventoryDialog v-else-if="dialog === 'delete'" title="Удалить запись?" :busy="busy" @close="dialog = undefined">
    <div class="dialog-content">
      <p>Удалить «{{ selected?.name }}»?</p>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" autofocus @click="dialog = undefined">Отмена</button>
        <button type="button" class="inventory-button destructive" :disabled="busy" @click="submit">Удалить</button>
      </div>
    </div>
  </InventoryDialog>
  <TechCardInfo v-else-if="dialog === 'info' && selectedCard" :card="selectedCard" @close="dialog = undefined" />
</template>
