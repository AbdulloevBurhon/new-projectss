import type { ProductId } from '@obshaya/contracts'
import { onMounted, shallowRef } from 'vue'
import { toast } from 'vue-sonner'
import { readBackupValue, writeBackupValues } from '../services/backup-storage'

type FolderKind = 'local' | 'secondary'
type FolderInfo = { name: string }
type DesktopBackup = {
  readFolder(kind: FolderKind): Promise<FolderInfo | undefined>
  chooseFolder(kind: FolderKind): Promise<FolderInfo | undefined>
  write(kind: FolderKind, archive: string): Promise<boolean>
}
type WritableFolder = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}
type DirectoryPicker = (options: { id: string; mode: 'readwrite' }) => Promise<WritableFolder>

const permission = { mode: 'readwrite' } as const
const kinds: FolderKind[] = ['local', 'secondary']
const desktopBackup = () => (window as Window & { workshopBackup?: DesktopBackup }).workshopBackup

export function useArchiveFolders(product: ProductId) {
  const localFolder = shallowRef<FolderInfo>()
  const secondaryFolder = shallowRef<FolderInfo>()

  onMounted(async () => {
    try {
      const desktop = desktopBackup()
      const [local, secondary] = await Promise.all(kinds.map(kind =>
        desktop ? desktop.readFolder(kind) : readBackupValue<WritableFolder>(product, kind),
      ))
      localFolder.value ??= local
      secondaryFolder.value ??= secondary
    } catch {
      toast.error('Не удалось загрузить выбранные папки.')
    }
  })

  async function chooseFolder(kind: FolderKind) {
    try {
      const desktop = desktopBackup()
      const pick = (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
      if (!desktop && !pick) {
        toast.error('Браузер не поддерживает выбор папок для записи.')
        return
      }
      const folder = desktop ? await desktop.chooseFolder(kind) : await pick!.call(window, { id: `${product}-${kind}`, ...permission })
      if (!folder) return
      if (!desktop) await writeBackupValues(product, { [kind]: folder })
      if (kind === 'local') localFolder.value = folder
      else secondaryFolder.value = folder
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.error('Не удалось сохранить выбранную папку.')
      }
    }
  }

  return { localFolder, secondaryFolder, chooseFolder }
}

export async function writeArchiveToFolders(product: ProductId, blob: Blob, fileName: string, targets: FolderKind[] = kinds) {
  const desktop = desktopBackup()
  if (desktop) {
    const archive = await blob.text()
    return Promise.allSettled(targets.map(kind => desktop.write(kind, archive)))
  }
  const folders = await Promise.all(targets.map(kind => readBackupValue<WritableFolder>(product, kind)))
  return Promise.allSettled(folders.map(async (folder) => {
    if(!folder)return false
    if (await folder.queryPermission(permission) !== 'granted') {
      throw new Error(`Выберите папку «${folder.name}» повторно, чтобы разрешить запись.`)
    }
    const file = await folder.getFileHandle(fileName, { create: true })
    const writer = await file.createWritable()
    try {
      await writer.write(blob)
      await writer.close()
      return true
    } catch (error) {
      await writer.abort().catch(() => {})
      throw new Error(`Не удалось записать копию в папку «${folder.name}».`, { cause: error })
    }
  }))
}
