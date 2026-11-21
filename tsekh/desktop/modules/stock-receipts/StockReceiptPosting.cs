using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    internal void ProcessStockReceipts()
    {
        using (var connection = Open()) ProcessStockReceipts(connection, StockReceiptTime());
    }

    private static void ProcessStockReceipts(SQLiteConnection connection, long now)
    {
        const string due = " FROM stock_receipts WHERE status='pending' AND due_at<=@now";
        using (var check = StockReceiptCommand(connection, null, "SELECT 1" + due + " LIMIT 1", "@now", now))
            if (check.ExecuteScalar() == null) return;

        using (var transaction = connection.BeginTransaction())
        {
            var rows = new List<StockReceiptRow>();
            using (var command = StockReceiptCommand(connection, transaction, "SELECT " + StockReceiptColumns + due + " ORDER BY due_at,rowid", "@now", now))
            using (var reader = command.ExecuteReader())
                while (reader.Read()) rows.Add(ReadStockReceipt(reader));

            foreach (var row in rows)
            {
                string error = row.total.HasValue ? null : "Проверьте количество и цену закупки.";
                if (row.total > 0)
                {
                    using (var debit = StockReceiptCommand(connection, transaction, @"UPDATE accounts
SET amount=ROUND(MAX(0,amount-@total),2), updated_at=CURRENT_TIMESTAMP WHERE id=@account AND ROUND(amount,2)>=@total",
                        "@account", row.accountId, "@total", row.total))
                        if (debit.ExecuteNonQuery() == 0) error = "Недостаточно средств на счёте.";
                }
                using (var command = StockReceiptCommand(connection, transaction,
                    "UPDATE stock_receipts SET status=@status, posted_at=@posted, error=@error WHERE id=@id",
                    "@status", error == null ? "posted" : "failed", "@posted", error == null ? (long?)row.dueAt : null,
                    "@error", error, "@id", row.id))
                    command.ExecuteNonQuery();
            }
            transaction.Commit();
        }
    }
}
