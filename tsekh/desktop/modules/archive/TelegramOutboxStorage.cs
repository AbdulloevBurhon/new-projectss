using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

internal sealed partial class WorkshopApi
{
    private static JavaScriptSerializer TelegramJson() { return new JavaScriptSerializer { MaxJsonLength = int.MaxValue }; }

    private string TelegramToken()
    {
        using (var db = Open())
        {
            var rows = WorkerRows(db, "getTelegramSchedule");
            return rows.Count == 0 ? null : Text(rows[0], "token");
        }
    }

    private void ReplaceTelegramToken(string token)
    {
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            var rows = ReadArchiveReport(db, tx, SaleSql["getTelegramSchedule"]);
            var current = rows.Count == 0 ? null : Text(rows[0], "token");
            if (current == token) return;
            if (token == null) RunWorkerSql(db, tx, "clearTelegramSchedule");
            else RunWorkerSql(db, tx, "setTelegramSchedule", "@token", token);
            RunWorkerSql(db, tx, "clearTelegramPolicy");
            tx.Commit();
        }
    }

    private void SyncTelegramPolicy(int minutes)
    {
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            RunWorkerSql(db, tx, "setTelegramPolicy", "@minutes", minutes, "@now", StockReceiptTime() + minutes * 60000L);
            if (minutes == 0) RunWorkerSql(db, tx, "clearTelegramOutbox");
            tx.Commit();
        }
    }

    private int? CaptureTelegram(TelegramInput input)
    {
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            var policy = ReadArchiveReport(db, tx, SaleSql["getTelegramPolicy"]);
            if (policy.Count == 0) return null;
            int minutes = Convert.ToInt32(policy[0]["interval_minutes"]);
            long now = StockReceiptTime();
            if (minutes == 0 || Convert.ToInt64(policy[0]["next_at"]) > now) return minutes;
            var query = SaleSql["telegramDaySales"];
            var snapshot = new {
                database = ReadArchiveSnapshot(db, tx),
                stock = ReadArchiveReport(db, tx, SaleSql["telegramStock"]),
                sales = ReadArchiveReport(db, tx, SaleSql["telegramSales"])[0],
                today = ReadArchiveReport(db, tx, query, "@from", input.Start, "@to", input.End)[0],
                yesterday = ReadArchiveReport(db, tx, query, "@from", input.Previous, "@to", input.Start)[0],
            };
            var entries = new Dictionary<string, string>();
            if (input.Techcards != null) entries.Add("obshaya:data:tsekh:techcards", input.Techcards);
            var id = Guid.NewGuid().ToString("N");
            var capturedAt = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", System.Globalization.CultureInfo.InvariantCulture);
            var payload = TelegramJson().Serialize(new { id, snapshot, day = input.Day, previousDay = input.PreviousDay, capturedAt, entries });
            RunWorkerSql(db, tx, "queueTelegramJob", "@id", id, "@day", input.Day, "@payload", payload);
            RunWorkerSql(db, tx, "advanceTelegramPolicy", "@next", now + minutes * 60000L);
            tx.Commit();
            return minutes;
        }
    }

    private Dictionary<string, object> ClaimTelegramJob()
    {
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            long now = StockReceiptTime();
            var jobs = ReadArchiveReport(db, tx, SaleSql["findTelegramJob"], "@now", now);
            if (jobs.Count == 0) return null;
            RunWorkerSql(db, tx, "markTelegramJob", "@id", Text(jobs[0], "id"), "@retry", now + 215000);
            tx.Commit();
            return jobs[0];
        }
    }
}
