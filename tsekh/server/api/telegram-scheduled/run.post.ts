import { runTelegramSchedule } from '../../services/telegram/schedule.service'

export default defineEventHandler(async event => {
  const body = await readBody<Record<string, unknown>>(event)
  return runTelegramSchedule(useRuntimeConfig(event).public.licenseApiBase as string, body)
})
