using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static bool StockReceiptAccountExists(SQLiteConnection connection, SQLiteTransaction transaction, string accountId)
    {
        using (var command = StockReceiptCommand(connection, transaction, "SELECT 1 FROM accounts WHERE id=@id", "@id", accountId))
            return command.ExecuteScalar() != null;
    }

    private static void AdjustPostedReceiptBalance(SQLiteConnection connection, SQLiteTransaction transaction, string accountId, double delta, bool source)
    {
        if (delta == 0) return;
        using (var command = StockReceiptCommand(connection, transaction, SaleSql["adjustReceiptAccount"], "@delta", delta, "@accountId", accountId))
            if (command.ExecuteNonQuery() != 0) return;

        string message = StockReceiptAccountExists(connection, transaction, accountId)
            ? (source ? "Недостаточно средств на исходном счёте." : "Недостаточно средств на выбранном счёте.")
            : (source ? "Исходный счёт удалён." : "Выбранный счёт не найден.");
        throw new ApiError(409, message);
    }

    private static object ChangePostedStockReceipt(SQLiteConnection connection, SQLiteTransaction transaction, string id, bool deleting, Dictionary<string, object> body)
    {
        var row = FindStockReceipt(connection, transaction, id);
        if (row == null) throw new ApiError(404, "Поступление не найдено.");
        if (row.status != "posted") throw new ApiError(409, "Поступление ещё не проведено.");

        double oldQuantity = row.quantity ?? 0;
        double oldTotal = row.total ?? 0;
        string accountId = row.accountId;
        if (!deleting)
        {
            if (body.ContainsKey("accountId"))
            {
                accountId = Text(body, "accountId");
                if (string.IsNullOrWhiteSpace(accountId)) throw new ApiError(400, "Выберите счёт.");
                if (!StockReceiptAccountExists(connection, transaction, accountId))
                    throw new ApiError(409, "Выбранный счёт не найден.");
            }
            ApplyStockReceiptAmounts(row, body);
            if (!row.total.HasValue) throw new ApiError(400, "Укажите количество и цену закупки.");
        }

        double reduction = oldQuantity - (deleting ? 0 : row.quantity.Value);
        if (reduction > 0)
            using (var command = StockReceiptCommand(connection, transaction, SaleSql["canReduceReceiptStock"], "@id", id, "@reduction", reduction))
                if (command.ExecuteScalar() == null)
                    throw new ApiError(409, "Недостаточно товара на складе для изменения поступления.");

        double newTotal = deleting ? 0 : row.total.Value;
        if (accountId == row.accountId)
        {
            double delta = Math.Round(newTotal - oldTotal, 2, MidpointRounding.AwayFromZero);
            AdjustPostedReceiptBalance(connection, transaction, accountId, delta, true);
        }
        else
        {
            AdjustPostedReceiptBalance(connection, transaction, row.accountId, -oldTotal, true);
            AdjustPostedReceiptBalance(connection, transaction, accountId, newTotal, false);
        }

        if (deleting)
        {
            using (var command = StockReceiptCommand(connection, transaction, "DELETE FROM stock_receipts WHERE id=@id", "@id", id))
                command.ExecuteNonQuery();
            return new { success = true };
        }
        row.accountId = accountId;
        SaveStockReceiptAmounts(connection, transaction, row);
        return FindStockReceipt(connection, transaction, id);
    }
}
