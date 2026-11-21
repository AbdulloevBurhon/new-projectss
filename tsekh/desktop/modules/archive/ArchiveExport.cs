using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private static readonly string[] ArchiveTables =
        { "accounts", "warehouses", "products", "receipts", "expenses", "transfers", "stock_receipts", "clients", "sales", "sale_lines", "stock_movements", "workers", "sale_workers", "client_payments", "worker_resource_access", "stock_revisions", "stock_revision_lines", "stock_batches" };

    private static object ExportDataArchive(SQLiteConnection connection, bool includeReports)
    {
        object snapshot;
        List<Dictionary<string, object>> stock = null, sales = null;
        using (var transaction = connection.BeginTransaction())
        {
            snapshot = ReadArchiveSnapshot(connection, transaction);
            if (includeReports)
            {
                stock = ReadArchiveReport(connection, transaction, SaleSql["stock"]);
                sales = ReadArchiveReport(connection, transaction, SaleSql["report"]);
            }
            transaction.Commit();
        }
        if (!includeReports) return snapshot;
        return new { database = snapshot, stock, sales };
    }

    private static object ReadArchiveSnapshot(SQLiteConnection connection, SQLiteTransaction transaction)
    {
        var tables = new Dictionary<string, List<Dictionary<string, object>>>();
        foreach (string table in ArchiveTables)
            tables.Add(table, ReadArchiveReport(connection, transaction, "SELECT * FROM " + table + " ORDER BY rowid"));
        return new { version = 1, tables = tables };
    }

    private static List<Dictionary<string, object>> ReadArchiveReport(SQLiteConnection connection, SQLiteTransaction transaction, string sql, params object[] parameters)
    {
        var rows = new List<Dictionary<string, object>>();
        using (var command = StockReceiptCommand(connection, transaction, sql, parameters))
        using (var reader = command.ExecuteReader())
            while (reader.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                    row.Add(reader.GetName(i), reader.IsDBNull(i) ? null : reader.GetValue(i));
                rows.Add(row);
            }
        return rows;
    }
}
