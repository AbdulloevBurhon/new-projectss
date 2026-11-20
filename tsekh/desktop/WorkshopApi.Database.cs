using System;
using System.Data.SQLite;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;

internal sealed partial class WorkshopApi
{
    private readonly string databasePath;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool SetDllDirectory(string path);

    internal static void PrepareSqlite(string root, Assembly assembly)
    {
        string nativeDirectory = Path.Combine(root, "x64");
        Directory.CreateDirectory(nativeDirectory);
        string nativePath = Path.Combine(nativeDirectory, "SQLite.Interop.dll");
        if (!File.Exists(nativePath))
        {
            string pending = nativePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
            using (Stream source = assembly.GetManifestResourceStream("SQLite.Interop.dll"))
            using (var output = File.Create(pending)) source.CopyTo(output);
            try { File.Move(pending, nativePath); }
            catch (IOException) { if (!File.Exists(nativePath)) throw; }
            finally { if (File.Exists(pending)) File.Delete(pending); }
        }
        if (!SetDllDirectory(nativeDirectory)) throw new InvalidOperationException("Не удалось загрузить SQLite.");
    }

    internal WorkshopApi(string root)
    {
        string dataDirectory = Path.Combine(root, "data");
        Directory.CreateDirectory(dataDirectory);
        databasePath = Path.Combine(dataDirectory, "tsekh.sqlite");
        using (SQLiteConnection connection = Open())
        using (SQLiteCommand command = connection.CreateCommand())
        {
            command.CommandText = @"
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, amount REAL NOT NULL DEFAULT 0 CHECK(amount >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS warehouses (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT CHECK(type IS NULL OR type IN ('finished-goods','materials')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('шт','уп','г','кг','м','м²','м³','л','т')), content_unit TEXT CHECK(content_unit IS NULL OR content_unit IN ('шт','уп','г','кг','м','м²','м³','л','т')), quantity_per_piece REAL CHECK(quantity_per_piece IS NULL OR quantity_per_piece > 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, date TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, date TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS transfers (id TEXT PRIMARY KEY, source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, target_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, date TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK(source_account_id <> target_account_id));";
            command.ExecuteNonQuery();
            InitializeProductBarcode(connection);
            InitializeStockReceipts(connection);
            using (var migration=connection.BeginTransaction())
            using (var schema=new SQLiteCommand(SaleSql["schema"],connection,migration))
            {
                schema.ExecuteNonQuery();
                migration.Commit();
            }
        }
    }

    private SQLiteConnection Open()
    {
        var connection = new SQLiteConnection("Data Source=" + databasePath + ";Version=3;Foreign Keys=True;Journal Mode=WAL;Pooling=False;");
        connection.Open();
        return connection;
    }
}
