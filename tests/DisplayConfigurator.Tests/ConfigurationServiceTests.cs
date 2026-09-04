using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
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
    private static void SeedCatalog(InMemoryHardwareCatalogRepository hw)
    {
        hw.PowerSupplies[1] = new PowerSupply
        {
            Id = 1,
            Name = "MeanWell 4000",
            Price = 0m,
            IsActive = true,
            OutputVoltage = 5m,
            MaxPowerOutputWatt = 4000m,
            Amperage = 800m,
            EfficiencyRatio = 1m,
        };
        hw.ReceivingCards[1] = new ReceivingCard
        {
            Id = 1,
            Name = "Nova A8s",
            Price = 0m,
            IsActive = true,
            MaxPixelWidth = 1920,
            MaxPixelHeight = 1080,
        };
        hw.Processors[1] = new Processor
        {
            Id = 1,
            Name = "NovaStar VX1000",
            Price = 0m,
            IsActive = true,
            EthernetPortCount = 10,
            MaxPixelCapacityMpx = 6.5m,
        };
        hw.PatchCables[1] = new PatchCable
        {
            Id = 1,
            Name = "Cat6 1m",
            Price = 0m,
            IsActive = true,
            CableType = "Cat6",
            ConnectorType = "RJ45",
            LengthMeters = 1m,
        };
        hw.MiniPcs[1] = new MiniPc
        {
            Id = 1,
            Name = "OPS Mini",
            Price = 0m,
            IsActive = true,
            MaxSupportedResolution = "3840x2160",
        };
    }

    private static ConfigurationService CreateService(
        out InMemoryCabinRepository cabinRepo,
        out InMemoryConfigurationRepository configRepo,
        bool seedHardware = true)
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
            SupplyVoltage = 5m,
        });
        var hardwareRepo = new InMemoryHardwareCatalogRepository();
        if (seedHardware) SeedCatalog(hardwareRepo);
        return new ConfigurationService(
            configRepo,
            cabinRepo,
            hardwareRepo,
            new InMemorySystemSettingsRepository(),
            new StubPdfReportService());
    }

    private sealed class StubPdfReportService : DisplayConfigurator.Application.Interfaces.IPdfReportService
    {
        public byte[] Generate(
            ConfigurationResponseDto config,
            PdfReportExtras? extras = null,
            Cabin? cabin = null,
            PdfReportKind kind = PdfReportKind.Client) => [0x25, 0x50, 0x44, 0x46];
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

    [Fact]
    public async Task CreateAsync_KatalogBos_HardwareMatchExceptionFirlatir()
    {
        var service = CreateService(out _, out _, seedHardware: false);
        var dto = new CreateConfigurationDto { ProjectName = "Katalogsuz", CabinId = 1, Cols = 4, Rows = 3 };

        var ex = await Assert.ThrowsAsync<HardwareMatchException>(() => service.CreateAsync(dto));
        Assert.Contains("Güç Kaynağı", ex.Message);
    }

    [Fact]
    public async Task PreviewAsync_GercekKatalogKayitlariniDoner()
    {
        var service = CreateService(out _, out _);
        var dto = new CreateConfigurationDto { ProjectName = "Önizleme", CabinId = 1, Cols = 4, Rows = 3 };

        var result = await service.PreviewAsync(dto);

        Assert.Equal(1, result.PowerSupplyId);
        Assert.Equal(1, result.ReceivingCardId);
        Assert.Equal(1, result.ProcessorId);
        Assert.Contains("VX1000", result.RecommendedProcessor);
        Assert.Equal(12003m, result.TotalPrice);
    }
}
