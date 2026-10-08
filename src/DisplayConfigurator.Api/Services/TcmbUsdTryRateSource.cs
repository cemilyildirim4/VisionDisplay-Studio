using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace DisplayConfigurator.Api.Services;

/// <summary>TCMB today.xml forex satış. Sonuç bir saat bellekte tutulur.</summary>
public sealed class TcmbUsdTryRateSource : IUsdTryRateSource
{
    private const string CacheKey = "tcmb-usd-try-forex-selling";
    private static readonly Uri Today = new("https://www.tcmb.gov.tr/kurlar/today.xml");

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TcmbUsdTryRateSource> _logger;

    public TcmbUsdTryRateSource(HttpClient http, IMemoryCache cache, ILogger<TcmbUsdTryRateSource> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    public async Task<decimal?> TryGetAsync(CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(CacheKey, out decimal cached) && cached > 0)
            return cached;

        try
        {
            using var response = await _http.GetAsync(Today, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            var xml = await response.Content.ReadAsStringAsync(cancellationToken);
            var rate = TcmbRateParser.UsdForexSelling(xml);
            if (rate is > 0)
                _cache.Set(CacheKey, rate.Value, TimeSpan.FromHours(1));
            return rate;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "TCMB dolar kuru alınamadı.");
            return null;
        }
    }
}
