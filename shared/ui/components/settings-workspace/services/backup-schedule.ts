import type { ProductId } from '@obshaya/contracts'
import type { BackupSchedule } from '../types'

export type SavedSchedule = BackupSchedule & { startsAt: number }

export const scheduleKey = (product: ProductId) => `obshaya:settings:${product}:backup-schedule`
const minuteMs = 60_000
const dayMinutes = 1440

export function readSchedule(product: ProductId): SavedSchedule | undefined {
  const raw = localStorage.getItem(scheduleKey(product))
  if (!raw) return
  try {
    const schedule = JSON.parse(raw) as (SavedSchedule & { time?: string; enabled?: boolean }) | null
    if (!schedule || !Number.isFinite(schedule.startsAt)) return

    const { time, intervalMinutes, enabled, startsAt, cloudCopy } = schedule
    const saved = { startsAt, cloudCopy }
    if (enabled === false) return { ...saved, intervalMinutes: 0 }
    if (Number.isInteger(intervalMinutes) && intervalMinutes >= 0 && intervalMinutes <= dayMinutes && !(intervalMinutes === 0 && time)) {
      return { ...saved, intervalMinutes }
    }

    // Older schedules with a fixed time continue on a 24-hour interval.
    if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return
    const [hour, minute] = time.split(':').map(Number)
    const first = new Date(saved.startsAt)
    first.setHours(hour!, minute!, 0, 0)
    if (first.getTime() < saved.startsAt) first.setDate(first.getDate() + 1)
    return { ...saved, startsAt: first.getTime() - dayMinutes * minuteMs, intervalMinutes: dayMinutes }
  } catch {
    return undefined
  }
}

export function dueBackupSlot(now: Date, schedule: SavedSchedule) {
  const interval = schedule.intervalMinutes * minuteMs
  if (!Number.isFinite(interval) || interval <= 0) return

  const periods = Math.floor((now.getTime() - schedule.startsAt) / interval)
  if (periods >= 1) return schedule.startsAt + periods * interval
}

export function nextBackupSlot(now: number, schedule: SavedSchedule) {
  const interval = schedule.intervalMinutes * minuteMs
  if (!Number.isFinite(interval) || interval <= 0) return

  const periods = Math.max(1, Math.floor((now - schedule.startsAt) / interval) + 1)
  return schedule.startsAt + periods * interval
}
