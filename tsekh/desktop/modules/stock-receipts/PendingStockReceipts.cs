using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Globalization;

internal sealed partial class WorkshopApi
{
    private const int StockReceiptDelayMilliseconds = 30000;

    private static void ReadStockReceiptExpiry(StockReceiptRow row, Dictionary<string, object> body)
    {
        object value;
        if (body.TryGetValue("expiresOn", out value)) row.expiresOn = StockExpiryDate(value);
    }

    private static string StockExpiryDate(object value)
    {
        DateTime date;
        if (value == null || (value is string && (string)value == "")) return null;
        if (value is string && DateTime.TryParseExact((string)value, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out date)) return (string)value;
        throw new ApiError(400, "Проверьте срок годности.");
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
        ReadStockReceiptExpiry(row, body);
        if (!row.total.HasValue) throw new ApiError(400, "Укажите количество и цену закупки.");
        row.dueAt = StockReceiptTime() + StockReceiptDelayMilliseconds;
        using (var command = StockReceiptCommand(connection, transaction, @"INSERT INTO stock_receipts
(id,product_id,warehouse_id,account_id,product_name,warehouse_name,unit,content_unit,quantity_per_piece,quantity,unit_price,sale_price,total,due_at,expires_on)
VALUES (@id,@product,@warehouse,@account,@productName,@warehouseName,@unit,@contentUnit,@perPiece,@quantity,@price,@salePrice,@total,@due,@expires)",
            "@id", row.id, "@product", row.productId, "@warehouse", row.warehouseId, "@account", row.accountId,
            "@productName", row.productName, "@warehouseName", row.warehouseName, "@unit", row.unit, "@contentUnit", row.contentUnit,
            "@perPiece", row.quantityPerPiece, "@quantity", row.quantity, "@price", row.unitPrice,
            "@salePrice", row.salePrice, "@total", row.total, "@due", row.dueAt, "@expires", row.expiresOn))
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
        ReadStockReceiptExpiry(row, body);
        SaveStockReceiptAmounts(connection, transaction, row);
        return FindStockReceipt(connection, transaction, id);
    }

    private static void SaveStockReceiptAmounts(SQLiteConnection connection, SQLiteTransaction transaction, StockReceiptRow row)
    {
        using (var command = StockReceiptCommand(connection, transaction, @"UPDATE stock_receipts
SET quantity=@quantity,unit_price=@price,sale_price=@salePrice,total=@total,account_id=@accountId,expires_on=@expires WHERE id=@id",
            "@quantity", row.quantity, "@price", row.unitPrice, "@salePrice", row.salePrice, "@total", row.total,
            "@accountId", row.accountId, "@id", row.id, "@expires", row.expiresOn))
            command.ExecuteNonQuery();
    }
}
