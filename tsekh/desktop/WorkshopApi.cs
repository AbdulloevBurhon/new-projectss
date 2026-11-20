using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
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

    internal void Serve(object sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        var core = (CoreWebView2)sender;
        int status = 200;
        string phrase = "OK";
        object result;
        try
        {
            Dictionary<string, object> body = ReadBody(args.Request.Content);
            result = Dispatch(args.Request.Method, new Uri(args.Request.Uri), body);
        }
        catch (ApiError error) { status = error.Status; phrase = error.Status == 404 ? "Not Found" : error.Status == 409 ? "Conflict" : "Bad Request"; result = new { statusCode = status, statusMessage = error.Message }; }
        catch (Exception error)
        {
            bool pending = error is System.Data.SQLite.SQLiteException && error.Message.Contains("STOCK_RECEIPT_PENDING");
            status = pending ? 409 : 500;
            phrase = pending ? "Conflict" : "Internal Server Error";
            result = new { statusCode = status, statusMessage = pending
                ? "Удаление недоступно, пока ожидается поступление." : "Не удалось выполнить операцию с данными." };
        }
        byte[] data = Encoding.UTF8.GetBytes(json.Serialize(result));
        args.Response = core.Environment.CreateWebResourceResponse(new MemoryStream(data, false), status, phrase, "Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
    }

    private object Dispatch(string method, Uri uri, Dictionary<string, object> body)
    {
        string[] parts = uri.AbsolutePath.Trim('/').Split('/');
        if (parts.Length == 2 && parts[0] == "api" && parts[1] == "data-archive") return DataArchive(method, body);
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "stock-receipts") return StockReceipts(method, parts, body);
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "products") return Products(method, parts, body);
        if (parts.Length >= 2 && parts[0] == "api" && parts[1] == "warehouses") return Warehouses(method, parts, body);
        if (parts.Length < 2 || parts[0] != "api" || parts[1] != "accounts") throw new ApiError(404, "Маршрут не найден.");
        if (parts.Length == 2 || (parts.Length == 3 && parts[2] == "migrate")) return Accounts(method, parts, body);
        if (parts.Length < 3) throw new ApiError(404, "Маршрут не найден.");
        if (parts[2] == "receipts") return Receipts(method, parts, uri, body);
        if (parts[2] == "expenses") return Expenses(method, parts, uri, body);
        if (parts[2] == "transfers") return Transfers(method, parts, uri, body);
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
