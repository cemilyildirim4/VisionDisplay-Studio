namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Bir rapor/dosya indirme olayı. CSV (Excel) indirmesi tarayıcıda üretildiği
/// için sunucuya başka hiçbir iz düşmüyordu; bu kayıt panelde "kim ne indirdi"
/// sorusunu cevaplıyor. Yalnızca olayın kendisi tutulur, dosya saklanmaz.
/// </summary>
public class ExportLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? CompanyName { get; set; }
    public string? ModelCode { get; set; }
    /// <summary>"csv" veya "pdf".</summary>
    public string Kind { get; set; } = "csv";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
