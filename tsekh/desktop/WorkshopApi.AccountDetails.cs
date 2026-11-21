internal sealed partial class WorkshopApi
{
    private object AccountDetails(string id)
    {
        using (var connection = Open())
        using (var transaction = connection.BeginTransaction())
        {
            var accounts = ReadArchiveReport(connection, transaction, "SELECT id, name, amount FROM accounts WHERE id = @id", "@id", id);
            if (accounts.Count == 0) throw new ApiError(404, "Счёт не найден.");

            var outflows = ReadArchiveReport(connection, transaction, SaleSql["accountHistory"], "@id", id);
            transaction.Commit();
            return new { account = accounts[0], outflows };
        }
    }
}
