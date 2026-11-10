const quantityFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })
const moneyFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const quantity = (value: number) => quantityFormat.format(value)
export const money = (value: number) => `${moneyFormat.format(value)} сом`
export const lineTotal = (quantity: number, price: number) =>
  Math.round(Math.round(quantity * 1000) * Math.round(price * 100) / 1000) / 100

export function validNumber(value: number, scale: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000
    && Math.abs(value * scale - Math.round(value * scale)) < 0.000001
}

export function localDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function matchesName(name: string, search: string) {
  return name.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))
}
