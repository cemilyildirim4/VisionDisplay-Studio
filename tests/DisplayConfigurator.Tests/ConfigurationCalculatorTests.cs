using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Domain.Entities;
using Xunit;

namespace DisplayConfigurator.Tests;

/// <summary>
/// LED ekran hesaplama motorunun (bkz. ConfigurationCalculator) matematiksel
/// doğruluğunu doğrulayan birim testleri. Veritabanı/HTTP bağımlılığı yok —
/// motor tamamen saf fonksiyonlar olduğu için doğrudan test edilebiliyor.
/// </summary>
public class ConfigurationCalculatorTests
{
    /// <summary>
    /// Örnek P2.5 kabin: 500x500 mm gövde, 200x200 piksel (P2.5), 1000 $/adet,
    /// 6,5 kg, tipik 200 W / maksimum 600 W. Sayılar kolay doğrulanabilsin diye
    /// bilerek yuvarlak seçildi (bkz. ADIM 6 uçtan uca simülasyon raporu).
    /// </summary>
    private static Cabin SampleCabinet() => new()
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
    };

    [Fact]
    public void Calculate_4x3CabinetGrid_ProducesBeklenenDegerler()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto { ProjectName = "Test Projesi", CabinId = 1, Cols = 4, Rows = 3 };

        var result = ConfigurationCalculator.Calculate(dto, cabin);

        // Fiziksel ölçüler: 4 sütun x 500mm = 2000mm, 3 satır x 500mm = 1500mm
        Assert.Equal(2000, result.TotalWidthMm);
        Assert.Equal(1500, result.TotalHeightMm);

        // Çözünürlük: 4*200 x 3*200 = 800x600 (~0,48 Mpx)
        Assert.Equal("800x600", result.TotalResolution);
        Assert.Equal(0.48, result.TotalPixelsMpx, 2);

        // Montaj tipi kabinden geliyor (DTO'da belirtilmedi) → CABINET,
        // her kabin kendi alıcı kartına sahip olduğundan 12 kart.
        Assert.Equal("CABINET", result.AssemblyType);
        Assert.Equal(12, result.ReceivingCardCount);

        // 800x600 = 480.000 piksel, tek RJ45 portu (max 650.000) yeterli.
        Assert.Equal(1, result.RequiredRj45Ports);
        Assert.Contains("TB40", result.RecommendedProcessor);

        // Güç: 12 kabin x 600W maks. = 7,2 kW; 12 x 200W tipik = 2,4 kW.
        Assert.Equal(7.2m, result.TotalMaxPowerKw);
        Assert.Equal(2.4m, result.TotalAvgPowerKw);

        // Ağırlık: 12 x 6,5 kg = 78 kg.
        // Donanım: 12 x 1000 $ = 12.000 $. İşçilik: 2 m × 1,5 m = 3 m² × 1 = 3 $.
        Assert.Equal(78m, result.TotalWeightKg);
        Assert.Equal(12000m, result.HardwareSubtotal);
        Assert.Equal(3m, result.ScreenAreaM2);
        Assert.Equal(3m, result.LaborCost);
        Assert.Equal(12003m, result.TotalPrice);

        Assert.Equal(6, result.HardwareBreakdown.Count);
        Assert.Equal(12, result.HardwareBreakdown.Single(x => x.Key == "module").Quantity);
        Assert.Equal(0, result.HardwareBreakdown.Single(x => x.Key == "miniPc").Quantity);

        // 2000x1500 = 4:3 en-boy oranı.
        Assert.Equal("4:3", result.AspectRatio);
        Assert.False(result.IsFullHd);
        Assert.False(result.Is4K);
    }

    [Fact]
    public void Calculate_ModuleAssemblyType_AlicKartSayisiniModulBasinaHesaplar()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto
        {
            ProjectName = "Modül Testi",
            CabinId = 1,
            Cols = 6,
            Rows = 10, // 60 modül
            AssemblyType = "MODULE",
            ModulesPerCard = 10,
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin);

        Assert.Equal("MODULE", result.AssemblyType);
        // 60 modül / 10 modül-per-kart = 6 alıcı kart.
        Assert.Equal(6, result.ReceivingCardCount);
    }

    [Fact]
    public void Calculate_FullHdVeUstuCozunurluk_BayraklariDogruIsaretler()
    {
        var cabin = SampleCabinet();
        // 200 piksel/kabin x 10 sütun = 2000 (>= 1920 FullHD eşiği)
        var dto = new CreateConfigurationDto { ProjectName = "FHD Testi", CabinId = 1, Cols = 10, Rows = 6 };

        var result = ConfigurationCalculator.Calculate(dto, cabin);

        Assert.Equal("2000x1200", result.TotalResolution);
        Assert.True(result.IsFullHd);
        Assert.False(result.Is4K);
    }

    [Theory]
    [InlineData(0, 5)]
    [InlineData(5, 0)]
    [InlineData(-1, 5)]
    public void Calculate_GecersizIzgaraBoyutu_ArgumentExceptionFirlatir(int cols, int rows)
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto { ProjectName = "Geçersiz", CabinId = 1, Cols = cols, Rows = rows };

        Assert.Throws<ArgumentException>(() => ConfigurationCalculator.Calculate(dto, cabin));
    }

    [Fact]
    public void Calculate_AsiriBuyukPikselSayisi_TasmaKorumasiTetiklenir()
    {
        // Kasıtlı olarak gerçekçi olmayan (hatalı veri girişini simüle eden) bir
        // kabin: 50x50 ızgarada toplam piksel sayısı int.MaxValue'yu (2,147,483,647)
        // aşacak şekilde ayarlandı — motor sessizce yanlış/negatif bir sayı
        // üretmek yerine açıkça hata fırlatmalı.
        var cabin = SampleCabinet();
        cabin.PixelWidth = 100_000;
        cabin.PixelHeight = 100_000;
        var dto = new CreateConfigurationDto { ProjectName = "Taşma Testi", CabinId = 1, Cols = 50, Rows = 50 };

        var ex = Assert.Throws<ArgumentException>(() => ConfigurationCalculator.Calculate(dto, cabin));
        Assert.Contains("piksel", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(480_000, 1, "TB40")]
    [InlineData(2_000_000, 2, "TB60")]
    [InlineData(2_500_000, 4, "VX400")]
    [InlineData(3_800_000, 6, "VX600")]
    [InlineData(6_000_000, 10, "VX1000")]
    [InlineData(8_000_000, 16, "MCTRL4K")]
    public void DetermineProcessor_PikselVePortEsiklerineGoreDogruModeliSecer(int totalPixels, int ports, string expectedFragment)
    {
        var processor = ConfigurationCalculator.DetermineProcessor(totalPixels, ports);
        Assert.Contains(expectedFragment, processor);
    }

    [Fact]
    public void DetermineProcessor_16PortUstu_SenkronizeCokluIslemciOnerir()
    {
        // 20 port, tek MCTRL4K'nın (16 port) fiziksel sınırını aşıyor →
        // 2 senkronize işlemci (ceil(20/16) = 2) önerilmeli.
        var processor = ConfigurationCalculator.DetermineProcessor(totalPixels: 10_000_000, requiredPorts: 20);

        Assert.Contains("x2", processor);
        Assert.Contains("20 port", processor);
    }

    [Theory]
    [InlineData(1920, 1080, "16:9")]
    [InlineData(3840, 2160, "16:9")]
    [InlineData(2000, 1500, "4:3")]
    public void CalculateAspectRatio_BilinenOranlariEtiketler(int width, int height, string expected)
    {
        Assert.Equal(expected, ConfigurationCalculator.CalculateAspectRatio(width, height));
    }

    [Fact]
    public void Calculate_HasMiniPcTrue_MiniPcSatiriniDahilEder()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto
        {
            ProjectName = "Mini PC",
            CabinId = 1,
            Cols = 4,
            Rows = 3,
            HasMiniPc = true,
            MiniPcId = 9,
        };
        var hardware = new HardwareCatalogItems
        {
            MiniPc = new MiniPc { Id = 9, Name = "Ops Mini", Price = 250m },
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin, hardware);

        var miniPc = result.HardwareBreakdown.Single(x => x.Key == "miniPc");
        Assert.Equal(1, miniPc.Quantity);
        Assert.Equal(250m, miniPc.LineTotal);
        Assert.Equal(12250m, result.HardwareSubtotal);
        Assert.Equal(12253m, result.TotalPrice);
    }

    [Fact]
    public void Calculate_PowerSupplyVerimi_ToplamWattVeBtuFormulunuUygular()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto
        {
            ProjectName = "PSU",
            CabinId = 1,
            Cols = 4,
            Rows = 3,
            LaborCostMultiplier = 0m,
        };
        var hardware = new HardwareCatalogItems
        {
            PowerSupply = new PowerSupply
            {
                Name = "MeanWell",
                Price = 80m,
                EfficiencyRatio = 0.9m,
            },
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin, hardware);

        // Modül 7,2 kW; η=0,9 → 7,2 / 0,9 = 8 kW. PSU 12 × 80 $ = 960 $.
        Assert.Equal(8.00m, result.TotalMaxPowerKw);
        Assert.Equal(2.67m, result.TotalAvgPowerKw); // 2400 / 0.9 = 2666.6… → 2.67 kW
        Assert.Equal(960m, result.HardwareBreakdown.Single(x => x.Key == "powerSupply").LineTotal);
        Assert.Equal(12960m, result.HardwareSubtotal);

        // Modül ısı = 7200 × 3.412 = 24566.4; toplam BTU = (8000 × 3.412) + 24566.4
        Assert.Equal(24566.4m, result.ModuleHeatDissipationBtu);
        Assert.Equal(Math.Round(8000 * 3.412 + 24566.4), result.HeatDissipationBtu);
    }

    [Fact]
    public void Calculate_IsçilikCarpani_EkranAlaniIleCarpilir()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto
        {
            ProjectName = "İşçilik",
            CabinId = 1,
            Cols = 4,
            Rows = 3,
            LaborCostMultiplier = 50m,
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin);

        Assert.Equal(3m, result.ScreenAreaM2);
        Assert.Equal(150m, result.LaborCost);
        Assert.Equal(12150m, result.TotalPrice);
    }

    [Fact]
    public void ApplyPsuLosses_Verim1_ModulGucunuKorur()
    {
        Assert.Equal(7200m, ConfigurationCalculator.ApplyPsuLosses(7200m, 1m));
        Assert.Equal(8000m, ConfigurationCalculator.ApplyPsuLosses(7200m, 0.9m));
    }
}
