import { createShawarmaArchive, downloadShawarmaArchive, type ShawarmaArchive } from './shawarma-archive'

export interface ShawarmaBackupSchedule { days: number[]; time: string; enabledAt: number }
export interface ShawarmaBackupStatus { slot: number; createdAt: string }
const scheduleKey = 'shawarma-backup-schedule-v1'

export function readShawarmaSchedule(): ShawarmaBackupSchedule | undefined {
  const raw = localStorage.getItem(scheduleKey)
  if (!raw) return
  try {
    const value = JSON.parse(raw) as Partial<ShawarmaBackupSchedule>
    if (!Array.isArray(value.days) || !value.days.length || !value.days.every(day => Number.isInteger(day) && day >= 0 && day < 7) || typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) || typeof value.enabledAt !== 'number') return
    return value as ShawarmaBackupSchedule
  } catch { return }
}

export function saveShawarmaSchedule(days: number[], time: string) {
  if (!days.length || !days.every(day => Number.isInteger(day) && day >= 0 && day < 7)) throw new Error('Выберите дни резервного копирования.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Укажите корректное время.')
  const schedule = { days: [...new Set(days)], time, enabledAt: Date.now() }
  localStorage.setItem(scheduleKey, JSON.stringify(schedule))
  return schedule
}

export function clearShawarmaSchedule() { localStorage.removeItem(scheduleKey) }

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('shawarma-backups-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('backup')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readValue<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase()
  try { return await new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction('backup').objectStore('backup').get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  }) } finally { db.close() }
}

async function writeValues(values: Record<string, unknown>) {
  const db = await openDatabase()
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('backup', 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) transaction.objectStore('backup').delete(key)
      else transaction.objectStore('backup').put(value, key)
    }
  }) } finally { db.close() }
}

export async function readLastShawarmaBackup() {
  return { archive: await readValue<ShawarmaArchive>('last-archive'), status: await readValue<ShawarmaBackupStatus>('last-status') }
}

export async function downloadLastShawarmaBackup() {
  const archive = await readValue<ShawarmaArchive>('last-archive')
  if (!archive) throw new Error('Резервных копий пока нет.')
  downloadShawarmaArchive(archive)
}

export async function runShawarmaBackup(now = new Date()) {
  const schedule = readShawarmaSchedule()
  if (!schedule) return
  const [hour, minute] = schedule.time.split(':').map(Number)
  let slot: number | undefined
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() - offset)
    if (!schedule.days.includes(candidate.getDay())) continue
    candidate.setHours(hour!, minute!, 0, 0)
    if (candidate <= now && candidate.getTime() >= schedule.enabledAt) { slot = candidate.getTime(); break }
  }
  if (slot === undefined) return
  const previous = await readValue<ShawarmaBackupStatus>('last-status')
  if (previous && previous.slot >= slot) return previous
  const archive = createShawarmaArchive()
  const status = { slot, createdAt: archive.createdAt }
  await writeValues({ 'last-archive': archive, 'last-status': status })
  return status
}
