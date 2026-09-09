using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>Admin panelinden beta davet kodu üretme/izleme/silme.</summary>
[ApiController]
[Route("api/invite-codes")]
[AdminOnly]
public class InviteCodesController : ControllerBase
{
    private readonly IInviteCodeRepository _inviteCodeRepository;

    public InviteCodesController(IInviteCodeRepository inviteCodeRepository)
    {
        _inviteCodeRepository = inviteCodeRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InviteCode>>> GetAll()
    {
        var codes = await _inviteCodeRepository.GetAllAsync();
        return Ok(codes);
    }

    public class CreateInviteCodeRequest
    {
        public string? Code { get; set; }
        /// <summary>Kodun verileceği kullanıcı adı; giriş için kodla birlikte istenir.</summary>
        public string? UserName { get; set; }
        public int MaxUses { get; set; } = 1;
        public DateTime? ExpiresAt { get; set; }
    }

    [HttpPost]
    public async Task<ActionResult<InviteCode>> Create([FromBody] CreateInviteCodeRequest request)
    {
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()
            : request.Code.Trim().ToUpperInvariant();

        var created = await _inviteCodeRepository.CreateAsync(new InviteCode
        {
            Code = code,
            UserName = string.IsNullOrWhiteSpace(request.UserName) ? null : request.UserName.Trim(),
            MaxUses = request.MaxUses < 1 ? 1 : request.MaxUses,
            ExpiresAt = request.ExpiresAt,
        });

        return Created(string.Empty, created);
    }

    public class UpdateInviteCodeRequest
    {
        public int MaxUses { get; set; } = 1;
    }

    /// <summary>Kullanım hakkını güncelle. Yapılmış kullanımın altına inilemez.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<InviteCode>> Update(int id, [FromBody] UpdateInviteCodeRequest request)
    {
        var updated = await _inviteCodeRepository.UpdateMaxUsesAsync(id, request.MaxUses);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _inviteCodeRepository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
