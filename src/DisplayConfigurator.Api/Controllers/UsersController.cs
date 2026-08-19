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
    /// Hiç Admin yokken ilk Admin hesabını oluşturur. İlk Admin oluştuktan sonra
    /// 409 döner; sonraki Admin'ler yalnızca mevcut Admin JWT ile POST /api/users üzerinden eklenir.
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("bootstrap-admin")]
    public async Task<ActionResult<UserListItemDto>> BootstrapAdmin([FromBody] BootstrapAdminDto dto)
    {
        if (await _users.AnyAdminExistsAsync())
            return Conflict(new { message = "Zaten en az bir Admin hesabı var. Yeni Admin için Kullanıcılar sekmesinden ekleyin." });

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

        return Ok(new UserListItemDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
        });
    }

    private string NormalizeRole(string role) =>
        AllowedRoles.First(r => r.Equals(role, StringComparison.OrdinalIgnoreCase));
}
