using Microsoft.AspNetCore.Mvc;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Test/beta kullanıcılarının hata ve geri bildirim notları.
/// Yazma yalnızca Development veya beta ortamında açıktır; canlıda anonim
/// gönderme kapalıdır. Okuma ve silme yönetim panelindendir.
/// </summary>
[ApiController]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private const int NoteMaxLength = 2000;

    private readonly IFeedbackRepository _repository;

    public FeedbackController(IFeedbackRepository repository)
    {
        _repository = repository;
    }

    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeedbackReport>>> GetAll(
        [FromQuery] int limit = 200,
        [FromQuery] bool onlyOpen = false)
    {
        var take = Math.Clamp(limit, 1, 1000);
        return Ok(await _repository.GetAllAsync(take, onlyOpen));
    }

    [DevOrBetaWrite]
    [HttpPost]
    public async Task<ActionResult<FeedbackReport>> Create([FromBody] FeedbackReport input)
    {
        var note = input.Note?.Trim();
        if (string.IsNullOrWhiteSpace(note))
            return BadRequest(new { message = "Bildirim metni boş olamaz." });

        var report = new FeedbackReport
        {
            // Alanlar veritabanı sütun sınırlarına göre kırpılır: uzun bir
            // tarayıcı bilgisi ya da adres yüzünden bildirim kaybolmasın.
            Note = note[..Math.Min(note.Length, NoteMaxLength)],
            Role = Kisalt(input.Role, 20),
            PageUrl = Kisalt(input.PageUrl, 500),
            UserAgent = Kisalt(input.UserAgent, 300),
        };

        return Created(string.Empty, await _repository.CreateAsync(report));
    }

    [AdminOnly]
    [HttpPut("{id:int}/resolved")]
    public async Task<IActionResult> SetResolved(int id, [FromBody] ResolvedDto dto)
        => await _repository.SetResolvedAsync(id, dto.Resolved) ? NoContent() : NotFound();

    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => await _repository.DeleteAsync(id) ? NoContent() : NotFound();

    private static string? Kisalt(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        return v[..Math.Min(v.Length, max)];
    }

    public class ResolvedDto
    {
        public bool Resolved { get; set; }
    }
}
