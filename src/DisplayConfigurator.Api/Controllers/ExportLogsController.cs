using System.Security.Claims;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// İndirme kayıtları. CSV/Excel dosyası tarayıcıda üretiliyor; sunucuya
/// düşen tek iz bu kayıt. Yazma her oturum sahibine açık (kendi indirmesini
/// bildiriyor), okuma yalnızca yöneticiye.
/// </summary>
[ApiController]
[Route("api/export-logs")]
public class ExportLogsController : ControllerBase
{
    private readonly IExportLogRepository _exportLogRepository;

    public ExportLogsController(IExportLogRepository exportLogRepository)
    {
        _exportLogRepository = exportLogRepository;
    }

    public class CreateExportLogRequest
    {
        /// <summary>"csv" veya "pdf"; başka değer csv sayılır.</summary>
        public string? Kind { get; set; }
        public string? ModelCode { get; set; }
        public string? CompanyName { get; set; }
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ExportLog>> Create([FromBody] CreateExportLogRequest request)
    {
        var kind = string.Equals(request.Kind, "pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "csv";
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var userId = int.TryParse(sub, out var id) && id > 0 ? id : (int?)null;

        var created = await _exportLogRepository.CreateAsync(new ExportLog
        {
            UserId = userId,
            // Ad, jetondan okunuyor: istemcinin gönderdiğine güvenilmiyor.
            UserName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("name") ?? User.FindFirstValue(ClaimTypes.Email),
            CompanyName = string.IsNullOrWhiteSpace(request.CompanyName) ? null : request.CompanyName.Trim(),
            ModelCode = string.IsNullOrWhiteSpace(request.ModelCode) ? null : request.ModelCode.Trim(),
            Kind = kind,
        });

        return Created(string.Empty, created);
    }

    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExportLog>>> GetRecent([FromQuery] int limit = 100)
    {
        var kayitlar = await _exportLogRepository.GetRecentAsync(Math.Clamp(limit, 1, 500));
        return Ok(kayitlar);
    }
}
