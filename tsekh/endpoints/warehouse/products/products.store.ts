import { reactive } from 'vue'
import { deleteProduct, getLegacyProducts, getProducts, saveProduct, saveProductBarcode, saveProducts } from './products.service'
import type { GetProductsResult, ProductDraft } from './products.types'
import { stockReceiptError } from '../stock-receipts/service'

export function useProductsStore() {
  const state = reactive({ rows: [] as GetProductsResult, loading: true, pending: false, error: '' })
  const barcodePending = reactive<Record<string, boolean>>({})
  const barcodeErrors = reactive<Record<string, string>>({})

  async function load() {
    try {
      state.rows = await getProducts()
      if (!state.rows.length && typeof window !== 'undefined') {
        const legacy = getLegacyProducts()
        if (legacy.length) {
          await $fetch('/api/products/migrate', { method: 'POST', body: { products: legacy } })
          state.rows = await getProducts()
        }
      }
      if (typeof window !== 'undefined') saveProducts(state.rows)
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
      const product = await saveProduct(draft, id, state.rows.find(row => row.id === id))
      state.rows = id ? state.rows.map(row => row.id === product.id ? product : row) : [product, ...state.rows]
      saveProducts(state.rows)
      return true
    } catch (error) {
      state.error = stockReceiptError(error, 'Не удалось сохранить товар.')
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
      await deleteProduct(id)
      state.rows = state.rows.filter(product => product.id !== id)
      saveProducts(state.rows)
      return true
    } catch (error) {
      state.error = stockReceiptError(error, 'Не удалось удалить товар.')
      return false
    } finally {
      state.pending = false
    }
  }

  async function saveBarcode(id: string, barcode: string | null) {
    if (barcodePending[id]) return
    delete barcodeErrors[id]
    if ((state.rows.find(row => row.id === id)?.barcode ?? null) === barcode) return
    barcodePending[id] = true
    try {
      const saved = await saveProductBarcode(id, barcode)
      state.rows = state.rows.map(row => row.id === id ? saved : row)
      saveProducts(state.rows)
    } catch (error) {
      barcodeErrors[id] = stockReceiptError(error, 'Не удалось сохранить штрихкод.')
    } finally {
      delete barcodePending[id]
    }
  }

  return { state, load, save, remove, saveBarcode, barcodePending, barcodeErrors }
}
