using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static Dictionary<string, object> ReceiptRow(SQLiteDataReader reader)
    {
        return new Dictionary<string, object> {
            { "id", reader.GetString(0) }, { "date", reader.GetString(1) }, { "accountId", reader.GetString(2) },
            { "amount", reader.GetDouble(3) }, { "note", reader.GetString(4) }, { "createdAt", reader.GetString(5) },
            { "accountName", reader.GetString(6) },
        };
    }

    private static Dictionary<string, object> FindReceipt(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT r.id,r.date,r.account_id,r.amount,r.note,r.created_at,a.name FROM receipts r JOIN accounts a ON a.id=r.account_id WHERE r.id=@id", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return ReceiptRow(reader);
        }
        throw new ApiError(404, "Приход не найден.");
    }

    private static object GetReceipt(SQLiteConnection connection, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT r.id,r.date,r.account_id,r.amount,r.note,r.created_at,a.name FROM receipts r JOIN accounts a ON a.id=r.account_id WHERE r.id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return ReceiptRow(reader);
        }
        throw new ApiError(404, "Приход не найден.");
    }
}
