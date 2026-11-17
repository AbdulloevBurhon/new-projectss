export interface ClientMessage {
  id: string
  text: string
  createdAt: string
  sender: 'client' | 'admin'
  status: 'sent' | 'seen'
}
