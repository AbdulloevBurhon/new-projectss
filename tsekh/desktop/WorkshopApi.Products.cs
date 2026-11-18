using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object Products(string method, string[] parts, Dictionary<string, object> body)
    {
        if (parts.Length == 2 && method == "GET") return ListProducts();
        if (parts.Length == 2 && method == "POST") return CreateProduct(ReadProductFields(body));
        if (parts.Length == 3 && parts[2] == "migrate" && method == "POST") return MigrateProducts(body);
        if (parts.Length != 3) throw new ApiError(404, "Маршрут не найден.");
        string id = Uri.UnescapeDataString(parts[2]);
        if (method == "PATCH") return UpdateProduct(id, ReadProductFields(body));
        if (method == "DELETE") return DeleteProduct(id);
        throw new ApiError(405, "Метод не поддерживается.");
    }

    private object ListProducts()
    {
        var rows = new List<object>();
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("SELECT id,name,unit,content_unit,quantity_per_piece FROM products ORDER BY created_at DESC,rowid DESC", connection))
        using (SQLiteDataReader reader = command.ExecuteReader())
            while (reader.Read()) rows.Add(ProductRow(reader));
        return rows;
    }

    private object CreateProduct(ProductData fields)
    {
        string id = Guid.NewGuid().ToString("D");
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO products (id,name,unit,content_unit,quantity_per_piece) VALUES (@id,@name,@unit,@content,@quantity)", connection))
        {
            BindProduct(command, id, fields); command.ExecuteNonQuery(); return GetProduct(connection, id);
        }
    }

    private object UpdateProduct(string id, ProductData fields)
    {
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("UPDATE products SET name=@name,unit=@unit,content_unit=@content,quantity_per_piece=@quantity,updated_at=CURRENT_TIMESTAMP WHERE id=@id", connection))
        {
            BindProduct(command, id, fields);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Товар не найден.");
            return GetProduct(connection, id);
        }
    }

    private object DeleteProduct(string id)
    {
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = new SQLiteCommand("DELETE FROM products WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            if (command.ExecuteNonQuery() == 0) throw new ApiError(404, "Товар не найден.");
        }
        return new { success = true };
    }

    private object GetProduct(SQLiteConnection connection, string id)
    {
        using (SQLiteCommand command = new SQLiteCommand("SELECT id,name,unit,content_unit,quantity_per_piece FROM products WHERE id=@id", connection))
        {
            command.Parameters.AddWithValue("@id", id);
            using (SQLiteDataReader reader = command.ExecuteReader()) if (reader.Read()) return ProductRow(reader);
        }
        throw new ApiError(404, "Товар не найден.");
    }

}
