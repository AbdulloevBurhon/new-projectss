using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal sealed class WorkshopWindow : Form
{
    private readonly string root;
    private readonly bool hidden;
    private readonly WebView2 webView = new WebView2 { Dock = DockStyle.Fill };
    internal int ExitCode { get; private set; }

    internal WorkshopWindow(string root, bool hidden)
    {
        this.root = root;
        this.hidden = hidden;
        Text = "Цех-4";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1440, 900);
        MinimumSize = new Size(760, 550);
        if (hidden)
        {
            ShowInTaskbar = false;
            Opacity = 0;
        }
        Controls.Add(webView);
        Shown += Initialize;
    }

    private async void Initialize(object sender, EventArgs args)
    {
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(root, "profile"));
            await webView.EnsureCoreWebView2Async(environment);
            var core = webView.CoreWebView2;
            WorkshopApi.PrepareSqlite(root, Assembly.GetExecutingAssembly());
            var api = new WorkshopApi(root);
            var assets = new WorkshopAssets(environment);
            var backups = new WorkshopBackups(this, root);

            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDevToolsEnabled = hidden;
            core.AddWebResourceRequestedFilter(WorkshopAssets.Origin + "/*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);
            core.WebResourceRequested += (s, e) =>
            {
                if (WorkshopApi.IsRequest(e.Request.Uri)) api.Serve(s, e);
                else assets.Serve(s, e);
            };
            core.NavigationStarting += (s, e) => { if (!WorkshopAssets.IsAppUrl(e.Uri)) e.Cancel = true; };
            core.NewWindowRequested += (s, e) => { e.Handled = true; };
            core.PermissionRequested += (s, e) => { e.State = CoreWebView2PermissionState.Deny; };
            core.WebMessageReceived += backups.Receive;
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("bridge.js"))
            using (var reader = new StreamReader(source)) await core.AddScriptToExecuteOnDocumentCreatedAsync(reader.ReadToEnd());
            core.Navigate(WorkshopAssets.Origin + "/");
        }
        catch (Exception error)
        {
            ExitCode = 1;
            if (hidden) File.WriteAllText(Path.Combine(root, "startup-error.txt"), error.ToString());
            else MessageBox.Show(this, "Не удалось запустить «Цех-4».\n" + error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }
}
