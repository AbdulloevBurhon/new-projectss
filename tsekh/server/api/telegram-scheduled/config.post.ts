import { saveTelegramScheduleToken } from '../../services/telegram/schedule.service'

export default defineEventHandler(async event => {
  const body = await readBody<{ token?: unknown }>(event)
  return saveTelegramScheduleToken(body?.token)
})
