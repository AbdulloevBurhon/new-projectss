using System;
using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private static void InitializeProductBarcode(SQLiteConnection connection)
    {
        using (var transaction = connection.BeginTransaction())
        {
            bool exists = false;
            using (var command = new SQLiteCommand("PRAGMA table_info(products)", connection, transaction))
            using (var reader = command.ExecuteReader())
                while (reader.Read()) if (reader.GetString(1) == "barcode") exists = true;
            if (!exists)
                using (var command = new SQLiteCommand("ALTER TABLE products ADD COLUMN barcode TEXT", connection, transaction))
                    command.ExecuteNonQuery();
            transaction.Commit();
        }
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
        string barcode = ReadProductBarcode(row);
        EnsureProductBarcodeAvailable(connection, transaction, barcode, id);
        using (SQLiteCommand command = new SQLiteCommand("INSERT INTO products (id,name,unit,content_unit,quantity_per_piece,barcode) VALUES (@id,@name,@unit,@content,@quantity,@barcode)", connection, transaction))
        {
            BindProduct(command, id, new ProductData(name, unit, hasContent ? content : null,
                hasQuantity ? (double?)quantity : null, barcode, row.ContainsKey("barcode")));
            command.ExecuteNonQuery();
        }
    }
}
