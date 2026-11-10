export const productNames = { tsekh: 'Цех', shawarma: 'Шаурма' } as const

export function formatDate(value?: number) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value * 1000))
}

export function dateInput(value: number) {
  return new Date(value * 1000).toISOString().slice(0, 10)
}
