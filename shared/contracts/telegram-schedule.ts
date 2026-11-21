export const MAX_TELEGRAM_INTERVAL_MINUTES = 10_080

export function isTelegramInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= 0 && value <= MAX_TELEGRAM_INTERVAL_MINUTES
}
