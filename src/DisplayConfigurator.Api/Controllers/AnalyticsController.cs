using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Admin paneli için: en çok konfigüre edilen modeller ve yardımcının
/// cevaplayamadığı en sık sorular (SSS önerisi). Sık istenip nadiren değiştiği
/// için 60 saniyelik kısa bir bellek içi önbellekle sunuluyor.
/// </summary>
[ApiController]
[Route("api/analytics")]
[AdminOnly]
public class AnalyticsController : ControllerBase
{
    private const string CacheKey = "analytics:dashboard-summary";
    private readonly IAnalyticsRepository _analyticsRepository;
    private readonly IMemoryCache _cache;

    public AnalyticsController(IAnalyticsRepository analyticsRepository, IMemoryCache cache)
    {
        _analyticsRepository = analyticsRepository;
        _cache = cache;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardSummaryDto>> GetDashboard()
    {
        var result = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60);
            return await _analyticsRepository.GetDashboardSummaryAsync();
        });

        return Ok(result);
    }
}
