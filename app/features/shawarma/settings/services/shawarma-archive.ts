export interface ShawarmaArchive {
  format: 'shawarma-data'
  version: 1
  createdAt: string
  records: Record<string, string>
}

const prefix = 'shawarma:data:'

export function createShawarmaArchive(): ShawarmaArchive {
  const records: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) {
      const value = localStorage.getItem(key)
      if (value !== null) records[key] = value
    }
  }
  return { format: 'shawarma-data', version: 1, createdAt: new Date().toISOString(), records }
}

export function parseShawarmaArchive(raw: string): ShawarmaArchive {
  const value = JSON.parse(raw) as Partial<ShawarmaArchive>
  if (value.format !== 'shawarma-data' || value.version !== 1 || typeof value.createdAt !== 'string' || !value.records || typeof value.records !== 'object' || Array.isArray(value.records)) {
    throw new Error('Файл не является архивом данных шаурмичной.')
  }
  for (const [key, record] of Object.entries(value.records)) {
    if (!key.startsWith(prefix) || typeof record !== 'string') throw new Error('В архиве обнаружены неподдерживаемые данные.')
  }
  return value as ShawarmaArchive
}

export function restoreShawarmaArchive(archive: ShawarmaArchive) {
  const previous = new Map<string, string>()
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) previous.set(key, localStorage.getItem(key) ?? '')
  }
  try {
    for (const key of previous.keys()) localStorage.removeItem(key)
    for (const [key, value] of Object.entries(archive.records)) localStorage.setItem(key, value)
  } catch {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (key?.startsWith(prefix)) localStorage.removeItem(key)
    }
    for (const [key, value] of previous) localStorage.setItem(key, value)
    throw new Error('Не удалось восстановить архив. Проверьте свободное место.')
  }
}

export function downloadShawarmaArchive(archive: ShawarmaArchive) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `shawarma-${new Date(archive.createdAt).toISOString().replaceAll(':', '-')}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
