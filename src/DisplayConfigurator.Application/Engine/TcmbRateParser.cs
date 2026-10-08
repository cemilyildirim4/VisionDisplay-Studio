using System.Globalization;
using System.Xml.Linq;

namespace DisplayConfigurator.Application.Engine;

/// <summary>TCMB günlük kur XML'inden USD forex satışını okur.</summary>
public static class TcmbRateParser
{
    public static decimal? UsdForexSelling(string? xml)
    {
        if (string.IsNullOrWhiteSpace(xml)) return null;
        try
        {
            var doc = XDocument.Parse(xml);
            var node = doc.Descendants("Currency")
                .FirstOrDefault(c =>
                    string.Equals((string?)c.Attribute("CurrencyCode"), "USD", StringComparison.OrdinalIgnoreCase)
                    || string.Equals((string?)c.Attribute("Kod"), "USD", StringComparison.OrdinalIgnoreCase));
            var raw = node?.Element("ForexSelling")?.Value?.Trim();
            if (string.IsNullOrWhiteSpace(raw)) return null;
            if (!decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var rate))
                return null;
            return rate > 0 ? rate : null;
        }
        catch (System.Xml.XmlException)
        {
            return null;
        }
    }
}
