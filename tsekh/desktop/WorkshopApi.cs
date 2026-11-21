using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Microsoft.Web.WebView2.Core;

internal sealed partial class WorkshopApi
{
    private readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

    internal static bool IsRequest(string value)
    {
        if (!WorkshopAssets.IsAppUrl(value)) return false;
        return new Uri(value).AbsolutePath.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
    }

    internal async void Serve(object sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        var core = (CoreWebView2)sender;
        int status = 200;
        string phrase = "OK";
        object result;
        var uri = new Uri(args.Request.Uri);
        bool printer = uri.AbsolutePath == "/api/receipt-printer"
            || uri.AbsolutePath.StartsWith("/api/receipt-printer/", StringComparison.Ordinal);
        var deferral = printer || uri.AbsolutePath == "/api/telegram-scheduled/run" ? args.GetDeferral() : null;
        try
        {
            Dictionary<string, object> body = ReadBody(args.Request.Content);
            string cookie = args.Request.Headers.Contains("Cookie") ? args.Request.Headers.GetHeader("Cookie") : "";
            string method = args.Request.Method, token = EmployeeToken(cookie);
            if (printer) result = await Task.Run(() => PrinterRequest(uri, method, body, token));
            else if (deferral != null && method == "POST")
            {
                FindEmployee(token);
                result = await Task.Run(() => RunTelegramSchedule(body));
            }
            else result = Dispatch(method, uri, body, token, cookie);
        }
        catch (ApiError error) { status = error.Status; phrase = error.Status == 401 ? "Unauthorized" : error.Status == 403 ? "Forbidden" : error.Status == 404 ? "Not Found"
            : error.Status == 409 ? "Conflict" : error.Status == 429 ? "Too Many Requests" : "Bad Request"; result = new { statusCode = status, statusMessage = error.Message }; }
        catch (Exception error)
        {
            bool pending = error is System.Data.SQLite.SQLiteException && error.Message.Contains("STOCK_RECEIPT_PENDING");
            status = pending ? 409 : 500;
            phrase = pending ? "Conflict" : "Internal Server Error";
            result = new { statusCode = status, statusMessage = pending
                ? "Удаление недоступно, пока ожидается поступление." : "Не удалось выполнить операцию с данными." };
        }
        try
        {
            byte[] data = Encoding.UTF8.GetBytes(json.Serialize(result));
            args.Response = core.Environment.CreateWebResourceResponse(new MemoryStream(data, false), status, phrase, "Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
        }
        finally { if (deferral != null) deferral.Complete(); }
    }

    private object Dispatch(string method, Uri uri, Dictionary<string, object> body, string token, string cookie)
    {
        string[] parts = uri.AbsolutePath.Trim('/').Split('/');
        if (parts.Length >= 2 && parts[1] == "workers") return Workers(method, uri, parts, body, token);
        var worker = FindEmployee(token);
        if (parts.Length == 2 && parts[1] == "stock-revision") return StockRevision(method, uri, body, worker, cookie);
        if (parts.Length == 3 && parts[1] == "telegram-scheduled" && method == "POST")
        {
            if (parts[2] == "run") return RunTelegramSchedule(body);
            if (parts[2] == "config" && worker == null) return SaveTelegramSchedule(body);
        }
        if (worker != null)
        {
            RestrictEmployeeRequest(worker, method, parts);
            RestrictEmployeeResources(worker, method, parts, body);
        }
        if (parts.Length >= 3 && parts[1] == "sales") return Sales(method, parts, body, worker, uri);
        if (parts.Length == 2 && parts[1] == "stock-expiry" && method == "GET") return ReadStockExpiry(worker);
        if (parts.Length == 2 && parts[1] == "stock-expiry" && method == "PATCH") return UpdateStockExpiry(body, worker);
        if (parts.Length == 2 && parts[1] == "summary" && method == "GET")
            return ReadSummary(System.Web.HttpUtility.ParseQueryString(uri.Query)["boundaries"], worker);
        if (parts.Length == 2 && parts[0] == "api" && parts[1] == "data-archive") return DataArchive(method, body, System.Web.HttpUtility.ParseQueryString(uri.Query));
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "stock-receipts") return ScopedList(StockReceipts(method, parts, body), worker, method, parts);
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "products") return Products(method, parts, body);
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "warehouses") return ScopedList(Warehouses(method, parts, body), worker, method, parts);
        if (parts.Length < 2 || parts[0] != "api" || parts[1] != "accounts") throw new ApiError(404, "Маршрут не найден.");
        if (parts.Length == 2 || (parts.Length == 3 && parts[2] == "migrate")) return ScopedList(Accounts(method, parts, body), worker, method, parts);
        if (parts.Length < 3) throw new ApiError(404, "Маршрут не найден.");
        if (parts[2] == "receipts") return ScopedList(Receipts(method, parts, uri, body), worker, method, parts);
        if (parts[2] == "expenses") return ScopedList(Expenses(method, parts, uri, body), worker, method, parts);
        if (parts[2] == "transfers") return ScopedList(Transfers(method, parts, uri, body), worker, method, parts);
        if (parts.Length == 3 && method == "GET") return AccountDetails(Uri.UnescapeDataString(parts[2]));
        throw new ApiError(404, "Маршрут не найден.");
    }

    private Dictionary<string, object> ReadBody(Stream content)
    {
        if (content != null)
        {
            using (var reader = new StreamReader(content, Encoding.UTF8))
            {
                string raw = reader.ReadToEnd();
                if (!string.IsNullOrWhiteSpace(raw))
                    return json.Deserialize<Dictionary<string, object>>(raw) ?? new Dictionary<string, object>();
            }
        }
        return new Dictionary<string, object>();
    }

    private sealed class ApiError : Exception
    {
        internal readonly int Status;
        internal ApiError(int status, string message) : base(message) { Status = status; }
    }
}
