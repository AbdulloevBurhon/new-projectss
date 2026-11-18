import { getTransfers } from '../../../services/transfers/transfers.service'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return getTransfers(readDate(query.from), readDate(query.to))
})

function readDate(value: unknown) {
  if (value === undefined) return undefined
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : null
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный формат даты.' })
  }
  return value as string
}
