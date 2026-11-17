import { reactive } from 'vue'
import type { ClientMessage } from './messages.types'

export const messagesStore = reactive({ items: [] as ClientMessage[], loading: false })
