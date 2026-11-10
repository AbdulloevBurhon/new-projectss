import type { BackupStatus } from '../types/settings'
import { snapshotArchive } from './archive'
import { writeToBackupFolder } from './backup-folder'
import { dueBackupSlot, readSchedule } from './backup-schedule'
import { readBackupValue, writeBackupValues } from './backup-storage'

export const readBackupStatus = () => readBackupValue<BackupStatus>('status')

export async function runScheduledBackup() {
  const run = async () => {
    const schedule = readSchedule()
    if (!schedule) return
    const slot = dueBackupSlot(new Date(), schedule)
    if (slot === undefined) return
    const previous = await readBackupStatus()
    if (previous && previous.slot >= slot) return previous

    const archive = await snapshotArchive()
    const status: BackupStatus = { slot, createdAt: archive.createdAt, destination: 'browser' }
    await writeBackupValues({ archive, status })
    if (await writeToBackupFolder(archive).catch(() => false)) {
      status.destination = 'folder'
      await writeBackupValues({ status })
    }
    return status
  }
  return navigator.locks ? navigator.locks.request('workshop-scheduled-backup', run) : run()
}
