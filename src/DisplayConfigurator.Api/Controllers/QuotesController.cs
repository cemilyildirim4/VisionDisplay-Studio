using System.Security.Claims;
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
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;

    public QuotesController(IQuoteRepository quoteRepository, IEmailService emailService, IConfiguration config)
    {
        _quoteRepository = quoteRepository;
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

    [Authorize]
    [BetaGate]
    [EnableRateLimiting("write")]
    [HttpPost]
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
            CustomerName = input.CustomerName,
            Phone = input.Phone,
            Email = input.Email,
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
            Status = "Beklemede",
            Revision = 1,
            UserId = GetUserId(),
        };

        var created = await _quoteRepository.CreateAsync(quote);

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

    private static bool HasCustomerPii(QuoteInputDto input) =>
        !string.IsNullOrWhiteSpace(input.CustomerName)
        || !string.IsNullOrWhiteSpace(input.Phone)
        || !string.IsNullOrWhiteSpace(input.Email)
        || !string.IsNullOrWhiteSpace(input.Address)
        || !string.IsNullOrWhiteSpace(input.Message);
}
