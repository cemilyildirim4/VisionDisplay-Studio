namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Bir LED kabini veya video duvarı paneli.
/// Alanlar, frontend'in (frontend/) beklediği model şekliyle birebir eşleşir.
/// ProductType/DefaultModulesPerCard/Price alanları ConfigurationsController
/// (PDF/teklif hesaplama) özelliği için korunur.
/// </summary>
public class Cabin
{
    public int Id { get; set; }
    public int SeriesId { get; set; }

    /// <summary>"led" veya "videowall" — model seçme ekranındaki sekmeleri belirler.</summary>
    public string Category { get; set; } = "led";

    public string ModelCode { get; set; } = string.Empty;

    // --- Configurations/PDF özelliği için korunan alanlar ---
    /// <summary>
    /// Ürün tipi: CABINET (kabin) veya MODULE (tekli panel / modül).
    /// Konfigüratörde rozet ve filtre; montaj/alıcı kart hesabında da kullanılır.
    /// </summary>
    public string ProductType { get; set; } = "CABINET";
    public int DefaultModulesPerCard { get; set; } = 10;
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

    /// <summary>En Uygun İzleme Mesafesi (m). Boşsa frontend pitch × 2,5 ile hesaplar.</summary>
    public decimal? ViewingDistanceM { get; set; }

    /// <summary>Video duvarı: panel boyutu (inç). LED kabinlerde boş.</summary>
    public int? SizeInch { get; set; }

    /// <summary>Video duvarı: çerçeveden çerçeveye ölçü (mm). LED kabinlerde boş.</summary>
    public decimal? BezelMm { get; set; }

    // ---------------------------------------------------------------
    // MODEL SEÇME EKRANI FİLTRELERİ
    // Birden fazla değer alabilenler VİRGÜLLE ayrılmış tek metin olarak tutulur
    // (ör. "Düz,Kavisli"). Frontend bu metni bölüp filtreleme yapar.
    // ---------------------------------------------------------------

    /// <summary>Kategori filtresi: "Kapalı", "Duvar" (birden fazla olabilir)</summary>
    public string? FilterCategory { get; set; }

    /// <summary>Kullanım: "Ticari İç Mekan", "Pencereye bakan", "Sanal Üretim", "Sinema"</summary>
    public string? Usage { get; set; }

    /// <summary>Kurulum: "Düz", "Dışbükey", "İçbükey", "İç L Tipi", "Dış L Tipi", "Asılı", "İstifleme"</summary>
    public string? Installation { get; set; }

    /// <summary>Yapılandırılabilir: "Hepsi Bir Arada", "Dolap"</summary>
    public string? Configurable { get; set; }

    /// <summary>Hizmet: "Ön", "Arka", "Kısmen Ön ve Kısmen Arka"</summary>
    public string? Service { get; set; }

    /// <summary>LED Tipi: "CoB", "SMD", "MIP"</summary>
    public string? LedType { get; set; }

    /// <summary>Koruma: "CoB", "Ağız"</summary>
    public string? Protection { get; set; }

    /// <summary>Sertifikasyon (birden fazla): "EMC B Sınıfı", "TÜV Göz Konforu", ...</summary>
    public string? Certification { get; set; }

    /// <summary>Vesaire (birden fazla): "LED HDR", "HDR 10/10+", "VXT", "SmartThings Pro", "Güç Yedekliliği"</summary>
    public string? Features { get; set; }

    // ---------------------------------------------------------------
    // GÖRSEL VE BİLEŞEN KODLARI
    // ---------------------------------------------------------------

    /// <summary>Ürün görseli adresi (model kartında gösterilir). Boşsa genel ikon çizilir.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Bileşenler bölümü: S-Kutu parça kodu</summary>
    public string? SboxCode { get; set; }

    /// <summary>Bileşenler bölümü: Jig parça kodu</summary>
    public string? JigCode { get; set; }

    /// <summary>Bileşenler bölümü: 110V güç kablosu kodu</summary>
    public string? PowerCord110Code { get; set; }

    /// <summary>Bileşenler bölümü: 220V güç kablosu kodu</summary>
    public string? PowerCord220Code { get; set; }

    public DateTime CreatedAt { get; set; }

    public Series? Series { get; set; }
}
