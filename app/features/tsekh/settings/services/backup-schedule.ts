import type { BackupSchedule } from '../types/settings'

const scheduleKey = 'workshop-backup-schedule-v1'
const validDay = (day: unknown): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day < 7
const validTime = (time: unknown): time is string => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

export function readSchedule(): BackupSchedule | undefined {
  const raw = localStorage.getItem(scheduleKey)
  if (!raw) return
  const schedule = JSON.parse(raw) as (Partial<BackupSchedule> & { day?: number }) | null
  if (!schedule || !validTime(schedule.time) || typeof schedule.enabledAt !== 'number' || !Number.isFinite(schedule.enabledAt)) return
  const days = schedule.days ?? [schedule.day]
  if (!Array.isArray(days) || !days.length || !days.every(validDay)) return
  return { days: [...new Set(days)], time: schedule.time, enabledAt: schedule.enabledAt }
}

export function saveSchedule(days: number[], time: string) {
  if (!days.length || !days.every(validDay)) throw new Error('Выберите хотя бы один день резервного копирования.')
  if (!validTime(time)) throw new Error('Выберите время резервного копирования.')
  const schedule = { days: [...new Set(days)], time, enabledAt: Math.floor(Date.now() / 60_000) * 60_000 }
  localStorage.setItem(scheduleKey, JSON.stringify(schedule))
  return schedule
}

export const resetSchedule = () => localStorage.removeItem(scheduleKey)

export function dueBackupSlot(now: Date, schedule: BackupSchedule) {
  const [hour, minute] = schedule.time.split(':').map(Number)
  for (let offset = 0; offset <= 7; offset++) {
    const slot = new Date(now)
    slot.setDate(slot.getDate() - offset)
    if (!schedule.days.includes(slot.getDay())) continue
    slot.setHours(hour!, minute!, 0, 0)
    if (slot <= now) return slot.getTime() >= schedule.enabledAt ? slot.getTime() : undefined
  }
}
