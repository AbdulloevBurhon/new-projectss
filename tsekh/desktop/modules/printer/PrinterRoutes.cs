using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing.Printing;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Threading;
using System.Web.Script.Serialization;

internal sealed partial class WorkshopApi
{
    private readonly object printerConfigLock = new object();
    private readonly object printJobLock = new object();
    private string PrinterConfigFile { get { return Path.Combine(Path.GetDirectoryName(databasePath), "receipt-printer.json"); } }

    private ReceiptPrinterConfig LoadPrinterConfig()
    {
        lock (printerConfigLock)
        {
            if (!File.Exists(PrinterConfigFile)) return new ReceiptPrinterConfig();
            var settings = new JavaScriptSerializer().Deserialize<ReceiptPrinterConfig>(File.ReadAllText(PrinterConfigFile));
            if (settings == null || !settings.IsValid()) throw new IOException("Invalid printer settings.");
            return settings;
        }
    }

    private void SavePrinterConfig(ReceiptPrinterConfig settings)
    {
        lock (printerConfigLock)
        {
            var temporary = PrinterConfigFile + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                File.WriteAllText(temporary, new JavaScriptSerializer().Serialize(settings));
                if (File.Exists(PrinterConfigFile)) File.Replace(temporary, PrinterConfigFile, null);
                else File.Move(temporary, PrinterConfigFile);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }

    private static ReceiptPrinterConfig ParsePrinterConfig(Dictionary<string, object> body)
    {
        ReceiptPrinterConfig settings = null;
        try { settings = new JavaScriptSerializer().ConvertToType<ReceiptPrinterConfig>(body); }
        catch (ArgumentException) { }
        catch (InvalidOperationException) { }
        if (settings == null || !settings.IsValid())
            throw new ApiError(400, "Проверьте ширину бумаги, IP-адрес и порт принтера.");
        settings.storeName = settings.storeName.Trim();
        settings.printerName = settings.printerName.Trim();
        return settings;
    }

    private object PrinterRequest(Uri uri, string method, Dictionary<string, object> body, string token)
    {
        var path = uri.AbsolutePath.TrimEnd('/');
        const string route = "/api/receipt-printer";
        var worker = FindEmployee(token);
        try
        {
            if (path == route + "/print" && method == "POST")
            {
                var settings = LoadPrinterConfig();
                var ticket = ReadPrinterSale(settings, Text(body, "id"), worker);
                return SendPrinterJob(settings, ticket);
            }
            if (worker != null) throw new ApiError(403, "Настройки принтера доступны администратору.");
            if (path == route && method == "GET")
                return new { settings = LoadPrinterConfig(), printers = PrinterSettings.InstalledPrinters.Cast<string>().OrderBy(name => name).ToArray() };
            if (path == route && method == "PUT")
            {
                var settings = ParsePrinterConfig(body);
                SavePrinterConfig(settings);
                return settings;
            }
            if (path == route + "/test" && method == "POST")
            {
                var settings = ParsePrinterConfig(body);
                return SendPrinterJob(settings, ReceiptTicket.Test(settings));
            }
            throw new ApiError(404, "Маршрут принтера не найден.");
        }
        catch (InvalidPrinterException) { throw new ApiError(409, "Принтер Windows недоступен. Проверьте выбранный принтер и драйвер."); }
        catch (SocketException) { throw new ApiError(502, "Не удалось подключиться к LAN-принтеру или отправить чек. Проверьте IP-адрес, порт и принтер."); }
        catch (Win32Exception) { throw new ApiError(502, "Windows не приняла задание. Проверьте драйвер и очередь печати."); }
        catch (IOException) { throw new ApiError(502, "Не удалось завершить операцию. Проверьте принтер перед повторной печатью."); }
    }

    private object SendPrinterJob(ReceiptPrinterConfig settings, ReceiptTicket ticket)
    {
        if (settings.connection == "windows" && string.IsNullOrWhiteSpace(settings.queue))
            throw new ApiError(400, "Выберите принтер в разделе «Настройки → Принтер».");
        if (!Monitor.TryEnter(printJobLock)) throw new ApiError(409, "Дождитесь отправки предыдущего чека.");
        try { ReceiptOutput.Send(settings, ticket); return new { submitted = true }; }
        finally { Monitor.Exit(printJobLock); }
    }

    private ReceiptTicket ReadPrinterSale(ReceiptPrinterConfig settings, string id, EmployeeProfile worker)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 100) throw new ApiError(400, "Не указан чек.");
        if (worker != null)
        {
            string[] parts = { "api", "sales", "receipt", Uri.EscapeDataString(id), "details" };
            RestrictEmployeeRequest(worker, "GET", parts);
            RestrictEmployeeResources(worker, "GET", parts, new Dictionary<string, object>());
        }
        using (var db = Open())
        using (var tx = db.BeginTransaction())
        {
            if (worker != null && !worker.Can("reports") && ReadArchiveReport(db, tx, SaleSql["ownReceipt"],
                "@id", id, "@worker", worker.id, "@allowedWarehouses", ResourceSqlValue(worker.resources.warehouses),
                "@allowedAccounts", ResourceSqlValue(worker.resources.accounts)).Count == 0)
                throw new ApiError(403, "Можно печатать только свой чек.");
            var header = ReadArchiveReport(db, tx, SaleSql["receiptHeader"], "@id", id).FirstOrDefault();
            if (header == null) throw new ApiError(404, "Чек не найден.");
            return ReceiptTicket.Sale(settings, header, ReadArchiveReport(db, tx, SaleSql["detail"], "@id", id));
        }
    }
}
