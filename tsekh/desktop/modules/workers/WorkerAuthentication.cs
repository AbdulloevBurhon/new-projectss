using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

internal sealed partial class WorkshopApi
{
    private static string EmployeeHex(byte[] bytes) { return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant(); }

    private static byte[] EmployeeRandom(int size)
    {
        var bytes = new byte[size];
        using (var random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
        return bytes;
    }

    private static string EmployeePinHash(string pin, byte[] salt)
    {
        using (var key = new Rfc2898DeriveBytes(pin, salt, 600000, HashAlgorithmName.SHA256))
            return EmployeeHex(key.GetBytes(32));
    }

    private object LoginEmployee(SQLiteConnection db, Dictionary<string, object> body)
    {
        string id = Text(body, "id").Trim(), pin = Text(body, "pin");
        if (body.ContainsKey("id") && (id.Length == 0 || id.Length > 100)) throw new ApiError(400, "Выберите сотрудника.");
        if (!Regex.IsMatch(pin, @"^[0-9]{5}$")) throw new ApiError(401, "Неверный ПИН-код.");
        long now = StockReceiptTime();
        string key = id.Length == 0 ? "locked-screen" : id;
        Tuple<long, int> attempt;
        if (!employeeAttempts.TryGetValue(key, out attempt) || attempt.Item1 <= now) attempt = Tuple.Create(now + 60000, 0);
        if (attempt.Item2 >= 5) throw new ApiError(429, "Слишком много попыток. Повторите через минуту.");
        var rows = id.Length == 0 ? WorkerRows(db, "workerPinCandidates", "@except", "") : WorkerRows(db, "findWorker", "@id", id);
        if (rows.Count != 0 || id.Length == 0) employeeAttempts[key] = Tuple.Create(attempt.Item1, attempt.Item2 + 1);
        var matches = rows.Where(row => MatchesEmployeePin(row, pin)).ToList();
        if (matches.Count != 1) throw new ApiError(401, "ПИН-код не подошёл. Если коды сотрудников совпадают, попросите администратора сменить код.");
        var matched = matches[0];
        employeeAttempts.Remove(key);
        string token = EmployeeHex(EmployeeRandom(32));
        RunWorkerSql(db, null, "pruneWorkerSessions", "@now", now);
        RunWorkerSql(db, null, "openWorkerSession", "@id", Text(matched, "id"), "@hash", Text(matched, "pin_hash"),
            "@token", token, "@expires", now + 43200000);
        return new { token, profile = EmployeeFromRow(matched) };
    }

    private static bool MatchesEmployeePin(Dictionary<string, object> row, string pin)
    {
        string salt = Text(row, "salt");
        byte[] bytes = Enumerable.Range(0, 16).Select(i => Convert.ToByte(salt.Substring(i * 2, 2), 16)).ToArray();
        string actual = EmployeePinHash(pin, bytes), expected = Text(row, "pin_hash");
        int diff = 0;
        for (int i = 0; i < 64; i++) diff |= actual[i] ^ expected[i];
        return diff == 0;
    }
}
