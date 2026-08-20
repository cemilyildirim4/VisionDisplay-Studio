using System.Security.Cryptography;
using System.Text;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Application.Security;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IHostEnvironment _environment;
    private readonly IConfiguration _config;

    public UsersController(IUserRepository users, IHostEnvironment environment, IConfiguration config)
    {
        _users = users;
        _environment = environment;
        _config = config;
    }

    private string[] AllowedRoles => RoleAvailability.AssignableRoles(_environment, _config);

    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserListItemDto>>> List()
    {
        var all = await _users.GetAllAsync();
        return Ok(all.Select(u => new UserListItemDto
        {
            Id = u.Id,
            Email = u.Email,
            DisplayName = u.DisplayName,
            Role = u.Role,
            CreatedAt = u.CreatedAt,
        }));
    }

    [AdminOnly]
    [EnableRateLimiting("write")]
    [HttpPost]
    public async Task<ActionResult<UserListItemDto>> Create([FromBody] CreateUserDto dto)
    {
        if (!AllowedRoles.Contains(dto.Role, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = $"Rol şunlardan biri olmalı: {string.Join(", ", AllowedRoles)}" });

        var existing = await _users.GetByEmailAsync(dto.Email);
        if (existing != null)
            return Conflict(new { message = "Bu e-posta adresiyle zaten bir hesap var." });

        var user = await _users.CreateAsync(new User
        {
            Email = dto.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.Hash(dto.Password),
            DisplayName = dto.DisplayName,
            Role = NormalizeRole(dto.Role),
        });

        return CreatedAtAction(nameof(List), new UserListItemDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
        });
    }

    [AdminOnly]
    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        if (!AllowedRoles.Contains(dto.Role, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = $"Rol şunlardan biri olmalı: {string.Join(", ", AllowedRoles)}" });

        var user = await _users.GetByIdAsync(id);
        if (user == null) return NotFound();

        // Son Admin'in rolünü düşürmeyi engelle
        if (user.Role == "Admin" && !string.Equals(dto.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var all = await _users.GetAllAsync();
            if (all.Count(u => u.Role == "Admin") <= 1)
                return BadRequest(new { message = "Sistemde en az bir Admin hesabı kalmalıdır." });
        }

        var ok = await _users.UpdateRoleAsync(id, NormalizeRole(dto.Role));
        return ok ? Ok(new { message = "Rol güncellendi." }) : NotFound();
    }

    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _users.GetByIdAsync(id);
        if (user == null) return NotFound();

        if (user.Role == "Admin")
        {
            var all = await _users.GetAllAsync();
            if (all.Count(u => u.Role == "Admin") <= 1)
                return BadRequest(new { message = "Son Admin hesabı silinemez." });
        }

        var ok = await _users.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    /// <summary>
    /// Hiç Admin yokken ilk Admin hesabını oluşturur. Bir Admin varken varsayılan
    /// 409 döner. Kilitli hesap için body'de <c>forceReset: true</c> ve
    /// <c>X-Admin-Key</c> (ortam: ADMIN_PASSWORD) ile mevcut Admin parolası
    /// projenin PBKDF2 SHA256 (100.000 iterasyon) formatında yeniden yazılır.
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("bootstrap-admin")]
    public async Task<ActionResult<UserListItemDto>> BootstrapAdmin([FromBody] BootstrapAdminDto dto)
    {
        if (await _users.AnyAdminExistsAsync())
        {
            if (dto.ForceReset)
            {
                if (!TryValidateAdminKey(out var error))
                    return error!;
                return await ResetExistingAdminPasswordAsync(dto);
            }

            return Conflict(new { message = "Zaten en az bir Admin hesabı var. Yeni Admin için Kullanıcılar sekmesinden ekleyin." });
        }

        var existing = await _users.GetByEmailAsync(dto.Email);
        if (existing != null)
            return Conflict(new { message = "Bu e-posta zaten kayıtlı. Rolünü Admin yapmak için Kullanıcılar sekmesini kullanın." });

        var user = await _users.CreateAsync(new User
        {
            Email = dto.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.Hash(dto.Password),
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? "Admin" : dto.DisplayName,
            Role = "Admin",
        });

        return Ok(ToListItem(user));
    }

    /// <summary>
    /// Mevcut Admin parolasını ops anahtarıyla zorla sıfırlar.
    /// Header: X-Admin-Key = ADMIN_PASSWORD ortam değişkeni.
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("reset-admin")]
    public async Task<ActionResult<UserListItemDto>> ResetAdmin([FromBody] BootstrapAdminDto dto)
    {
        if (!TryValidateAdminKey(out var error))
            return error!;

        if (!await _users.AnyAdminExistsAsync())
            return NotFound(new { message = "Sıfırlanacak Admin hesabı yok. Önce POST /api/users/bootstrap-admin kullanın." });

        return await ResetExistingAdminPasswordAsync(dto);
    }

    private async Task<ActionResult<UserListItemDto>> ResetExistingAdminPasswordAsync(BootstrapAdminDto dto)
    {
        var target = await _users.GetByEmailAsync(dto.Email);
        if (target != null && !string.Equals(target.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Bu e-posta bir Admin hesabına ait değil." });

        target ??= await _users.GetFirstAdminAsync();
        if (target == null)
            return NotFound(new { message = "Sıfırlanacak Admin hesabı bulunamadı." });

        var hash = PasswordHasher.Hash(dto.Password);
        var ok = await _users.UpdatePasswordHashAsync(target.Id, hash);
        if (!ok)
            return NotFound(new { message = "Admin parolası güncellenemedi." });

        target.PasswordHash = hash;
        return Ok(ToListItem(target));
    }

    private bool TryValidateAdminKey(out ActionResult? error)
    {
        var expected =
            Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
            ?? _config["ADMIN_PASSWORD"]
            ?? _config["Admin:Password"];

        if (string.IsNullOrEmpty(expected))
        {
            error = StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "ADMIN_PASSWORD ortam değişkeni tanımlı değil. Ops sıfırlama kapalı.",
            });
            return false;
        }

        if (!Request.Headers.TryGetValue("X-Admin-Key", out var provided) ||
            !AdminKeysEqual(provided.ToString(), expected))
        {
            error = Unauthorized(new { message = "Geçerli X-Admin-Key gerekli." });
            return false;
        }

        error = null;
        return true;
    }

    private static bool AdminKeysEqual(string provided, string expected)
    {
        var a = Encoding.UTF8.GetBytes(provided);
        var b = Encoding.UTF8.GetBytes(expected);
        if (a.Length != b.Length) return false;
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static UserListItemDto ToListItem(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        DisplayName = user.DisplayName,
        Role = user.Role,
        CreatedAt = user.CreatedAt,
    };

    private string NormalizeRole(string role) =>
        AllowedRoles.First(r => r.Equals(role, StringComparison.OrdinalIgnoreCase));
}
