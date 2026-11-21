const path = '/api/workers/owner-pin'

export const syncOwnerPin = (pin: string, action: 'sync' | 'initialize' = 'sync') =>
  $fetch(path, { method: 'POST', body: { action, pin } })
export const reserveOwnerPin = (pin: string) =>
  $fetch<{ reservation: string }>(path, { method: 'POST', body: { action: 'reserve', pin } })
export const finishOwnerPin = (action: 'commit' | 'cancel', reservation: string) =>
  $fetch(path, { method: 'POST', body: { action, reservation } })
