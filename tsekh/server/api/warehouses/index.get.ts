import { getWarehouses } from '../../services/warehouses/warehouses.service'

import { onlyResources } from '../../services/workers/employee-scope'

export default defineEventHandler(event => onlyResources(getWarehouses(), event.context.employee?.resources, 'warehouses', 'id'))
