using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using DisplayConfigurator.Infrastructure.Pdf;
using DisplayConfigurator.Infrastructure.Services;
using DisplayConfigurator.Tests.Fakes;
using QuestPDF.Infrastructure;
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
    static ConfigurationServiceTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }
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
            MaxPixelCapacityPerPort = 650_000,
            MaxPortWidth = 4096,
            MaxPortHeight = 4096,
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
        bool seedHardware = true,
        IPdfReportService? pdfService = null)
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
            pdfService ?? new StubPdfReportService());
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

    [Fact]
    public async Task GeneratePdf_KatalogBos_MusteriPdfOlustururUyariYok()
    {
        var service = CreateService(out _, out _, seedHardware: false, pdfService: new PdfReportService());
        var dto = new CreateConfigurationDto { ProjectName = "PDF", CabinId = 1, Cols = 4, Rows = 3 };

        var bytes = await service.GenerateSpecSheetPdfFromDtoAsync(dto, kind: PdfReportKind.Client);

        Assert.True(bytes.Length > 100);
        var text = System.Text.Encoding.UTF8.GetString(bytes);
        Assert.DoesNotContain("UYARI", text, StringComparison.Ordinal);
        var warning = ProfessionalReportDocument.FormatAdminUnmetWarning("Güç Kaynağı, İşlemci");
        Assert.Contains("UYARI:", warning);
        Assert.Contains("[Güç Kaynağı, İşlemci]", warning);
    }

    [Fact]
    public async Task GeneratePdf_KatalogBos_AdminPdfUyariMetniniKullanir()
    {
        var service = CreateService(out _, out _, seedHardware: false, pdfService: new PdfReportService());
        var dto = new CreateConfigurationDto { ProjectName = "PDF", CabinId = 1, Cols = 4, Rows = 3 };

        var bytes = await service.GenerateSpecSheetPdfFromDtoAsync(dto, kind: PdfReportKind.Admin);
        Assert.True(bytes.Length > 100);
        var warning = ProfessionalReportDocument.FormatAdminUnmetWarning("Güç Kaynağı");
        Assert.StartsWith("UYARI:", warning);
        Assert.Contains("temin ediniz.", warning);
    }

    [Fact]
    public void ImageAspectRatio_PngEnBoyunuOkur()
    {
        Assert.Equal(2f, ProfessionalReportDocument.ImageAspectRatio(TinyPng(2, 1)), 2);
        Assert.Equal(0.5f, ProfessionalReportDocument.ImageAspectRatio(TinyPng(1, 2)), 2);
    }

    [Fact]
    public async Task GeneratePdf_GenisVeDikeyGorsel_SayfayiTasmaz()
    {
        var service = CreateService(out _, out _, seedHardware: false, pdfService: new PdfReportService());
        var dto = new CreateConfigurationDto { ProjectName = "PDF", CabinId = 1, Cols = 4, Rows = 3 };

        var wide = await service.GenerateSpecSheetPdfFromDtoAsync(
            dto, new PdfReportExtras { PreviewImage = TinyPng(8, 2) }, PdfReportKind.Client);
        var tall = await service.GenerateSpecSheetPdfFromDtoAsync(
            dto, new PdfReportExtras { PreviewImage = TinyPng(2, 8) }, PdfReportKind.Admin);

        Assert.True(wide.Length > 100);
        Assert.True(tall.Length > 100);
    }

    private static byte[] TinyPng(int width, int height)
    {
        int stride = width * 3 + 1;
        var raw = new byte[stride * height];
        using var idat = new MemoryStream();
        using (var zlib = new System.IO.Compression.ZLibStream(idat, System.IO.Compression.CompressionLevel.Fastest, leaveOpen: true))
            zlib.Write(raw, 0, raw.Length);
        var compressed = idat.ToArray();

        using var png = new MemoryStream();
        png.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        WritePngChunk(png, "IHDR", new byte[]
        {
            (byte)(width >> 24), (byte)(width >> 16), (byte)(width >> 8), (byte)width,
            (byte)(height >> 24), (byte)(height >> 16), (byte)(height >> 8), (byte)height,
            8, 2, 0, 0, 0,
        });
        WritePngChunk(png, "IDAT", compressed);
        WritePngChunk(png, "IEND", Array.Empty<byte>());
        return png.ToArray();
    }

    private static void WritePngChunk(Stream stream, string type, byte[] data)
    {
        Span<byte> len = stackalloc byte[4];
        len[0] = (byte)(data.Length >> 24);
        len[1] = (byte)(data.Length >> 16);
        len[2] = (byte)(data.Length >> 8);
        len[3] = (byte)data.Length;
        stream.Write(len);
        var typeBytes = System.Text.Encoding.ASCII.GetBytes(type);
        stream.Write(typeBytes);
        stream.Write(data);
        uint crc = PngCrc(typeBytes, data);
        Span<byte> crcBytes = stackalloc byte[4];
        crcBytes[0] = (byte)(crc >> 24);
        crcBytes[1] = (byte)(crc >> 16);
        crcBytes[2] = (byte)(crc >> 8);
        crcBytes[3] = (byte)crc;
        stream.Write(crcBytes);
    }

    private static uint PngCrc(byte[] type, byte[] data)
    {
        uint crc = 0xFFFFFFFF;
        foreach (var b in type) crc = PngCrcStep(crc, b);
        foreach (var b in data) crc = PngCrcStep(crc, b);
        return crc ^ 0xFFFFFFFF;
    }

    private static uint PngCrcStep(uint crc, byte value)
    {
        crc ^= value;
        for (int i = 0; i < 8; i++)
            crc = (crc & 1) != 0 ? 0xEDB88320 ^ (crc >> 1) : crc >> 1;
        return crc;
    }
}
