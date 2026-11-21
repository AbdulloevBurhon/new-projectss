import { randomUUID } from 'node:crypto'
import { isTelegramInterval } from '@obshaya/contracts/telegram-schedule'
import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import { exportTelegramSummary } from '../archive/archive.service'
import { readScheduleInput } from './schedule-input'

db.exec(q.telegramScheduleSchema)
const store = db.prepare(q.setTelegramSchedule)
const drop = db.prepare(q.clearTelegramSchedule)
const read = db.prepare(q.getTelegramSchedule)
const readPolicy = db.prepare(q.getTelegramPolicy)
const setPolicy = db.prepare(q.setTelegramPolicy)
const clearOutbox = db.prepare(q.clearTelegramOutbox)
const prune = db.prepare(q.pruneTelegramOutbox)
const queue = db.prepare(q.queueTelegramJob)
const advance = db.prepare(q.advanceTelegramPolicy)
const find = db.prepare(q.findTelegramJob)
const mark = db.prepare(q.markTelegramJob)
const remove = db.prepare(q.removeTelegramJob)

type Policy = { interval_minutes: number; next_at: number }
type Job = { id: string; payload: string }
type Input = ReturnType<typeof readScheduleInput>
const token = () => (read.get() as { token: string } | undefined)?.token
const policy = () => readPolicy.get() as Policy | undefined

const replaceToken = db.transaction((value: string | null) => {
  if (value === token()) return
  if (value === null) drop.run()
  else store.run({ token: value })
  db.exec(q.clearTelegramPolicy)
})

export function saveTelegramScheduleToken(value: unknown) {
  if (value !== null && (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный ключ расписания.' })
  }
  replaceToken.immediate(value)
  return { saved: true }
}

const capture = db.transaction((input: Input, now: number) => {
  const current = policy()
  if (!current?.interval_minutes || current.next_at > now) return
  const id = randomUUID().replaceAll('-', '')
  const { start, previous, end, day, previousDay, entries } = input
  const snapshot = exportTelegramSummary(start, previous, end, true)
  const capturedAt = new Date(now).toISOString()
  queue.run({ id, day, payload: JSON.stringify({ id, day, previousDay, capturedAt, entries, snapshot }) })
  advance.run({ next: now + current.interval_minutes * 60_000 })
})

const claim = db.transaction((now: number) => {
  const job = find.get({ now }) as Job | undefined
  if (job) mark.run({ id: job.id, retry: now + 215_000 })
  return job
})

const syncPolicy = db.transaction((minutes: number, now: number) => {
  setPolicy.run({ minutes, now: now + minutes * 60_000 })
  if (minutes === 0) clearOutbox.run()
})

class OutboxHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

async function load(apiBase: string, key: string, body?: string) {
  const response = await fetch(apiBase.replace(/\/$/, '') + '/api/client/telegram/outbox', {
    method: body ? 'POST' : 'GET', body, redirect: 'error',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(body ? 205_000 : 8_000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new OutboxHttpError(response.status, result.error ?? 'Не удалось отправить комплект в Telegram.')
  return result as { intervalMinutes?: unknown; delivered?: boolean }
}

let running = false
export async function runTelegramSchedule(apiBase: string, raw: Record<string, unknown>) {
  const key = token()
  if (!key) return { needsDevice: true }
  if (running) return {}
  const input = readScheduleInput(raw, Date.now())
  running = true
  try {
    prune.run({ cutoff: input.cutoff })
    if (input.online) {
      const result = await load(apiBase, key)
      if (key !== token()) return {}
      if (!isTelegramInterval(result.intervalMinutes)) throw new Error('Сервер не вернул интервал Telegram.')
      syncPolicy.immediate(result.intervalMinutes, Date.now())
    }
    capture.immediate(input, Date.now())
    const intervalMinutes = policy()?.interval_minutes
    const job = input.online && intervalMinutes ? claim.immediate(Date.now()) : undefined
    if (!job) return { intervalMinutes }
    try {
      if (!(await load(apiBase, key, job.payload)).delivered) throw new Error('Сервер не подтвердил получение комплекта.')
      remove.run({ id: job.id })
      return { intervalMinutes, more: !!find.get({ now: Date.now() }) }
    } catch (error) {
      mark.run({ id: job.id, retry: Date.now() + 60_000 })
      throw error
    }
  } catch (error) {
    if (key !== token()) return {}
    if (error instanceof OutboxHttpError && error.status === 401) {
      replaceToken.immediate(null)
      return { needsDevice: true }
    }
    if (error instanceof OutboxHttpError && error.status === 403) syncPolicy.immediate(0, Date.now())
    else if (input.online && !(error instanceof OutboxHttpError && error.status === 404)) capture.immediate(input, Date.now())
    throw createError({ statusCode: 502, statusMessage: 'Telegram: ошибка доставки', data: {
      message: error instanceof OutboxHttpError ? error.message : 'Связь с Telegram недоступна. Повторим позже.',
    } })
  } finally { running = false }
}
