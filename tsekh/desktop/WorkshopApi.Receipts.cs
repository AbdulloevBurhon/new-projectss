using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Receipts(string method, string[] parts, Uri uri, Dictionary<string, object> body)
    {
        if (parts.Length == 3 && method == "GET") return ListReceipts(uri);
        if (parts.Length == 3 && method == "POST") return CreateReceipt(body);
        if (parts.Length != 4) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[3]);
        if (method == "PATCH") return UpdateReceipt(id, body);
        if (method == "DELETE") return DeleteReceipt(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListReceipts(Uri uri)
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT r.id,r.date,r.account_id,r.amount,r.note,r.created_at,a.name FROM receipts r JOIN accounts a ON a.id=r.account_id WHERE (@from IS NULL OR r.date>=@from) AND (@to IS NULL OR r.date<=@to) ORDER BY r.date DESC,r.created_at DESC,r.rowid DESC", connection))
        {
            command.Parameters.AddWithValue("@from", (object)QueryDate(uri, "from") ?? DBNull.Value);
            command.Parameters.AddWithValue("@to", (object)QueryDate(uri, "to") ?? DBNull.Value);
            using (SQLiteDataReader reader = command.ExecuteReader()) while (reader.Read()) rows.Add(ReceiptRow(reader));
        }
        return rows;
    }

    private object CreateReceipt(Dictionary<string, object> body)
    {
        string date = RequiredDate(body), accountId = Text(body, "accountId"), note = RequiredNote(body);
        double amount = RequiredAmount(body);
        if (accountId.Length == 0) throw new ApiError(400, "Выберите счёт.");
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            RequireAccount(connection, transaction, accountId);
            using (SQLiteCommand command = new SQLiteCommand("INSERT INTO receipts (id,account_id,date,amount,note) VALUES (@id,@account,@date,@amount,@note)", connection, transaction))
            {
                BindReceipt(command, id, accountId, date, amount, note);
                command.ExecuteNonQuery();
            }
            AddBalance(connection, transaction, accountId, amount);
            transaction.Commit();
            return GetReceipt(connection, id);
        }
    }

    private object UpdateReceipt(string id, Dictionary<string, object> body)
    {
        string date = RequiredDate(body), accountId = Text(body, "accountId"), note = RequiredNote(body);
        double amount = RequiredAmount(body);
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> current = FindReceipt(connection, transaction, id);
            RequireAccount(connection, transaction, accountId);
            Debit(connection, transaction, (string)current["accountId"], Convert.ToDouble(current["amount"]));
            AddBalance(connection, transaction, accountId, amount);
            using (SQLiteCommand command = new SQLiteCommand("UPDATE receipts SET account_id=@account,date=@date,amount=@amount,note=@note,updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection, transaction))
            {
                BindReceipt(command, id, accountId, date, amount, note);
                command.ExecuteNonQuery();
            }
            transaction.Commit();
            return GetReceipt(connection, id);
        }
    }

    private object DeleteReceipt(string id)
    {
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            Dictionary<string, object> current = FindReceipt(connection, transaction, id);
            Debit(connection, transaction, (string)current["accountId"], Convert.ToDouble(current["amount"]));
            using (SQLiteCommand command = new SQLiteCommand("DELETE FROM receipts WHERE id=@id", connection, transaction))
            { command.Parameters.AddWithValue("@id", id); command.ExecuteNonQuery(); }
            transaction.Commit();
        }
        return new { success = true };
    }

    private static void BindReceipt(SQLiteCommand command, string id, string account, string date, double amount, string note)
    {
        command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@account", account);
        command.Parameters.AddWithValue("@date", date); command.Parameters.AddWithValue("@amount", amount);
        command.Parameters.AddWithValue("@note", note);
    }
}
