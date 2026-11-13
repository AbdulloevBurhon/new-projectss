export interface UpdateRow { id: string; name: string; direction: string; version: string; fileName: string; size: number; sha256: string; note: string; uploadedAt: string }
export interface UpdateReceipt { id: string; client: string; device: string; version: string; downloadedAt: string | null; installedAt: string | null }
