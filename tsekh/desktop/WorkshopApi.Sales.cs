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
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("sales.json"))
        using (var reader = new StreamReader(stream))
            return new JavaScriptSerializer().Deserialize<Dictionary<string,string>>(reader.ReadToEnd());
    }
    private object Sales(string method, string[] parts, Dictionary<string,object> data)
    {
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
                if (path == "catalog") return new { products=read("catalog"), accounts=read("accounts"), warehouses=read("warehouses") };
                if (path == "history" || path == "stock" || path == "report" || path == "clients") return read(path);
                if (path == "receipt" && parts.Length==4) { cmd.Parameters.AddWithValue("@id",parts[3]); return read("detail"); }
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
                    run("post"); run("copy"); run("credit");
                }
            } else throw new ApiError(404,"Маршрут не найден.");
            tx.Commit();
            return new { id=data["id"] };
        }
    }
}
