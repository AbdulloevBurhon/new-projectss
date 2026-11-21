import type { Env } from '../../../types'
import { json } from '../../../utils/http'
import { bot, configured, phoneDigits } from './bot'

type TelegramUpdate = {
  message?: {
    chat: { type: string; id: number }
    from?: { id: number }
    text?: string
    contact?: { phone_number: string; user_id?: number }
  }
}
export async function telegramWebhook(request: Request, env: Env) {
  if (!configured(env) || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ error: 'Не авторизован' }, 401)
  }
  const message = (await request.json() as TelegramUpdate | null)?.message
  if (!message || message.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id) || message.from?.id !== message.chat.id) return json({ ok: true })
  const chat = String(message.chat.id)
  const start = message.text?.match(/^\/start ([a-f0-9]{32})$/)?.[1]
  if (start) {
    const result = await env.DB.prepare(`UPDATE telegram_deliveries SET chat_id=? WHERE ticket=? AND state='pending' AND expires_at>?
      AND (chat_id IS NULL OR chat_id=?)
      AND NOT EXISTS (SELECT 1 FROM telegram_deliveries WHERE chat_id=? AND ticket!=? AND state='pending' AND expires_at>?)
      RETURNING ticket`).bind(chat, start, Date.now(), chat, chat, start, Date.now()).first()
    const reply = result ? {
      chat_id: chat, text: 'Подтвердите номер для получения сверки и бэкапа «Цеха».',
      reply_markup: { keyboard: [[{ text: 'Подтвердить мой номер', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    } : { chat_id: chat, text: 'Ссылка недействительна. Запросите новую ссылку в настройках «Цеха».' }
    if (!(await bot(env, 'sendMessage', reply)).ok) return json({ error: 'Telegram не принял сообщение.' }, 502)
  } else if (message.contact?.user_id === message.from?.id && message.contact) {
    const phone = phoneDigits(message.contact.phone_number)
    const row = await env.DB.prepare(`SELECT ticket,phone FROM telegram_deliveries
      WHERE chat_id=? AND state='pending' AND expires_at>? ORDER BY expires_at DESC LIMIT 1`).bind(chat, Date.now()).first<{ ticket: string; phone: string }>()
    if (!row) return json({ ok: true })
    const match = row.phone === phone
    const result = await env.DB.prepare(`UPDATE telegram_deliveries SET state=?, chat_id=?
      WHERE ticket=? AND chat_id=? AND state='pending' AND expires_at>? RETURNING ticket`)
      .bind(match ? 'verified' : 'pending', match ? chat : null, row.ticket, chat, Date.now()).first()
    if (result) await bot(env, 'sendMessage', {
      chat_id: chat,
      text: match ? 'Номер подтверждён. Отправку нужно одобрить в настройках «Цеха».' : 'Номер не совпал. Проверьте номер в «Цехе» и откройте ссылку заново.',
      reply_markup: { remove_keyboard: true },
    })
  }
  return json({ ok: true })
}
