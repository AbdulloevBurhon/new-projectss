using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Transfers(string method, string[] parts, Uri uri, Dictionary<string, object> body)
    {
        if (parts.Length == 3 && method == "GET") return ListTransfers(uri);
        if (parts.Length == 3 && method == "POST") return CreateTransfer(body);
        if (parts.Length != 4) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[3]);
        if (method == "PATCH") return UpdateTransfer(id, body);
        if (method == "DELETE") return DeleteTransfer(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListTransfers(Uri uri)
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT t.id,t.date,t.source_account_id,t.target_account_id,t.amount,t.note,t.created_at,s.name,d.name FROM transfers t JOIN accounts s ON s.id=t.source_account_id JOIN accounts d ON d.id=t.target_account_id WHERE (@from IS NULL OR t.date>=@from) AND (@to IS NULL OR t.date<=@to) ORDER BY t.date DESC,t.created_at DESC,t.rowid DESC", connection))
        {
            command.Parameters.AddWithValue("@from", (object)QueryDate(uri, "from") ?? DBNull.Value);
            command.Parameters.AddWithValue("@to", (object)QueryDate(uri, "to") ?? DBNull.Value);
            using (SQLiteDataReader reader = command.ExecuteReader()) while (reader.Read()) rows.Add(TransferRow(reader));
        }
        return rows;
    }

    private object CreateTransfer(Dictionary<string, object> body)
    {
        string date = RequiredDate(body), source = Text(body, "sourceAccountId"), target = Text(body, "targetAccountId");
        string note = RequiredNote(body); double amount = RequiredAmount(body);
        ValidateTransferAccounts(source, target);
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            RequireAccount(connection, transaction, source); RequireAccount(connection, transaction, target);
            Debit(connection, transaction, source, amount); AddBalance(connection, transaction, target, amount);
            using (SQLiteCommand command = new SQLiteCommand("INSERT INTO transfers (id,source_account_id,target_account_id,date,amount,note) VALUES (@id,@source,@target,@date,@amount,@note)", connection, transaction))
            { BindTransfer(command, id, source, target, date, amount, note); command.ExecuteNonQuery(); }
            transaction.Commit(); return GetTransfer(connection, id);
        }
    }

    private object UpdateTransfer(string id, Dictionary<string, object> body)
    {
        string date = RequiredDate(body), source = Text(body, "sourceAccountId"), target = Text(body, "targetAccountId");
        string note = RequiredNote(body); double amount = RequiredAmount(body);
        ValidateTransferAccounts(source, target);
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> old = FindTransfer(connection, transaction, id);
            RequireAccount(connection, transaction, source); RequireAccount(connection, transaction, target);
            ApplyTransferChange(connection, transaction, old, source, target, amount);
            using (SQLiteCommand command = new SQLiteCommand("UPDATE transfers SET source_account_id=@source,target_account_id=@target,date=@date,amount=@amount,note=@note,updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection, transaction))
            { BindTransfer(command, id, source, target, date, amount, note); command.ExecuteNonQuery(); }
            transaction.Commit(); return GetTransfer(connection, id);
        }
    }

    private object DeleteTransfer(string id)
    {
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> old = FindTransfer(connection, transaction, id);
            Debit(connection, transaction, (string)old["targetAccountId"], Convert.ToDouble(old["amount"]));
            AddBalance(connection, transaction, (string)old["sourceAccountId"], Convert.ToDouble(old["amount"]));
            using (SQLiteCommand command = new SQLiteCommand("DELETE FROM transfers WHERE id=@id", connection, transaction))
            { command.Parameters.AddWithValue("@id", id); command.ExecuteNonQuery(); }
            transaction.Commit();
        }
        return new { success = true };
    }

    private static void ValidateTransferAccounts(string source, string target)
    {
        if (source.Length == 0 || target.Length == 0 || source == target) throw new ApiError(400, "Выберите два разных счёта.");
    }

    private static void BindTransfer(SQLiteCommand command, string id, string source, string target, string date, double amount, string note)
    {
        command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@source", source);
        command.Parameters.AddWithValue("@target", target); command.Parameters.AddWithValue("@date", date);
        command.Parameters.AddWithValue("@amount", amount); command.Parameters.AddWithValue("@note", note);
    }
}
