using System;
using System.Collections.Generic;
using System.Collections.Specialized;

internal sealed partial class WorkshopApi
{
    private object ReadSalesCatalog(NameValueCollection query, EmployeeProfile worker)
    {
        const int pageSize = 15;
        string view = query["view"] ?? "", warehouse = query["warehouse"];
        var scope = worker == null ? new EmployeeResources() : worker.resources;
        using (var db = Open())
        {
            if (view == "" || view == "setup") return new {
                products = view == "" ? FilterResources(WorkerRows(db, "catalog"), scope.warehouses, "warehouse") : new List<Dictionary<string, object>>(),
                warehouses = FilterResources(WorkerRows(db, "warehouses"), scope.warehouses, "id"),
                accounts = FilterResources(WorkerRows(db, "accounts"), scope.accounts, "id")
            };
            if (string.IsNullOrEmpty(warehouse) || !AllowsResource(scope.warehouses, warehouse))
                throw new ApiError(403, "Нет доступа к выбранному складу.");
            if (view == "barcode")
            {
                string code = (query["code"] ?? "").Trim();
                if (code.Length == 0 || code.Length > BarcodeMaxLength) throw new ApiError(400, "Проверьте штрихкод.");
                return WorkerRows(db, "catalogBarcode", "@warehouse", warehouse, "@code", code);
            }
            if (view != "page") throw new ApiError(400, "Неизвестный режим каталога.");
            string search = (query["search"] ?? "").Trim();
            var rows = WorkerRows(db, "catalogPage", "@warehouse", warehouse,
                "@afterId", query["afterId"] ?? "", "@afterName", query["afterName"] ?? "",
                "@limit", search.Length == 0 ? pageSize + 1 : -1);
            if (search.Length != 0) rows = rows.FindAll(row => Text(row, "name").IndexOf(search, StringComparison.OrdinalIgnoreCase) >= 0);
            bool more = rows.Count > pageSize;
            if (more) rows.RemoveRange(pageSize, rows.Count - pageSize);
            return new { rows, more };
        }
    }
}
