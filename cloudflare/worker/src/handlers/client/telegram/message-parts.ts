import type { Env } from '../../../types'
import { bot } from './bot'

export const maxTextLength = 4096
type Document = { file: File; caption: string }
export type DeliveryPart = Document | { text: string }

export function textParts(report: string): { text: string }[] {
  const parts: { text: string }[] = []
  let remaining = report.trim()
  while (remaining.length > maxTextLength) {
    const lineEnd = remaining.lastIndexOf('\n', maxTextLength)
    let end = lineEnd > 0 ? lineEnd : maxTextLength
    const last = remaining.charCodeAt(end - 1)
    if (lineEnd <= 0 && last >= 0xd800 && last <= 0xdbff) end--
    const text = remaining.slice(0, end).trimEnd()
    if (text) parts.push({ text })
    remaining = remaining.slice(end + Number(lineEnd > 0)).trimStart()
  }
  if (remaining) parts.push({ text: remaining })
  return parts
}

export function sendDeliveryPart(env: Env, chatId: string, part: DeliveryPart) {
  if ('text' in part) return bot(env, 'sendMessage', { chat_id: chatId, text: part.text })
  const form = new FormData()
  form.set('chat_id', chatId)
  form.set('document', part.file, part.file.name)
  form.set('caption', part.caption)
  return bot(env, 'sendDocument', form)
}
