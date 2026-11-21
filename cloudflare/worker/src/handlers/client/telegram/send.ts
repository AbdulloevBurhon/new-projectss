import type { Env } from '../../../types'
import { json } from '../../../utils/http'
import { sendDeliveryPart } from './message-parts'
import { publicDelivery, type Delivery } from './delivery-state'
import { readDeliveryPackage } from './send-package'

export async function sendTelegramDelivery(
  request: Request, env: Env, id: string, row: Delivery | null, tokenHash: string | null = null,
) {
  const now = Date.now()
  const scheduled = row?.interval_minutes && row.next_at != null && row.next_at <= now
  if (!row || !row.chat_id || (row.state === 'sending' && row.expires_at > now)
    || (!scheduled && (row.interval_minutes || row.state !== 'verified' || row.expires_at <= now))) {
    return json({ error: 'Номер не подтверждён, отправка уже начата или ещё не наступил срок.' }, 409)
  }
  const delivery = await readDeliveryPackage(request, row.ticket)
  if (delivery instanceof Response) return delivery
  const claimTime = Math.max(delivery.separateReports ? 180_000 : 120_000, delivery.parts.length * 55_000 + 15_000)
  const claimAt = Date.now()
  const claim = await env.DB.prepare(`UPDATE telegram_deliveries SET state='sending',expires_at=?,
    next_at=CASE WHEN interval_minutes>0 THEN ?+interval_minutes*60000 ELSE NULL END
    WHERE license_id=? AND ticket=? AND chat_id IS NOT NULL AND (state!='sending' OR expires_at<=?)
      AND ((interval_minutes=0 AND state='verified' AND expires_at>?) OR (interval_minutes>0 AND next_at<=?))
      AND (? IS NULL OR schedule_token_hash=?)
    RETURNING chat_id,interval_minutes`)
    .bind(claimAt + claimTime, claimAt + claimTime, id, row.ticket, claimAt, claimAt, claimAt, tokenHash, tokenHash).first<{ chat_id: string; interval_minutes: number }>()
  if (!claim) return json({ error: 'Подтверждение устарело или отправка уже начата.' }, 409)
  const finish = (state: Delivery['state']) => {
    const now = Date.now()
    const delay = state === 'verified' ? 60_000 : claim.interval_minutes * 60_000
    return env.DB.prepare(`UPDATE telegram_deliveries SET state=?,expires_at=?,next_at=?,last_sent_at=coalesce(?,last_sent_at)
      WHERE license_id=? AND ticket=? AND state='sending' AND expires_at=? RETURNING *`).bind(
      state, now + 15 * 60 * 1000, claim.interval_minutes ? now + delay : null, state === 'sent' ? now : null, id, row.ticket, claimAt + claimTime,
    ).first<Delivery>()
  }
  let sent = 0
  let result: { ok?: boolean } = {}
  const partial = () => delivery.separateReports
    ? `Отправлено сообщений: ${sent} из ${delivery.parts.length}. Проверьте чат перед повтором.`
    : 'Бэкап отправлен. Проверьте, дошёл ли текст сверки.'
  try {
    for (const part of delivery.parts) {
      result = await sendDeliveryPart(env, claim.chat_id, part)
      if (result.ok !== true) break
      sent++
    }
  } catch {
    await finish('unknown')
    return json({ error: sent ? partial() : 'Telegram не подтвердил отправку. Проверьте чат перед повторной попыткой.' }, 502)
  }
  if (result.ok !== true) {
    await finish(result.ok === false && !sent ? 'verified' : 'unknown')
    const error = sent ? partial()
      : result.ok === false ? 'Telegram отклонил отправку. Проверьте, что бот не заблокирован.' : 'Telegram не подтвердил отправку. Проверьте чат.'
    return json({ error }, 502)
  }
  return json(publicDelivery(env, await finish('sent')))
}
