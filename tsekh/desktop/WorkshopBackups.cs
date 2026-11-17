using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

internal sealed class WorkshopBackups
{
    private readonly Form owner;
    private readonly string root;
    private readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

    internal WorkshopBackups(Form owner, string root)
    {
        this.owner = owner;
        this.root = root;
    }

    internal async void Receive(object sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        if (!WorkshopAssets.IsAppUrl(args.Source)) return;
        var core = (CoreWebView2)sender;
        object id = null;
        try
        {
            var message = json.DeserializeObject(args.WebMessageAsJson) as Dictionary<string, object>;
            object action;
            if (message == null || !message.TryGetValue("id", out id) || !(id is int)
                || !message.TryGetValue("action", out action)) return;
            if (action as string == "install-update")
            {
                await WorkshopUpdates.Install(message, root);
                owner.Close();
                return;
            }
            object result = Handle(action as string, message);
            core.PostWebMessageAsJson(json.Serialize(new { id, result }));
        }
        catch (Exception error)
        {
            if (id is int) core.PostWebMessageAsJson(json.Serialize(new { id, error = error.Message }));
        }
    }

    private object Handle(string action, Dictionary<string, object> message)
    {
        var receipt = Path.Combine(root, "pending-update.txt");
        if (action == "read-update") return File.Exists(receipt) ? File.ReadAllLines(receipt) : null;
        if (action == "clear-update") { File.Delete(receipt); return null; }
        var kind = message["kind"] as string;
        if (kind != "local" && kind != "secondary") throw new InvalidOperationException("Недопустимая папка.");
        var folderFile = Path.Combine(root, "backup-folder-" + kind + ".txt");
        var folder = File.Exists(folderFile) ? File.ReadAllText(folderFile, Encoding.UTF8) : null;
        switch (action)
        {
            case "read-folder": return FolderInfo(folder);
            case "choose-folder":
                using (var picker = new FolderBrowserDialog { Description = "Выберите папку резервных копий" })
                {
                    picker.SelectedPath = folder ?? "";
                    if (picker.ShowDialog(owner) != DialogResult.OK) return null;
                    WriteFile(folderFile, picker.SelectedPath);
                    return FolderInfo(picker.SelectedPath);
                }
            case "write":
                var archive = message["archive"] as string;
                if (string.IsNullOrEmpty(archive)) throw new InvalidOperationException("Пустой архив.");
                if (folder == null) return false;
                WriteFile(Path.Combine(folder, "tsekh-backup.json"), archive);
                return true;
            default: throw new InvalidOperationException("Неизвестная операция резервного копирования.");
        }
    }

    private static object FolderInfo(string path)
    {
        if (path == null) return null;
        var name = Path.GetFileName(path.TrimEnd(Path.DirectorySeparatorChar));
        return new { name = string.IsNullOrEmpty(name) ? path : name };
    }

    private static void WriteFile(string path, string content)
    {
        string pending = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(pending, content, new UTF8Encoding(false));
            if (File.Exists(path)) File.Replace(pending, path, null);
            else File.Move(pending, path);
        }
        finally
        {
            if (File.Exists(pending)) File.Delete(pending);
        }
    }
}
