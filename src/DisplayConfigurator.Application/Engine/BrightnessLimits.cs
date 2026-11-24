namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// İç mekân LED / modül parlaklığı tavanı. Dış mekân ürünleri bu tavana bağlı değildir.
/// </summary>
public static class BrightnessLimits
{
    public const int MaxIndoorNits = 800;

    public static bool IsOutdoor(string? usage, string? filterCategory, string? features = null)
    {
        var blob = $"{usage} {filterCategory} {features}".ToLowerInvariant()
            .Replace("ı", "i")
            .Replace("ş", "s")
            .Replace("ğ", "g")
            .Replace("ü", "u")
            .Replace("ö", "o")
            .Replace("ç", "c");
        return blob.Contains("outdoor")
            || blob.Contains("dis mekan")
            || blob.Contains("dismekan");
    }

    public static int Clamp(int nits, bool outdoor)
        => outdoor ? Math.Max(0, nits) : Math.Clamp(nits, 0, MaxIndoorNits);

    public static string? Validate(int nits, bool outdoor)
    {
        if (nits < 0) return "Parlaklık negatif olamaz.";
        if (!outdoor && nits > MaxIndoorNits)
            return $"İç mekân modül parlaklığı en fazla {MaxIndoorNits} nit olabilir.";
        return null;
    }
}
