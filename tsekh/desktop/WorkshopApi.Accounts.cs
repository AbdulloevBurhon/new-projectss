using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Accounts(string method, string[] parts, Dictionary<string, object> body)
    {
        if (parts.Length == 3 && parts[2] == "migrate" && method == "POST") return MigrateAccounts(body);
        if (parts.Length == 2 && method == "GET") return ListAccounts();
        if (parts.Length == 2 && method == "POST") return CreateAccount(RequiredName(body));
        if (parts.Length != 3) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[2]);
        if (method == "PATCH") return RenameAccount(id, RequiredName(body));
        if (method == "DELETE") return RemoveAccount(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListAccounts()
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT id, name, amount FROM accounts ORDER BY created_at DESC, rowid DESC", connection))
        using (SQLiteDataReader reader = command.ExecuteReader())
            while (reader.Read()) rows.Add(new { id = reader.GetString(0), name = reader.GetString(1), amount = reader.GetDouble(2) });
        return rows;
    }

    private object CreateAccount(string name)
    {
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open())
        {
            EnsureUniqueName(connection, name, null);
            using (SQLiteCommand command = new SQLiteCommand("INSERT INTO accounts (id, name, amount) VALUES (@id, @name, 0)", connection))
            {
                command.Parameters.AddWithValue("@id", id);
                command.Parameters.AddWithValue("@name", name);
                command.ExecuteNonQuery();
            }
            return GetAccount(connection, id);
        }
    }

    private object RenameAccount(string id, string name)
    {
        using (SQLiteConnection connection = Open())
        {
            EnsureUniqueName(connection, name, id);
            using (SQLiteCommand command = new SQLiteCommand("UPDATE accounts SET name=@name, updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection))
            {
                command.Parameters.AddWithValue("@name", name);
                command.Parameters.AddWithValue("@id", id);
                if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Счёт не найден.");
            }
            return GetAccount(connection, id);
        }
    }

    private object RemoveAccount(string id)
    {
        using (SQLiteConnection connection = Open())
        {
            using (SQLiteCommand check = new SQLiteCommand("SELECT (SELECT COUNT(*) FROM receipts WHERE account_id=@id)+(SELECT COUNT(*) FROM expenses WHERE account_id=@id)+(SELECT COUNT(*) FROM transfers WHERE source_account_id=@id OR target_account_id=@id)", connection))
            {
                check.Parameters.AddWithValue("@id", id);
                if (Convert.ToInt32(check.ExecuteScalar()) > 0) throw new ApiError(409, "Нельзя удалить счёт, пока к нему привязаны операции.");
            }
            using (SQLiteCommand command = new SQLiteCommand("DELETE FROM accounts WHERE id=@id", connection))
            {
                command.Parameters.AddWithValue("@id", id);
                if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Счёт не найден.");
            }
        }
        return new { success = true };
    }

    private object MigrateAccounts(Dictionary<string, object> body)
    {
        object[] rows = body.ContainsKey("accounts") ? body["accounts"] as object[] : null;
        if (rows == null || rows.Length > 1000) throw new ApiError(400, "Некорректные сохранённые счета.");
        using (SQLiteConnection connection = Open())
        using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            using (SQLiteCommand count = new SQLiteCommand("SELECT COUNT(*) FROM accounts", connection, transaction))
                if (Convert.ToInt32(count.ExecuteScalar()) > 0) { transaction.Commit(); return new { migrated = false }; }
            foreach (object item in rows) ImportAccount(connection, transaction, item);
            transaction.Commit();
        }
        return new { migrated = true };
    }
}
