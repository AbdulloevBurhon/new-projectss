import type { StockReceipt } from '../../../../endpoints/warehouse/stock-receipts/types'

export type HistoryEntry = {id:string;operation:string;postedAt:number|null;warehouseId:string;warehouseName:string;productId?:string|null;productName:string;quantity:number|null;unit:string;total:number|null;accountName?:string|null;employee?:string|null}
export type HistoryRow = HistoryEntry & { receipt: StockReceipt | null; rowKey: string }
export type HistoryProductOption = { key: string; name: string; searchText: string }
