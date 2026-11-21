using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private sealed class EmployeeResources
    {
        public string[] warehouses { get; set; }
        public string[] accounts { get; set; }
    }

    private object ResourceSqlValue(string[] ids) { return ids == null ? (object)DBNull.Value : json.Serialize(ids); }

    private EmployeeResources ReadEmployeeResources(Dictionary<string, object> row)
    {
        string warehouses = Text(row, "warehouseScope"), accounts = Text(row, "accountScope");
        return new EmployeeResources {
            warehouses = warehouses.Length == 0 ? null : json.Deserialize<string[]>(warehouses),
            accounts = accounts.Length == 0 ? null : json.Deserialize<string[]>(accounts)
        };
    }

    private void SaveEmployeeResources(SQLiteConnection db, SQLiteTransaction tx, Dictionary<string, object> body, string id, bool owner)
    {
        object value;
        if (!body.TryGetValue("resources", out value)) return;
        if (!owner) throw new ApiError(403, "Доступ к складам и счетам выдаёт администратор.");
        var selected = value as Dictionary<string, object>;
        if (selected == null || selected.Keys.Any(key => key != "warehouses" && key != "accounts"))
            throw new ApiError(400, "Проверьте выбранные склады и счета.");

        var previous = ReadArchiveReport(db, tx, SaleSql["getWorkerResources"], "@id", id).FirstOrDefault();
        Func<string, object> read = kind => {
            object entry;
            if (!selected.TryGetValue(kind, out entry)) return previous == null ? null : previous[kind];
            var values = entry as IList;
            if (values == null || values.Cast<object>().Any(x => !(x is string) || ((string)x).Length == 0 || ((string)x).Length > 200))
                throw new ApiError(400, "Проверьте выбранные склады и счета.");
            var ids = values.Cast<string>().Distinct().ToArray();
            var available = new HashSet<string>(ReadArchiveReport(db, tx, SaleSql[kind]).Select(row => Text(row, "id")));
            if (ids.Any(item => !available.Contains(item)))
                throw new ApiError(409, "Один из выбранных складов или счетов недоступен.");
            return json.Serialize(ids);
        };
        RunWorkerSql(db, tx, "saveWorkerResources", "@id", id, "@warehouses", read("warehouses"), "@accounts", read("accounts"));
    }
}
