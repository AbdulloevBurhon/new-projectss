using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Printing;
using System.Drawing.Text;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;

internal static class ReceiptOutput
{
    internal static void Send(ReceiptPrinterConfig settings, ReceiptTicket ticket)
    {
        if (settings.connection == "lan") SendLan(settings, ticket);
        else SendWindows(settings, ticket);
    }

    private static void SendWindows(ReceiptPrinterConfig settings, ReceiptTicket ticket)
    {
        using (var document = new PrintDocument())
        {
            document.PrinterSettings.PrinterName = settings.queue;
            if (!document.PrinterSettings.IsValid) throw new InvalidPrinterException(document.PrinterSettings);
            document.DocumentName = string.IsNullOrWhiteSpace(settings.printerName) ? "Цех — чек" : settings.printerName + " — чек";
            document.PrintController = new StandardPrintController();
            int paperWidth = (int)Math.Round(settings.width * 100 / 25.4);
            document.DefaultPageSettings.PaperSize = new PaperSize("Чек " + settings.width + " мм",
                paperWidth, Math.Min(2800, Math.Max(170, (ticket.Lines.Count + 2) * 14)));
            document.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            int row = 0;
            document.PrintPage += (sender, args) =>
            {
                float width = Math.Min(paperWidth, args.PageSettings.PrintableArea.Width) - 12;
                float height = args.PageSettings.PrintableArea.Height;
                if (width <= 0 || height < 20) throw new IOException("Invalid receipt paper size.");
                using (var measure = new Font("Consolas", 8))
                {
                    float measured = args.Graphics.MeasureString(new string('0', ticket.Columns), measure,
                        int.MaxValue, StringFormat.GenericTypographic).Width;
                    using (var font = new Font(measure.FontFamily, measure.Size * Math.Min(1, width / measured)))
                    {
                        float step = font.GetHeight(args.Graphics) * 1.18f;
                        float y = 4;
                        do
                        {
                            args.Graphics.DrawString(ticket.Lines[row++], font, Brushes.Black, 5, y, StringFormat.GenericTypographic);
                            y += step;
                        } while (row < ticket.Lines.Count && y + step < height);
                    }
                }
                args.HasMorePages = row < ticket.Lines.Count;
            };
            document.Print();
        }
    }

    private static void SendLan(ReceiptPrinterConfig settings, ReceiptTicket ticket)
    {
        var address = settings.Address();
        if (address == null) throw new IOException("Invalid printer address.");
        using (var client = new TcpClient(address.AddressFamily))
        {
            var connection = client.BeginConnect(address, settings.port, null, null);
            using (var wait = connection.AsyncWaitHandle)
                if (!wait.WaitOne(3000)) throw new IOException("Printer connection timed out.");
            client.EndConnect(connection);
            client.SendTimeout = 5000;
            using (var stream = client.GetStream())
            using (var font = new Font("Consolas", 18, FontStyle.Regular, GraphicsUnit.Pixel))
            {
                Write(stream, new byte[] { 0x1B, 0x40 });
                int width = settings.width == 58 ? 384 : 576;
                const int lineHeight = 25, bandLines = 8;
                for (int i = 0; i < ticket.Lines.Count; i += bandLines)
                {
                    int count = Math.Min(bandLines, ticket.Lines.Count - i);
                    using (var bitmap = new Bitmap(width, count * lineHeight, PixelFormat.Format24bppRgb))
                    {
                        using (var graphics = Graphics.FromImage(bitmap))
                        {
                            graphics.Clear(Color.White);
                            graphics.TextRenderingHint = TextRenderingHint.SingleBitPerPixelGridFit;
                            float textWidth = graphics.MeasureString(new string('0', ticket.Columns), font,
                                int.MaxValue, StringFormat.GenericTypographic).Width;
                            float left = Math.Max(5, (width - textWidth) / 2);
                            for (int line = 0; line < count; line++)
                                graphics.DrawString(ticket.Lines[i + line], font, Brushes.Black, left, line * lineHeight + 2,
                                    StringFormat.GenericTypographic);
                        }
                        WriteRaster(stream, bitmap);
                    }
                }
                Write(stream, new byte[] { 0x1B, 0x64, 0x04 });
            }
        }
    }

    private static void Write(Stream stream, byte[] bytes) { stream.Write(bytes, 0, bytes.Length); }

    private static void WriteRaster(Stream stream, Bitmap bitmap)
    {
        int bytes = bitmap.Width / 8, height = bitmap.Height;
        Write(stream, new byte[] { 0x1D, 0x76, 0x30, 0, (byte)bytes, (byte)(bytes >> 8), (byte)height, (byte)(height >> 8) });
        var pixels = bitmap.LockBits(new Rectangle(0, 0, bitmap.Width, height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        try
        {
            var rgb = new byte[Math.Abs(pixels.Stride)];
            var raster = new byte[bytes * height];
            for (int y = 0; y < height; y++)
            {
                Marshal.Copy(IntPtr.Add(pixels.Scan0, y * pixels.Stride), rgb, 0, rgb.Length);
                for (int x = 0; x < bitmap.Width; x++)
                    if (rgb[x * 3] < 128) raster[y * bytes + x / 8] |= (byte)(0x80 >> (x % 8));
            }
            Write(stream, raster);
        }
        finally { bitmap.UnlockBits(pixels); }
    }
}
