import { ref } from 'vue'

export type RequestItem = { id: number; client: string; direction: string; device: string; version: string; received: string; licenseUntil: string }
export type VersionChange = { date: string; from: string; to: string }
export type ClientItem = { id: number; client: string; direction: string; device: string; licenseFrom: string; licenseUntil: string; active: boolean; version: string; versionUpdatedAt: string; versionHistory: VersionChange[] }

export const requests = ref<RequestItem[]>([
  { id: 1, client: 'Бохтар', direction: 'Цех', device: 'demo-device-01', version: '0.2.0', received: 'Сегодня, 09:15', licenseUntil: '2027-11-12' },
  { id: 2, client: 'Шаурма Центр', direction: 'Шаурма', device: 'demo-device-02', version: '0.1.0', received: 'Сегодня, 10:40', licenseUntil: '2027-11-12' },
])

export const clients = ref<ClientItem[]>([
  { id: 101, client: 'Демо-клиент 1', direction: 'Цех', device: 'demo-device-03', licenseFrom: '12.11.2025', licenseUntil: '2027-11-12', active: true, version: '0.2.0', versionUpdatedAt: '12.11.2026, 09:15', versionHistory: [{ date: '12.11.2025, 10:20', from: '0.0.8', to: '0.1.0' }, { date: '05.03.2026, 14:30', from: '0.1.0', to: '0.1.5' }, { date: '12.11.2026, 09:15', from: '0.1.5', to: '0.2.0' }] },
  { id: 102, client: 'Демо-клиент 2', direction: 'Шаурма', device: 'demo-device-04', licenseFrom: '12.11.2025', licenseUntil: '2027-11-12', active: true, version: '0.1.0', versionUpdatedAt: '11.11.2026, 16:40', versionHistory: [{ date: '20.11.2025, 11:10', from: '0.0.5', to: '0.0.8' }, { date: '06.04.2026, 16:00', from: '0.0.8', to: '0.0.9' }, { date: '11.11.2026, 16:40', from: '0.0.9', to: '0.1.0' }] },
])

export function acceptRequest(request: RequestItem) {
  clients.value.unshift({ id: Date.now(), client: request.client, direction: request.direction, device: request.device,
    licenseFrom: new Date().toLocaleDateString('ru-RU'), licenseUntil: request.licenseUntil, active: true, version: request.version, versionUpdatedAt: request.received, versionHistory: [] })
  requests.value = requests.value.filter(item => item.id !== request.id)
}

export function declineRequest(id: number) {
  requests.value = requests.value.filter(item => item.id !== id)
}
