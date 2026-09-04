using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Engine;

/// <summary>Eşleştirme için ekran talebi (modül ızgarasından türetilir).</summary>
public readonly record struct ScreenDemand(
    int TotalModules,
    int TotalResW,
    int TotalResH,
    int TotalPixels,
    decimal ModuleMaxWatts,
    decimal? ModuleVoltage);

/// <summary>Yönetim kataloğunun bellek görüntüsü (aktif kayıtlar süzülmüş olabilir).</summary>
public sealed class HardwareCatalogSnapshot
{
    public IReadOnlyList<PowerSupply> PowerSupplies { get; init; } = [];
    public IReadOnlyList<ReceivingCard> ReceivingCards { get; init; } = [];
    public IReadOnlyList<Processor> Processors { get; init; } = [];
    public IReadOnlyList<PatchCable> PatchCables { get; init; } = [];
    public IReadOnlyList<MiniPc> MiniPcs { get; init; } = [];
}

/// <summary>
/// Veritabanındaki gerçek katalog kayıtlarını ekran talebine göre seçer.
/// Jenerik/varsayılan model adı veya sabit "6 modül = 1 PSU" kuralı kullanmaz.
/// </summary>
public static class HardwareMatcher
{
    public const decimal VoltageToleranceV = 0.5m;

    public static ScreenDemand DemandFrom(Cabin cabin, int cols, int rows)
    {
        int modules = Math.Max(1, cols) * Math.Max(1, rows);
        int resW = cols * cabin.PixelWidth;
        int resH = rows * cabin.PixelHeight;
        long pixels = (long)resW * resH;
        if (pixels > int.MaxValue)
            throw new ArgumentException("Seçilen ızgara boyutu çok büyük — toplam piksel sayısı hesaplama sınırını aşıyor.");

        decimal? voltage = cabin.SupplyVoltage is > 0 ? cabin.SupplyVoltage : null;
        return new ScreenDemand(
            modules,
            resW,
            resH,
            (int)pixels,
            modules * cabin.PowerMaxWatts,
            voltage);
    }

    public static HardwareCatalogItems Match(
        ScreenDemand demand,
        bool hasMiniPc,
        HardwareCatalogSnapshot catalog,
        HardwareCatalogItems? requested = null)
    {
        var powerSupply = requested?.PowerSupply
            ?? SelectPowerSupply(demand, Active(catalog.PowerSupplies))
            ?? throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Güç Kaynağı bulunamadı.");

        var receivingCard = requested?.ReceivingCard
            ?? SelectReceivingCard(demand, Active(catalog.ReceivingCards))
            ?? throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Alıcı Kart bulunamadı.");

        var processor = requested?.Processor
            ?? SelectProcessor(demand, Active(catalog.Processors))
            ?? throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun İşlemci bulunamadı.");

        int receivingQty = ConfigurationCalculator.CountReceivingCards(
            demand.TotalResW, demand.TotalResH, demand.TotalPixels, receivingCard);
        int patchQty = ConfigurationCalculator.CountPatchCables(receivingQty);

        PatchCable? patchCable = requested?.PatchCable;
        if (patchCable == null && patchQty > 0)
        {
            patchCable = SelectPatchCable(Active(catalog.PatchCables))
                ?? throw new HardwareMatchException(
                    "Seçilen konfigürasyon için veritabanında uygun Patch Kablosu bulunamadı.");
        }

        MiniPc? miniPc = requested?.MiniPc;
        if (hasMiniPc && miniPc == null)
        {
            miniPc = SelectMiniPc(demand, Active(catalog.MiniPcs))
                ?? throw new HardwareMatchException(
                    "Seçilen konfigürasyon için veritabanında uygun Mini PC bulunamadı.");
        }

        return new HardwareCatalogItems
        {
            PowerSupply = powerSupply,
            ReceivingCard = receivingCard,
            Processor = processor,
            PatchCable = patchCable,
            MiniPc = miniPc,
        };
    }

    public static PowerSupply? SelectPowerSupply(ScreenDemand demand, IEnumerable<PowerSupply> items)
    {
        var candidates = items
            .Where(p => EffectiveWattCapacity(p) > 0)
            .Where(p => VoltageCompatible(p, demand.ModuleVoltage))
            .Where(p => EffectiveWattCapacity(p) >= OneModuleWatts(demand))
            .Select(p =>
            {
                int qty = ConfigurationCalculator.CountPowerSupplies(demand.ModuleMaxWatts, p, demand.ModuleVoltage);
                return (Item: p, Qty: qty, Cap: EffectiveWattCapacity(p));
            })
            .Where(x => x.Qty > 0)
            .ToList();

        return candidates
            .OrderBy(x => x.Qty)
            .ThenBy(x => x.Cap)
            .ThenBy(x => x.Item.Price)
            .ThenBy(x => x.Item.Id)
            .Select(x => x.Item)
            .FirstOrDefault();
    }

