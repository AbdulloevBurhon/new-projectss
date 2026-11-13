export interface BackupSchedule {
  enabled: boolean
  days: string[]
  time: string
  cloudCopy: boolean
  intervalHours: number
  intervalMinutes: number
}
