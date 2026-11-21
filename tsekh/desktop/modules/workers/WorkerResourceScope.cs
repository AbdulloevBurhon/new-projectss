using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private static bool AllowsResource(string[] allowed, string id) { return allowed == null || allowed.Contains(id); }

    private static void RequireResource(string[] allowed, string id)
    {
        if (!AllowsResource(allowed, id)) throw new ApiError(403, "У сотрудника нет доступа к этому складу или счёту.");
    }

    private void RequireResourceRow(EmployeeResources scope, string key, string id)
    {
        using (var db = Open())
        {
            var row = WorkerRows(db, key, "@id", id).FirstOrDefault();
            if (row == null) return;
            if (row.ContainsKey("warehouse")) RequireResource(scope.warehouses, Text(row, "warehouse"));
            if (row.ContainsKey("account")) RequireResource(scope.accounts, Text(row, "account"));
            if (row.ContainsKey("targetAccount")) RequireResource(scope.accounts, Text(row, "targetAccount"));
        }
    }

    private void RestrictEmployeeResources(EmployeeProfile worker, string method, string[] parts, Dictionary<string, object> body)
    {
        var scope = worker.resources;
        if (scope.warehouses == null && scope.accounts == null) return;
        string resource = parts[1], action = parts.Length > 2 ? Uri.UnescapeDataString(parts[2]) : "",
            record = parts.Length > 3 ? Uri.UnescapeDataString(parts[3]) : "";
        bool write = method == "POST" || method == "PATCH";
        Action<string> account = key => RequireResource(scope.accounts, Text(body, key));
        Action<string> warehouse = key => RequireResource(scope.warehouses, Text(body, key));

        if (resource == "warehouses")
        {
            if (method == "POST") RequireResource(scope.warehouses, null);
            else if (action.Length != 0) RequireResource(scope.warehouses, action);
        }
        if (resource == "accounts")
        {
            string operation = action == "receipts" ? "scopeReceipt" : action == "expenses" ? "scopeExpense" : action == "transfers" ? "scopeTransfer" : null;
            if (operation != null)
            {
                if (record.Length != 0) RequireResourceRow(scope, operation, record);
                if (write && action == "transfers") { account("sourceAccountId"); account("targetAccountId"); }
                else if (write) account("accountId");
            }
            else if (method == "POST") RequireResource(scope.accounts, null);
            else if (action.Length != 0) RequireResource(scope.accounts, action);
        }
        if (resource == "stock-receipts")
        {
            if (action.Length != 0) RequireResourceRow(scope, "scopeStockReceipt", action);
            if (method == "POST") { warehouse("warehouseId"); account("accountId"); }
            else if (write && body.ContainsKey("accountId") && body["accountId"] != null) account("accountId");
        }
        if (resource == "sales")
        {
            if (action == "checkout" && write) { warehouse("warehouse"); account("account"); }
            if (action == "receipt" && record.Length != 0) RequireResourceRow(scope, "scopeSale", record);
            if (action == "clients" && parts.Length > 4 && parts[4] == "payments" && write) account("account");
            if (action == "movement" && write)
            {
                RequireResourceRow(scope, "scopeStockLot", Text(body, "lot"));
                if (body.ContainsKey("target") && body["target"] != null) warehouse("target");
            }
        }
    }

    private static List<Dictionary<string, object>> FilterResources(List<Dictionary<string, object>> rows, string[] allowed, string key)
    {
        return allowed == null ? rows : rows.Where(row => AllowsResource(allowed, Text(row, key))).ToList();
    }

    private object ScopedList(object result, EmployeeProfile worker, string method, string[] parts)
    {
        var scope = worker == null ? null : worker.resources;
        if (method != "GET" || scope == null || (scope.accounts == null && scope.warehouses == null)) return result;
        string resource = parts[1], action = parts.Length > 2 ? parts[2] : "";
        if (resource == "stock-receipts")
        {
            var snapshot = json.Deserialize<Dictionary<string, object>>(json.Serialize(result));
            var rows = ((IList)snapshot["rows"]).Cast<Dictionary<string, object>>().ToList();
            snapshot["rows"] = FilterResources(FilterResources(rows, scope.warehouses, "warehouseId"), scope.accounts, "accountId");
            return snapshot;
        }
        if (resource != "warehouses" && resource != "accounts") return result;
        var entries = json.Deserialize<List<Dictionary<string, object>>>(json.Serialize(result));
        if (resource == "warehouses") return FilterResources(entries, scope.warehouses, "id");
        if (action == "transfers") return FilterResources(FilterResources(entries, scope.accounts, "sourceAccountId"), scope.accounts, "targetAccountId");
        return FilterResources(entries, scope.accounts, action.Length == 0 ? "id" : "accountId");
    }
}
