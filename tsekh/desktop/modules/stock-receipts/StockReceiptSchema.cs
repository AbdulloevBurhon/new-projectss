using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static void InitializeStockReceipts(SQLiteConnection connection)
    {
        using (var command = new SQLiteCommand(@"
CREATE TABLE IF NOT EXISTS stock_receipts (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, warehouse_id TEXT NOT NULL, account_id TEXT NOT NULL,
    product_name TEXT NOT NULL, warehouse_name TEXT NOT NULL, unit TEXT NOT NULL,
    content_unit TEXT, quantity_per_piece REAL, quantity REAL, unit_price REAL, sale_price REAL, total REAL,
    due_at INTEGER NOT NULL, posted_at INTEGER, status TEXT NOT NULL DEFAULT 'pending', error TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_receipts_pending_product ON stock_receipts(product_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS stock_receipts_due ON stock_receipts(due_at) WHERE status = 'pending';", connection))
            command.ExecuteNonQuery();

        using (var transaction = connection.BeginTransaction())
        {
            var columnsFound = new HashSet<string>();
            using (var command = new SQLiteCommand("PRAGMA table_info(stock_receipts)", connection, transaction))
            using (var reader = command.ExecuteReader())
                while (reader.Read()) columnsFound.Add(reader.GetString(1));
            if (!columnsFound.Contains("sale_price"))
                using (var command = new SQLiteCommand("ALTER TABLE stock_receipts ADD COLUMN sale_price REAL", connection, transaction))
                    command.ExecuteNonQuery();
            if (!columnsFound.Contains("expires_on"))
                using (var command = new SQLiteCommand("ALTER TABLE stock_receipts ADD COLUMN expires_on TEXT", connection, transaction))
                    command.ExecuteNonQuery();
            transaction.Commit();
        }

        string[] tables = { "accounts", "warehouses", "products" };
        string[] columns = { "account_id", "warehouse_id", "product_id" };
        for (int i = 0; i < tables.Length; i++)
        {
            string sql = "CREATE TRIGGER IF NOT EXISTS stock_receipts_protect_" + tables[i] +
                " BEFORE DELETE ON " + tables[i] + " WHEN EXISTS (SELECT 1 FROM stock_receipts WHERE " +
                columns[i] + " = OLD.id AND status = 'pending') BEGIN SELECT RAISE(ABORT, 'STOCK_RECEIPT_PENDING'); END;";
            using (var command = new SQLiteCommand(sql, connection)) command.ExecuteNonQuery();
        }
    }
}
