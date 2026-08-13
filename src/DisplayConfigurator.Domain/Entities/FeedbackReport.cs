namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Test/beta kullanıcısının gönderdiği hata veya geri bildirim notu.
///
/// NEDEN VAR: Kontrol Merkezi'ndeki "Test Araçları" formu bir not alıyordu ama
/// notu hiçbir yere yazmıyor, yalnızca tarayıcı konsoluna basıyordu. Yani
/// kullanıcı "gönderdim" sanıyor, kimse görmüyordu. Notlar artık kaydediliyor
/// ve yönetim panelinden okunuyor.
///
/// Kişisel veri tutulmaz; yalnızca notun kendisi ve hatayı tekrar üretmeye
/// yarayacak ortam bilgisi (sayfa adresi, tarayıcı) saklanır.
/// </summary>
public class FeedbackReport
{
    public int Id { get; set; }

    /// <summary>Kullanıcının yazdığı bildirim metni</summary>
    public string Note { get; set; } = string.Empty;

    /// <summary>Bildirimi gönderenin rolü: Guest | Dealer | Tester | Admin</summary>
    public string? Role { get; set; }

    /// <summary>Bildirimin gönderildiği sayfanın adresi</summary>
    public string? PageUrl { get; set; }

    /// <summary>Tarayıcı/cihaz bilgisi — cihaza özgü hataları ayırt etmek için</summary>
    public string? UserAgent { get; set; }

    /// <summary>Yönetici bu bildirimi ele aldı mı?</summary>
    public bool Resolved { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
