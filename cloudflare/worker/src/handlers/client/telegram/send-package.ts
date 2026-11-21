import { json, readJson } from '../../../utils/http'
import { maxTextLength, textParts, type DeliveryPart } from './message-parts'

const maxBackupSize = 40 * 1024 * 1024
const maxReportSize = 256 * 1024
export type DeliveryPackage = { parts: DeliveryPart[]; separateReports: boolean }

function isReport(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.name.toLowerCase().endsWith('.txt')
    && value.type === 'text/plain' && value.size > 0
}

export async function readDeliveryPackage(request: Request, ticket: string): Promise<DeliveryPackage | Response> {
  const size = Number(request.headers.get('Content-Length'))
  const contentType = request.headers.get('Content-Type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    if (size > maxBackupSize + maxReportSize * 2 + 65536) {
      return json({ error: 'Бэкап или отчёты превышают допустимый размер.' }, 413)
    }
    let form: FormData
    try { form = await request.formData() }
    catch { return json({ error: 'Не удалось прочитать файлы сверки.' }, 400) }
    const archive = form.get('archive')
    if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith('.json') || !archive.size) {
      return json({ error: 'Нужен JSON-файл бэкапа «Цеха».' }, 400)
    }
    if (archive.size > maxBackupSize) return json({ error: 'Бэкап превышает 40 МБ.' }, 413)
    const sales = form.get('salesReport')
    const stock = form.get('stockReport')
    if (sales !== null || stock !== null) {
      if (form.get('ticket') !== ticket || !isReport(sales) || !isReport(stock)) {
        return json({ error: 'Проверьте подтверждение получателя и оба файла отчётов.' }, 400)
      }
      if (sales.size > maxReportSize || stock.size > maxReportSize) {
        return json({ error: 'Размер каждого отчёта ограничен 256 КБ.' }, 413)
      }
      const salesParts = textParts(await sales.text())
      const stockParts = textParts(await stock.text())
      if (!salesParts.length || !stockParts.length) return json({ error: 'Отчёты должны содержать текст.' }, 400)
      return {
        separateReports: true,
        parts: [
          { file: archive, caption: 'Резервная копия «Цеха»' },
          ...salesParts,
          ...stockParts,
        ],
      }
    }
    return legacyPackage(form.get('ticket'), form.get('text'), ticket, archive)
  }

  if (!contentType.includes('application/json')) {
    return json({ error: 'Обновите страницу «Цеха», чтобы отправить сверку.' }, 415)
  }
  if (size > 65536) return json({ error: 'Сверка слишком длинная.' }, 413)
  const body = await readJson<{ ticket?: unknown; text?: unknown }>(request)
  return legacyPackage(body?.ticket, body?.text, ticket)
}

function legacyPackage(inputTicket: unknown, text: unknown, ticket: string, archive?: File): DeliveryPackage | Response {
  const message = typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim() : ''
  if (inputTicket !== ticket || !message || message.length > maxTextLength) {
    return json({ error: 'Проверьте текст сверки и подтверждение получателя.' }, 400)
  }
  const caption = message.length <= 1024 ? message : 'Резервная копия «Цеха»'
  return {
    separateReports: false,
    parts: [
      ...(archive ? [{ file: archive, caption }] : []),
      ...(!archive || message.length > 1024 ? [{ text: message }] : []),
    ],
  }
}
