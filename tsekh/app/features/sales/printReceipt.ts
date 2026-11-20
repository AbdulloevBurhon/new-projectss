import { money, positions, reports } from '../../../endpoints/sales/service'
export async function printReceipt(id:string){
  const [list,lines]=await Promise.all([reports(),positions(id)])
  const receipt=list.find(r=>r.id===id)
  if(!receipt)return
  const frame=document.createElement('iframe')
  frame.style.cssText='position:fixed;width:0;height:0;border:0'
  document.body.append(frame)
  const win=frame.contentWindow!
  const block=win.document.createElement('pre')
  block.textContent=[
    'Чек '+id,new Date(receipt.date).toLocaleString('ru-RU'),receipt.warehouseName+' · '+receipt.accountName,
    ...lines.map(l=>l.name+' · '+l.qty+' '+l.unit+' × '+l.price+' = '+money(l.amount)),
    'Скидка на чек '+money(receipt.discount),'Итого '+money(receipt.total),'Оплачено '+money(receipt.paid),
    'Долг '+money(receipt.total-receipt.paid),'Сдача '+money(receipt.tender-receipt.paid)
  ].join('\n')
  win.document.body.append(block)
  win.onafterprint=()=>frame.remove()
  win.focus();win.print()
}
