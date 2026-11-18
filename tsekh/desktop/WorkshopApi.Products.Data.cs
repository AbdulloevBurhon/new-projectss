using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static readonly string[] ProductUnits = { "шт", "уп", "г", "кг", "м", "м²", "м³", "л", "т" };

    private static Dictionary<string, object> ProductRow(SQLiteDataReader reader)
    {
        var row = new Dictionary<string, object> { { "id", reader.GetString(0) }, { "name", reader.GetString(1) }, { "unit", reader.GetString(2) } };
        if (!reader.IsDBNull(3)) row["contentUnit"] = reader.GetString(3);
        if (!reader.IsDBNull(4)) row["quantityPerPiece"] = reader.GetDouble(4);
        return row;
    }

    private static void BindProduct(SQLiteCommand command, string id, ProductData fields)
    {
        command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@name", fields.Name);
        command.Parameters.AddWithValue("@unit", fields.Unit); command.Parameters.AddWithValue("@content", (object)fields.ContentUnit ?? DBNull.Value);
        command.Parameters.AddWithValue("@quantity", fields.Quantity.HasValue ? (object)fields.Quantity.Value : DBNull.Value);
    }

    private static ProductData ReadProductFields(Dictionary<string, object> body)
    {
        string name = Text(body, "name").Trim(), unit = Text(body, "unit");
        if (name.Length == 0 || name.Length > 100) throw new ApiError(400, "Введите название до 100 символов.");
        if (Array.IndexOf(ProductUnits, unit) < 0) throw new ApiError(400, "Выберите единицу измерения.");
        object rawContent, rawQuantity;
        bool hasContent = body.TryGetValue("contentUnit", out rawContent) && rawContent != null;
        bool hasQuantity = body.TryGetValue("quantityPerPiece", out rawQuantity) && rawQuantity != null;
        if (!hasContent && !hasQuantity) return new ProductData(name, unit, null, null);
        string content = Text(body, "contentUnit"); double quantity = Number(body, "quantityPerPiece");
        if (!hasContent || !hasQuantity || (unit != "шт" && unit != "кг" && unit != "уп") || Array.IndexOf(ProductUnits, content) < 0
            || double.IsNaN(quantity) || double.IsInfinity(quantity) || quantity <= 0 || quantity > 1000000 || Math.Abs(quantity * 1000 - Math.Round(quantity * 1000)) >= 0.000001)
            throw new ApiError(400, "Проверьте единицу и содержимое упаковки.");
        return new ProductData(name, unit, content, quantity);
    }

    private object MigrateProducts(Dictionary<string, object> body)
    {
        object[] rows = body.ContainsKey("products") ? body["products"] as object[] : null;
        if (rows == null || rows.Length > 5000) throw new ApiError(400, "Некорректные сохранённые товары.");
        using (SQLiteConnection connection = Open()) using (SQLiteTransaction transaction = connection.BeginTransaction())
        {
            using (SQLiteCommand count = new SQLiteCommand("SELECT COUNT(*) FROM products", connection, transaction))
                if (Convert.ToInt32(count.ExecuteScalar()) > 0) { transaction.Commit(); return new { migrated = false }; }
            foreach (object item in rows) ImportProduct(connection, transaction, item);
            transaction.Commit();
        }
        return new { migrated = true };
    }

    private static void ImportProduct(SQLiteConnection connection, SQLiteTransaction transaction, object item)
    {
        var row = item as Dictionary<string, object>;
        if (row == null) throw new ApiError(400, "Некорректные сохранённые товары.");
        string id = Text(row, "id"), name = Text(row, "name").Trim(), unit = Text(row, "unit"), content = Text(row, "contentUnit");
        object rawContent, rawQuantity;
        bool hasContent = row.TryGetValue("contentUnit", out rawContent) && rawContent != null;
        bool hasQuantity = row.TryGetValue("quantityPerPiece", out rawQuantity) && rawQuantity != null;
        double quantity = hasQuantity ? Number(row, "quantityPerPiece") : 0;
        if (id.Length == 0 || id.Length > 100 || name.Length == 0 || name.Length > 100 || Array.IndexOf(ProductUnits, unit) < 0
            || (hasContent && Array.IndexOf(ProductUnits, content) < 0) || (hasQuantity && (double.IsNaN(quantity) || double.IsInfinity(quantity) || quantity <= 0 || quantity > 1000000)))
            throw new ApiError(400, "Некорректные сохранённые товары.");
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO products (id,name,unit,content_unit,quantity_per_piece) VALUES (@id,@name,@unit,@content,@quantity)", connection, transaction))
        {
            command.Parameters.AddWithValue("@id", id); command.Parameters.AddWithValue("@name", name); command.Parameters.AddWithValue("@unit", unit);
            command.Parameters.AddWithValue("@content", hasContent ? (object)content : DBNull.Value); command.Parameters.AddWithValue("@quantity", hasQuantity ? (object)quantity : DBNull.Value);
            command.ExecuteNonQuery();
        }
    }

    private sealed class ProductData
    {
        internal readonly string Name, Unit, ContentUnit; internal readonly double? Quantity;
        internal ProductData(string name, string unit, string contentUnit, double? quantity) { Name = name; Unit = unit; ContentUnit = contentUnit; Quantity = quantity; }
    }
}
