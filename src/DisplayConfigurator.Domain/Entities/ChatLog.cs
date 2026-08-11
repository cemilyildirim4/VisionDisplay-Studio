namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Sohbet yardımcısına sorulan her soru ve verilen cevabın kaydı.
///
/// NEDEN TUTULUYOR: müşterilerin en çok neyi sorduğunu görmek için.
/// Özellikle <see cref="Answered"/> = false olan kayıtlar değerlidir —
/// bunlar yardımcının cevaplayamadığı sorulardır, bilgi tabanına
/// eklenmesi gereken konuları gösterir.
///
/// Kişisel bilgi saklanmaz: yalnızca sorulan metin, eşleşen konu ve zaman.
/// </summary>
public class ChatLog
{
    public int Id { get; set; }

    /// <summary>Kullanıcının yazdığı ya da tıkladığı soru</summary>
    public string Question { get; set; } = string.Empty;

    /// <summary>Eşleşen konunun kimliği (ör. "pitch"); eşleşme yoksa null</summary>
    public string? TopicId { get; set; }

    /// <summary>Yardımcı bu soruya cevap verebildi mi?</summary>
    public bool Answered { get; set; }

    /// <summary>Sorunun sorulduğu arayüz dili: tr | en | ar</summary>
    public string? Lang { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
