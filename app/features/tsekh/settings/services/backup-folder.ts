import type { Archive } from '../types/settings'
import { archiveName } from './archive'
import { readBackupValue, writeBackupValues } from './backup-storage'

interface BackupFolder extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}

type FolderPicker = (options: { mode: 'readwrite'; id: string }) => Promise<BackupFolder>
type FolderInfo = { name: string }
type DesktopBackup = {
  readFolder(): Promise<FolderInfo | undefined>
  chooseFolder(): Promise<FolderInfo | undefined>
  clearFolder(): Promise<void>
  write(name: string, archive: string): Promise<boolean>
}

const desktopBackup = () => (window as Window & { workshopBackup?: DesktopBackup }).workshopBackup

function folderPicker() {
  return (window as Window & { showDirectoryPicker?: FolderPicker }).showDirectoryPicker
}

export const readBackupFolder = () => desktopBackup()?.readFolder() ?? readBackupValue<BackupFolder>('folder')
export const clearBackupFolder = () => desktopBackup()?.clearFolder() ?? writeBackupValues({ folder: undefined })

export async function chooseBackupFolder() {
  const desktop = desktopBackup()
  if (desktop) return await desktop.chooseFolder()
  const pick = folderPicker()
  if (!pick) throw new Error('Этот браузер сохраняет автоматические копии в своём хранилище. Архив можно скачать из настроек.')
  const folder = await pick.call(window, { mode: 'readwrite', id: 'workshop-backups' })
  await writeBackupValues({ folder })
  return folder
}

export async function writeToBackupFolder(archive: Archive) {
  const desktop = desktopBackup()
  if (desktop) return desktop.write(archiveName(archive), JSON.stringify(archive))
  const folder = await readBackupValue<BackupFolder>('folder')
  if (!folder || await folder.queryPermission({ mode: 'readwrite' }) !== 'granted') return false
  const file = await folder.getFileHandle(archiveName(archive), { create: true })
  const writer = await file.createWritable()
  try {
    await writer.write(JSON.stringify(archive))
    await writer.close()
  } catch (cause) {
    await writer.abort().catch(() => {})
    throw cause
  }
  return true
}
