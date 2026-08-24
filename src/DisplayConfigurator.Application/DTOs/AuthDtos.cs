using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Bayi/müşteri kendi hesabını açar. Rol her zaman "Dealer" olur; bu DTO'dan
/// rol yükseltilemez (bkz. AuthController.Register).
/// </summary>
public class RegisterDto
{
    [Required, EmailAddress, StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8, ErrorMessage = "Parola en az 8 karakter olmalıdır.")]
    public string Password { get; set; } = string.Empty;

    [StringLength(150)]
    public string? DisplayName { get; set; }

    /// <summary>
    /// KULLANILMIYOR. Eski istemcilerle uyum için duruyor; Register bu alanı
    /// okumuyor, açılan hesap her hâlükârda "Dealer" oluyor. Tester/Admin
    /// rolünü yalnızca Admin, kullanıcı yönetiminden verir.
    /// </summary>
    [StringLength(100)]
    public string? StaffCode { get; set; }
}

public class LoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Eski istemciler hâlâ gönderebilir; girişte yok sayılır. Rol hesabın kendisinde yazılıdır.
    /// </summary>
    [StringLength(100)]
    public string? StaffCode { get; set; }
}

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>Beta aşamasında zorunlu kayıt yerine kullanılan geçici misafir oturumu.</summary>
public class RedeemInviteDto
{
    [Required, StringLength(50)]
    public string Code { get; set; } = string.Empty;
}

/// <summary>Login/register/guest-redeem sonucunda dönen jeton çifti.</summary>
public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime AccessTokenExpiresAt { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
}

/// <summary>Admin panelinden bir teklif/konfigürasyonun durumunu değiştirmek için.</summary>
public class UpdateStatusDto
{
    [Required, StringLength(20)]
    public string Status { get; set; } = string.Empty;

    [StringLength(500)]
    public string? AdminNote { get; set; }
}
