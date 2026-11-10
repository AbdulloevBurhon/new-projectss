import { useProductPin } from '~/features/license/composables/useProductPin'
import type { ProductId } from '~~/shared/contracts/product'

export function useWorkshopPin(productId: ProductId = 'tsekh') {
  return useProductPin(productId)
}
