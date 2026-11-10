const dayFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' })
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

interface OperationDate {
  date: string
  createdAt?: string
}

function timestamp(value?: string) {
  if (typeof value !== 'string' || !/[T ]\d{2}:\d{2}/.test(value)) return undefined
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : undefined
}

export function operationDateTime(date: string, createdAt?: string) {
  const day = dayFormat.format(new Date(date))
  const time = timestamp(createdAt)
  return time === undefined ? day : `${day}, ${timeFormat.format(time)}`
}

export function newestOperationFirst(a: OperationDate, b: OperationDate) {
  return b.date.localeCompare(a.date)
    || (timestamp(b.createdAt) ?? Number.MIN_SAFE_INTEGER) - (timestamp(a.createdAt) ?? Number.MIN_SAFE_INTEGER)
}
