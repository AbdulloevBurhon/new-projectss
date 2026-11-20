import database from '../../database/accounts/accounts.database'
import '../sales/sales.service'
import type { AccountRecord } from '../../../endpoints/accounts/get-accounts/types'
import type { AccountOutflow } from '../../../endpoints/accounts/get-account-details/types'

const accountById = database.prepare('SELECT id, name, amount FROM accounts WHERE id = ?')
const outflowsByAccount = database.prepare(`
  SELECT id, kind, date, description, amount, unit, quantity, unitPrice, contentUnit, contentQuantity
  FROM (
    SELECT 'purchase:' || id AS id, 'purchase' AS kind,
      strftime('%Y-%m-%dT%H:%M:%fZ', posted_at / 1000.0, 'unixepoch') AS date,
      product_name AS description, -total AS amount, unit, quantity, unit_price AS unitPrice,
      content_unit AS contentUnit, quantity * quantity_per_piece AS contentQuantity,
      strftime('%Y-%m-%dT%H:%M:%fZ', posted_at / 1000.0, 'unixepoch') AS sortDate
    FROM stock_receipts
    WHERE account_id = @id AND status = 'posted' AND total > 0
    UNION ALL
    SELECT 'sale:' || id,'sale',date,coalesce(clientName,'Розничная продажа'),paid/100.0,NULL,NULL,NULL,NULL,NULL,date FROM sales WHERE account=@id
    UNION ALL
    SELECT 'receipt:' || id,'receipt',date,coalesce(nullif(note,''),'Поступление'),amount,NULL,NULL,NULL,NULL,NULL,date FROM receipts WHERE account_id=@id
    UNION ALL
    SELECT 'expense:' || id, 'expense', date, COALESCE(NULLIF(TRIM(note), ''), 'Списание'),
      -amount, NULL, NULL, NULL, NULL, NULL, date || 'T' || substr(created_at, 12)
    FROM expenses WHERE account_id = @id
    UNION ALL
    SELECT 'transfer-in:' || t.id, 'transfer-in', t.date, a.name, t.amount,NULL,NULL,NULL,NULL,NULL,t.date || 'T' || substr(t.created_at,12)
    FROM transfers t JOIN accounts a ON a.id=t.source_account_id WHERE t.target_account_id=@id
    UNION ALL
    SELECT 'transfer:' || t.id, 'transfer', t.date,
      a.name || CASE WHEN TRIM(t.note) = '' THEN '' ELSE ' · ' || t.note END,
      -t.amount, NULL, NULL, NULL, NULL, NULL, t.date || 'T' || substr(t.created_at, 12)
    FROM transfers t JOIN accounts a ON a.id = t.target_account_id
    WHERE t.source_account_id = @id
  )
  ORDER BY sortDate DESC, id DESC
`)

export const getAccountDetails = database.transaction((id: string) => {
  const account = accountById.get(id) as AccountRecord | undefined
  if (!account) return undefined
  return { account, outflows: outflowsByAccount.all({ id }) as AccountOutflow[] }
})
