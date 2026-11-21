using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;

internal sealed partial class WorkshopApi
{
    private Dictionary<string, object> SendTelegramBackground(string token, string data)
    {
        var request = (HttpWebRequest)WebRequest.Create(DesktopConfig.ApiBase.TrimEnd('/') + "/api/client/telegram/outbox");
        request.AllowAutoRedirect = false;
        request.Headers["Authorization"] = "Bearer " + token;
        request.Method = data == null ? "GET" : "POST";
        request.Timeout = data == null ? 8000 : 205000;
        request.ReadWriteTimeout = request.Timeout;
        try
        {
            if (data != null)
            {
                var bytes = Encoding.UTF8.GetBytes(data);
                request.ContentType = "application/json";
                request.ContentLength = bytes.Length;
                using (var output = request.GetRequestStream()) output.Write(bytes, 0, bytes.Length);
            }
            using (var response = (HttpWebResponse)request.GetResponse())
            {
                if ((int)response.StatusCode != 200) throw new ApiError(502, "Не удалось проверить или отправить расписание.");
                using (var reader = new StreamReader(response.GetResponseStream()))
                    return TelegramJson().Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
            }
        }
        catch (WebException error)
        {
            using (var response = error.Response as HttpWebResponse)
            {
                if (response == null) throw new ApiError(502, "Telegram недоступен. Повторим отправку позже.");
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    var result = TelegramJson().Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
                    throw new ApiError((int)response.StatusCode, Text(result, "error"));
                }
            }
        }
    }
}
