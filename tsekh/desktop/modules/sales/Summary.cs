using System;
using System.Globalization;

internal sealed partial class WorkshopApi
{
    private object ReadSummary(string value, EmployeeProfile worker)
    {
        string[] days = value != null && value.Length <= 774 ? value.Split(',') : new string[0];
        if (days.Length < 2 || days.Length > 31) throw new ApiError(400, "Проверьте период итогов.");
        DateTimeOffset previous = default(DateTimeOffset);
        for (int index = 0; index < days.Length; index++)
        {
            DateTimeOffset date;
            const string format = "yyyy-MM-dd'T'HH:mm:ss.fff'Z'";
            if (!DateTimeOffset.TryParseExact(days[index], format, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out date)
                || (index > 0 && ((date - previous).TotalHours < 22 || (date - previous).TotalHours > 26)))
                throw new ApiError(400, "Проверьте период итогов.");
            previous = date;
        }

        var scope = worker == null ? new EmployeeResources() : worker.resources;
        using (var db = Open())
            return WorkerRows(db, "summaryDaily", "@boundaries", json.Serialize(days),
                "@allowedWarehouses", ResourceSqlValue(scope.warehouses), "@allowedAccounts", ResourceSqlValue(scope.accounts));
    }
}
