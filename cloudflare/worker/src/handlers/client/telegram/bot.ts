import type { Env } from '../../../types'

export function phoneDigits(value: unknown) {
  if (typeof value !== 'string' || !/^\+?[0-9 ()-]+$/.test(value)) return ''
  const digits = value.replace(/\D/g, '')
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : ''
}

export function configured(env: Env) {
  return env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.TELEGRAM_BOT_USERNAME
    && /^[a-zA-Z0-9_]{5,32}$/.test(env.TELEGRAM_BOT_USERNAME)
}

export async function bot(env: Env, method: string, body: FormData | Record<string, unknown>) {
  const multipart = body instanceof FormData
  const result = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: multipart ? undefined : { 'Content-Type': 'application/json' },
    body: multipart ? body : JSON.stringify(body), signal: AbortSignal.timeout(55_000),
  })
  return await result.json() as { ok?: boolean }
}
