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
    internal static int Apply(string[] args)
    {
        string staged = Assembly.GetExecutingAssembly().Location;
        string target = Path.GetFullPath(args[2]);
        if (!Path.GetFileName(staged).StartsWith(".tsekh-update-", StringComparison.Ordinal)
            || !string.Equals(Path.GetDirectoryName(staged), Path.GetDirectoryName(target), StringComparison.OrdinalIgnoreCase)
            || !string.Equals(Path.GetExtension(target), ".exe", StringComparison.OrdinalIgnoreCase)) return 1;

        string next = staged + ".next";
        string previous = staged + ".previous";
        try
        {
            try
            {
                using (var process = Process.GetProcessById(int.Parse(args[1])))
                    if (!process.WaitForExit(30000)) throw new IOException("Закройте предыдущую версию «Цеха».");
            }
            catch (ArgumentException) { /* The previous process has already exited. */ }
            File.Copy(staged, next);
            File.Replace(next, target, previous);
            try
            {
                Process.Start(new ProcessStartInfo(target, "--cleanup-update \"" + staged + "\"") { UseShellExecute = false });
            }
            catch
            {
                File.Replace(previous, target, null);
                throw;
            }
            return 0;
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "Обновление «Цеха»", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    internal static void Cleanup(string path)
    {
        var executable = Assembly.GetExecutingAssembly().Location;
        path = Path.GetFullPath(path);
        if (!string.Equals(Path.GetDirectoryName(path), Path.GetDirectoryName(executable), StringComparison.OrdinalIgnoreCase)
            || !Regex.IsMatch(Path.GetFileName(path), @"\A\.tsekh-update-[a-f0-9]{32}\.exe\z")) return;
        Task.Run(() => {
            for (int i = 0; i < 10; i++)
            {
                try { File.Delete(path); File.Delete(path + ".previous"); return; }
                catch (IOException) { System.Threading.Thread.Sleep(250); }
                catch (UnauthorizedAccessException) { return; }
            }
        });
    }
}
