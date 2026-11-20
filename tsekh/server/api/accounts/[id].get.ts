import { getAccountDetails } from '../../services/accounts/account-details.service'

export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id')
  const details = id && getAccountDetails(id)
  if (!details) throw createError({ statusCode: 404, message: 'Счёт не найден.' })
  setHeader(event, 'Cache-Control', 'no-store')
  return details
})
