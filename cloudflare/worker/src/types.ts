export type ProductId = 'tsekh' | 'shawarma'
interface D1Result<T = Record<string, unknown>> { results: T[]; success: boolean; meta: { changes: number } }
interface D1Statement {
  bind(...values: unknown[]): D1Statement
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<D1Result>
}
interface WorkerDatabase { prepare(query: string): D1Statement; batch<T = D1Result[]>(statements: D1Statement[]): Promise<T> }
interface WorkerObject { body: ReadableStream<Uint8Array> }
interface WorkerBucket {
  put(key: string, value: ArrayBuffer | ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
  get(key: string): Promise<WorkerObject | null>
  delete(key: string): Promise<void>
}
export interface Env {
  DB: WorkerDatabase
  UPDATES_BUCKET: WorkerBucket
  ADMIN_API_KEY: string
}

export interface ApiError { error: string }
export interface LicenseRow {
  id: string
  installation_id: string
  product: ProductId
  client_name: string
  status: 'active' | 'disabled' | 'removed'
  license_from: string
  license_until: string
  current_version: string
  updated_at: string
}
