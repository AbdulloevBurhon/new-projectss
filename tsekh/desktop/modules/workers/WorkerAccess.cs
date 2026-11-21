using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

internal sealed partial class WorkshopApi
{
    private static readonly HashSet<string> EmployeeRights = new HashSet<string>(new[] {
        "warehouses", "warehouses.edit", "warehouses.delete", "accounts", "accounts.edit", "accounts.delete",
        "workers", "workers.edit", "workers.delete", "clients", "clients.edit", "clients.delete", "clients.pay",
        "sales", "sales.settings", "sales.price", "sales.debt", "sales.discount", "reports", "summary"
    });
    private readonly Dictionary<string, Tuple<long, int>> employeeAttempts = new Dictionary<string, Tuple<long, int>>();

    private sealed class EmployeeProfile
    {
        public string id { get; set; }
        public string name { get; set; }
        public string role { get; set; }
        public string phone { get; set; }
        public string[] permissions { get; set; }
        public EmployeeResources resources { get; set; }
        internal bool Can(string right) { return permissions.Contains(right.Split('.')[0]) && permissions.Contains(right); }
    }

    private static string EmployeeToken(string cookie)
    {
        const string prefix = "tsekh_employee_session=";
        var entry = (cookie ?? "").Split(';').Select(part => part.Trim()).FirstOrDefault(part => part.StartsWith(prefix, StringComparison.Ordinal));
        return entry == null ? "" : entry.Substring(prefix.Length);
    }

    private EmployeeProfile EmployeeFromRow(Dictionary<string, object> row)
    {
        var stored = json.Deserialize<string[]>(Text(row, "permissions"));
        var employee = new EmployeeProfile {
            id = Text(row, "id"), name = Text(row, "name"), role = Text(row, "role"), phone = Text(row, "phone"),
            permissions = stored.Where(EmployeeRights.Contains).ToArray(), resources = ReadEmployeeResources(row)
        };
        // Keep the old grant until the administrator saves the employee's rights explicitly.
        if (!stored.Contains("clients.pay.configured") && !employee.Can("clients.pay")
            && employee.Can("clients.edit") && employee.Can("accounts"))
            employee.permissions = employee.permissions.Concat(new[] { "clients.pay" }).ToArray();
        return employee;
    }

    private EmployeeProfile FindEmployee(string token)
    {
        if (string.IsNullOrEmpty(token)) return null;
        using (var db = Open())
        {
            var row = WorkerRows(db, "workerSession", "@token", token, "@now", StockReceiptTime()).FirstOrDefault();
            if (row == null) throw new ApiError(401, "Войдите снова в режим сотрудника.");
            return EmployeeFromRow(row);
        }
    }

    private static void RestrictEmployeeRequest(EmployeeProfile worker, string method, string[] parts)
    {
        string resource = parts.Length > 1 ? parts[1] : "";
        string action = parts.Length > 2 ? parts[2] : "";
        bool read = method == "GET";
        string section = resource == "accounts" ? "accounts"
            : new[] { "warehouses", "products", "stock-receipts" }.Contains(resource) ? "warehouses" : null;
        bool allowed = section != null && action != "migrate"
            && worker.Can(section + (method == "PATCH" ? ".edit" : method == "DELETE" ? ".delete" : ""));
        if (resource == "summary" && parts.Length == 2 && read) allowed = worker.Can("summary");
        if (resource == "stock-expiry" && parts.Length == 2)
            allowed = read ? worker.Can("warehouses") : method == "PATCH" && worker.Can("warehouses.edit");
        if (resource == "sales")
        {
            if (action == "catalog" && read || action == "checkout") allowed = worker.Can("sales");
            if (read && new[] { "stock", "history", "warehouse-accounts" }.Contains(action)) allowed = worker.Can("warehouses");
            if (action == "movement" && method == "POST") allowed = worker.Can("warehouses.edit");
            if (action == "clients")
            {
                if (parts.Length > 3) allowed = parts.Length == 4 && read && worker.Can("clients")
                    || parts.Length == 5 && parts[4] == "payments" && method == "POST" && worker.Can("clients.pay") && worker.Can("accounts");
                else allowed = read ? worker.Can("clients") || worker.Can("sales")
                    : worker.Can(method == "PATCH" ? "clients.edit" : method == "DELETE" ? "clients.delete" : "clients");
            }
            if (action == "report") allowed = worker.Can("reports");
            if (action == "receipt" && read) allowed = worker.Can("reports") || worker.Can("sales");
        }
        if (!allowed) throw new ApiError(403, "У вас нет прав для этого действия.");
    }
}
