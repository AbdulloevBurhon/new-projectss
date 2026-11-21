using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object StockReceipts(string method, string[] parts, Dictionary<string, object> body)
    {
        using (var connection = Open())
        {
            long now = StockReceiptTime();
            ProcessStockReceipts(connection, now);
            if (parts.Length == 2 && method == "GET")
            {
                var rows = new List<StockReceiptRow>();
                using (var command = new SQLiteCommand("SELECT " + StockReceiptColumns + " FROM stock_receipts ORDER BY COALESCE(posted_at,due_at) DESC,rowid DESC", connection))
                using (var reader = command.ExecuteReader())
                    while (reader.Read()) rows.Add(ReadStockReceipt(reader));
                return new { rows, serverTime = now };
            }

            using (var transaction = connection.BeginTransaction())
            {
                object result;
                if (parts.Length == 2 && method == "POST")
                    result = StartStockReceipt(connection, transaction, body);
                else if (parts.Length == 3 && method == "PATCH")
                    result = EditStockReceipt(connection, transaction, Uri.UnescapeDataString(parts[2]), body);
                else if (parts.Length == 3 && method == "DELETE")
                {
                    string id = Uri.UnescapeDataString(parts[2]);
                    var row = FindStockReceipt(connection, transaction, id);
                    if (row != null && (row.status == "posted" || (row.status == "pending" && row.dueAt <= StockReceiptTime())))
                        throw new ApiError(409, "Время отмены истекло.");
                    using (var command = StockReceiptCommand(connection, transaction, "DELETE FROM stock_receipts WHERE id=@id", "@id", id))
                        command.ExecuteNonQuery();
                    result = new { success = true };
                }
                else if (parts.Length == 4 && parts[3] == "posted" && (method == "PATCH" || method == "DELETE"))
                    result = ChangePostedStockReceipt(connection, transaction, Uri.UnescapeDataString(parts[2]), method == "DELETE", body);
                else throw new ApiError(404, "Маршрут не найден.");
                transaction.Commit();
                return result;
            }
        }
    }
}
