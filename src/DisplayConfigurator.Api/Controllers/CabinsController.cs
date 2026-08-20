using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
// NOT: Rota bilinçli olarak "cabinets" — frontend bu adrese istek atıyor.
// Sınıf adı Cabins olduğu için [controller] kullanılsaydı /api/cabins olur ve 404 dönerdi.
[Route("api/cabinets")]
public class CabinsController : ControllerBase
{
    private readonly ICabinRepository _cabinRepository;
    private readonly ISeriesRepository _seriesRepository;
    private readonly IMemoryCache _cache;

    // Model listesi konfigüratörün en sık çağırdığı uç nokta ama admin dışında
    // dakikada birkaç kez değişir; 60 sn'lik bellek içi önbellek DB yükünü
    // gözle görülür şekilde azaltır. Yazma uçları (Create/Update/Delete) bu
    // kayıtları temizler, böylece admin bir model kaydettiğinde 60 sn
    // beklemeden görünür.
    //
    // Anahtarlar tek tek SİLİNMİYOR: liste anahtarı category ve productType ile
    // üretiliyor (ör. "cabins:list:led:CABINET") ve category serbest metin olduğu
    // için kaç anahtar oluştuğu önceden bilinemez. Onun yerine bütün liste
    // kayıtları ortak bir iptal jetonuna bağlanıyor; yazma işleminde jeton iptal
    // edilince hepsi birden düşüyor. (Eskiden yalnızca "cabins:list:all" gibi iki
    // parçalı anahtarlar siliniyordu; bu anahtarlar hiç var olmadığı için yeni
    // model 60 saniye boyunca yönetim panelinde görünmüyordu.)
    private const string CabinsCacheKeyPrefix = "cabins:list:";
    private const string SeriesCacheKey = "cabins:series";
    // GetCabins anahtarı "cabins:list:{category}:{productType}" biçiminde.
    // InvalidateCache bu kombinasyonların hepsini silmeli; aksi halde admin
    // model sildiğinde konfigüratör 60 sn boyunca eski listeyi görür.
    private static readonly string[] CabinListCacheCategories = ["all", "led", "videowall"];
    private static readonly string[] CabinListCacheTypes = ["all", "CABINET", "MODULE"];

    // Controller her istekte yeniden kurulduğu için jeton static tutuluyor.
    private static CancellationTokenSource _listeSifirlama = new();

    public CabinsController(ICabinRepository cabinRepository, ISeriesRepository seriesRepository, IMemoryCache cache)
    {
        _cabinRepository = cabinRepository;
        _seriesRepository = seriesRepository;
        _cache = cache;
    }

    // GET: api/cabinets
    // İsteğe bağlı: ?category=led|videowall  &  ?productType=CABINET|MODULE
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Cabin>>> GetCabins(
        [FromQuery] string? category,
        [FromQuery] string? productType)
    {
        if (productType is not null &&
            !productType.Equals("CABINET", StringComparison.OrdinalIgnoreCase) &&
            !productType.Equals("MODULE", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "productType 'CABINET' veya 'MODULE' olmalı." });
        }

