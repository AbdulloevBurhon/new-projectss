using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Expenses(string method, string[] parts, Uri uri, Dictionary<string, object> body)
    {
        if (parts.Length == 3 && method == "GET") return ListExpenses(uri);
        if (parts.Length == 3 && method == "POST") return CreateExpense(body);
        if (parts.Length != 4) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[3]);
        if (method == "PATCH") return UpdateExpense(id, body);
        if (method == "DELETE") return DeleteExpense(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListExpenses(Uri uri)
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT e.id,e.date,e.account_id,e.amount,e.note,e.created_at,a.name FROM expenses e JOIN accounts a ON a.id=e.account_id WHERE (@from IS NULL OR e.date>=@from) AND (@to IS NULL OR e.date<=@to) ORDER BY e.date DESC,e.created_at DESC,e.rowid DESC", connection))
        {
            command.Parameters.AddWithValue("@from", (object)QueryDate(uri, "from") ?? DBNull.Value);
            command.Parameters.AddWithValue("@to", (object)QueryDate(uri, "to") ?? DBNull.Value);
            using (SQLiteDataReader reader = command.ExecuteReader()) while (reader.Read()) rows.Add(ExpenseRow(reader));
        }
        return rows;
    }

    private object CreateExpense(Dictionary<string, object> body)
    {
        string date = RequiredDate(body), accountId = Text(body, "accountId"), note = RequiredNote(body);
        double amount = RequiredAmount(body);
        if (accountId.Length == 0) throw new ApiError(400, "Выберите счёт.");
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            RequireAccount(connection, transaction, accountId);
            Debit(connection, transaction, accountId, amount);
            using (SQLiteCommand command = new SQLiteCommand("INSERT INTO expenses (id,account_id,date,amount,note) VALUES (@id,@account,@date,@amount,@note)", connection, transaction))
            {
                BindExpense(command, id, accountId, date, amount, note);
                command.ExecuteNonQuery();
            }
            transaction.Commit();
            return GetExpense(connection, id);
        }
    }

    private object UpdateExpense(string id, Dictionary<string, object> body)
    {
        string date = RequiredDate(body), accountId = Text(body, "accountId"), note = RequiredNote(body);
        double amount = RequiredAmount(body);
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> current = FindExpense(connection, transaction, id);
            RequireAccount(connection, transaction, accountId);
            AddBalance(connection, transaction, (string)current["accountId"], Convert.ToDouble(current["amount"]));
            Debit(connection, transaction, accountId, amount);
            using (SQLiteCommand command = new SQLiteCommand("UPDATE expenses SET account_id=@account,date=@date,amount=@amount,note=@note,updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection, transaction))
            {
                BindExpense(command, id, accountId, date, amount, note);
                command.ExecuteNonQuery();
            }
            transaction.Commit();
            return GetExpense(connection, id);
        }
    }

    private object DeleteExpense(string id)
    {
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> current = FindExpense(connection, transaction, id);
            AddBalance(connection, transaction, (string)current["accountId"], Convert.ToDouble(current["amount"]));
            using (SQLiteCommand command = new SQLiteCommand("DELETE FROM expenses WHERE id=@id", connection, transaction))
            { command.Parameters.AddWithValue("@id", id); command.ExecuteNonQuery(); }
            transaction.Commit();
        }
        return new { success = true };
    }

    private static void BindExpense(SQLiteCommand command, string id, string account, string date, double amount, string note)
    {
        command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@account", account);
        command.Parameters.AddWithValue("@date", date); command.Parameters.AddWithValue("@amount", amount);
        command.Parameters.AddWithValue("@note", note);
    }
}
