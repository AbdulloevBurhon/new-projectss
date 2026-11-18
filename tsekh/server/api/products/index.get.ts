import { getProducts } from '../../services/products/products.service'

export default defineEventHandler(() => getProducts())