        var normalizedType = productType?.ToUpperInvariant();
        var cacheKey = $"{CabinsCacheKeyPrefix}{category ?? "all"}:{normalizedType ?? "all"}";
        var cabins = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60);
            entry.AddExpirationToken(new CancellationChangeToken(_listeSifirlama.Token));
            return await _cabinRepository.GetAllAsync(category, normalizedType);
        });

        return Ok(cabins);
    }

    // GET: api/cabinets/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Cabin>> GetCabin(int id)
    {
        var cabin = await _cabinRepository.GetByIdAsync(id);
        return cabin is null ? NotFound() : Ok(cabin);
    }

    // GET: api/cabinets/series
    [HttpGet("series")]
    public async Task<ActionResult<IEnumerable<Series>>> GetSeries()
    {
        var series = await _cache.GetOrCreateAsync(SeriesCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60);
            entry.AddExpirationToken(new CancellationChangeToken(_listeSifirlama.Token));
            return await _seriesRepository.GetAllAsync();
        });

        return Ok(series);
    }

    // POST: api/cabinets/series — yeni seri (ürün ailesi) ekler
    [AdminOnly]
    [HttpPost("series")]
    public async Task<ActionResult<Series>> CreateSeries([FromBody] SeriesInputDto input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Seri adı boş olamaz." });

        var series = new Series { Name = input.Name.Trim(), Description = input.Description };
        var created = await _seriesRepository.CreateAsync(series);
        InvalidateCache();
        return Created(string.Empty, created);
    }

    // PUT: api/cabinets/series/5 — mevcut seriyi günceller
    [AdminOnly]
    [HttpPut("series/{id:int}")]
    public async Task<IActionResult> UpdateSeries(int id, [FromBody] SeriesInputDto input)
    {
        if (!await _seriesRepository.ExistsAsync(id)) return NotFound();
        if (string.IsNullOrWhiteSpace(input.Name))
            return BadRequest(new { message = "Seri adı boş olamaz." });

        var series = new Series { Id = id, Name = input.Name.Trim(), Description = input.Description };
        await _seriesRepository.UpdateAsync(series);
        InvalidateCache();
        return Ok(series);
    }

    // DELETE: api/cabinets/series/5
    // NOT: series → cabins ilişkisi ON DELETE CASCADE olduğu için, seriye bağlı
    // kabin/panel varsa silme reddedilir — aksi halde tüm o modeller sessizce silinirdi.
    [AdminOnly]
    [HttpDelete("series/{id:int}")]
    public async Task<IActionResult> DeleteSeries(int id)
    {
        if (!await _seriesRepository.ExistsAsync(id)) return NotFound();

        var cabinCount = await _seriesRepository.CountCabinsAsync(id);
        if (cabinCount > 0)
        {
            return BadRequest(new
            {
                message = $"Bu seriye bağlı {cabinCount} model var. Önce o modelleri başka bir seriye taşıyın ya da silin.",
            });
        }

        await _seriesRepository.DeleteAsync(id);
        InvalidateCache();
        return NoContent();
    }

    // POST: api/cabinets — yeni kabin ekler
    [AdminOnly]
    [HttpPost]
    public async Task<ActionResult<Cabin>> CreateCabin([FromBody] CabinInputDto input)
    {
        var error = await ValidateAsync(input, null);
        if (error is not null) return BadRequest(new { message = error });

        var cabin = new Cabin();
        Apply(input, cabin);

        var created = await _cabinRepository.CreateAsync(cabin);
        var withSeries = await _cabinRepository.GetByIdAsync(created.Id);
        InvalidateCache();

        return CreatedAtAction(nameof(GetCabin), new { id = created.Id }, withSeries);
    }

    // PUT: api/cabinets/5 — mevcut kabini günceller
    [AdminOnly]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Cabin>> UpdateCabin(int id, [FromBody] CabinInputDto input)
    {
        var existing = await _cabinRepository.GetByIdAsync(id);
        if (existing is null) return NotFound();

        var error = await ValidateAsync(input, id);
        if (error is not null) return BadRequest(new { message = error });

        Apply(input, existing);
        await _cabinRepository.UpdateAsync(existing);

        var updated = await _cabinRepository.GetByIdAsync(id);
        InvalidateCache();
        return Ok(updated);
    }

    // DELETE: api/cabinets/5
    // configurations.cabin_id → cabins(id) FK'si ON DELETE RESTRICT; kayıtlı
    // projesi olan bir modeli silmek Postgres 23503 fırlatırdı ve global
    // handler bunu yanlışlıkla 503 Service Unavailable olarak gösteriyordu.
    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCabin(int id)
    {
        var existing = await _cabinRepository.GetByIdAsync(id);
        if (existing is null) return NotFound();

        var configCount = await _cabinRepository.CountConfigurationsAsync(id);
        if (configCount > 0)
        {
            return Conflict(new
            {
                message = $"Bu model {configCount} kayıtlı projede kullanılıyor. Silmek için önce ilgili projeleri silin.",
            });
        }

        await _cabinRepository.DeleteAsync(id);
        InvalidateCache();
        return NoContent();
    }

    private void InvalidateCache()
    {
        // Jetonu iptal et: ona bağlı bütün liste kayıtları (hangi category /
        // productType kombinasyonuyla üretilmiş olursa olsun) anında düşer.
        var eski = Interlocked.Exchange(ref _listeSifirlama, new CancellationTokenSource());
        eski.Cancel();
        eski.Dispose();

        foreach (var category in CabinListCacheCategories)
        {
            foreach (var productType in CabinListCacheTypes)
            {
                _cache.Remove($"{CabinsCacheKeyPrefix}{category}:{productType}");
            }
        }
        _cache.Remove(SeriesCacheKey);
    }

    private async Task<string?> ValidateAsync(CabinInputDto input, int? currentId)
    {
        if (string.IsNullOrWhiteSpace(input.ModelCode))
            return "Model kodu boş olamaz.";

        if (input.Category is not ("led" or "videowall"))
            return "Kategori 'led' veya 'videowall' olmalı.";

        if (input.WidthMm <= 0 || input.HeightMm <= 0)
            return "Genişlik ve yükseklik 0'dan büyük olmalı.";

        if (input.PixelPitchMm <= 0)
            return "Piksel aralığı 0'dan büyük olmalı.";

        if (input.ProductType is not ("CABINET" or "MODULE"))
            return "Ürün tipi 'CABINET' (Kabin) veya 'MODULE' (Tekli Panel) olmalı.";

        if (input.Price < 0)
            return "Fiyat negatif olamaz.";

        if (input.DefaultModulesPerCard <= 0)
            return "Kart başına modül sayısı 0'dan büyük olmalı.";

        if (input.IpRating is int ip && (ip < 10 || ip > 69))
            return "IP sınıfı 10–69 aralığında olmalı (ör. 20, 30, 65).";

        if (!await _seriesRepository.ExistsAsync(input.SeriesId))
            return "Seçilen seri bulunamadı.";

        if (await _cabinRepository.ModelCodeExistsAsync(input.ModelCode, currentId))
            return $"'{input.ModelCode}' model kodu zaten kullanılıyor.";

        return null;
    }

    private static void Apply(CabinInputDto input, Cabin cabin)
    {
        cabin.SeriesId = input.SeriesId;
        cabin.Category = input.Category;
        cabin.ModelCode = input.ModelCode.Trim();
        cabin.ProductType = input.ProductType;
        cabin.DefaultModulesPerCard = input.DefaultModulesPerCard;
        cabin.Price = input.Price;
        cabin.PixelPitchMm = input.PixelPitchMm;
        cabin.WidthMm = input.WidthMm;
        cabin.HeightMm = input.HeightMm;
        cabin.DepthMm = input.DepthMm;
        cabin.WeightKg = input.WeightKg;
        cabin.PixelWidth = input.PixelWidth;
        cabin.PixelHeight = input.PixelHeight;
        cabin.BrightnessNits = input.BrightnessNits;
        cabin.RefreshRateHz = input.RefreshRateHz;
        cabin.PowerTypicalWatts = input.PowerTypicalWatts;
        cabin.PowerMaxWatts = input.PowerMaxWatts;
        cabin.ViewingDistanceM = input.ViewingDistanceM;
        cabin.SizeInch = input.SizeInch;
        cabin.BezelMm = input.BezelMm;
        cabin.FilterCategory = input.FilterCategory;
        cabin.Usage = input.Usage;
        cabin.Installation = input.Installation;
        cabin.Configurable = input.Configurable;
        cabin.Service = input.Service;
        cabin.LedType = input.LedType;
        cabin.Protection = input.Protection;
        cabin.Certification = input.Certification;
        cabin.Features = input.Features;
        cabin.IpRating = input.IpRating;
        cabin.Featured = input.Featured;
        cabin.ImageUrl = input.ImageUrl;
        cabin.SboxCode = input.SboxCode;
        cabin.JigCode = input.JigCode;
        cabin.PowerCord110Code = input.PowerCord110Code;
        cabin.PowerCord220Code = input.PowerCord220Code;
    }
}
