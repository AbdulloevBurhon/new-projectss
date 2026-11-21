using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

internal sealed partial class WorkshopApi
{
    private static string EmployeeDate(string input)
    {
        DateTimeOffset value;
        return Regex.IsMatch(input ?? "", @"^\d{4}-\d{2}-\d{2}T")
            && DateTimeOffset.TryParse(input, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out value)
            ? value.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture) : "";
    }

    private object Workers(string method, Uri uri, string[] parts, Dictionary<string, object> body, string token)
    {
        string id = parts.Length > 2 ? Uri.UnescapeDataString(parts[2]) : "";
        string action = parts.Length > 3 ? parts[3] : "";
        using (var db = Open())
        {
            if (id == "session" && method == "DELETE")
            {
                if (!string.IsNullOrEmpty(token)) RunWorkerSql(db, null, "closeWorkerSession", "@token", token);
                return new { success = true };
            }
            var worker = FindEmployee(token);
            if (id == "owner-pin" && method == "POST") return OwnerPinRequest(db, body, worker != null);
            if (id == "session" && method == "GET") return worker;
            if (id == "session" && method == "POST")
            {
                if (worker != null) throw new ApiError(409, "Сначала выйдите из текущего сеанса.");
                return LoginEmployee(db, body);
            }
            string required = method == "PATCH" ? "workers.edit" : method == "DELETE" ? "workers.delete" : "workers";
            if (worker != null && (action == "permissions" || !worker.Can(required)))
                throw new ApiError(403, "У вас нет прав для этого действия.");
            if (id == "" && method == "GET") return WorkerRows(db, "listWorkers").Select(EmployeeFromRow).ToList();
            if (id != "" && WorkerRows(db, "findWorker", "@id", id).Count == 0) throw new ApiError(404, "Сотрудник не найден.");
            if (method == "GET" && action == "sales")
            {
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var scope = worker == null ? new EmployeeResources() : worker.resources;
                var rows = WorkerRows(db, "workerSales", "@id", id, "@from", EmployeeDate(query["from"]), "@to", EmployeeDate(query["to"]),
                    "@allowedWarehouses", ResourceSqlValue(scope.warehouses), "@allowedAccounts", ResourceSqlValue(scope.accounts));
                foreach (var sale in rows) sale["lines"] = json.DeserializeObject(Text(sale, "lines"));
                return rows;
            }
            if (method == "PATCH" && action == "permissions")
            {
                object supplied;
                var list = body.TryGetValue("permissions", out supplied) ? supplied as System.Collections.IList : null;
                if (list == null || list.Cast<object>().Any(value => !(value is string) || !EmployeeRights.Contains((string)value)))
                    throw new ApiError(400, "Проверьте права доступа.");
                RunWorkerSql(db, null, "workerRights", "@id", id, "@permissions", json.Serialize(list.Cast<string>().Distinct().ToArray()));
                return new { success = true };
            }
            if (id != "" && action == "" && method == "DELETE")
            {
                RunWorkerSql(db, null, "deleteWorker", "@id", id);
                employeeAttempts.Remove(id);
                return new { success = true };
            }
            if (!(id == "" && method == "POST" || id != "" && action == "" && method == "PATCH"))
                throw new ApiError(404, "Маршрут не найден.");
            string name = Text(body, "name").Trim(), role = Text(body, "role").Trim(), phone = Text(body, "phone").Trim(), pin = Text(body, "pin");
            if (id != "" && pin != "" && worker != null) throw new ApiError(403, "ПИН-код может менять администратор.");
            if (name.Length == 0 || name.Length > 100 || role.Length == 0 || role.Length > 80 || phone.Length > 32 || !Regex.IsMatch(phone, @"[0-9]")
                || ((id == "" || pin != "") && !Regex.IsMatch(pin, @"^[0-9]{5}$")))
                throw new ApiError(400, "Проверьте имя, роль, телефон и ПИН-код из пяти цифр.");
            byte[] saltBytes = pin == "" ? null : EmployeeRandom(16);
            string workerId = id == "" ? Guid.NewGuid().ToString("D") : id;
            string hash = saltBytes == null ? null : EmployeePinHash(pin, saltBytes);
            using (var tx = db.BeginTransaction())
            {
                if (hash != null && ReadArchiveReport(db, tx, SaleSql["ownerPinGuards"]).Any(row => MatchesEmployeePin(row, pin)))
                    throw new ApiError(409, "Этот ПИН-код используется администратором.");
                if (hash != null && ReadArchiveReport(db, tx, SaleSql["workerPinCandidates"], "@except", id).Any(row => MatchesEmployeePin(row, pin)))
                    throw new ApiError(409, "Этот ПИН-код уже используется другим сотрудником.");
                RunWorkerSql(db, tx, id == "" ? "createWorker" : "editWorker", "@id", workerId, "@name", name,
                    "@role", role, "@phone", phone, "@salt", saltBytes == null ? null : EmployeeHex(saltBytes), "@hash", hash);
                SaveEmployeeResources(db, tx, body, workerId, worker == null);
                if (id != "" && hash != null) RunWorkerSql(db, tx, "revokeWorkerSessions", "@id", id);
                tx.Commit();
            }
            return new { id = workerId };
        }
    }
}
