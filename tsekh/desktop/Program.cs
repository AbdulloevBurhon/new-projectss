using System;
using System.ComponentModel;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: AssemblyTitle("Цех-4")]
[assembly: AssemblyProduct("Цех-4")]

internal static class Program
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibrary(string path);

    [STAThread]
    private static int Main(string[] args)
    {
        bool hidden = Array.IndexOf(args, "--workshop-headless") >= 0;
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Tsekh-4");
        if (DesktopConfig.ApiBase.StartsWith("http://127.0.0.1:", StringComparison.Ordinal) && Environment.GetEnvironmentVariable("TSEKH4_TEST_PROFILE") != null)
            root = Environment.GetEnvironmentVariable("TSEKH4_TEST_PROFILE");

        try
        {
            if (args.Length == 3 && args[0] == "--apply-update") return WorkshopUpdates.Apply(args);
            if (args.Length == 2 && args[0] == "--cleanup-update") WorkshopUpdates.Cleanup(args[1]);
            var assembly = Assembly.GetExecutingAssembly();
            AppDomain.CurrentDomain.AssemblyResolve += (sender, eventArgs) =>
            {
                string name = new AssemblyName(eventArgs.Name).Name;
                if (name != "Microsoft.Web.WebView2.Core" && name != "Microsoft.Web.WebView2.WinForms" && name != "System.Data.SQLite") return null;
                using (Stream resource = assembly.GetManifestResourceStream(name + ".dll"))
                using (var data = new MemoryStream())
                {
                    resource.CopyTo(data);
                    return Assembly.Load(data.ToArray());
                }
            };

            string runtime = Path.Combine(root, "runtime", "1.0.4129.50");
            Directory.CreateDirectory(runtime);
            string loader = Path.Combine(runtime, "WebView2Loader.dll");
            if (!File.Exists(loader))
            {
                string pending = loader + "." + Guid.NewGuid().ToString("N") + ".tmp";
                using (Stream source = assembly.GetManifestResourceStream("WebView2Loader.dll"))
                using (var destination = File.Create(pending)) source.CopyTo(destination);
                try { File.Move(pending, loader); }
                catch (IOException) { if (!File.Exists(loader)) throw; }
                finally { if (File.Exists(pending)) File.Delete(pending); }
            }
            if (LoadLibrary(loader) == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
            return Run(root, hidden);
        }
        catch (Exception error)
        {
            if (hidden) File.WriteAllText(Path.Combine(root, "startup-error.txt"), error.ToString());
            else MessageBox.Show("Не удалось запустить «Цех-4».\n" + error.Message, "Цех-4", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int Run(string root, bool hidden)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        using (var window = new WorkshopWindow(root, hidden))
        {
            Application.Run(window);
            return window.ExitCode;
        }
    }
}
