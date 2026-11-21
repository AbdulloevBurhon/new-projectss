using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Globalization;

internal sealed partial class WorkshopApi
{
    private object ClientDetails(string client)
    {
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            var totals = ReadArchiveReport(db, tx, SaleSql["clientTotals"], "@client", client);
            if (totals.Count == 0) throw new ApiError(404, "Клиент не найден.");
            var rows = ReadArchiveReport(db, tx, SaleSql["clientHistory"], "@client", client);
            tx.Commit();
            return new { totals = totals[0], rows };
        }
    }

    private object RepayClientDebt(string client, Dictionary<string, object> body, EmployeeProfile worker)
    {
        object paymentId, paymentAccount, paymentAmount;
        body.TryGetValue("id", out paymentId);
        body.TryGetValue("account", out paymentAccount);
        body.TryGetValue("amount", out paymentAmount);
        string id = paymentId as string, account = paymentAccount as string;
        if (string.IsNullOrEmpty(id) || id.Length > 100 || string.IsNullOrEmpty(account)
            || !(paymentAmount is int || paymentAmount is long))
            throw new ApiError(400, "Проверьте счёт и сумму оплаты.");
        long amount = Convert.ToInt64(paymentAmount);
        if (amount <= 0 || amount > 9007199254740991L)
            throw new ApiError(400, "Проверьте счёт и сумму оплаты.");

        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            var existing = ReadArchiveReport(db, tx, SaleSql["existingClientPayment"], "@id", id);
            if (existing.Count != 0)
            {
                var row = existing[0];
                if (Convert.ToString(row["client"]) == client && Convert.ToString(row["account"]) == account
                    && Convert.ToInt64(row["amount"]) == amount) return new { id };
                throw new ApiError(409, "Этот платёж уже сохранён. Откройте форму заново и проверьте долг.");
            }

            string date = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
            using (var post = StockReceiptCommand(db, tx, SaleSql["postClientPayment"], "@id", id, "@client", client,
                "@account", account, "@amount", amount, "@date", date, "@employee", worker == null ? "Админ" : worker.name))
                if (post.ExecuteNonQuery() != 1)
                    throw new ApiError(409, "Проверьте текущий долг клиента и выбранный счёт.");
            using (var credit = StockReceiptCommand(db, tx, SaleSql["creditClientPayment"], "@account", account, "@amount", amount))
                credit.ExecuteNonQuery();
            tx.Commit();
            return new { id };
        }
    }
}
