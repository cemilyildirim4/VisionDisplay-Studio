namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Teklif / iletişim bilgileri — yapılandırma hesabına karışmaz, yalnızca PDF üst özetinde basılır.
/// </summary>
public class PdfReportExtras
{
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Message { get; set; }
    public string? ScreenType { get; set; }
    public string? Resolution { get; set; }
    public string? ScreensSummary { get; set; }
    public decimal? WallWidthM { get; set; }
    public decimal? WallHeightM { get; set; }
    public string? ScreenMode { get; set; }

    /// <summary>Canlı tuval önizlemesi (jpeg/png baytları). Yoksa görsel sayfası basılmaz.</summary>
    public byte[]? PreviewImage { get; set; }
}
