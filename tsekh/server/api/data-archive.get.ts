import { exportDatabase } from '../services/archive/archive.service'

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store')
  return exportDatabase()
})
