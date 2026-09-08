using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Domain.Entities;
using Xunit;

namespace DisplayConfigurator.Tests;

public class HardwareMatcherTests
{
    private static Cabin SampleCabin() => new()
    {
        Id = 1,
        ModelCode = "P2.5",
        WidthMm = 500,
        HeightMm = 500,
        PixelWidth = 200,
        PixelHeight = 200,
        PowerMaxWatts = 600m,
        SupplyVoltage = 5m,
    };

    private static HardwareCatalogSnapshot FullCatalog() => new()
    {
        PowerSupplies =
        [
            new PowerSupply
            {
                Id = 1,
                Name = "5V 4000W",
                Price = 100m,
                IsActive = true,
                OutputVoltage = 5m,
                MaxPowerOutputWatt = 4000m,
                Amperage = 800m,
                EfficiencyRatio = 0.94m,
            },
            new PowerSupply
            {
                Id = 2,
                Name = "12V 800W (yanlış voltaj)",
                Price = 10m,
                IsActive = true,
                OutputVoltage = 12m,
                MaxPowerOutputWatt = 8000m,
                Amperage = 666m,
            },
            new PowerSupply
            {
                Id = 3,
                Name = "5V 200W (yetersiz)",
                Price = 5m,
                IsActive = true,
                OutputVoltage = 5m,
                MaxPowerOutputWatt = 200m,
                Amperage = 40m,
            },
            new PowerSupply
            {
                Id = 4,
                Name = "Pasif 5V 4000W",
                Price = 1m,
                IsActive = false,
                OutputVoltage = 5m,
                MaxPowerOutputWatt = 4000m,
                Amperage = 800m,
            },
        ],
        ReceivingCards =
        [
            new ReceivingCard
            {
                Id = 1,
                Name = "A8s",
                Price = 50m,
                IsActive = true,
                MaxPixelWidth = 1920,
                MaxPixelHeight = 1080,
            },
            new ReceivingCard
            {
                Id = 2,
                Name = "A5s küçük",
                Price = 20m,
                IsActive = true,
                MaxPixelWidth = 512,
                MaxPixelHeight = 512,
            },
        ],
        Processors =
        [
            new Processor
            {
                Id = 1,
                Name = "VX1000",
                Price = 900m,
                IsActive = true,
                EthernetPortCount = 10,
                MaxPixelCapacityPerPort = 650_000,
                MaxPortWidth = 4096,
                MaxPortHeight = 4096,
            },
            new Processor
            {
                Id = 2,
                Name = "TB40 yetersiz",
                Price = 100m,
                IsActive = true,
                EthernetPortCount = 1,
                MaxPixelCapacityPerPort = 650_000,
                MaxPortWidth = 4096,
                MaxPortHeight = 4096,
            },
        ],
        PatchCables =
        [
            new PatchCable
            {
                Id = 1,
                Name = "Cat6 1m",
                Price = 8m,
                IsActive = true,
                CableType = "Cat6",
                ConnectorType = "RJ45",
                LengthMeters = 1m,
            },
        ],
        MiniPcs =
        [
            new MiniPc
            {
                Id = 1,
                Name = "OPS 4K",
                Price = 400m,
                IsActive = true,
                MaxSupportedResolution = "3840x2160",
            },
        ],
    };

    [Fact]
    public void Match_4x3_KapasiteVeVoltajaGorePsuSecer()
    {
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 4, 3);
        var matched = HardwareMatcher.Match(demand, hasMiniPc: false, FullCatalog());

