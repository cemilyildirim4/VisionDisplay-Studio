namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// "PDF olarak dışa aktar" formundan gelen teklif kaydı.
/// Kim, hangi müşteri için, hangi yapılandırmayı çıkardı — satış takibi için saklanır.
/// </summary>
public class Quote
{
    public int Id { get; set; }

    /// <summary>Talebi gönderen kişinin adı soyadı</summary>
    public string? CustomerName { get; set; }

    /// <summary>Geri dönüş için telefon — en çok kullanılan iletişim yolu</summary>
    public string? Phone { get; set; }

    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Message { get; set; }

    // --- PDF anındaki yapılandırma özeti ---
    public string? ModelCode { get; set; }
    public decimal? WallWidthM { get; set; }
    public decimal? WallHeightM { get; set; }

    /// <summary>"single" veya "multi"</summary>
    public string? ScreenMode { get; set; }

    /// <summary>Tek ekranda sütun/satır; çoklu ekranda toplam</summary>
    public int? Columns { get; set; }
    public int? Rows { get; set; }

    /// <summary>"flat" | "curved" | "curvedIn" | "lshape"</summary>
    public string? ScreenType { get; set; }

    /// <summary>"FHD" veya "UHD"</summary>
    public string? Resolution { get; set; }

    /// <summary>Çoklu ekran ayrıntısı, okunabilir metin olarak</summary>
    public string? ScreensSummary { get; set; }

    /// <summary>
    /// Teklif anındaki tasarımın TAMAMI (JSON). Yukarıdaki özet alanları
    /// tasarımı ekranda göstermeye yetiyor ama geri AÇMAYA yetmiyor: çoklu
    /// ekran düzeni <see cref="ScreensSummary"/> içinde yalnızca insan okusun
    /// diye yazılmış bir cümle. "Tekliflerim → Düzenle" bu alanı okuyup
    /// tasarımı birebir geri yükler. Sütun eklenmeden önceki tekliflerde null.
    /// </summary>
    public string? ConfigJson { get; set; }

    /// <summary>"Beklemede" | "Onaylandı" | "Reddedildi" — teklif yaşam döngüsü.</summary>
    public string Status { get; set; } = "Beklemede";

    /// <summary>Admin tekrar düzenleyip müşteriye geri gönderdikçe artar.</summary>
    public int Revision { get; set; } = 1;

    /// <summary>Admin panelinden durum değişikliğiyle birlikte bırakılan not (müşteriye e-posta ile de gidebilir).</summary>
    public string? AdminNote { get; set; }

    /// <summary>Giriş yapmış bir bayi/müşteri oluşturduysa hesabı — misafir taleplerinde null.</summary>
    public int? UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
