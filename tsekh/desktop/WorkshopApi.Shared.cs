using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Globalization;

internal sealed partial class WorkshopApi
{
    private static string RequiredName(Dictionary<string, object> body)
    {
        string name = Text(body, "name").Trim();
        if (name.Length == 0 || name.Length > 100) throw new ApiError(400, "Название счёта должно содержать от 1 до 100 символов.");
        return name;
    }

    private static string Text(Dictionary<string, object> body, string key)
    {
        object value;
        return body != null && body.TryGetValue(key, out value) && value is string ? (string)value : "";
    }

    private static double Number(Dictionary<string, object> body, string key)
    {
        object value;
        double amount;
        return body != null && body.TryGetValue(key, out value)
            && double.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture, out amount)
            ? amount : double.NaN;
    }

    private static string RequiredDate(Dictionary<string, object> body)
    {
        string date = Text(body, "date");
        DateTime parsed;
        if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
            throw new ApiError(400, "Проверьте дату операции.");
        return date;
    }

    private static string RequiredNote(Dictionary<string, object> body)
    {
        object value;
        if (body == null || !body.TryGetValue("note", out value) || !(value is string)) throw new ApiError(400, "Проверьте заметку.");
        string note = ((string)value).Trim();
        if (note.Length > 240) throw new ApiError(400, "Заметка слишком длинная.");
        return note;
    }

    private static double RequiredAmount(Dictionary<string, object> body)
    {
        double amount = Number(body, "amount");
        if (double.IsNaN(amount) || double.IsInfinity(amount) || amount <= 0 || amount > 1000000 || Math.Round(amount, 2) != amount)
            throw new ApiError(400, "Сумма должна быть больше нуля и не превышать 1 000 000.");
        return amount;
    }

    private static string QueryDate(Uri uri, string key)
    {
        foreach (string pair in uri.Query.TrimStart('?').Split('&'))
        {
            string[] part = pair.Split(new[] { '=' }, 2);
            if (part.Length == 2 && Uri.UnescapeDataString(part[0]) == key)
            {
                string date = Uri.UnescapeDataString(part[1].Replace('+', ' '));
                DateTime parsed;
                if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
                    throw new ApiError(400, "Некорректный формат даты.");
                return date;
            }
        }
        return null;
    }

    private static void EnsureUniqueName(SQLiteConnection connection, string name, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT COUNT(*) FROM accounts WHERE name=@name COLLATE NOCASE AND (@id IS NULL OR id<>@id)", connection))
        {
            command.Parameters.AddWithValue("@name", name);
            command.Parameters.AddWithValue("@id", (object)id ?? DBNull.Value);
            if (Convert.ToInt32(command.ExecuteScalar()) > 0) throw new ApiError(409, "Счёт с таким названием уже существует.");
        }
    }

    private static object GetAccount(SQLiteConnection connection, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT id,name,amount FROM accounts WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return new { id = reader.GetString(0), name = reader.GetString(1), amount = reader.GetDouble(2) };
        }
        throw new ApiError(404, "Счёт не найден.");
    }

    private static void ImportAccount(SQLiteConnection connection, SQLiteTransaction transaction, object item)
    {
        var row = item as Dictionary<string, object>;
        if (row == null) throw new ApiError(400, "Некорректные сохранённые счета.");
        string id = Text(row, "id");
        string name = RequiredName(row);
        double amount = Number(row, "amount");
        if (id.Length == 0 || id.Length > 100 || double.IsNaN(amount) || amount < 0)
            throw new ApiError(400, "Некорректные сохранённые счета.");
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO accounts (id,name,amount) VALUES (@id,@name,@amount)", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id);
            command.Parameters.AddWithValue("@name", name);
            command.Parameters.AddWithValue("@amount", amount);
            command.ExecuteNonQuery();
        }
    }
}