    public static ReceivingCard? SelectReceivingCard(ScreenDemand demand, IEnumerable<ReceivingCard> items)
    {
        var candidates = items
            .Where(c => PixelCapacity(c) > 0)
            .Select(c =>
            {
                int qty = ConfigurationCalculator.CountReceivingCards(
                    demand.TotalResW, demand.TotalResH, demand.TotalPixels, c);
                return (Item: c, Qty: qty, Cap: PixelCapacity(c));
            })
            .Where(x => x.Qty > 0)
            .ToList();

        return candidates
            .OrderBy(x => x.Qty)
            .ThenBy(x => x.Cap)
            .ThenBy(x => x.Item.Price)
            .ThenBy(x => x.Item.Id)
            .Select(x => x.Item)
            .FirstOrDefault();
    }

    public static Processor? SelectProcessor(ScreenDemand demand, IEnumerable<Processor> items)
    {
        var candidates = items
            .Where(p => p.EthernetPortCount > 0 || p.MaxPixelCapacityMpx > 0)
            .Select(p =>
            {
                int qty = ConfigurationCalculator.CountProcessors(demand.TotalPixels, p, out int ports);
                return (Item: p, Qty: qty, Ports: ports, Cap: p.MaxPixelCapacityMpx);
            })
            .Where(x => x.Qty > 0)
            .ToList();

        return candidates
            .OrderBy(x => x.Qty)
            .ThenBy(x => x.Item.EthernetPortCount <= 0 ? int.MaxValue : x.Item.EthernetPortCount)
            .ThenBy(x => x.Cap)
            .ThenBy(x => x.Item.Price)
            .ThenBy(x => x.Item.Id)
            .Select(x => x.Item)
            .FirstOrDefault();
    }

    public static PatchCable? SelectPatchCable(IEnumerable<PatchCable> items)
    {
        var list = items.ToList();
        if (list.Count == 0) return null;

        static int Rank(PatchCable c)
        {
            var blob = $"{c.CableType} {c.ConnectorType}".ToLowerInvariant();
            if (blob.Contains("rj45") || blob.Contains("cat6") || blob.Contains("cat5") || blob.Contains("ether"))
                return 0;
            return 1;
        }

        return list
            .OrderBy(Rank)
            .ThenBy(c => c.LengthMeters <= 0 ? decimal.MaxValue : c.LengthMeters)
            .ThenBy(c => c.Price)
            .ThenBy(c => c.Id)
            .First();
    }

    public static MiniPc? SelectMiniPc(ScreenDemand demand, IEnumerable<MiniPc> items)
    {
        var list = items.ToList();
        if (list.Count == 0) return null;

        var withRes = list
            .Select(p => (Item: p, Res: ParseResolution(p.MaxSupportedResolution)))
            .ToList();

        var covering = withRes
            .Where(x => x.Res is { } r && r.W >= demand.TotalResW && r.H >= demand.TotalResH)
            .OrderBy(x => x.Res!.Value.W * (long)x.Res.Value.H)
            .ThenBy(x => x.Item.Price)
            .ThenBy(x => x.Item.Id)
            .Select(x => x.Item)
            .FirstOrDefault();

        if (covering != null) return covering;

        return withRes
            .OrderBy(x => x.Res is null ? 1 : 0)
            .ThenBy(x => x.Item.Price)
            .ThenBy(x => x.Item.Id)
            .Select(x => x.Item)
            .First();
    }

    public static decimal EffectiveWattCapacity(PowerSupply psu)
    {
        decimal watt = psu.MaxPowerOutputWatt > 0 ? psu.MaxPowerOutputWatt : 0;
        decimal ampWatt = psu.Amperage > 0 && psu.OutputVoltage > 0
            ? psu.Amperage * psu.OutputVoltage
            : 0;
        if (watt > 0 && ampWatt > 0) return Math.Min(watt, ampWatt);
        if (watt > 0) return watt;
        return ampWatt;
    }

    public static long PixelCapacity(ReceivingCard card)
    {
        int w = Math.Max(0, card.MaxPixelWidth);
        int h = Math.Max(0, card.MaxPixelHeight);
        if (w > 0 && h > 0) return (long)w * h;
        if (w > 0) return w;
        if (h > 0) return h;
        return 0;
    }

    private static bool VoltageCompatible(PowerSupply psu, decimal? moduleVoltage)
    {
        if (moduleVoltage is null or <= 0) return true;
        if (psu.OutputVoltage <= 0) return true;
        return Math.Abs(psu.OutputVoltage - moduleVoltage.Value) <= VoltageToleranceV;
    }

    private static decimal OneModuleWatts(ScreenDemand demand) =>
        demand.TotalModules <= 0 ? demand.ModuleMaxWatts : demand.ModuleMaxWatts / demand.TotalModules;

    private static IEnumerable<T> Active<T>(IEnumerable<T> items) where T : HardwareComponent =>
        items.Where(x => x.IsActive);

    private static (int W, int H)? ParseResolution(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var parts = text.ToLowerInvariant().Replace(" ", "").Split('x', '*');
        if (parts.Length != 2) return null;
        if (!int.TryParse(parts[0], out int w) || !int.TryParse(parts[1], out int h)) return null;
        if (w <= 0 || h <= 0) return null;
        return (w, h);
    }
}
