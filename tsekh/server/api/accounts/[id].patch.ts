import { updateAccount } from '../../services/accounts/accounts.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ name?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан счёт.' })
  if (!name || name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Название счёта должно содержать от 1 до 100 символов.' })
  }
  try {
    const account = updateAccount(id, name)
    if (!account) throw createError({ statusCode: 404, statusMessage: 'Счёт не найден.' })
    return account
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'Счёт с таким названием уже существует.' })
    }
    throw error
  }
})
