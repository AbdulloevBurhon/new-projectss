using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading;

internal sealed partial class WorkshopApi
{
    private int telegramRun;

    private sealed class TelegramInput
    {
        internal string Start, Previous, End, Day, PreviousDay, Cutoff, Techcards;
        internal bool Online;
    }

    private static TelegramInput ReadTelegramInput(Dictionary<string, object> body)
    {
        var input = new TelegramInput {
            Start = EmployeeDate(Text(body, "start")), Previous = EmployeeDate(Text(body, "previous")),
            End = EmployeeDate(Text(body, "end")), Day = Text(body, "day"), PreviousDay = Text(body, "previousDay"),
        };
        object online, techcards;
        DateTime day, previousDay;
        if (input.Previous.Length == 0 || string.CompareOrdinal(input.Previous, input.Start) >= 0
            || string.CompareOrdinal(input.Start, input.End) >= 0
            || !DateTime.TryParseExact(input.Day, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day)
            || !DateTime.TryParseExact(input.PreviousDay, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out previousDay)
            || (day - previousDay).TotalDays != 1 || Math.Abs((day - DateTime.UtcNow).TotalDays) > 2
            || !body.TryGetValue("online", out online) || !(online is bool))
            throw new ApiError(400, "Проверьте данные запланированной сверки.");
        if (body.TryGetValue("techcards", out techcards) && techcards != null
            && (!(techcards is string) || ((string)techcards).Length > 10000000))
            throw new ApiError(400, "Проверьте данные запланированной сверки.");
        input.Techcards = techcards as string;
        input.Online = (bool)online;
        input.Cutoff = day.AddDays(-2).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return input;
    }

    private object SaveTelegramSchedule(Dictionary<string, object> body)
    {
        object value;
        if (!body.TryGetValue("token", out value) || (value != null && (!(value is string) || !Regex.IsMatch((string)value, @"\A[a-f0-9]{64}\z"))))
            throw new ApiError(400, "Некорректный ключ расписания.");
        ReplaceTelegramToken(value as string);
        return new { saved = true };
    }

    private object RunTelegramSchedule(Dictionary<string, object> body)
    {
        var key = TelegramToken();
        if (key == null) return new { needsDevice = true };
        if (Interlocked.CompareExchange(ref telegramRun, 1, 0) != 0) return new { };
        try
        {
            var input = ReadTelegramInput(body);
            using (var db = Open()) RunWorkerSql(db, null, "pruneTelegramOutbox", "@cutoff", input.Cutoff);
            try
            {
                if (input.Online)
                {
                    var cloud = SendTelegramBackground(key, null);
                    if (key != TelegramToken()) return new { };
                    object value;
                    if (!cloud.TryGetValue("intervalMinutes", out value) || !(value is int) || (int)value < 0 || (int)value > 10080)
                        throw new ApiError(502, "Сервер не вернул интервал Telegram.");
                    SyncTelegramPolicy((int)value);
                }
                int? intervalMinutes = CaptureTelegram(input);
                var job = input.Online && intervalMinutes > 0 ? ClaimTelegramJob() : null;
                if (job == null) return new { intervalMinutes };
                var id = Text(job, "id");
                try
                {
                    var result = SendTelegramBackground(key, Text(job, "payload"));
                    if (!result.ContainsKey("delivered") || !Equals(result["delivered"], true))
                        throw new ApiError(502, "Сервер не подтвердил получение комплекта.");
                    using (var db = Open())
                    {
                        RunWorkerSql(db, null, "removeTelegramJob", "@id", id);
                        bool more = WorkerRows(db, "findTelegramJob", "@now", StockReceiptTime()).Count > 0;
                        return new { intervalMinutes, more };
                    }
                }
                catch
                {
                    using (var db = Open())
                        RunWorkerSql(db, null, "markTelegramJob", "@id", id, "@retry", StockReceiptTime() + 60000);
                    throw;
                }
            }
            catch (ApiError error)
            {
                if (key != TelegramToken()) return new { };
                if (error.Status == 401)
                {
                    ReplaceTelegramToken(null);
                    return new { needsDevice = true };
                }
                if (error.Status == 403) SyncTelegramPolicy(0);
                else if (input.Online && error.Status != 404) CaptureTelegram(input);
                throw new ApiError(502, error.Message);
            }
        }
        finally { Interlocked.Exchange(ref telegramRun, 0); }
    }
}