        Assert.Equal(1, matched.PowerSupply!.Id);
        Assert.Equal("5V 4000W", matched.PowerSupply.Name);
        Assert.Equal(1, matched.ReceivingCard!.Id);
        Assert.Equal("TB40 yetersiz", matched.Processor!.Name);
        Assert.Null(matched.PatchCable);
        Assert.Null(matched.MiniPc);
    }

    [Fact]
    public void Match_BuyukCozunurluk_YeterliIslemciVeKartSecer()
    {
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 10, 6); // 2000x1200
        var matched = HardwareMatcher.Match(demand, hasMiniPc: true, FullCatalog());

        Assert.Equal("A8s", matched.ReceivingCard!.Name);
        Assert.Equal("VX1000", matched.Processor!.Name);
        Assert.NotNull(matched.MiniPc);
        Assert.Equal("OPS 4K", matched.MiniPc!.Name);
    }

    [Fact]
    public void Match_BirdenFazlaAlicKart_PatchKablosuBaglar()
    {
        var tinyCatalog = new HardwareCatalogSnapshot
        {
            PowerSupplies = FullCatalog().PowerSupplies,
            ReceivingCards =
            [
                new ReceivingCard
                {
                    Id = 9,
                    Name = "A5s",
                    IsActive = true,
                    MaxPixelWidth = 512,
                    MaxPixelHeight = 512,
                },
            ],
            Processors = FullCatalog().Processors,
            PatchCables = FullCatalog().PatchCables,
        };

        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 6, 10);
        var matched = HardwareMatcher.Match(demand, hasMiniPc: false, tinyCatalog);

        Assert.Equal(9, matched.ReceivingCard!.Id);
        Assert.NotNull(matched.PatchCable);
        Assert.Equal("Cat6 1m", matched.PatchCable!.Name);
    }

    [Fact]
    public void Match_UygunPsuYok_TurkceHataDoner()
    {
        var catalog = new HardwareCatalogSnapshot
        {
            PowerSupplies = [],
            ReceivingCards = FullCatalog().ReceivingCards,
            Processors = FullCatalog().Processors,
        };
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 4, 3);

        var ex = Assert.Throws<HardwareMatchException>(() =>
            HardwareMatcher.Match(demand, hasMiniPc: false, catalog));
        Assert.Equal("Seçilen konfigürasyon için veritabanında uygun Güç Kaynağı bulunamadı.", ex.Message);
    }

    [Fact]
    public void Match_UygunIslemciYok_TurkceHataDoner()
    {
        var catalog = new HardwareCatalogSnapshot
        {
            PowerSupplies = FullCatalog().PowerSupplies,
            ReceivingCards = FullCatalog().ReceivingCards,
            Processors = [],
        };
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 4, 3);

        var ex = Assert.Throws<HardwareMatchException>(() =>
            HardwareMatcher.Match(demand, hasMiniPc: false, catalog));
        Assert.Equal("Seçilen konfigürasyon için veritabanında uygun İşlemci bulunamadı.", ex.Message);
    }

    [Fact]
    public void Match_MiniPcIsteniyorAmaKatalogBos_TurkceHataDoner()
    {
        var catalog = new HardwareCatalogSnapshot
        {
            PowerSupplies = FullCatalog().PowerSupplies,
            ReceivingCards = FullCatalog().ReceivingCards,
            Processors = FullCatalog().Processors,
            MiniPcs = [],
        };
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 4, 3);

        var ex = Assert.Throws<HardwareMatchException>(() =>
            HardwareMatcher.Match(demand, hasMiniPc: true, catalog));
        Assert.Equal("Seçilen konfigürasyon için veritabanında uygun Mini PC bulunamadı.", ex.Message);
    }

    [Fact]
    public void SelectPowerSupply_PasifKayitlariAtlar()
    {
        var demand = HardwareMatcher.DemandFrom(SampleCabin(), 4, 3);
        var psu = HardwareMatcher.SelectPowerSupply(demand, FullCatalog().PowerSupplies.Where(x => x.IsActive));
        Assert.Equal(1, psu!.Id);
        Assert.NotEqual(4, psu.Id);
    }

    [Fact]
    public void EffectiveWattCapacity_WattVeAmperMininiAlir()
    {
        var psu = new PowerSupply
        {
            MaxPowerOutputWatt = 4000m,
            OutputVoltage = 5m,
            Amperage = 100m, // 500 W
        };
        Assert.Equal(500m, HardwareMatcher.EffectiveWattCapacity(psu));
    }
}
