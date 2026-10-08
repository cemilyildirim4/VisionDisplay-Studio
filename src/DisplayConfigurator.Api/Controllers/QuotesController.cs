using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using DisplayConfigurator.Api.ExceptionHandling;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/quotes")]
public class QuotesController : ControllerBase
{
    private readonly IQuoteRepository _quoteRepository;
    private readonly IConfigurationService _configurations;
    private readonly ICabinRepository _cabins;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;

    public QuotesController(
        IQuoteRepository quoteRepository,
        IConfigurationService configurations,
        ICabinRepository cabins,
        IEmailService emailService,
        IConfiguration config)
    {
        _quoteRepository = quoteRepository;
        _configurations = configurations;
        _cabins = cabins;
        _emailService = emailService;
        _config = config;
    }

    // Yalnızca yönetim ekranı listeler — teklif kayıtları kişisel bilgi (ad, telefon,
    // e-posta, adres) içerdiği için herkese açık bırakılamaz. Liste büyüdükçe
    // sayfalama + serbest metin arama (ad/telefon/e-posta/model) destekler.
    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<PagedResultDto<Quote>>> GetQuotes([FromQuery] PagedQueryDto query)
    {
        var result = await _quoteRepository.GetPagedAsync(query);
        return Ok(result);
    }

    // Giriş yapmış bir bayi/müşteri yalnızca kendi tekliflerini görebilir.
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<Quote>>> GetMine()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var quotes = await _quoteRepository.GetByUserIdAsync(userId.Value);
        return Ok(quotes);
    }

    /// <summary>Teklif sahibi (veya admin) müşteri PDF'ini yeniden indirir.</summary>
    [Authorize]
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var quote = await _quoteRepository.GetByIdAsync(id);
        if (quote == null)
            return NotFound(new { message = "Teklif bulunamadı." });

        var userId = GetUserId();
        if (!IsAdmin() && (userId == null || quote.UserId != userId))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bu teklife erişim yetkiniz yok." });

        var draft = ReadDraft(quote.ConfigJson);
        var cabinId = quote.CabinId is > 0 ? quote.CabinId : draft.ModelId;
        if (cabinId is not > 0 && !string.IsNullOrWhiteSpace(quote.ModelCode ?? draft.ModelCode))
        {
            var cabin = await _cabins.GetByModelCodeAsync((quote.ModelCode ?? draft.ModelCode)!);
            cabinId = cabin?.Id;
        }
        if (cabinId is not > 0)
            return BadRequest(new { message = "Bu teklifte model kaydı yok; PDF yeniden üretilemez." });

        var dto = new CreateConfigurationDto
        {
            ProjectName = FirstNonEmpty(quote.CustomerName, quote.ModelCode) ?? "LED Ekran Projesi",
            CustomerName = quote.CustomerName,
            Phone = quote.Phone,
            Email = quote.Email,
            WallWidthM = quote.WallWidthM,
            WallHeightM = quote.WallHeightM,
            ScreenMode = quote.ScreenMode,
            CabinId = cabinId.Value,
            Cols = Math.Clamp(quote.Columns ?? draft.Cols ?? 1, 1, 50),
            Rows = Math.Clamp(quote.Rows ?? draft.Rows ?? 1, 1, 50),
            HasMiniPc = quote.HasMiniPc,
            MiniPcId = quote.MiniPcId,
            LaborCostMultiplier = quote.LaborCostMultiplier > 0 ? quote.LaborCostMultiplier : null,
        };
        if (dto.ProjectName.Length > 100)
            dto.ProjectName = dto.ProjectName[..100];

        var extras = new PdfReportExtras
        {
            Phone = quote.Phone,
            Email = quote.Email,
            Address = quote.Address,
            Message = quote.Message,
            ScreenType = quote.ScreenType,
            Resolution = quote.Resolution,
            ScreensSummary = quote.ScreensSummary,
            WallWidthM = quote.WallWidthM,
            WallHeightM = quote.WallHeightM,
            ScreenMode = quote.ScreenMode,
            PreviewImage = await _quoteRepository.GetPreviewImageAsync(id),
        };

        try
        {
            var pdf = await _configurations.GenerateSpecSheetPdfFromDtoAsync(
                dto, extras, PdfReportKind.Client, quote.CreatedAt);
            return File(pdf, "application/pdf", $"Musteri_Rapor_{id}.pdf");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [BetaGate]
    [EnableRateLimiting("write")]
    [HttpPost]
    [RequestSizeLimit(20_000_000)]
    [ProducesResponseType(typeof(Quote), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateQuote([FromBody] QuoteInputDto input)
    {
        if (!ModelState.IsValid)
            return ValidationProblemFactory.Create(ControllerContext);
        // Beta kapalıyken (BETA_ENABLED=false) teklif gövdesinde KVKK/PII alanı kabul edilmez.
        if (!_config.GetValue<bool>("Beta:Enabled") && HasCustomerPii(input))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Beta kapalıyken teklif isteğinde kişisel veri (ad, telefon, e-posta, adres, mesaj) kabul edilmez.",
                code = "PII_DISABLED",
            });
        }

        var quote = new Quote
        {
            CustomerName = FirstNonEmpty(input.Customer?.Name, input.CustomerName),
            Phone = FirstNonEmpty(input.Customer?.Phone, input.Phone),
            Email = FirstNonEmpty(input.Customer?.Email, input.Email),
            Address = input.Address,
            Message = input.Message,
            ModelCode = input.ModelCode,
            WallWidthM = input.WallWidthM,
            WallHeightM = input.WallHeightM,
            ScreenMode = input.ScreenMode,
            Columns = input.Columns,
            Rows = input.Rows,
            ScreenType = input.ScreenType,
            Resolution = input.Resolution,
            ScreensSummary = input.ScreensSummary,
            ConfigJson = input.ConfigJson,
            HasMiniPc = input.HasMiniPc,
            MiniPcId = input.MiniPcId,
            CabinId = input.CabinId is > 0 ? input.CabinId : null,
            Status = "Beklemede",
            Revision = 1,
            UserId = GetUserId(),
        };

        var created = await _quoteRepository.CreateAsync(quote);
        var preview = PreviewImageCodec.Decode(input.PreviewImageBase64);
        if (preview != null)
            await _quoteRepository.SetPreviewImageAsync(created.Id, preview);

        var adminEmail = _config["Notifications:AdminEmail"];
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            _ = _emailService.SendAsync(
                adminEmail,
                $"Yeni teklif talebi — {created.CustomerName ?? "İsimsiz"}",
                $"<p><b>{created.CustomerName}</b> ({created.Phone}, {created.Email}) yeni bir teklif talebi gönderdi.</p>" +
                $"<p>Model: {created.ModelCode} — {created.Columns}x{created.Rows} — {created.Resolution}</p>");
        }

        return CreatedAtAction(nameof(GetQuotes), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteQuote(int id)
    {
        var deleted = await _quoteRepository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // Teklif yaşam döngüsü: Beklemede -> Onaylandı / Reddedildi. Durum
    // değiştiğinde müşteriye (e-postası varsa) bilgilendirme gider.
    [AdminOnly]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var allowed = new[] { "Beklemede", "Onaylandı", "Reddedildi" };
        if (!allowed.Contains(dto.Status))
            return BadRequest(new { message = $"Durum şunlardan biri olmalı: {string.Join(", ", allowed)}" });

        var updated = await _quoteRepository.UpdateStatusAsync(id, dto.Status, dto.AdminNote);
        if (!updated) return NotFound();

        return Ok(new { message = "Durum güncellendi." });
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

    private readonly record struct DraftBits(int? ModelId, string? ModelCode, int? Cols, int? Rows);

    private static DraftBits ReadDraft(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return default;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            int? modelId = root.TryGetProperty("modelId", out var id) && id.TryGetInt32(out var n) && n > 0 ? n : null;
            string? modelCode = root.TryGetProperty("modelCode", out var code) && code.ValueKind == JsonValueKind.String
                ? code.GetString()
                : null;
            int? cols = root.TryGetProperty("cols", out var c) && c.TryGetInt32(out var cv) && cv > 0 ? cv : null;
            int? rows = root.TryGetProperty("rows", out var r) && r.TryGetInt32(out var rv) && rv > 0 ? rv : null;
            return new DraftBits(modelId, modelCode, cols, rows);
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private static bool HasCustomerPii(QuoteInputDto input) =>
        !string.IsNullOrWhiteSpace(FirstNonEmpty(input.Customer?.Name, input.CustomerName))
        || !string.IsNullOrWhiteSpace(FirstNonEmpty(input.Customer?.Phone, input.Phone))
        || !string.IsNullOrWhiteSpace(FirstNonEmpty(input.Customer?.Email, input.Email))
        || !string.IsNullOrWhiteSpace(input.Address)
        || !string.IsNullOrWhiteSpace(input.Message);

    private static string? FirstNonEmpty(string? a, string? b) =>
        !string.IsNullOrWhiteSpace(a) ? a : (!string.IsNullOrWhiteSpace(b) ? b : null);
}
