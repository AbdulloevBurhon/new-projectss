using System.Collections.Generic;
using System.Data.SQLite;

internal sealed partial class WorkshopApi
{
    private object AccountDetails(string id)
    {
        using (var connection = Open())
        using (var transaction = connection.BeginTransaction())
        {
            object account;
            using (var command = new SQLiteCommand("SELECT id, name, amount FROM accounts WHERE id = @id", connection, transaction))
            {
                command.Parameters.AddWithValue("@id", id);
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) throw new ApiError(404, "Счёт не найден.");
                    account = new { id = reader.GetString(0), name = reader.GetString(1), amount = reader.GetDouble(2) };
                }
            }

            var outflows = new List<object>();
            using (var command = new SQLiteCommand(@"
SELECT id, kind, date, description, amount, unit, quantity, unitPrice, contentUnit, contentQuantity
FROM (
    SELECT 'purchase:' || id AS id, 'purchase' AS kind,
      strftime('%Y-%m-%dT%H:%M:%fZ', posted_at / 1000.0, 'unixepoch') AS date,
      product_name AS description, -total AS amount, unit, quantity, unit_price AS unitPrice,
      content_unit AS contentUnit, quantity * quantity_per_piece AS contentQuantity,
      strftime('%Y-%m-%dT%H:%M:%fZ', posted_at / 1000.0, 'unixepoch') AS sortDate
    FROM stock_receipts
    WHERE account_id = @id AND status = 'posted' AND total > 0
    UNION ALL
    SELECT 'expense:' || id, 'expense', date, COALESCE(NULLIF(TRIM(note), ''), 'Списание'),
      -amount, NULL, NULL, NULL, NULL, NULL, date || 'T' || substr(created_at, 12)
    FROM expenses WHERE account_id = @id
    UNION ALL
    SELECT 'transfer:' || t.id, 'transfer', t.date,
      a.name || CASE WHEN TRIM(t.note) = '' THEN '' ELSE ' · ' || t.note END,
      -t.amount, NULL, NULL, NULL, NULL, NULL, t.date || 'T' || substr(t.created_at, 12)
    FROM transfers t JOIN accounts a ON a.id = t.target_account_id
    WHERE t.source_account_id = @id
)
ORDER BY sortDate DESC, id DESC", connection, transaction))
            {
                command.Parameters.AddWithValue("@id", id);
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        outflows.Add(new {
                            id = reader.GetString(0), kind = reader.GetString(1), date = reader.GetString(2),
                            description = reader.GetString(3), amount = reader.GetDouble(4),
                            unit = reader.IsDBNull(5) ? null : reader.GetString(5),
                            quantity = reader.IsDBNull(6) ? (double?)null : reader.GetDouble(6),
                            unitPrice = reader.IsDBNull(7) ? (double?)null : reader.GetDouble(7),
                            contentUnit = reader.IsDBNull(8) ? null : reader.GetString(8),
                            contentQuantity = reader.IsDBNull(9) ? (double?)null : reader.GetDouble(9)
                        });
            }
            transaction.Commit();
            return new { account, outflows };
        }
    }
}
