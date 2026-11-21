using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private object DataArchive(string method, Dictionary<string, object> body, System.Collections.Specialized.NameValueCollection query)
    {
        string reportFormat = query["reports"];
        using (var connection = Open())
        {
            if (method == "GET" && reportFormat == "telegram-text")
            {
                using (var tx = connection.BeginTransaction())
                {
                    var database = query["backup"] == "1" ? ReadArchiveSnapshot(connection, tx) : null;
                    var stock = ReadArchiveReport(connection, tx, SaleSql["telegramStock"]);
                    var sales = ReadArchiveReport(connection, tx, SaleSql["telegramSales"])[0];
                    string start = EmployeeDate(query["start"]), previous = EmployeeDate(query["previous"]), end = EmployeeDate(query["end"]);
                    if (previous.Length > 0 && string.CompareOrdinal(previous, start) < 0 && string.CompareOrdinal(start, end) < 0)
                    {
                        string sql = SaleSql["telegramDaySales"];
                        var today = ReadArchiveReport(connection, tx, sql, "@from", start, "@to", end)[0];
                        var yesterday = ReadArchiveReport(connection, tx, sql, "@from", previous, "@to", start)[0];
                        tx.Commit();
                        if (database != null) return new { database, stock, sales, today, yesterday };
                        return new { stock, sales, today, yesterday };
                    }
                    tx.Commit();
                    if (database != null) return new { database, stock, sales };
                    return new { stock, sales };
                }
            }
            if (method == "GET") return ExportDataArchive(connection, reportFormat == "telegram");
            if (method == "PUT") return ImportDataArchive(connection, body);
        }
        throw new ApiError(405, "Метод не поддерживается.");
    }
}
