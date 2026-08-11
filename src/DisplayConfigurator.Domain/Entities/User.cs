namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Bayi veya yönetici hesabı. Beta aşamasında opsiyonel; production'da
/// "geçmiş tekliflerimi gör" akışının temelini oluşturur.
/// </summary>
public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;

    /// <summary>PBKDF2 (Rfc2898DeriveBytes) ile üretilmiş "iterasyon.tuz.özet" formatında saklanır — asla düz metin değil.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    /// <summary>"Admin" | "Dealer" — JWT'deki role claim'iyle birebir eşleşir.</summary>
    public string Role { get; set; } = "Dealer";

    /// <summary>Google/Microsoft ile giriş yapıldıysa sağlayıcı adı; yerel hesaplarda null.</summary>
    public string? ExternalProvider { get; set; }
    public string? ExternalId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
