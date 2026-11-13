import { ref } from 'vue'

export type RequestItem = { id: string; client: string; direction: string; device: string; version: string; received: string; licenseUntil: string }
export type VersionChange = { date: string; from: string; to: string }
export type ClientItem = { id: string; client: string; direction: string; device: string; licenseFrom: string; licenseUntil: string; active: boolean; expired: boolean; version: string; versionUpdatedAt: string; versionHistory: VersionChange[]; unreadMessages: number }

export const requests = ref<RequestItem[]>([])
export const clients = ref<ClientItem[]>([])
