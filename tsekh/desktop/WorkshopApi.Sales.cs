using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using System.Reflection;
using System.Web.Script.Serialization;

internal sealed partial class WorkshopApi
{
    private static readonly Dictionary<string,string> SaleSql = LoadSaleQueries();
    private static Dictionary<string,string> LoadSaleQueries()
    {
        var queries = new Dictionary<string, string>();
        var assembly = Assembly.GetExecutingAssembly();
        var serializer = new JavaScriptSerializer();
        foreach (string resource in assembly.GetManifestResourceNames())
        {
            if (!resource.StartsWith("sales.", StringComparison.Ordinal) || !resource.EndsWith(".json", StringComparison.Ordinal)) continue;
            using (var stream = assembly.GetManifestResourceStream(resource))
            using (var reader = new StreamReader(stream))
                foreach (var pair in serializer.Deserialize<Dictionary<string, string[]>>(reader.ReadToEnd()))
                    queries.Add(pair.Key, string.Join("\n", pair.Value));
        }
        return queries;
    }
    private object Sales(string method, string[] parts, Dictionary<string,object> data, EmployeeProfile worker, Uri uri)
    {
        if (parts.Length == 3 && parts[2] == "catalog" && method == "GET")
            return ReadSalesCatalog(System.Web.HttpUtility.ParseQueryString(uri.Query), worker);
        if (parts[2] == "clients" && parts.Length > 3)
        {
            string client = Uri.UnescapeDataString(parts[3]);
            if (parts.Length == 4 && method == "GET") return ClientDetails(client);
            if (parts.Length == 5 && parts[4] == "payments" && method == "POST") return RepayClientDebt(client, data, worker);
            throw new ApiError(404, "Маршрут не найден.");
        }
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        using (var cmd = db.CreateCommand())
        {
            cmd.Transaction = tx;
            foreach (var pair in data)
                cmd.Parameters.AddWithValue("@" + pair.Key, pair.Key == "lines" ? json.Serialize(pair.Value) : pair.Value ?? DBNull.Value);
            Func<string,List<Dictionary<string,object>>> read = key => {
                cmd.CommandText = SaleSql[key];
                var rows = new List<Dictionary<string,object>>();
                using (var r = cmd.ExecuteReader()) while (r.Read()) {
                    var row = new Dictionary<string,object>();
                    for (int i=0;i<r.FieldCount;i++) row[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                    rows.Add(row);
                }
                return rows;
            };
            Action<string> run = key => { cmd.CommandText = SaleSql[key]; cmd.ExecuteNonQuery(); };
            string path = parts.Length > 2 ? parts[2] : "";
            if (method == "GET") {
                var scope = worker == null ? new EmployeeResources() : worker.resources;
                if (path == "clients") return read(path);
                if (path == "stock") return FilterResources(read(path), scope.warehouses, "warehouse");
                if (path == "history") return FilterResources(read(path), scope.warehouses, "warehouseId")
                    .FindAll(row => row["accountId"] == null || AllowsResource(scope.accounts, Text(row, "accountId")));
                if (path == "report") return FilterResources(FilterResources(read(path), scope.warehouses, "warehouse"), scope.accounts, "account");
                if (path == "warehouse-accounts") return FilterResources(read("warehouseAccounts"), scope.accounts, "id");
                if (path == "receipt" && (parts.Length == 4 || (parts.Length == 5 && parts[4] == "details")))
                {
                    cmd.Parameters.AddWithValue("@id", Uri.UnescapeDataString(parts[3]));
                    if (worker != null && !worker.Can("reports"))
                    {
                        cmd.Parameters.AddWithValue("@worker", worker.id);
                        cmd.Parameters.AddWithValue("@allowedWarehouses", ResourceSqlValue(worker.resources.warehouses));
                        cmd.Parameters.AddWithValue("@allowedAccounts", ResourceSqlValue(worker.resources.accounts));
                        if (read("ownReceipt").Count == 0) throw new ApiError(403, "Можно открыть только свой чек.");
                    }
                    var lines = read("detail");
                    if (parts.Length == 4) return lines;
                    var result = read("receiptHeader");
                    if (result.Count == 0) throw new ApiError(404, "Чек не найден.");
                    return new { receipt = result[0], lines };
                }
            }
            if (path == "movement" && method == "POST") {
                cmd.CommandText = SaleSql["move"];
                if (cmd.ExecuteNonQuery()!=1) throw new ApiError(409,"Проверьте количество и доступный остаток.");
            } else if (path == "clients" && (method=="POST" || method=="PATCH" || method=="DELETE"))
                run(method=="POST" ? "createClient" : method=="PATCH" ? "editClient" : "deleteClient");
            else if (path == "checkout" && method == "POST") {
                if (read("existing").Count == 0) {
                    run("stage"); run("lines");
                    if (Convert.ToInt32(read("valid")[0]["ok"]) != 1) throw new ApiError(409,"Проверьте количество и доступный остаток.");
                    if (worker != null)
                    {
                        cmd.Parameters["@seller"].Value = worker.name;
                        cmd.Parameters["@role"].Value = worker.role;
                        cmd.Parameters.AddWithValue("@worker", worker.id);
                        cmd.Parameters.AddWithValue("@allowedWarehouses", ResourceSqlValue(worker.resources.warehouses));
                        cmd.Parameters.AddWithValue("@allowedAccounts", ResourceSqlValue(worker.resources.accounts));
                        cmd.Parameters.AddWithValue("@settingsAllowed", worker.Can("sales.settings") ? 1 : 0);
                        cmd.Parameters.AddWithValue("@priceAllowed", worker.Can("sales.price") ? 1 : 0);
                        cmd.Parameters.AddWithValue("@debtAllowed", worker.Can("sales.debt") ? 1 : 0);
                        cmd.Parameters.AddWithValue("@discountAllowed", worker.Can("sales.discount") ? 1 : 0);
                        if (Convert.ToInt32(read("workerCheckout")[0]["ok"]) != 1)
                            throw new ApiError(403,"У вас нет прав на выбранные настройки, цену, скидку или продажу в долг.");
                    }
                    run("post");
                    if (worker != null) run("assignSaleWorker");
                    run("copy"); run("credit");
                }
            } else throw new ApiError(404,"Маршрут не найден.");
            tx.Commit();
            return new { id=data["id"] };
        }
    }
}
