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

    /// <summary>
    /// Kodun verildiği kullanıcı adı. Giriş için kod ile BİRLİKTE isteniyor.
    /// Eski kayıtlarda boş olabilir; boşsa yalnızca kod sorulur.
    /// </summary>
    public string? UserName { get; set; }

    /*
     * FİRMA BİLGİLERİ.
     *
     * Kod üretilirken bir kez giriliyor; böylece bayi her PDF öncesi aynı
     * bilgileri elle yazmıyor. Giriş yapıldığında oturuma taşınıyor ve
     * teklif/rapor bunlarla dolduruluyor.
     */
    public string? CompanyName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Note { get; set; }
    public int MaxUses { get; set; } = 1;
    public int UsedCount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
