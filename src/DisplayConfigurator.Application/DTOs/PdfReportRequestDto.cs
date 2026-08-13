using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Canlı yapılandırma + teklif bilgisi. CreateConfigurationDto alanları hesap motoruna gider.
/// </summary>
public class PdfReportRequestDto : CreateConfigurationDto
{
    [StringLength(50)]
    public string? Phone { get; set; }

    [EmailAddress, StringLength(150)]
    public string? Email { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(2000)]
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
    };

    private const int MaxPreviewBytes = 6 * 1024 * 1024;

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
