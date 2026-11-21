if (window.top === window && location.origin === 'https://tsekh4.invalid') {
  window.workshopReceiptPrinter = true
  let sequence = 0
  const pending = new Map()

  window.chrome.webview.addEventListener('message', ({ data }) => {
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id)
    if (data.error) request.reject(new Error(data.error))
    else request.resolve(data.result ?? undefined)
  })

  function send(action, fields = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
      try {
        window.chrome.webview.postMessage({ ...fields, id, action })
      } catch (error) {
        pending.delete(id)
        reject(error)
      }
    })
  }

  window.workshopBackup = {
    readFolder: kind => send('read-folder', { kind }),
    chooseFolder: kind => send('choose-folder', { kind }),
    write: (kind, archive) => send('write', { kind, archive }),
  }
  window.workshopUpdates = {
    install: ({ id, ...fields }) => send('install-update', { ...fields, updateId: id }),
    readReceipt: () => send('read-update'),
    clearReceipt: () => send('clear-update'),
  }
}
