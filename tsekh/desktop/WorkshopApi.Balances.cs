using System;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static void AddBalance(SQLiteConnection connection, SQLiteTransaction transaction, string id, double amount)
    {
        using (SQLiteCommand command = new SQLiteCommand("UPDATE accounts SET amount=(CAST(ROUND(amount*100) AS INTEGER)+CAST(ROUND(@amount*100) AS INTEGER))/100.0, updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection, transaction))
        {
            command.Parameters.AddWithValue("@amount", amount);
            command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Выбранный счёт не найден.");
        }
    }

    private static void Debit(SQLiteConnection connection, SQLiteTransaction transaction, string id, double amount)
    {
        using (SQLiteCommand command = new SQLiteCommand("UPDATE accounts SET amount=(CAST(ROUND(amount*100) AS INTEGER)-CAST(ROUND(@amount*100) AS INTEGER))/100.0, updated_at=CURRENT_TIMESTAMP WHERE id=@id AND ROUND(amount*100)>=ROUND(@amount*100)", connection, transaction))
        {
            command.Parameters.AddWithValue("@amount", amount);
            command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(409, "На счёте недостаточно денег для операции.");
        }
    }

    private static void RequireAccount(SQLiteConnection connection, SQLiteTransaction transaction, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT 1 FROM accounts WHERE id=@id", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteScalar() == null) throw new ApiError(404, "Один из выбранных счетов не найден.");
        }
    }
}
