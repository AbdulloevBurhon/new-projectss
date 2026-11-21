using System;
using System.Net;
using System.Net.Sockets;

internal sealed class ReceiptPrinterConfig
{
    public string storeName { get; set; }
    public string printerName { get; set; }
    public string connection { get; set; }
    public string queue { get; set; }
    public string ip { get; set; }
    public int port { get; set; }
    public int width { get; set; }
    internal int Columns { get { return width == 58 ? 32 : 48; } }

    public ReceiptPrinterConfig()
    {
        storeName = printerName = queue = ip = "";
        connection = "windows";
        port = 9100;
        width = 80;
    }

    internal bool IsValid()
    {
        if (storeName == null || storeName.Length > 100 || printerName == null || printerName.Length > 100
            || queue == null || queue.Length > 256 || ip == null || ip.Length > 80
            || width != 58 && width != 80 || port < 1 || port > 65535) return false;
        return connection == "windows" || connection == "lan" && Address() != null;
    }

    internal IPAddress Address()
    {
        IPAddress address;
        if (!IPAddress.TryParse(ip, out address) || IPAddress.Any.Equals(address)
            || IPAddress.IPv6Any.Equals(address) || IPAddress.Broadcast.Equals(address)
            || address.IsIPv6Multicast) return null;
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            if (address.ToString() != ip || address.GetAddressBytes()[0] >= 224) return null;
        }
        return address;
    }
}
