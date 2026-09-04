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

    private static HardwareCatalogItems SampleHardware() => new()
    {
        PowerSupply = new PowerSupply
        {
            Id = 1,
            Name = "MeanWell 4000",
            Price = 0m,
            MaxPowerOutputWatt = 4000m,
            EfficiencyRatio = 1m,
            OutputVoltage = 5m,
            Amperage = 800m,
            IsActive = true,
        },
        ReceivingCard = new ReceivingCard
        {
            Id = 2,
            Name = "Nova A8s",
            Price = 0m,
            MaxPixelWidth = 1920,
            MaxPixelHeight = 1080,
            IsActive = true,
        },
        Processor = new Processor
        {
            Id = 3,
            Name = "NovaStar VX1000",
            Price = 0m,
            EthernetPortCount = 10,
            MaxPixelCapacityMpx = 6.5m,
            IsActive = true,
        },
        PatchCable = new PatchCable
        {
            Id = 4,
            Name = "Cat6 1m",
            Price = 0m,
            CableType = "Cat6",
            ConnectorType = "RJ45",
            LengthMeters = 1m,
            IsActive = true,
        },
    };

    [Fact]
    public void Calculate_4x3CabinetGrid_ProducesBeklenenDegerler()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto { ProjectName = "Test Projesi", CabinId = 1, Cols = 4, Rows = 3 };

        var result = ConfigurationCalculator.Calculate(dto, cabin, SampleHardware());

        // Fiziksel ölçüler: 4 sütun x 500mm = 2000mm, 3 satır x 500mm = 1500mm
        Assert.Equal(2000, result.TotalWidthMm);
        Assert.Equal(1500, result.TotalHeightMm);

        // Çözünürlük: 4*200 x 3*200 = 800x600 (~0,48 Mpx)
        Assert.Equal("800x600", result.TotalResolution);
        Assert.Equal(0.48, result.TotalPixelsMpx, 2);

        // 12 modül × 600 W = 7200 W; PSU 4000 W → ceil(7200/4000)=2.
        // 800x600, kart 1920x1080 → 1 alıcı kart.
        Assert.Equal("CABINET", result.AssemblyType);
        Assert.Equal(1, result.ReceivingCardCount);
        Assert.Equal(2, result.HardwareBreakdown.Single(x => x.Key == "powerSupply").Quantity);
        Assert.Equal(0, result.HardwareBreakdown.Single(x => x.Key == "patchCable").Quantity);

        // 800x600 = 480.000 piksel, tek RJ45 portu (max 650.000) yeterli.
        Assert.Equal(1, result.RequiredRj45Ports);
        Assert.Contains("VX1000", result.RecommendedProcessor);

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
    public void Calculate_AlicKartPikselKapasitesineGoreMinimumAdetDoner()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto
        {
            ProjectName = "Alıcı Kart",
            CabinId = 1,
            Cols = 6,
            Rows = 10, // 60 modül, 1200x2000 = 2.400.000 px
            AssemblyType = "MODULE",
        };
        var baseHw = SampleHardware();
        var hardware = new HardwareCatalogItems
        {
            PowerSupply = baseHw.PowerSupply,
            Processor = baseHw.Processor,
            PatchCable = baseHw.PatchCable,
            ReceivingCard = new ReceivingCard
            {
                Name = "Nova A5s",
                Price = 40m,
                MaxPixelWidth = 512,
                MaxPixelHeight = 512, // 262.144 px/kart → ceil(2.4e6/262144)=10
                IsActive = true,
            },
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin, hardware);

        Assert.Equal(10, result.ReceivingCardCount);
        Assert.Equal(9, result.HardwareBreakdown.Single(x => x.Key == "patchCable").Quantity);
        Assert.Equal(9, result.HardwareBreakdown.Single(x => x.Key == "powerSupply").Quantity); // 36000 W / 4000 W
        Assert.Equal(60, result.HardwareBreakdown.Single(x => x.Key == "module").Quantity);
    }

    [Fact]
    public void Calculate_FullHdVeUstuCozunurluk_BayraklariDogruIsaretler()
    {
        var cabin = SampleCabinet();
        // 200 piksel/kabin x 10 sütun = 2000 (>= 1920 FullHD eşiği)
        var dto = new CreateConfigurationDto { ProjectName = "FHD Testi", CabinId = 1, Cols = 10, Rows = 6 };

        var result = ConfigurationCalculator.Calculate(dto, cabin, SampleHardware());

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
        var baseHw = SampleHardware();
        var hardware = new HardwareCatalogItems
        {
            PowerSupply = baseHw.PowerSupply,
            ReceivingCard = baseHw.ReceivingCard,
            Processor = baseHw.Processor,
            PatchCable = baseHw.PatchCable,
            MiniPc = new MiniPc { Id = 9, Name = "Ops Mini", Price = 250m, IsActive = true },
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
        var baseHw = SampleHardware();
        var hardware = new HardwareCatalogItems
        {
            PowerSupply = new PowerSupply
            {
                Name = "MeanWell",
                Price = 80m,
                EfficiencyRatio = 0.9m,
                MaxPowerOutputWatt = 4000m,
                OutputVoltage = 5m,
                Amperage = 800m,
                HeatDissipationBtu = 0m,
                IsActive = true,
            },
            ReceivingCard = baseHw.ReceivingCard,
            Processor = baseHw.Processor,
            PatchCable = baseHw.PatchCable,
        };

        var result = ConfigurationCalculator.Calculate(dto, cabin, hardware);

        // 12 modül × 600 W = 7,2 kW; η=0,9 → 8 kW. PSU 4000 W → 2 × 80 $ = 160 $.
        Assert.Equal(8.00m, result.TotalMaxPowerKw);
        Assert.Equal(2.67m, result.TotalAvgPowerKw); // 2400 / 0.9 = 2666.6… → 2.67 kW
        Assert.Equal(160m, result.HardwareBreakdown.Single(x => x.Key == "powerSupply").LineTotal);
        Assert.Equal(2, result.HardwareBreakdown.Single(x => x.Key == "powerSupply").Quantity);
        Assert.Equal(12160m, result.HardwareSubtotal);

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

        var result = ConfigurationCalculator.Calculate(dto, cabin, SampleHardware());

        Assert.Equal(3m, result.ScreenAreaM2);
        Assert.Equal(150m, result.LaborCost);
        Assert.Equal(12150m, result.TotalPrice);
    }

    [Fact]
    public void Calculate_DonanimEksik_HardwareMatchExceptionFirlatir()
    {
        var cabin = SampleCabinet();
        var dto = new CreateConfigurationDto { ProjectName = "Eksik", CabinId = 1, Cols = 4, Rows = 3 };

        var ex = Assert.Throws<HardwareMatchException>(() => ConfigurationCalculator.Calculate(dto, cabin));
        Assert.Contains("Güç Kaynağı", ex.Message);
    }

    [Fact]
    public void CountPowerSupplies_WattKapasitesineGoreAdetDoner()
    {
        var psu = new PowerSupply { MaxPowerOutputWatt = 3600m };
        Assert.Equal(1, ConfigurationCalculator.CountPowerSupplies(600m, psu));
        Assert.Equal(1, ConfigurationCalculator.CountPowerSupplies(3600m, psu));
        Assert.Equal(2, ConfigurationCalculator.CountPowerSupplies(4200m, psu));
        Assert.Equal(2, ConfigurationCalculator.CountPowerSupplies(7200m, psu));
        Assert.Equal(10, ConfigurationCalculator.CountPowerSupplies(36000m, psu));
    }

    [Fact]
    public void CountPatchCables_DaisyChainAlicKartEksiBir()
    {
        Assert.Equal(0, ConfigurationCalculator.CountPatchCables(0));
        Assert.Equal(0, ConfigurationCalculator.CountPatchCables(1));
        Assert.Equal(5, ConfigurationCalculator.CountPatchCables(6));
    }

    [Fact]
    public void CountProcessors_PortVeMpxTavaninaGoreAdetDoner()
    {
        var proc = new Processor
        {
            Name = "VX1000",
            MaxPixelCapacityMpx = 6.5m,
            EthernetPortCount = 10,
        };

        int qty = ConfigurationCalculator.CountProcessors(3_000_000, proc, out int ports);
        Assert.Equal(1, qty);
        Assert.True(ports >= 1);

        int many = ConfigurationCalculator.CountProcessors(20_000_000, proc, out _);
        Assert.True(many >= 2);
    }

    [Fact]
    public void ApplyPsuLosses_Verim1_ModulGucunuKorur()
    {
        Assert.Equal(7200m, ConfigurationCalculator.ApplyPsuLosses(7200m, 1m));
        Assert.Equal(8000m, ConfigurationCalculator.ApplyPsuLosses(7200m, 0.9m));
    }
}
