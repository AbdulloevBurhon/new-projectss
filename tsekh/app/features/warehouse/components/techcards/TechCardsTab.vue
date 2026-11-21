<script setup lang="ts">
import { useEmployeeAccess } from '../../../workers/composables/useEmployeeAccess'
import { computed, ref } from 'vue'
import { Button,DataTable,Input,TabsContent,toast } from '@obshaya/ui'
import { Info,Plus,Pencil,Trash2 } from '@lucide/vue'
import type { TechCard, TechCardDraft } from '../../../../../endpoints/warehouse/techcards/techcards.types'
import TechCardFormDialog from './TechCardFormDialog.vue'
import TechCardInfoDialog from './TechCardInfoDialog.vue'
import DeleteTechCardDialog from './DeleteTechCardDialog.vue'
import { money } from '../../format'
import { useWarehouseContext } from '../../composables/warehouseContext'
const { products,techCards } = useWarehouseContext()
const techCardSearch = ref('')
const techCardDialogOpen = ref(false)
const selectedTechCard = ref<TechCard | null>(null)
const infoTechCard = ref<TechCard | null>(null)
const techCardInfoOpen = ref(false)
const deleteTechCardOpen = ref(false)
const deletingTechCard = ref<TechCard | null>(null)
const visibleTechCards = computed(() => techCards.state.rows.filter(card => card.name.toLocaleLowerCase('ru').includes(techCardSearch.value.trim().toLocaleLowerCase('ru'))))
const techCardColumns = [
  { key: 'name', label: 'Название техкарты' },
  { key: 'productionCost', label: 'Производство', align: 'right' as const },
  { key: 'salePrice', label: 'Продажа', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
function openTechCardForm(card: TechCard | null = null) {
  selectedTechCard.value = card
  techCards.state.error = ''
  techCardDialogOpen.value = true
}
function openTechCardInfo(card: TechCard) { infoTechCard.value = card; techCardInfoOpen.value = true }
function openTechCardDelete(card: TechCard) { deletingTechCard.value = card; techCards.state.error = ''; deleteTechCardOpen.value = true }
async function saveTechCard(draft: TechCardDraft) {
  if (selectedTechCard.value && !can('warehouses.edit')) return
  if (!await techCards.save(draft, products.state.rows, selectedTechCard.value?.id)) return
  techCardDialogOpen.value = false
  toast.success(selectedTechCard.value ? 'Техкарта обновлена.' : 'Техкарта добавлена.')
}
async function confirmDeleteTechCard() {
  if (!can('warehouses.delete') || !deletingTechCard.value || !await techCards.remove(deletingTechCard.value.id)) return
  deleteTechCardOpen.value = false
  toast.success('Техкарта удалена.')
}

const { can } = useEmployeeAccess()
</script>

<template>
  <TabsContent value="techcards" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <Input v-model="techCardSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск техкарты" />
      <Button class="ml-auto" :disabled="techCards.state.loading || !!techCards.state.error || products.state.loading || !!products.state.error" @click="openTechCardForm()"><Plus class="size-4" />Техкарта</Button>
    </div>
    <p v-if="techCards.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка техкарт…</p>
    <p v-else-if="techCards.state.error" class="text-sm text-destructive" role="alert">{{ techCards.state.error }}</p>
    <DataTable v-else :columns="techCardColumns" :rows="visibleTechCards" :empty-text="techCardSearch.trim() ? 'Совпадений не найдено' : 'Техкарт пока нет'">
      <template #cell-productionCost="{ row }">{{ money(row.cost) }} сом</template>
      <template #cell-salePrice="{ row }">{{ money(row.price) }} сом</template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1">
          <Button size="icon" variant="ghost" :aria-label="`Информация о техкарте ${row.name}`" @click="openTechCardInfo(row)"><Info class="size-4 text-sky-600" /></Button>
          <Button v-if="can('warehouses.edit')" size="icon" variant="ghost" :aria-label="`Изменить техкарту ${row.name}`" @click="openTechCardForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
          <Button v-if="can('warehouses.delete')" size="icon" variant="ghost" :aria-label="`Удалить техкарту ${row.name}`" @click="openTechCardDelete(row)"><Trash2 class="size-4 text-destructive" /></Button>
        </div>
      </template>
    </DataTable>
  </TabsContent>
    <TechCardFormDialog :open="techCardDialogOpen && (!selectedTechCard || can('warehouses.edit'))" @update:open="techCardDialogOpen = $event" :card="selectedTechCard" :products="products.state.rows" :saving="techCards.state.pending" :error="techCards.state.error" @save="saveTechCard" />
    <TechCardInfoDialog v-model:open="techCardInfoOpen" :card="infoTechCard" />
    <DeleteTechCardDialog :open="deleteTechCardOpen && can('warehouses.delete')" @update:open="deleteTechCardOpen = $event" :name="deletingTechCard?.name || ''" :pending="techCards.state.pending" :error="techCards.state.error" @confirm="confirmDeleteTechCard" />
</template>
