using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static Dictionary<string, object> ExpenseRow(SQLiteDataReader reader)
    {
        return new Dictionary<string, object> {
            { "id", reader.GetString(0) }, { "date", reader.GetString(1) }, { "accountId", reader.GetString(2) },
            { "amount", reader.GetDouble(3) }, { "note", reader.GetString(4) }, { "createdAt", reader.GetString(5) },
            { "accountName", reader.GetString(6) },
        };
    }

    private static Dictionary<string, object> FindExpense(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT e.id,e.date,e.account_id,e.amount,e.note,e.created_at,a.name FROM expenses e JOIN accounts a ON a.id=e.account_id WHERE e.id=@id", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return ExpenseRow(reader);
        }
        throw new ApiError(404, "Списание не найдено.");
    }

    private static object GetExpense(SQLiteConnection connection, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT e.id,e.date,e.account_id,e.amount,e.note,e.created_at,a.name FROM expenses e JOIN accounts a ON a.id=e.account_id WHERE e.id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return ExpenseRow(reader);
        }
        throw new ApiError(404, "Списание не найдено.");
    }
}
