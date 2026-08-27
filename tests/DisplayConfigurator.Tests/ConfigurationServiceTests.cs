using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;
using DisplayConfigurator.Infrastructure.Services;
using DisplayConfigurator.Tests.Fakes;
using Xunit;

namespace DisplayConfigurator.Tests;

/// <summary>
/// Servis katmanı için hafif "entegrasyon" testleri: gerçek Postgres yerine
/// bellek içi sahte repository'ler kullanılır (bkz. Fakes/InMemoryRepositories.cs),
/// ama akışın kendisi (DTO → motor → entity → repository → yanıt DTO) uçtan
/// uca ve gerçek servis koduyla çalıştırılır.
/// </summary>
public class ConfigurationServiceTests
{
    private static ConfigurationService CreateService(out InMemoryCabinRepository cabinRepo, out InMemoryConfigurationRepository configRepo)
    {
        cabinRepo = new InMemoryCabinRepository();
        configRepo = new InMemoryConfigurationRepository();
        cabinRepo.Seed(new Cabin
        {
            Id = 1,
            ModelCode = "P2.5-CABINET",
            ProductType = "CABINET",
            DefaultModulesPerCard = 10,
            Price = 1000m,
            WidthMm = 500,
            HeightMm = 500,
            PixelWidth = 200,
            PixelHeight = 200,
            WeightKg = 6.5m,
            PowerTypicalWatts = 200m,
            PowerMaxWatts = 600m,
        });
        return new ConfigurationService(configRepo, cabinRepo, new InMemoryHardwareCatalogRepository(), new StubPdfReportService());
    }

    private sealed class StubPdfReportService : DisplayConfigurator.Application.Interfaces.IPdfReportService
    {
        public byte[] Generate(
            ConfigurationResponseDto config,
            PdfReportExtras? extras = null,
            Cabin? cabin = null) => [0x25, 0x50, 0x44, 0x46]; // %PDF
    }

    [Fact]
    public async Task CreateAsync_GecerliDto_KaydiOlusturupTasklaDurumdaDoner()
    {
        var service = CreateService(out _, out var configRepo);
        var dto = new CreateConfigurationDto { ProjectName = "Uçtan Uca Test", CabinId = 1, Cols = 4, Rows = 3 };

        var result = await service.CreateAsync(dto, userId: 42);

        Assert.True(result.Id > 0);
        Assert.Equal("Beklemede", result.Status);
        Assert.Equal(1, result.Revision);
        Assert.Equal(12003m, result.TotalPrice);

        // Repository'ye gerçekten yazıldığını doğrula (yalnızca DTO'yu değil).
        var stored = await configRepo.GetByIdAsync(result.Id);
        Assert.NotNull(stored);
        Assert.Equal(42, stored!.UserId);
    }

    [Fact]
    public async Task CreateAsync_OlmayanKabinId_ArgumentExceptionFirlatir()
    {
        var service = CreateService(out _, out _);
        var dto = new CreateConfigurationDto { ProjectName = "Hatalı", CabinId = 999, Cols = 2, Rows = 2 };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task UpdateStatusAsync_GecerliId_DurumuGuncellerVeRevizyonuArtirir()
    {
        var service = CreateService(out _, out var configRepo);
        var dto = new CreateConfigurationDto { ProjectName = "Durum Testi", CabinId = 1, Cols = 2, Rows = 2 };
        var created = await service.CreateAsync(dto);

        var updated = await service.UpdateStatusAsync(created.Id, "Onaylandı");

        Assert.True(updated);
        var stored = await configRepo.GetByIdAsync(created.Id);
        Assert.Equal("Onaylandı", stored!.Status);
        Assert.Equal(2, stored.Revision); // 1 → 2
    }
}
