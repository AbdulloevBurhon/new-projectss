using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private const string StockReceiptColumns = @"id, product_id, warehouse_id, account_id,
product_name, warehouse_name, unit, content_unit, quantity_per_piece, quantity, unit_price, total,
due_at, posted_at, status, error, sale_price";

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
            bool hasSalePrice = false;
            using (var command = new SQLiteCommand("PRAGMA table_info(stock_receipts)", connection, transaction))
            using (var reader = command.ExecuteReader())
                while (reader.Read()) if (reader.GetString(1) == "sale_price") hasSalePrice = true;
            if (!hasSalePrice)
                using (var command = new SQLiteCommand("ALTER TABLE stock_receipts ADD COLUMN sale_price REAL", connection, transaction))
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

    private static long StockReceiptTime() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }

    private static SQLiteCommand StockReceiptCommand(SQLiteConnection connection, SQLiteTransaction transaction, string sql, params object[] pairs)
    {
        var command = new SQLiteCommand(sql, connection, transaction);
        for (int i = 0; i < pairs.Length; i += 2)
            command.Parameters.AddWithValue((string)pairs[i], pairs[i + 1] ?? DBNull.Value);
        return command;
    }

    private sealed class StockReceiptRow
    {
        public string id { get; set; }
        public string productId { get; set; }
        public string warehouseId { get; set; }
        public string accountId { get; set; }
        public string productName { get; set; }
        public string warehouseName { get; set; }
        public string unit { get; set; }
        public string contentUnit { get; set; }
        public double? quantityPerPiece { get; set; }
        public double? quantity { get; set; }
        public double? unitPrice { get; set; }
        public double? salePrice { get; set; }
        public double? total { get; set; }
        public long dueAt { get; set; }
        public long? postedAt { get; set; }
        public string status { get; set; }
        public string error { get; set; }
    }

    private static StockReceiptRow ReadStockReceipt(SQLiteDataReader reader)
    {
        return new StockReceiptRow {
            id = reader.GetString(0), productId = reader.GetString(1),
            warehouseId = reader.GetString(2), accountId = reader.GetString(3),
            productName = reader.GetString(4), warehouseName = reader.GetString(5), unit = reader.GetString(6),
            contentUnit = reader.IsDBNull(7) ? null : reader.GetString(7),
            quantityPerPiece = reader.IsDBNull(8) ? (double?)null : reader.GetDouble(8),
            quantity = reader.IsDBNull(9) ? (double?)null : reader.GetDouble(9),
            unitPrice = reader.IsDBNull(10) ? (double?)null : reader.GetDouble(10),
            total = reader.IsDBNull(11) ? (double?)null : reader.GetDouble(11),
            dueAt = reader.GetInt64(12), postedAt = reader.IsDBNull(13) ? (long?)null : reader.GetInt64(13),
            status = reader.GetString(14), error = reader.IsDBNull(15) ? null : reader.GetString(15),
            salePrice = reader.IsDBNull(16) ? (double?)null : reader.GetDouble(16)
        };
    }

    private static StockReceiptRow FindStockReceipt(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        using (var command = StockReceiptCommand(connection, transaction, "SELECT " + StockReceiptColumns + " FROM stock_receipts WHERE id=@id", "@id", id))
        using (var reader = command.ExecuteReader())
            return reader.Read() ? ReadStockReceipt(reader) : null;
    }

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
                else throw new ApiError(404, "Маршрут не найден.");
                transaction.Commit();
                return result;
            }
        }
    }

    private static double? StockReceiptNumber(Dictionary<string, object> body, string field, double min)
    {
        double value = Number(body, field);
        return value >= min && value <= 1000000 ? (double?)value : null;
    }

    private static void ApplyStockReceiptAmounts(StockReceiptRow row, Dictionary<string, object> body)
    {
        row.quantity = StockReceiptNumber(body, "quantity", 0.001);
        row.unitPrice = StockReceiptNumber(body, "unitPrice", 0);
        row.salePrice = StockReceiptNumber(body, "salePrice", 0);
        object salePrice;
        if (body.TryGetValue("salePrice", out salePrice) && salePrice != null && !row.salePrice.HasValue)
            throw new ApiError(400, "Цена продажи должна быть от 0 до 1 000 000 сомони.");
        row.total = row.quantity.HasValue && row.unitPrice.HasValue
            ? (double?)Math.Round(row.quantity.Value * row.unitPrice.Value, 2, MidpointRounding.AwayFromZero) : null;
    }

    private static StockReceiptRow StartStockReceipt(SQLiteConnection connection, SQLiteTransaction transaction, Dictionary<string, object> body)
    {
        var row = new StockReceiptRow { id = Text(body, "id"), productId = Text(body, "productId") };
        Guid parsed;
        if (!Guid.TryParseExact(row.id, "D", out parsed) || row.productId.Length == 0) throw new ApiError(400, "Не указан товар.");
        var existing = FindStockReceipt(connection, transaction, row.id);
        if (existing != null)
        {
            if (existing.productId != row.productId) throw new ApiError(409, "Поступление уже существует.");
            return existing;
        }
        using (var command = StockReceiptCommand(connection, transaction, "SELECT 1 FROM stock_receipts WHERE product_id=@product AND status='pending'", "@product", row.productId))
            if (command.ExecuteScalar() != null) throw new ApiError(409, "Для этого товара уже идёт отсчёт.");
        using (var command = StockReceiptCommand(connection, transaction, "SELECT name,unit,content_unit,quantity_per_piece FROM products WHERE id=@id", "@id", row.productId))
        using (var reader = command.ExecuteReader())
        {
            if (!reader.Read()) throw new ApiError(404, "Товар не найден.");
            row.productName = reader.GetString(0);
            row.unit = reader.GetString(1);
            row.contentUnit = reader.IsDBNull(2) ? null : reader.GetString(2);
            row.quantityPerPiece = reader.IsDBNull(3) ? (double?)null : reader.GetDouble(3);
        }
        row.warehouseId = Text(body, "warehouseId");
        row.accountId = Text(body, "accountId");
        if (row.warehouseId.Length == 0 || row.accountId.Length == 0) throw new ApiError(400, "Выберите склад и счёт.");
        using (var command = StockReceiptCommand(connection, transaction, "SELECT name FROM warehouses WHERE id=@id", "@id", row.warehouseId))
            row.warehouseName = command.ExecuteScalar() as string;
        using (var command = StockReceiptCommand(connection, transaction, "SELECT 1 FROM accounts WHERE id=@id", "@id", row.accountId))
            if (row.warehouseName == null || command.ExecuteScalar() == null) throw new ApiError(404, "Выбранный склад или счёт не найден.");
        ApplyStockReceiptAmounts(row, body);
        if (!row.total.HasValue) throw new ApiError(400, "Укажите количество и цену закупки.");
        row.dueAt = StockReceiptTime() + 120000;
        using (var command = StockReceiptCommand(connection, transaction, @"INSERT INTO stock_receipts
(id,product_id,warehouse_id,account_id,product_name,warehouse_name,unit,content_unit,quantity_per_piece,quantity,unit_price,sale_price,total,due_at)
VALUES (@id,@product,@warehouse,@account,@productName,@warehouseName,@unit,@contentUnit,@perPiece,@quantity,@price,@salePrice,@total,@due)",
            "@id", row.id, "@product", row.productId, "@warehouse", row.warehouseId, "@account", row.accountId,
            "@productName", row.productName, "@warehouseName", row.warehouseName, "@unit", row.unit, "@contentUnit", row.contentUnit,
            "@perPiece", row.quantityPerPiece, "@quantity", row.quantity, "@price", row.unitPrice,
            "@salePrice", row.salePrice, "@total", row.total, "@due", row.dueAt))
            command.ExecuteNonQuery();
        return FindStockReceipt(connection, transaction, row.id);
    }

    private static StockReceiptRow EditStockReceipt(SQLiteConnection connection, SQLiteTransaction transaction, string id, Dictionary<string, object> body)
    {
        var row = FindStockReceipt(connection, transaction, id);
        if (row == null) throw new ApiError(404, "Поступление не найдено.");
        if (row.status != "pending" || row.dueAt <= StockReceiptTime()) throw new ApiError(409, "Время редактирования истекло.");
        if ((body.ContainsKey("warehouseId") && Text(body, "warehouseId") != row.warehouseId)
            || (body.ContainsKey("accountId") && Text(body, "accountId") != row.accountId))
            throw new ApiError(409, "Склад и счёт фиксируются при запуске отсчёта.");
        ApplyStockReceiptAmounts(row, body);
        using (var command = StockReceiptCommand(connection, transaction, @"UPDATE stock_receipts
SET quantity=@quantity,unit_price=@price,sale_price=@salePrice,total=@total WHERE id=@id",
            "@quantity", row.quantity, "@price", row.unitPrice, "@salePrice", row.salePrice, "@total", row.total, "@id", id))
            command.ExecuteNonQuery();
        return FindStockReceipt(connection, transaction, id);
    }
}
