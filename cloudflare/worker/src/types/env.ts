export interface Env {
  DB: D1Database
  UPDATES: R2Bucket
  ADMIN_KEY?: string
  ADMIN_API_KEY?: string
  LICENSE_PRIVATE_KEY?: string
  LICENSE_SIGNING_PRIVATE_KEY?: string
  ALLOWED_ORIGINS?: string
}
