export function money(amount: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function requestError(error: unknown, fallback: string) {
  const response = (error as { data?: { statusMessage?: string; data?: { message?: string } } } | null)?.data
  const message = response?.data?.message || response?.statusMessage
  return typeof message === 'string' ? message : fallback
}

export function dateTime(row: { date: string; createdAt: string }) {
  const timestamp = new Date(row.createdAt)
  return Number.isNaN(timestamp.getTime()) ? row.date : `${new Date(`${row.date}T00:00:00`).toLocaleDateString('ru-RU')} ${timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}
