using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;

internal sealed class ReceiptTicket
{
    private static readonly CultureInfo Locale = CultureInfo.GetCultureInfo("ru-RU");
    internal readonly List<string> Lines = new List<string>();
    internal readonly int Columns;
    private ReceiptTicket(int columns) { Columns = columns; }

    private static string Text(Dictionary<string, object> row, string key)
    {
        object value;
        return row.TryGetValue(key, out value) ? Convert.ToString(value, CultureInfo.InvariantCulture) : "";
    }

    private static decimal Amount(Dictionary<string, object> row, string key)
    {
        return Convert.ToDecimal(row[key], CultureInfo.InvariantCulture);
    }

    private static string Format(decimal value, string digits) { return value.ToString(digits, Locale); }
    private static string Money(decimal cents) { return Format(cents / 100, "#,0.##") + " сом"; }

    private void Add(string value, bool center = false)
    {
        var text = Regex.Replace(value, @"[\x00-\x1F\x7F]", " ").Trim();
        while (text.Length > Columns)
        {
            int length = text.LastIndexOf(' ', Columns);
            if (length <= 0) length = Columns;
            Add(text.Substring(0, length), center);
            text = text.Substring(length).TrimStart();
        }
        Lines.Add(center ? text.PadLeft(text.Length + (Columns - text.Length) / 2) : text);
    }

    private void Divider() { Lines.Add(new string('-', Columns)); }

    private void Pair(string label, decimal amount)
    {
        string price = Money(amount);
        if (label.Length + price.Length >= Columns) { Add(label); Add(price); }
        else Lines.Add(label + price.PadLeft(Columns - label.Length));
    }

    private void Header(ReceiptPrinterConfig settings, string label, DateTimeOffset date, string id,
        string warehouse, string account, string seller, string client)
    {
        Add(string.IsNullOrWhiteSpace(settings.storeName) ? "Цех" : settings.storeName, true);
        Add(label, true);
        Add(date.ToLocalTime().ToString("dd.MM.yyyy, HH:mm:ss", Locale));
        if (!string.IsNullOrEmpty(id)) Add("Чек № " + id);
        Add("Склад: " + warehouse);
        Add("Счёт: " + account);
        Add("Сотрудник: " + seller);
        if (!string.IsNullOrEmpty(client)) Add("Клиент: " + client);
        Divider();
    }

    private void Item(string name, string unit, decimal qty, decimal price, decimal listPrice, decimal amount)
    {
        Add(name);
        Add(Format(qty, "0.#########") + " " + unit + " × " + Format(price, "0.#########") + " сом = " + Money(amount));
        if (price < listPrice && Format(price, "0.#########") != Format(listPrice, "0.#########"))
        {
            Add("По каталогу " + Format(listPrice, "0.#########") + " сом");
            Add("Скидка " + Money(Math.Max(0, Math.Round(qty * listPrice * 100, MidpointRounding.AwayFromZero) - amount)));
        }
    }

    private void Totals(decimal total, decimal discount, decimal paid, decimal tender)
    {
        Divider();
        if (discount > 0) Pair("Скидка на чек", discount);
        Pair("ИТОГО", total);
        Pair("Оплачено", paid);
        if (total > paid) Pair("Долг", total - paid);
        if (tender > paid) Pair("Сдача", tender - paid);
    }

    internal static ReceiptTicket Test(ReceiptPrinterConfig settings)
    {
        var ticket = new ReceiptTicket(settings.Columns);
        ticket.Header(settings, "Пробный чек", DateTimeOffset.Now, "", "Основной склад", "Касса", "Кассир", "Тестовый клиент");
        ticket.Item("Картошка", "кг", 1, 5, 6, 500);
        ticket.Totals(500, 0, 500, 500);
        return ticket;
    }

    internal static ReceiptTicket Sale(ReceiptPrinterConfig settings, Dictionary<string, object> header,
        List<Dictionary<string, object>> items)
    {
        var ticket = new ReceiptTicket(settings.Columns);
        var date = DateTimeOffset.Parse(Text(header, "date"), CultureInfo.InvariantCulture);
        ticket.Header(settings, "Чек продажи", date, Text(header, "id"), Text(header, "warehouseName"),
            Text(header, "accountName"), Text(header, "seller"), Text(header, "clientName"));
        foreach (var item in items)
            ticket.Item(Text(item, "name"), Text(item, "unit"), Amount(item, "qty"), Amount(item, "price"),
                Amount(item, "listPrice"), Amount(item, "amount"));
        ticket.Totals(Amount(header, "total"), Amount(header, "discount"), Amount(header, "paid"), Amount(header, "tender"));
        return ticket;
    }
}
