using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using DisplayConfigurator.Api.ExceptionHandling;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigurationsController : ControllerBase
{
    private readonly IConfigurationService _configurationService;
    private readonly ILogger<ConfigurationsController> _logger;

    public ConfigurationsController(
        IConfigurationService configurationService,
        ILogger<ConfigurationsController> logger)
    {
        _configurationService = configurationService;
        _logger = logger;
    }

    // GET: api/configurations — kayıtlı tüm projeleri listeler; yalnızca yönetim ekranı kullanır.
    // Sayfalama + serbest metin arama (proje adı/müşteri) destekler.
    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<PagedResultDto<ConfigurationResponseDto>>> GetAll([FromQuery] PagedQueryDto query)
    {
        var result = await _configurationService.GetPagedAsync(query);
        return Ok(result);
    }

    // Giriş yapmış bir bayi/müşteri yalnızca kendi kaydettiği projeleri görebilir.
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<ConfigurationResponseDto>>> GetMine()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _configurationService.GetByUserIdAsync(userId.Value);
        return Ok(result);
    }

    // GET: api/configurations/1 — sahibi veya Admin; aksi halde 403 (IDOR).
    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConfigurationResponseDto>> GetById(int id)
    {
        var result = await _configurationService.GetByIdAsync(id);
        if (result == null)
            return NotFound(new { message = "Konfigürasyon bulunamadı." });

        if (!CanAccessConfiguration(result.UserId))
            return ForbidConfigAccess();

        return Ok(result);
    }

    // POST: api/configurations — giriş yapmış bayi/admin; sahipsiz yazma yok.
    [Authorize]
    [BetaGate]
    [EnableRateLimiting("write")]
    [HttpPost]
    public async Task<ActionResult<ConfigurationResponseDto>> Create([FromBody] CreateConfigurationDto dto)
    {
        try
        {
            var result = await _configurationService.CreateAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException)
        {
            return Problem(
                title: "Geçersiz istek",
                detail: "Gönderilen konfigürasyon verisi işlenemedi.",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    // DELETE: api/configurations/1 — yalnızca yönetim ekranı silebilir.
    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _configurationService.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = $"ID'si {id} olan konfigürasyon bulunamadı." });

        return Ok(new { message = "Konfigürasyon başarıyla silindi." });
    }

    // Proje süreç takibi: Taslak -> Beklemede -> Onaylandı / Reddedildi.
    [AdminOnly]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var allowed = new[] { "Taslak", "Beklemede", "Onaylandı", "Reddedildi" };
        if (!allowed.Contains(dto.Status))
            return BadRequest(new { message = $"Durum şunlardan biri olmalı: {string.Join(", ", allowed)}" });

        var updated = await _configurationService.UpdateStatusAsync(id, dto.Status);
        if (!updated) return NotFound();

        return Ok(new { message = "Durum güncellendi." });
    }

    // GET: api/configurations/1/pdf — sahibi veya Admin.
    // Admin varsayılan olarak iç rapor (fiyat dökümü) alır; ?kind=client ile müşteri raporu.
    [Authorize]
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadSpecSheet(int id, [FromQuery] string? kind)
    {
        var existing = await _configurationService.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Konfigürasyon bulunamadı." });

        if (!CanAccessConfiguration(existing.UserId))
            return ForbidConfigAccess();

        var reportKind = ResolvePdfKind(kind);
        var pdfBytes = await _configurationService.GenerateSpecSheetPdfAsync(id, reportKind);
        if (pdfBytes == null)
            return NotFound(new { message = "Konfigürasyon bulunamadı." });

        string fileName = reportKind == PdfReportKind.Admin
            ? $"Ic_Rapor_{id}.pdf"
            : $"Musteri_Rapor_{id}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // POST: api/configurations/export-pdf — müşteri raporu (fiyat dökümü yok)
    [Authorize]
    [EnableRateLimiting("write")]
    [RequestSizeLimit(20_000_000)]
    [HttpPost("export-pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportPdfDirect([FromBody] PdfReportRequestDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblemFactory.Create(ControllerContext);

        try
        {
            var pdfBytes = await _configurationService.GenerateSpecSheetPdfFromDtoAsync(
                dto, dto.ToExtras(), PdfReportKind.Client);

            if (pdfBytes == null || pdfBytes.Length == 0)
            {
                return Problem(
                    title: "PDF raporu oluşturulamadı.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            return File(pdfBytes, "application/pdf", "Musteri_Rapor.pdf");
        }
        catch (ArgumentException)
        {
            return Problem(
                title: "Geçersiz PDF isteği",
                detail: "Gönderilen konfigürasyon verisi işlenemedi.",
                statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PDF oluşturulurken beklenmeyen hata.");
            return Problem(
                title: "PDF oluşturulamadı",
                detail: null,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private PdfReportKind ResolvePdfKind(string? kind)
    {
        if (string.Equals(kind, "client", StringComparison.OrdinalIgnoreCase)
            || string.Equals(kind, "musteri", StringComparison.OrdinalIgnoreCase))
            return PdfReportKind.Client;

        if (string.Equals(kind, "admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(kind, "ic", StringComparison.OrdinalIgnoreCase))
            return IsAdmin() ? PdfReportKind.Admin : PdfReportKind.Client;

        return IsAdmin() ? PdfReportKind.Admin : PdfReportKind.Client;
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(sub, out var id) && id > 0 ? id : null;
    }

    private bool IsAdmin()
    {
        if (User.Identity?.IsAuthenticated != true) return false;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Sahipsiz (UserId null) kayıtlar yalnızca Admin tarafından okunabilir.
    /// </summary>
    private bool CanAccessConfiguration(int? ownerUserId)
    {
        if (IsAdmin()) return true;
        var userId = GetUserId();
        return userId != null && ownerUserId != null && userId.Value == ownerUserId.Value;
    }

    private ObjectResult ForbidConfigAccess() =>
        StatusCode(StatusCodes.Status403Forbidden, new { message = "Bu kayda erişim yetkiniz yok." });
}
