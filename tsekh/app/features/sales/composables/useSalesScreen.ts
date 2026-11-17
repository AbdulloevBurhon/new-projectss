import { computed, ref } from 'vue'
import { saleCatalog } from '../data/sale-catalog'
import type { SaleCartLine, SaleProduct } from '../types/sale.types'

export function useSalesScreen() {
  const search = ref('')
  const warehouse = ref('Основной склад')
  const account = ref('Касса')
  const category = ref('')
  const cart = ref<SaleCartLine[]>([])
  const categories = [...new Set(saleCatalog.map(item => item.category))]
  const products = computed(() => saleCatalog.filter((item) => {
    const query = search.value.trim().toLocaleLowerCase('ru')
    return item.name.toLocaleLowerCase('ru').includes(query)
      && (!category.value || item.category === category.value)
  }))
  const total = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

  function add(product: SaleProduct) {
    const line = cart.value.find(item => item.id === product.id)
    if (line) line.quantity = Math.min(product.stock, line.quantity + 1)
    else cart.value.push({ ...product, quantity: 1 })
  }

  function changeQuantity(id: string, delta: number) {
    const line = cart.value.find(item => item.id === id)
    if (!line) return
    line.quantity = Math.min(line.stock, line.quantity + delta)
    if (line.quantity <= 0) cart.value = cart.value.filter(item => item.id !== id)
  }

  return { search, warehouse, account, category, categories, products, cart, total, add, changeQuantity }
}
