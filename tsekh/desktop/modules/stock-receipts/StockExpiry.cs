using System.Collections.Generic;

internal sealed partial class WorkshopApi
{
    private object ReadStockExpiry(EmployeeProfile worker)
    {
        using (var db = Open())
        {
            ProcessStockReceipts(db, StockReceiptTime());
            return FilterResources(WorkerRows(db, "expiryRows"), worker == null ? null : worker.resources.warehouses, "warehouse");
        }
    }

    private object UpdateStockExpiry(Dictionary<string, object> body, EmployeeProfile worker)
    {
        string receipt = Text(body, "receipt"), lot = Text(body, "lot");
        if (receipt.Length == 0 || lot.Length == 0 || !body.ContainsKey("expiresOn") || !body.ContainsKey("previous"))
            throw new ApiError(400, "Проверьте данные партии.");
        var expiresOn = StockExpiryDate(body["expiresOn"]);
        var previous = StockExpiryDate(body["previous"]);
        using (var db = Open())
        {
            ProcessStockReceipts(db, StockReceiptTime());
            using (var tx = db.BeginTransaction())
            {
                var affected = TransactionRows(db, tx, "expiryEditWarehouses", "@receipt", receipt, "@lot", lot);
                if (affected.Count == 0) throw new ApiError(409, "Партия больше не доступна. Обновите список.");
                if (worker != null && affected.Exists(row => !AllowsResource(worker.resources.warehouses, Text(row, "warehouse"))))
                    throw new ApiError(403, "Для изменения даты нужен доступ ко всем складам этой партии.");
                if (RunWorkerSql(db, tx, "expiryUpdate", "@receipt", receipt, "@expiresOn", expiresOn, "@previous", previous) != 1)
                    throw new ApiError(409, "Срок уже изменился. Обновите список.");
                tx.Commit();
            }
        }
        return new { expiresOn };
    }
}
