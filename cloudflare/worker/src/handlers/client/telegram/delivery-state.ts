import type { Env } from '../../../types'

export type Delivery = {
  ticket: string
  phone: string
  chat_id: string | null
  state: 'pending' | 'verified' | 'sending' | 'sent' | 'unknown'
  expires_at: number
  interval_minutes: number
  next_at: number | null
  last_sent_at: number | null
}
export function publicDelivery(env: Env, row: Delivery | null) {
  if (!row || (!row.interval_minutes && row.expires_at <= Date.now())) return { state: 'idle', reportFormat: 3 }
  const state = row.state === 'sending' && row.expires_at <= Date.now() ? 'unknown' : row.state
  return {
    reportFormat: 3, state, ticket: row.ticket, intervalMinutes: row.interval_minutes, nextAt: row.next_at, lastSentAt: row.last_sent_at, phone: '+' + row.phone,
    ...(row.state === 'pending' ? { botUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${row.ticket}` } : {}),
  }
}
