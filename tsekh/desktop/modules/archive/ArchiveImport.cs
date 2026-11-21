using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private static ApiError InvalidArchive()
    {
        return new ApiError(400, "Архив SQLite содержит некорректные данные.");
    }

    private sealed class ArchiveColumn
    {
        public string Name;
        public string Type;
        public bool Required;
        public bool PrimaryKey;
    }

    private static List<ArchiveColumn> ArchiveColumns(SQLiteConnection connection, SQLiteTransaction transaction, string table)
    {
        var columns = new List<ArchiveColumn>();
        using (var command = new SQLiteCommand("PRAGMA table_info(" + table + ")", connection, transaction))
        using (var reader = command.ExecuteReader())
            while (reader.Read())
                columns.Add(new ArchiveColumn { Name = reader.GetString(1), Type = reader.GetString(2),
                    Required = reader.GetInt64(3) != 0, PrimaryKey = reader.GetInt64(5) != 0 });
        return columns;
    }

    private static object ArchiveValue(Dictionary<string, object> row, ArchiveColumn column)
    {
        object value;
        if (!row.TryGetValue(column.Name, out value)) throw InvalidArchive();
        if (value == null && !column.Required && !column.PrimaryKey) return DBNull.Value;
        if (column.Type == "TEXT" && value is string && (!column.PrimaryKey || ((string)value).Length > 0)
            && (column.Name != "barcode" || ((string)value).Length <= BarcodeMaxLength)) return value;
        if (value is int || value is long || value is double || value is decimal)
        {
            double number = Convert.ToDouble(value);
            if (column.Type == "REAL" && !double.IsNaN(number) && !double.IsInfinity(number)) return number;
            if (column.Type == "INTEGER" && Math.Abs(number) <= 9007199254740991 && Math.Truncate(number) == number) return (long)number;
        }
        throw InvalidArchive();
    }

    private static object ImportDataArchive(SQLiteConnection connection, Dictionary<string, object> body)
    {
        object version, source;
        if (!body.TryGetValue("version", out version) || !(version is int) || (int)version != 1 ||
            !body.TryGetValue("tables", out source)) throw InvalidArchive();
        var tables = source as Dictionary<string, object>;
        if (tables != null && new[] { 7, 10, 11, 13, 14, 15, 17 }.Contains(tables.Count)
            && ArchiveTables.Take(tables.Count).All(t => tables.ContainsKey(t)))
            foreach (string table in ArchiveTables.Skip(tables.Count)) tables.Add(table, new object[0]);
        if (tables == null || tables.Count != ArchiveTables.Length) throw InvalidArchive();

        try
        {
            using (var transaction = connection.BeginTransaction())
            {
                foreach (string table in ArchiveTables.Reverse())
                    using (var command = new SQLiteCommand("DELETE FROM " + table, connection, transaction))
                        command.ExecuteNonQuery();

                foreach (string table in ArchiveTables)
                {
                    object input;
                    if (!tables.TryGetValue(table, out input)) throw InvalidArchive();
                    var rows = input as System.Collections.IList;
                    if (rows == null) throw InvalidArchive();
                    var columns = ArchiveColumns(connection, transaction, table);
                    string names = string.Join(",", columns.Select(column => column.Name));
                    string parameters = string.Join(",", columns.Select(column => "@" + column.Name));
                    using (var command = new SQLiteCommand("INSERT INTO " + table + " (" + names + ") VALUES (" + parameters + ")", connection, transaction))
                    {
                        foreach (object item in rows)
                        {
                            var row = item as Dictionary<string, object>;
                            if (row == null) throw InvalidArchive();
                            string optional = table == "products" ? "barcode" : table == "stock_receipts" ? "expires_on" : null;
                            bool legacy = optional != null && !row.ContainsKey(optional);
                            if (row.Count != columns.Count - (legacy ? 1 : 0)) throw InvalidArchive();
                            if (legacy) row.Add(optional, null);
                            command.Parameters.Clear();
                            foreach (var column in columns)
                                command.Parameters.AddWithValue("@" + column.Name, ArchiveValue(row, column));
                            command.ExecuteNonQuery();
                        }
                    }
                }
                using (var check = new SQLiteCommand(@"SELECT 1 FROM stock_receipts s WHERE
  s.status NOT IN ('pending','posted','failed') OR
  (s.status = 'posted' AND (s.posted_at IS NULL OR s.quantity IS NULL OR s.quantity <= 0 OR
    s.unit_price IS NULL OR s.unit_price < 0 OR s.total IS NULL OR s.total < 0)) OR
  (s.status = 'pending' AND (NOT EXISTS (SELECT 1 FROM accounts WHERE id=s.account_id)
    OR NOT EXISTS (SELECT 1 FROM warehouses WHERE id=s.warehouse_id)
    OR NOT EXISTS (SELECT 1 FROM products WHERE id=s.product_id))) LIMIT 1", connection, transaction))
                    if (check.ExecuteScalar() != null) throw InvalidArchive();
                using (var check = new SQLiteCommand(SaleSql["invalidClientDebt"], connection, transaction))
                    if (check.ExecuteScalar() != null) throw InvalidArchive();
                using (var check = new SQLiteCommand(SaleSql["invalidStockBatches"], connection, transaction))
                    if (check.ExecuteScalar() != null) throw InvalidArchive();
                using (var check = new SQLiteCommand(SaleSql["invalidWorkerResources"], connection, transaction))
                    if (check.ExecuteScalar() != null) throw InvalidArchive();
                transaction.Commit();
            }
        }
        catch (SQLiteException error)
        {
            if (error.ResultCode == SQLiteErrorCode.Constraint) throw InvalidArchive();
            throw;
        }
        return new { success = true };
    }
}
