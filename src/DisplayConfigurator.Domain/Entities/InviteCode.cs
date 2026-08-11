namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Beta aşamasında kayıt zorunluluğu olmadan siteye erişim sağlayan davet kodu.
/// Bir kod birden fazla kişi tarafından (MaxUses'a kadar) kullanılabilir —
/// örn. bir bayiye "10 kullanıcıya kadar" tek kod verilebilir.
/// </summary>
public class InviteCode
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int MaxUses { get; set; } = 1;
    public int UsedCount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
