export function money(value: number) { return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) }
export const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 })
export const operationDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' })
