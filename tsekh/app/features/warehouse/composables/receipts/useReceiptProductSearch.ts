import { computed, ref, watch } from 'vue'
import { barcodeMaxLength, type Product } from '../../../../../endpoints/warehouse/products/products.types'
import { barcodeKey, type BarcodeScanResult } from '../../../../components/barcode/barcode'

export function useReceiptProductSearch(products: () => Product[]) {
  const receiptSearch = ref('')
  const receiptBarcodeSearch = ref('')
  const exactProduct = ref('')
  const receiptNameQuery = computed(() => receiptSearch.value.trim().toLocaleLowerCase('ru'))
  const receiptBarcodeQuery = computed(() => receiptBarcodeSearch.value.trim().toLowerCase())
  const visibleReceiptProducts = computed(() => products().filter(product => exactProduct.value
    ? product.id === exactProduct.value
    : product.name.toLocaleLowerCase('ru').includes(receiptNameQuery.value)
      && (!receiptBarcodeQuery.value || product.barcode?.toLowerCase().includes(receiptBarcodeQuery.value))))

  watch([receiptSearch, receiptBarcodeSearch], () => { exactProduct.value = '' }, { flush: 'sync' })

  function scan(code: string): BarcodeScanResult {
    if (code.length > barcodeMaxLength) return { ok: false, title: 'Не удалось найти товар', message: 'Штрихкод слишком длинный.' }
    const key = barcodeKey(code)
    const matches = products().filter(product => product.barcode && barcodeKey(product.barcode) === key)
    if (!matches.length) return { ok: false, title: 'Товар не найден', message: 'В справочнике товаров нет такого штрихкода.' }
    if (matches.length > 1) return { ok: false, title: 'Найдено несколько товаров', message: 'Уточните штрихкод в карточках товаров.' }
    const product = matches[0]!
    receiptSearch.value = ''
    receiptBarcodeSearch.value = product.barcode!
    exactProduct.value = product.id
    return { ok: true, message: `Товар найден: ${product.name}.` }
  }

  return { receiptSearch, receiptBarcodeSearch, visibleReceiptProducts, hasFilters: computed(() => !!(receiptNameQuery.value || receiptBarcodeQuery.value)), scan }
}
