using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

internal static partial class WorkshopUpdates
{
    internal static async Task Install(Dictionary<string, object> message, string root)
    {
        string id = message["updateId"] as string;
        string hash = message["sha256"] as string;
        string release = message["version"] as string;
        Version expected;
        if (!Regex.IsMatch(id ?? "", @"\A[a-zA-Z0-9_-]{1,80}\z")
            || !Regex.IsMatch(hash ?? "", @"\A[a-fA-F0-9]{64}\z")
            || !Regex.IsMatch(release ?? "", @"\A\d+\.\d+\.\d+\z")
            || !Version.TryParse(release + ".0", out expected)
            || expected <= Assembly.GetExecutingAssembly().GetName().Version)
            throw new InvalidOperationException("Некорректная версия обновления.");

        string target = Assembly.GetExecutingAssembly().Location;
        string staged = Path.Combine(Path.GetDirectoryName(target), ".tsekh-update-" + Guid.NewGuid().ToString("N") + ".exe");
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(DesktopConfig.ApiBase + "/api/client/updates/" + id + "/download");
            request.AllowAutoRedirect = false;
            request.Headers["X-Installation-Id"] = message["installationId"] as string;
            request.Headers["X-Client-Pin"] = message["pin"] as string;
            using (var response = (HttpWebResponse)await request.GetResponseAsync())
            using (var input = response.GetResponseStream())
            using (var output = new FileStream(staged, FileMode.CreateNew))
            {
                byte[] buffer = new byte[81920];
                int read;
                while ((read = await input.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    if (output.Length + read > 40L * 1024 * 1024) throw new IOException("Файл обновления слишком большой.");
                    await output.WriteAsync(buffer, 0, read);
                }
            }
            using (var stream = File.OpenRead(staged))
            using (var sha = SHA256.Create())
            {
                string actual = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "");
                if (!string.Equals(actual, hash, StringComparison.OrdinalIgnoreCase)
                    || AssemblyName.GetAssemblyName(staged).Version != expected)
                    throw new InvalidOperationException("Не удалось проверить файл обновления.");
            }

            // Keep the previous executable until Windows has started the replacement.
            string receipt = Path.Combine(root, "pending-update.txt");
            File.WriteAllText(receipt, id + "\n" + release);
            Process.Start(new ProcessStartInfo(staged, "--apply-update " + Process.GetCurrentProcess().Id
                + " \"" + target + "\"") { UseShellExecute = false });
        }
        catch
        {
            File.Delete(staged);
            throw;
        }
    }
}
