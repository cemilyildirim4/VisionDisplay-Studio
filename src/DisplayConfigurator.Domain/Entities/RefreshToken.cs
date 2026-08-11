namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Uzun ömürlü, tek kullanımlık yenileme jetonu. JWT erişim jetonu kısa ömürlü
/// (15 dk) tutulur; oturumu canlı tutmak için bu tablo kullanılır. Böylece bir
/// jeton sızarsa yalnızca o cihaz için "revoked=true" yapılarak iptal edilebilir
/// (tüm hesabın parolasını değiştirmeye gerek kalmaz).
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool Revoked { get; set; }
}
