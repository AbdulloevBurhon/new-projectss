export interface Client {
  id: string
  name: string
  phone: string
}

export type ClientDraft = Pick<Client, 'name' | 'phone'>
