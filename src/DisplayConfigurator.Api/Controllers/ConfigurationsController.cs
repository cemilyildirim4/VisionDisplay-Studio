using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigurationsController : ControllerBase
{
    private readonly IConfigurationService _configurationService;

    public ConfigurationsController(IConfigurationService configurationService)
    {
        _configurationService = configurationService;
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

    // GET: api/configurations/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConfigurationResponseDto>> GetById(int id)
    {
        var result = await _configurationService.GetByIdAsync(id);
        if (result == null)
            return NotFound(new { message = "Konfigürasyon bulunamadı." });

        return Ok(result);
    }

    // POST: api/configurations
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
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
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

    // GET: api/configurations/1/pdf (KAYITLI PROJE PDF'İ)
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> DownloadSpecSheet(int id)
    {
        var pdfBytes = await _configurationService.GenerateSpecSheetPdfAsync(id);
        
        if (pdfBytes == null)
            return NotFound("Konfigürasyon bulunamadı.");

        string fileName = $"Profesyonel_Rapor_{id}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // POST: api/configurations/export-pdf — teklif özeti + teknik şartname + ekran görseli
    [EnableRateLimiting("write")]
    [RequestSizeLimit(20_000_000)]
    [HttpPost("export-pdf")]
    public async Task<IActionResult> ExportPdfDirect([FromBody] PdfReportRequestDto dto)
    {
        try
        {
            var pdfBytes = await _configurationService.GenerateSpecSheetPdfFromDtoAsync(dto, dto.ToExtras());

            if (pdfBytes == null || pdfBytes.Length == 0)
                return BadRequest(new { message = "PDF raporu oluşturulamadı." });

            return File(pdfBytes, "application/pdf", "Profesyonel_Rapor.pdf");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "PDF oluşturulurken beklenmeyen bir hata oluştu.", error = ex.Message });
        }
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(sub, out var id) && id > 0 ? id : null;
    }
}
