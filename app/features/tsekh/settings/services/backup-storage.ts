function openBackupStorage() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('workshop-backups', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('backup')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readBackupValue<T>(key: string): Promise<T | undefined> {
  const database = await openBackupStorage()
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

export async function writeBackupValues(values: Record<string, unknown>) {
  const database = await openBackupStorage()
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
