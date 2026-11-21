using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;
using System.Text.RegularExpressions;

internal sealed partial class WorkshopApi
{
    private void WriteOwnerPinGuard(SQLiteConnection db, SQLiteTransaction tx, string kind, string salt, string hash, string reservation, long expires)
    {
        RunWorkerSql(db, tx, "writeOwnerPinGuard", "@kind", kind, "@salt", salt, "@hash", hash, "@reservation", reservation, "@expires", expires);
    }

    private object OwnerPinRequest(SQLiteConnection db, Dictionary<string, object> body, bool employee)
    {
        if (employee) throw new ApiError(403, "ПИН-код администратора меняет администратор.");
        string action = Text(body, "action"), pin = Text(body, "pin"), reservation = Text(body, "reservation");
        using (var tx = db.BeginTransaction())
        {
            var rows = ReadArchiveReport(db, tx, SaleSql["ownerPinGuards"]);
            var pending = rows.FirstOrDefault(row => Text(row, "kind") == "pending");
            long now = StockReceiptTime();
            if (action == "commit" || action == "cancel")
            {
                if (reservation.Length == 0 || pending == null || Text(pending, "reservation") != reservation)
                    throw new ApiError(409, "Состояние ПИН изменилось. Войдите снова с действующим кодом.");
                if (action == "commit") WriteOwnerPinGuard(db, tx, "current", Text(pending, "salt"), Text(pending, "pin_hash"), "", 0);
                RunWorkerSql(db, tx, "clearOwnerPinGuard", "@reservation", reservation);
                tx.Commit();
                return new { ok = true };
            }
            if ((action != "sync" && action != "initialize" && action != "reserve") || !Regex.IsMatch(pin, @"^[0-9]{5}$"))
                throw new ApiError(400, "ПИН-код должен содержать пять цифр.");
            if (action == "sync" || action == "initialize")
            {
                var current = rows.FirstOrDefault(row => Text(row, "kind") == "current");
                if (action == "initialize" && (current != null || pending != null)) return new { ok = true };
                if (current == null || !MatchesEmployeePin(current, pin))
                {
                    byte[] salt = EmployeeRandom(16);
                    WriteOwnerPinGuard(db, tx, "current", EmployeeHex(salt), EmployeePinHash(pin, salt), "", 0);
                }
                if (pending != null && (Convert.ToInt64(pending["expires"]) <= now || MatchesEmployeePin(pending, pin)))
                    RunWorkerSql(db, tx, "clearOwnerPinGuard", "@reservation", Text(pending, "reservation"));
                tx.Commit();
                return new { ok = true };
            }

            if (pending != null) throw new ApiError(409, "Предыдущая смена ПИН ещё не подтверждена. Войдите заново с действующим кодом.");
            if (ReadArchiveReport(db, tx, SaleSql["workerPinCandidates"], "@except", "").Any(row => MatchesEmployeePin(row, pin)))
                throw new ApiError(409, "Этот ПИН-код уже используется сотрудником.");
            byte[] nextSalt = EmployeeRandom(16);
            string next = Guid.NewGuid().ToString("D");
            WriteOwnerPinGuard(db, tx, "pending", EmployeeHex(nextSalt), EmployeePinHash(pin, nextSalt), next, now + 60000);
            tx.Commit();
            return new { reservation = next };
        }
    }
}
