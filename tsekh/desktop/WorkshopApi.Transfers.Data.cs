using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static void ApplyTransferChange(SQLiteConnection connection, SQLiteTransaction transaction,
        Dictionary<string, object> old, string source, string target, double amount)
    {
        string oldSource = (string)old["sourceAccountId"], oldTarget = (string)old["targetAccountId"];
        double oldAmount = Convert.ToDouble(old["amount"]), difference = amount - oldAmount;
        if (oldSource == source && oldTarget == target)
        {
            if (difference > 0) { Debit(connection, transaction, source, difference); AddBalance(connection, transaction, target, difference); }
            else if (difference < 0) { AddBalance(connection, transaction, source, -difference); Debit(connection, transaction, target, -difference); }
            return;
        }
        Debit(connection, transaction, oldTarget, oldAmount);
        AddBalance(connection, transaction, oldSource, oldAmount);
        Debit(connection, transaction, source, amount);
        AddBalance(connection, transaction, target, amount);
    }

    private static Dictionary<string, object> TransferRow(SQLiteDataReader reader)
    {
        return new Dictionary<string, object> {
            { "id", reader.GetString(0) }, { "date", reader.GetString(1) },
            { "sourceAccountId", reader.GetString(2) }, { "targetAccountId", reader.GetString(3) },
            { "amount", reader.GetDouble(4) }, { "note", reader.GetString(5) },
            { "createdAt", reader.GetString(6) }, { "sourceAccountName", reader.GetString(7) },
            { "targetAccountName", reader.GetString(8) },
        };
    }

    private static Dictionary<string, object> FindTransfer(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        const string sql = "SELECT t.id,t.date,t.source_account_id,t.target_account_id,t.amount,t.note,t.created_at,s.name,d.name FROM transfers t JOIN accounts s ON s.id=t.source_account_id JOIN accounts d ON d.id=t.target_account_id WHERE t.id=@id";
        using (SQLiteCommand command = new SQLiteCommand(sql, connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader()) if (reader.Read()) return TransferRow(reader);
        }
        throw new ApiError(404, "Перевод не найден.");
    }

    private static object GetTransfer(SQLiteConnection connection, string id)
    {
        const string sql = "SELECT t.id,t.date,t.source_account_id,t.target_account_id,t.amount,t.note,t.created_at,s.name,d.name FROM transfers t JOIN accounts s ON s.id=t.source_account_id JOIN accounts d ON d.id=t.target_account_id WHERE t.id=@id";
        using (SQLiteCommand command = new SQLiteCommand(sql, connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader()) if (reader.Read()) return TransferRow(reader);
        }
        throw new ApiError(404, "Перевод не найден.");
    }
}
