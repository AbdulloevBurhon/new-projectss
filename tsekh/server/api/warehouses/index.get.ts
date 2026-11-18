import { getWarehouses } from '../../services/warehouses/warehouses.service'

export default defineEventHandler(() => getWarehouses())
