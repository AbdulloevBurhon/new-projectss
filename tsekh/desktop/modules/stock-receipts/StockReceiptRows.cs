using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private const string StockReceiptColumns = @"id, product_id, warehouse_id, account_id,
product_name, warehouse_name, unit, content_unit, quantity_per_piece, quantity, unit_price, total,
due_at, posted_at, status, error, sale_price, expires_on";

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
        public string expiresOn { get; set; }
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
            salePrice = reader.IsDBNull(16) ? (double?)null : reader.GetDouble(16),
            expiresOn = reader.IsDBNull(17) ? null : reader.GetString(17)
        };
    }

    private static StockReceiptRow FindStockReceipt(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        using (var command = StockReceiptCommand(connection, transaction, "SELECT " + StockReceiptColumns + " FROM stock_receipts WHERE id=@id", "@id", id))
        using (var reader = command.ExecuteReader())
            return reader.Read() ? ReadStockReceipt(reader) : null;
    }
}
