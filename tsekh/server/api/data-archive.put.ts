import { importDatabase } from '../services/archive/archive.service'

export default defineEventHandler(async event => {
  if (getHeader(event, 'content-type')?.split(';')[0] !== 'application/json') {
    throw createError({ statusCode: 415, statusMessage: 'Expected application/json' })
  }
  return importDatabase(await readBody(event))
})
