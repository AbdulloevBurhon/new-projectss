using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

internal sealed partial class WorkshopApi
{
    private List<Dictionary<string, object>> WorkerRows(SQLiteConnection db, string key, params object[] values)
    {
        return TransactionRows(db, null, key, values);
    }

    private static List<Dictionary<string, object>> TransactionRows(SQLiteConnection db, SQLiteTransaction tx, string key, params object[] values)
    {
        var rows = new List<Dictionary<string, object>>();
        using (var command = StockReceiptCommand(db, tx, SaleSql[key], values))
        using (var reader = command.ExecuteReader())
            while (reader.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                rows.Add(row);
            }
        return rows;
    }

    private static int RunWorkerSql(SQLiteConnection db, SQLiteTransaction tx, string key, params object[] values)
    {
        using (var command = StockReceiptCommand(db, tx, SaleSql[key], values)) return command.ExecuteNonQuery();
    }
}
