using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SQLite;
using System.Linq;

internal sealed partial class WorkshopApi
{
    private static ApiError RevisionChanged()
    {
        return new ApiError(409, "Данные изменились. Обновите ревизию и проверьте подсчёт.");
    }

    private object StockRevision(string method, Uri uri, Dictionary<string, object> body, EmployeeProfile worker, string cookie)
    {
        bool unlocked = cookie.Split(';').Any(value => {
            string decoded = Uri.UnescapeDataString(value.Trim());
            return decoded == "tsekh_pin_access=1" || decoded == "tsekh_pin_access=\"1\"";
        });
        if (!unlocked) throw new ApiError(403, "Войдите в «Цех», чтобы открыть ревизию.");
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        string warehouse = method == "GET" ? query["warehouse"] : Text(body, "warehouse"), selected = query["id"];
        if (string.IsNullOrEmpty(warehouse) || warehouse.Length > 200) throw new ApiError(400, "Выберите склад.");
        if (worker != null)
        {
            if (!worker.Can("warehouses")) throw new ApiError(403, "У вас нет доступа к этому складу.");
            RequireResource(worker.resources.warehouses, warehouse);
        }
        if (method != "GET" && method != "POST") throw new ApiError(405, "Метод не поддерживается.");
        using (var db = Open())
        using (var tx = db.BeginTransaction(method == "GET" ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable))
        {
            using (var check = StockReceiptCommand(db, tx, "SELECT 1 FROM warehouses WHERE id=@warehouse", "@warehouse", warehouse))
                if (check.ExecuteScalar() == null) throw new ApiError(404, "Склад не найден.");
            var history = TransactionRows(db, tx, "revisionHeaders", "@warehouse", warehouse);
            if (method == "GET")
            {
                var header = string.IsNullOrEmpty(selected) ? history.Find(row => Text(row, "status") == "draft")
                    : history.Find(row => Text(row, "id") == selected);
                if (header == null && !string.IsNullOrEmpty(selected)) throw new ApiError(404, "Ревизия не найдена.");
                var rows = header == null ? new List<Dictionary<string, object>>() : TransactionRows(db, tx, "revisionRows",
                    "@warehouse", warehouse, "@id", Text(header, "id"), "@draft", Text(header, "status") == "draft" ? 1 : 0);
                return new { header, history, rows };
            }
            var result = WriteRevision(db, tx, warehouse, history, body, worker);
            tx.Commit();
            return result;
        }
    }

    private static object WriteRevision(SQLiteConnection db, SQLiteTransaction tx, string warehouse,
        List<Dictionary<string, object>> history, Dictionary<string, object> body, EmployeeProfile worker)
    {
        string action = Text(body, "action"), id = Text(body, "id");
        long now = StockReceiptTime();
        if (action == "start")
        {
            var existing = history.Find(row => Text(row, "status") == "draft");
            if (existing != null) return new { id = Text(existing, "id"), version = existing["version"] };
            id = Guid.NewGuid().ToString();
            if (RunWorkerSql(db, tx, "revisionStart", "@id", id, "@warehouse", warehouse, "@now", now) != 1) throw RevisionChanged();
            return new { id, version = 0 };
        }
        if (action != "count" && action != "post" && action != "cancel") throw new ApiError(400, "Неизвестное действие ревизии.");
        if (action != "count" && worker != null && !worker.Can("warehouses.edit"))
            throw new ApiError(403, "Для проведения или отмены нужно право редактировать склад.");
        var revision = history.Find(row => Text(row, "id") == id);
        if (revision == null) throw new ApiError(404, "Ревизия не найдена.");
        long version = Convert.ToInt64(revision["version"]);
        string currentStatus = Text(revision, "status"), status = action == "post" ? "posted" : "cancelled";
        if (action != "count" && currentStatus == status) return new { id, version };
        if (currentStatus != "draft" || version != RevisionNumber(body, "version")) throw RevisionChanged();
        if (action == "count") SaveRevisionLine(db, tx, warehouse, id, body);
        else
        {
            if (action == "post")
            {
                var validation = TransactionRows(db, tx, "revisionCounts", "@id", id).Single();
                if (Convert.ToInt64(validation["counted"]) == 0) throw new ApiError(400, "Сначала посчитайте хотя бы одну позицию.");
                if (Convert.ToInt64(validation["stale"]) != 0) throw new ApiError(409, "Остаток изменился. Пересчитайте отмеченные позиции.");
            }
            RunWorkerSql(db, tx, "revisionClose", "@id", id, "@status", status, "@now", now,
                "@actor", worker == null ? "Админ" : worker.name, "@employee", worker == null ? null : worker.id);
            if (action == "post") RunWorkerSql(db, tx, "revisionMovements", "@id", id, "@now", now);
        }
        return new { id, version = version + 1 };
    }

    private static void SaveRevisionLine(SQLiteConnection db, SQLiteTransaction tx, string warehouse, string id, Dictionary<string, object> body)
    {
        string lot = Text(body, "lot");
        object input;
        if (lot.Length == 0 || lot.Length > 2048 || !body.TryGetValue("actual", out input))
            throw new ApiError(400, "Проверьте фактическое количество.");
        if (input == null) RunWorkerSql(db, tx, "revisionClear", "@id", id, "@lot", lot);
        else
        {
            double actual = RevisionNumber(body, "actual"), book = RevisionNumber(body, "book");
            if (double.IsNaN(actual) || actual < 0 || actual > 1e9 || double.IsNaN(book) || double.IsInfinity(book))
                throw new ApiError(400, "Проверьте фактическое количество.");
            if (RunWorkerSql(db, tx, "revisionSave", "@id", id, "@lot", lot, "@warehouse", warehouse,
                "@actual", actual, "@book", book) != 1) throw RevisionChanged();
        }
        RunWorkerSql(db, tx, "revisionTouch", "@id", id);
    }

    private static double RevisionNumber(Dictionary<string, object> body, string key)
    {
        object value;
        return body.TryGetValue(key, out value) && (value is int || value is long || value is double || value is decimal)
            ? Convert.ToDouble(value) : double.NaN;
    }
}
