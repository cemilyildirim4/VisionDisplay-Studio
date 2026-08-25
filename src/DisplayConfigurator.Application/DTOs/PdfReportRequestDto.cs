using System.ComponentModel.DataAnnotations;
using DisplayConfigurator.Application.Validation;

namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Canlı yapılandırma + teklif bilgisi. CreateConfigurationDto alanları hesap motoruna gider.
/// </summary>
public class PdfReportRequestDto : CreateConfigurationDto
{
    [RequiredFilled, StringLength(150, ErrorMessage = "Müşteri adı en fazla 150 karakter olabilir.")]
    public new string? CustomerName { get; set; }

    [ContactPhone, StringLength(50)]
    public string? Phone { get; set; }

    [ContactEmail, StringLength(150)]
    public string? Email { get; set; }

    [RequiredFilled, StringLength(500)]
    public string? Address { get; set; }

    [RequiredFilled, StringLength(2000)]
    public string? Message { get; set; }

    [StringLength(20)]
    public string? ScreenType { get; set; }

    [StringLength(10)]
    public string? Resolution { get; set; }

    [StringLength(4000)]
    public string? ScreensSummary { get; set; }

    [Range(0, 1000)]
    public decimal? WallWidthM { get; set; }

    [Range(0, 1000)]
    public decimal? WallHeightM { get; set; }

    [StringLength(20)]
    public string? ScreenMode { get; set; }

    /// <summary>data:image/...;base64,... veya ham base64. En fazla ~6 MB çözülür.</summary>
    public string? PreviewImageBase64 { get; set; }

    /// <summary>
    /// Kamerada ("Nasıl Görüneceğini Gör") çekilip KAYDEDİLEN kare. Varsa
    /// rapora "Mekânda Görünüm" sayfası olarak eklenir; yoksa o sayfa hiç
    /// basılmaz. Önizleme görseliyle aynı biçim ve aynı boyut sınırı.
    /// </summary>
    public string? ArImageBase64 { get; set; }

    /// <summary>
    /// Kullanıcının rapora ELİYLE eklediği mekân fotoğrafları.
    ///
    /// iPhone'da AR (Quick Look) içindeki deklanşör Apple'ın kendi düğmesi:
    /// çektiği kare doğrudan Fotoğraflar'a gidiyor, sayfa onu hiç göremiyor.
    /// Bu alan o kareleri (ya da herhangi bir mekân fotoğrafını) rapora
    /// sokmanın yolu. Her biri ayrı bir "Mekânda Görünüm" sayfası olur.
    /// </summary>
    public List<string>? ArImagesBase64 { get; set; }

    public PdfReportExtras ToExtras() => new()
    {
        Phone = Phone,
        Email = Email,
        Address = Address,
        Message = Message,
        ScreenType = ScreenType,
        Resolution = Resolution,
        ScreensSummary = ScreensSummary,
        WallWidthM = WallWidthM,
        WallHeightM = WallHeightM,
        ScreenMode = ScreenMode,
        PreviewImage = DecodePreview(PreviewImageBase64),
        ArImages = DecodeAll(ArImageBase64, ArImagesBase64),
    };

    private const int MaxPreviewBytes = 6 * 1024 * 1024;

    /// <summary>Rapora en çok bu kadar mekân karesi girer — PDF şişmesin.</summary>
    private const int MaxArImages = 6;

    /// <summary>
    /// Otomatik kaydedilen kare ile elle eklenenleri tek listede birleştirir.
    /// Çözülemeyen ya da boş olanlar sessizce atlanır: tek bozuk fotoğraf
    /// yüzünden raporun tamamı düşmemeli.
    /// </summary>
    private static List<byte[]> DecodeAll(string? tek, List<string>? liste)
    {
        var sonuc = new List<byte[]>();
        var bytes = DecodePreview(tek);
        if (bytes != null) sonuc.Add(bytes);

        foreach (var ham in liste ?? new List<string>())
        {
            if (sonuc.Count >= MaxArImages) break;
            var b = DecodePreview(ham);
            if (b != null) sonuc.Add(b);
        }

        return sonuc;
    }

    private static byte[]? DecodePreview(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim();
        var comma = s.IndexOf(',');
        if (comma >= 0) s = s[(comma + 1)..];
        try
        {
            var bytes = Convert.FromBase64String(s);
            return bytes.Length is > 0 and <= MaxPreviewBytes ? bytes : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
