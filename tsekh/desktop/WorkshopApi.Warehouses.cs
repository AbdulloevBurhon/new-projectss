using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Warehouses(string method, string[] parts, Dictionary<string, object> body)
    {
        if (parts.Length == 2 && method == "GET") return ListWarehouses();
        if (parts.Length == 2 && method == "POST") return CreateWarehouse(body);
        if (parts.Length == 3 && parts[2] == "migrate" && method == "POST") return MigrateWarehouses(body);
        if (parts.Length != 3) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[2]);
        if (method == "PATCH") return UpdateWarehouse(id, body);
        if (method == "DELETE") return DeleteWarehouse(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListWarehouses()
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT id,name,type FROM warehouses ORDER BY created_at DESC,rowid DESC", connection))
        using (SQLiteDataReader reader = command.ExecuteReader())
            while (reader.Read()) rows.Add(new { id = reader.GetString(0), name = reader.GetString(1), type = reader.IsDBNull(2) ? null : reader.GetString(2) });
        return rows;
    }

    private object CreateWarehouse(Dictionary<string, object> body)
    {
        string name = WarehouseName(body), type = WarehouseType(body);
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO warehouses (id,name,type) VALUES (@id,@name,@type)", connection))
        {
            command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@name", name); command.Parameters.AddWithValue("@type", type);
            command.ExecuteNonQuery();
            return GetWarehouse(connection, id);
        }
    }

    private object UpdateWarehouse(string id, Dictionary<string, object> body)
    {
        string name = WarehouseName(body), type = WarehouseType(body);
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("UPDATE warehouses SET name=@name,type=@type,updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@name", name); command.Parameters.AddWithValue("@type", type); command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Склад не найден.");
            return GetWarehouse(connection, id);
        }
    }

    private object DeleteWarehouse(string id)
    {
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("DELETE FROM warehouses WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Склад не найден.");
        }
        return new { success = true };
    }

    private object GetWarehouse(SQLiteConnection connection, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT id,name,type FROM warehouses WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader())
                if (reader.Read()) return new { id = reader.GetString(0), name = reader.GetString(1), type = reader.IsDBNull(2) ? null : reader.GetString(2) };
        }
        throw new ApiError(404, "Склад не найден.");
    }

    private object MigrateWarehouses(Dictionary<string, object> body)
    {
        object[] rows = body.ContainsKey("warehouses") ? body["warehouses"] as object[] : null;
        if (rows == null || rows.Length > 1000) throw new ApiError(400, "Некорректные сохранённые склады.");
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            using (SQLiteCommand count = new SQLiteCommand("SELECT COUNT(*) FROM warehouses", connection, transaction))
                if (Convert.ToInt32(count.ExecuteScalar()) > 0) { transaction.Commit(); return new { migrated = false }; }
            foreach (object item in rows) ImportWarehouse(connection, transaction, item);
            transaction.Commit();
        }
        return new { migrated = true };
    }

    private static string WarehouseName(Dictionary<string, object> body)
    {
        string name = Text(body, "name").Trim();
        if (name.Length == 0 || name.Length > 120) throw new ApiError(400, "Название склада должно содержать от 1 до 120 символов.");
        return name;
    }

    private static string WarehouseType(Dictionary<string, object> body)
    {
        string type = Text(body, "type");
        if (type != "finished-goods" && type != "materials") throw new ApiError(400, "Выберите тип склада.");
        return type;
    }

    private static void ImportWarehouse(SQLiteConnection connection, SQLiteTransaction transaction, object item)
    {
        var row = item as Dictionary<string, object>;
        if (row == null) throw new ApiError(400, "Некорректные сохранённые склады.");
        string id = Text(row, "id"), name = Text(row, "name").Trim(), type = Text(row, "type");
        object rawType;
        bool hasType = row.TryGetValue("type", out rawType) && rawType != null;
        if (id.Length == 0 || id.Length > 100 || name.Length == 0 || name.Length > 120
            || (hasType && type != "finished-goods" && type != "materials")) throw new ApiError(400, "Некорректные сохранённые склады.");
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO warehouses (id,name,type) VALUES (@id,@name,@type)", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@name", name);
            command.Parameters.AddWithValue("@type", hasType ? (object)type : DBNull.Value); command.ExecuteNonQuery();
        }
    }
}
