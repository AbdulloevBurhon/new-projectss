import { reactive } from 'vue'
import { getTechCards, saveTechCard, deleteTechCard } from './techcards.service'
import type { Product } from '../products/products.types'
import type { GetTechCardsResult, TechCardDraft } from './techcards.types'

export function useTechCardsStore() {
  const state = reactive({ rows: [] as GetTechCardsResult, loading: true, pending: false, error: '' })

  function load() {
    try {
      state.rows = getTechCards()
      state.error = ''
    } catch {
      state.error = 'Не удалось загрузить техкарты.'
    } finally {
      state.loading = false
    }
  }

  async function save(draft: TechCardDraft, products: Product[], id?: string) {
    if (state.pending) return false
    state.pending = true
    state.error = ''
    try {
      state.rows = await saveTechCard(draft, products, id)
      return true
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Не удалось сохранить техкарту.'
      return false
    } finally {
      state.pending = false
    }
  }

  async function remove(id: string) {
    if (state.pending) return false
    state.pending = true
    state.error = ''
    try {
      state.rows = await deleteTechCard(id)
      return true
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Не удалось удалить техкарту.'
      return false
    } finally {
      state.pending = false
    }
  }

  return { state, load, save, remove }
}
