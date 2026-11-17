import { reactive } from 'vue'
import { deleteProduct, getProducts, saveProduct } from './products.service'
import type { GetProductsResult, ProductDraft } from './products.types'

export function useProductsStore() {
  const state = reactive({ rows: [] as GetProductsResult, loading: true, pending: false, error: '' })

  function load() {
    try {
      state.rows = getProducts()
      state.error = ''
    } catch {
      state.error = 'Не удалось загрузить товары.'
    } finally {
      state.loading = false
    }
  }

  async function save(draft: ProductDraft, id?: string) {
    if (state.pending) return false
    state.pending = true
    state.error = ''
    try {
      state.rows = await saveProduct(draft, id)
      return true
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Не удалось сохранить товар.'
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
      state.rows = await deleteProduct(id)
      return true
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Не удалось удалить товар.'
      return false
    } finally {
      state.pending = false
    }
  }

  return { state, load, save, remove }
}
