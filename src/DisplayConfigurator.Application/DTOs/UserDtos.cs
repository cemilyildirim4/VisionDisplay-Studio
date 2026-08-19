using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.DTOs;

public class UserListItemDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string Role { get; set; } = "Dealer";
    public DateTime CreatedAt { get; set; }
}

public class CreateUserDto
{
    [Required, EmailAddress, StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [StringLength(150)]
    public string? DisplayName { get; set; }

    /// <summary>Admin | Dealer. Tester yalnızca Development veya Beta:Enabled.</summary>
    [Required, StringLength(20)]
    public string Role { get; set; } = "Dealer";
}

public class UpdateUserRoleDto
{
    [Required, StringLength(20)]
    public string Role { get; set; } = "Dealer";
}

/// <summary>
/// İlk Admin hesabını oluşturmak veya (X-Admin-Key + ForceReset) mevcut
/// Admin parolasını PBKDF2 ile sıfırlamak için.
/// </summary>
public class BootstrapAdminDto
{
    [Required, EmailAddress, StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [StringLength(150)]
    public string? DisplayName { get; set; }

    /// <summary>
    /// true ise ve geçerli X-Admin-Key varsa, mevcut Admin'in parolası
    /// verilen değerle yeniden hash'lenir (kilitli hesap kurtarma).
    /// </summary>
    public bool ForceReset { get; set; }
}
