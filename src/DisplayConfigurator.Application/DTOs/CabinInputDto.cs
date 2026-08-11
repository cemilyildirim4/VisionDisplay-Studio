namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Admin panelinden kabin oluşturma/güncelleme isteğinin gövdesi.
/// Id ve CreatedAt sunucu tarafından yönetilir, bu yüzden burada yer almaz.
/// </summary>
public class CabinInputDto
{
    public int SeriesId { get; set; }
    public string Category { get; set; } = "led";
    public string ModelCode { get; set; } = string.Empty;

    /// <summary>CABINET veya MODULE — Configurations (donanım/PDF) özelliğinin montaj hesabında kullanılır.</summary>
    public string ProductType { get; set; } = "CABINET";
    /// <summary>Yalnızca ProductType="MODULE" iken anlamlı: bir alıcı karta kaç modülün bağlanabileceği.</summary>
    public int DefaultModulesPerCard { get; set; } = 10;
    /// <summary>Birim (kabin/panel) satış fiyatı — Configurations toplam fiyat hesabında kullanılır.</summary>
    public decimal Price { get; set; }

    public decimal PixelPitchMm { get; set; }
    public int WidthMm { get; set; }
    public int HeightMm { get; set; }
    public int DepthMm { get; set; }
    public decimal? WeightKg { get; set; }
    public int PixelWidth { get; set; }
    public int PixelHeight { get; set; }
    public int BrightnessNits { get; set; }
    public int RefreshRateHz { get; set; }
    public decimal PowerTypicalWatts { get; set; }
    public decimal PowerMaxWatts { get; set; }
    public decimal? ViewingDistanceM { get; set; }
    public int? SizeInch { get; set; }
    public decimal? BezelMm { get; set; }
    public string? FilterCategory { get; set; }
    public string? Usage { get; set; }
    public string? Installation { get; set; }
    public string? Configurable { get; set; }
    public string? Service { get; set; }
    public string? LedType { get; set; }
    public string? Protection { get; set; }
    public string? Certification { get; set; }
    public string? Features { get; set; }
    public string? ImageUrl { get; set; }
    public string? SboxCode { get; set; }
    public string? JigCode { get; set; }
    public string? PowerCord110Code { get; set; }
    public string? PowerCord220Code { get; set; }
}
