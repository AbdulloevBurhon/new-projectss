import { getTransfers } from '../../../services/transfers/transfers.service'

import { onlyResources } from '../../../services/workers/employee-scope'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const scope = event.context.employee?.resources
  const rows = getTransfers(readDate(query.from), readDate(query.to))
  return onlyResources(onlyResources(rows, scope, 'accounts', 'sourceAccountId'), scope, 'accounts', 'targetAccountId')
})

function readDate(value: unknown) {
  if (value === undefined) return undefined
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : null
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный формат даты.' })
  }
  return value as string
}
