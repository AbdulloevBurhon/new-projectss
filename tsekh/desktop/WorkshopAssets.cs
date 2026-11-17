using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using Microsoft.Web.WebView2.Core;

internal sealed class WorkshopAssets
{
    internal const string Origin = "https://tsekh4.invalid";
    private const string Policy = "default-src 'self'; connect-src 'self' " + DesktopConfig.ApiBase + "; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-src 'none'; form-action 'self'";
    private readonly Dictionary<string, byte[]> files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
    private readonly CoreWebView2Environment environment;

    internal WorkshopAssets(CoreWebView2Environment environment)
    {
        this.environment = environment;
        using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("renderer.zip"))
        using (var zip = new ZipArchive(source, ZipArchiveMode.Read))
        {
            foreach (var entry in zip.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue;
                using (var input = entry.Open())
                using (var output = new MemoryStream())
                {
                    input.CopyTo(output);
                    files.Add(entry.FullName.Replace('\\', '/'), output.ToArray());
                }
            }
        }
    }

    internal static bool IsAppUrl(string value)
    {
        Uri uri;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == "https" && uri.Host == "tsekh4.invalid"
            && uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo);
    }

    internal void Serve(object sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        if (!IsAppUrl(args.Request.Uri)) return;
        string path = Uri.UnescapeDataString(new Uri(args.Request.Uri).AbsolutePath).Trim('/');
        if (string.IsNullOrEmpty(path)) path = "index.html";
        else if (Path.GetExtension(path) == "") path += "/index.html";
        byte[] data;
        if (!files.TryGetValue(path, out data))
        {
            if (args.ResourceContext != CoreWebView2WebResourceContext.Document || !files.TryGetValue("index.html", out data))
            {
                args.Response = environment.CreateWebResourceResponse(null, 404, "Not Found", "");
                return;
            }
            path = "index.html";
        }

        string headers = "Content-Type: " + ContentType(path) + "\r\nX-Content-Type-Options: nosniff";
        if (Path.GetExtension(path) == ".html") headers += "\r\nContent-Security-Policy: " + Policy;
        args.Response = environment.CreateWebResourceResponse(new MemoryStream(data, false), 200, "OK", headers);
    }

    private static string ContentType(string path)
    {
        switch (Path.GetExtension(path))
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".svg": return "image/svg+xml";
            default: return "application/octet-stream";
        }
    }
}
