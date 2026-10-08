namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Tuval ekran görüntüsü: data URL veya ham base64. Bozuk ya da aşırı büyük
/// veri sessizce atılır; kayıt ve PDF onsuz da üretilir.
/// </summary>
public static class PreviewImageCodec
{
    public const int MaxStoredBytes = 6 * 1024 * 1024;

    public static byte[]? Decode(string? raw, int maxBytes = MaxStoredBytes)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim();
        var comma = s.IndexOf(',');
        if (comma >= 0 && s.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            s = s[(comma + 1)..];

        try
        {
            var bytes = Convert.FromBase64String(s);
            return bytes.Length is > 32 and var n && n <= maxBytes ? bytes : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
