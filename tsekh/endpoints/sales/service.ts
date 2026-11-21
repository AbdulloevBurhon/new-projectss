export interface Client {id:string; name:string; phone:string; debt:number}
export interface Location {id:string; name:string}
export interface Goods {id:string; productId:string; warehouse:string; name:string; unit:string; contentUnit:string|null; factor:number; price:number; stock:number}
export interface Line extends Goods {key:string; mode:string; qty:number; actual:number}
export interface SaleGoods extends Goods { barcode?: string | null }
export interface Catalog {products:SaleGoods[]; warehouses:Location[]; accounts:Location[]}
export interface Receipt {id:string;date:string;accountName:string;warehouseName:string;clientName:string|null;seller:string;role:string;discount:number;total:number;paid:number;tender:number}
export interface Position {name:string;unit:string;qty:number;price:number;listPrice:number;amount:number}
export const catalog = () => $fetch<Catalog>('/api/sales/catalog')
export const catalogOptions = () => $fetch<Catalog>('/api/sales/catalog', { query: { view: 'setup' } })
export const catalogPage = (warehouse: string, search: string, after?: SaleGoods) =>
  $fetch<{ rows: SaleGoods[]; more: boolean }>('/api/sales/catalog', {
    query: { view: 'page', warehouse, search, afterName: after?.name, afterId: after?.id },
  })
export const catalogBarcode = (warehouse: string, code: string) =>
  $fetch<SaleGoods[]>('/api/sales/catalog', { query: { view: 'barcode', warehouse, code } })
export const customers = () => $fetch<Client[]>('/api/sales/clients')
export const saveClient = (name:string,phone:string,id?:string) => $fetch('/api/sales/clients',{method:id?'PATCH':'POST',body:{id:id??crypto.randomUUID(),name,phone}})
export const deleteClient = (id:string) => $fetch('/api/sales/clients',{method:'DELETE',body:{id}})
export const reports = () => $fetch<Receipt[]>('/api/sales/report')
export const receiptDetails = (id: string) =>
  $fetch<{ receipt: Receipt; lines: Position[] }>(`/api/sales/receipt/${encodeURIComponent(id)}/details`)
export const positions = (id:string) => $fetch<Position[]>('/api/sales/receipt/'+id)
export const money = (cents:number) => (cents/100).toLocaleString('ru-RU',{maximumFractionDigits:2})+' сом'
export function modes(p:Goods) {
  const result = [{key:'pack',unit:p.unit,ratio:1}]
  if (p.contentUnit) result.push({key:'content',unit:p.contentUnit,ratio:1/p.factor})
  if (p.unit==='кг' && p.contentUnit!=='г') result.push({key:'g',unit:'г',ratio:0.001})
  return result
}
export const basis = (p:Line) => modes(p).find(m=>m.key===p.mode)!
export const cents = (n:number) => Math.round((n+Number.EPSILON)*100)
export const sum = (rows:Line[]) => rows.reduce((n,r)=>n+cents(r.actual*r.qty),0)
