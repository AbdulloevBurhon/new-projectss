import type { ProductId } from '@obshaya/contracts'
function openBackupStorage(product: ProductId) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(`obshaya-${product}-backups`, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('backup')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readBackupValue<T>(product: ProductId, key: string): Promise<T | undefined> {
  const database = await openBackupStorage(product)
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = database.transaction('backup').objectStore('backup').get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function writeBackupValues(product: ProductId, values: Record<string, unknown>) {
  const database = await openBackupStorage(product)
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('backup', 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      const store = transaction.objectStore('backup')
      try {
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined) store.delete(key)
          else store.put(value, key)
        }
      } catch (cause) {
        transaction.abort()
        reject(cause)
      }
    })
  } finally {
    database.close()
  }
}
