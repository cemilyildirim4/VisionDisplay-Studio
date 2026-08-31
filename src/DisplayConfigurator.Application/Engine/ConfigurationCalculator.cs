using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// LED ekran yapılandırma HESAPLAMA MOTORU.
///
/// Kabin başına 1 PSU / 1 alıcı kart varsayımı yoktur. Adetler seçilen
/// modülün ölçüleri ve donanım katalog kapasitelerine göre türetilir.
/// Saf (side-effect'siz) statik sınıf — birim testlerle doğrudan doğrulanır.
/// </summary>
public static class ConfigurationCalculator
{
    /// <summary>1 RJ45 portunun güvenli piksel tavanı.</summary>
    public const int MaxPixelsPerPort = 650000;

    /// <summary>Bir güç kaynağı en fazla bu kadar modül besler.</summary>
    public const int ModulesPerPowerSupply = 6;

    /// <summary>Watt → BTU/saat dönüşüm katsayısı.</summary>
    public const decimal WattsToBtu = 3.412m;

    public static ConfigurationResponseDto Calculate(CreateConfigurationDto dto, Cabin cabin)
        => Calculate(dto, cabin, hardware: null);

    public static ConfigurationResponseDto Calculate(
        CreateConfigurationDto dto,
        Cabin cabin,
        HardwareCatalogItems? hardware)
    {
        if (dto.Cols <= 0 || dto.Rows <= 0)
            throw new ArgumentException("Sütun ve satır sayısı 0'dan büyük olmalıdır.");
        if (cabin.WidthMm <= 0 || cabin.HeightMm <= 0)
            throw new ArgumentException("Modül genişliği ve yüksekliği 0'dan büyük olmalıdır.");

        var hw = hardware ?? new HardwareCatalogItems();

        // 1. MODÜL: ekran mm / modül mm
        int screenWidthMm = dto.Cols * cabin.WidthMm;
        int screenHeightMm = dto.Rows * cabin.HeightMm;
        int horizontalModules = CountHorizontalModules(screenWidthMm, cabin.WidthMm);
        int verticalModules = CountVerticalModules(screenHeightMm, cabin.HeightMm);
        int totalModules = horizontalModules * verticalModules;

        int totalResW = horizontalModules * cabin.PixelWidth;
        int totalResH = verticalModules * cabin.PixelHeight;

        long totalPixelsLong = (long)totalResW * totalResH;
        if (totalPixelsLong > int.MaxValue)
            throw new ArgumentException("Seçilen ızgara boyutu çok büyük — toplam piksel sayısı hesaplama sınırını aşıyor.");
        int totalPixels = (int)totalPixelsLong;
        string totalResolution = $"{totalResW}x{totalResH}";

        string assemblyType = !string.IsNullOrWhiteSpace(dto.AssemblyType)
            ? dto.AssemblyType
            : (string.IsNullOrWhiteSpace(cabin.ProductType) ? "MODULE" : cabin.ProductType);

        int modulesPerCard = dto.ModulesPerCard > 0
            ? dto.ModulesPerCard
            : (cabin.DefaultModulesPerCard > 0 ? cabin.DefaultModulesPerCard : 10);

        // 2–5. DONANIM ADET KURALLARI
        int powerSupplyQty = CountPowerSupplies(totalModules);
        int receivingCardQty = CountReceivingCards(totalResW, totalResH, totalPixels, hw.ReceivingCard);
        int patchCableQty = CountPatchCables(receivingCardQty);
        int processorQty = CountProcessors(totalPixels, hw.Processor, out int requiredPorts);
        int miniPcQty = dto.HasMiniPc ? 1 : 0;

        string recommendedProcessor = DisplayName(hw.Processor, DetermineProcessor(totalPixels, requiredPorts));

        var breakdown = new List<HardwareLineItemDto>
        {
            Line("module", ModuleDisplayName(cabin), totalModules, cabin.Price),
            Line("processor", recommendedProcessor, processorQty, hw.Processor?.Price ?? 0m),
            Line("powerSupply", DisplayName(hw.PowerSupply, "Güç Kaynağı"),
                powerSupplyQty, hw.PowerSupply?.Price ?? 0m),
            Line("miniPc", DisplayName(hw.MiniPc, "Mini PC"),
                miniPcQty, hw.MiniPc?.Price ?? 0m),
            Line("patchCable", DisplayName(hw.PatchCable, "Patch Kablosu"),
                patchCableQty, hw.PatchCable?.Price ?? 0m),
            Line("receivingCard", DisplayName(hw.ReceivingCard, "Alıcı Kart"),
                receivingCardQty, hw.ReceivingCard?.Price ?? 0m),
        };

        decimal hardwareSubtotal = Math.Round(breakdown.Sum(x => x.LineTotal), 2);

        decimal maxWattsPerUnit = cabin.PowerMaxWatts;
        decimal avgWattsPerUnit = cabin.PowerTypicalWatts > 0
            ? cabin.PowerTypicalWatts
            : maxWattsPerUnit * 0.35m;

        decimal moduleMaxWatts = totalModules * maxWattsPerUnit;
        decimal moduleAvgWatts = totalModules * avgWattsPerUnit;

        decimal efficiency = hw.PowerSupply is { EfficiencyRatio: > 0 }
            ? hw.PowerSupply.EfficiencyRatio
            : 1m;

        decimal totalMaxWatts = ApplyPsuLosses(moduleMaxWatts, efficiency);
        decimal totalAvgWatts = ApplyPsuLosses(moduleAvgWatts, efficiency);

        decimal maxPowerKw = Math.Round(totalMaxWatts / 1000m, 2);
        decimal avgPowerKw = Math.Round(totalAvgWatts / 1000m, 2);
        decimal moduleHeatBtu = Math.Round(moduleMaxWatts * WattsToBtu, 2);
        decimal totalWeightKg = Math.Round(totalModules * (cabin.WeightKg ?? 0m), 2);

        decimal widthM = screenWidthMm / 1000m;
        decimal heightM = screenHeightMm / 1000m;
        decimal screenAreaM2 = Math.Round(widthM * heightM, 4);
        decimal laborMultiplier = dto.LaborCostMultiplier ?? 1m;
        decimal laborCost = Math.Round(screenAreaM2 * laborMultiplier, 2);
        decimal adminTotal = Math.Round(hardwareSubtotal + laborCost, 2);

        string aspectRatio = CalculateAspectRatio(screenWidthMm, screenHeightMm);
        bool isFullHd = totalResW >= 1920 && totalResH >= 1080;
        bool is4K = totalResW >= 3840 && totalResH >= 2160;

        return new ConfigurationResponseDto
        {
            ProjectName = string.IsNullOrWhiteSpace(dto.ProjectName) ? "Taslak Proje" : dto.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(dto.Customer?.Name)
                ? (string.IsNullOrWhiteSpace(dto.CustomerName) ? "Müşteri Belirtilmedi" : dto.CustomerName)
                : dto.Customer.Name,
            CabinId = dto.CabinId,
            CabinModelName = ModuleDisplayName(cabin),
            AssemblyType = assemblyType,
            ModulesPerCard = modulesPerCard,
            ReceivingCardCount = receivingCardQty,
            RequiredRj45Ports = requiredPorts,
            RecommendedProcessor = recommendedProcessor,
            Cols = horizontalModules,
            Rows = verticalModules,
            TotalWidthMm = screenWidthMm,
            TotalHeightMm = screenHeightMm,
            TotalResolution = totalResolution,
            TotalWeightKg = totalWeightKg,
            TotalMaxPowerKw = maxPowerKw,
            TotalAvgPowerKw = avgPowerKw,
            ModuleHeatDissipationBtu = moduleHeatBtu,
            AspectRatio = aspectRatio,
            IsFullHd = isFullHd,
            Is4K = is4K,
            HasMiniPc = dto.HasMiniPc,
            LaborCostMultiplier = laborMultiplier,
            ScreenAreaM2 = screenAreaM2,
            LaborCost = laborCost,
            HardwareSubtotal = hardwareSubtotal,
            PowerSupplyId = dto.PowerSupplyId,
            MiniPcId = dto.MiniPcId,
            PatchCableId = dto.PatchCableId,
            ReceivingCardId = dto.ReceivingCardId,
            ProcessorId = dto.ProcessorId,
            HardwareBreakdown = breakdown,
            PsuEfficiencyRatio = hw.PowerSupply is { EfficiencyRatio: > 0 }
                ? hw.PowerSupply.EfficiencyRatio
                : null,
            TotalPrice = adminTotal,
            Status = "Beklemede",
            Revision = 1,
            CreatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>Yatay modül = ekran genişliği / modül genişliği (yukarı yuvarlanır).</summary>
    public static int CountHorizontalModules(int screenWidthMm, int moduleWidthMm) =>
        Math.Max(1, (int)Math.Ceiling(screenWidthMm / (double)Math.Max(1, moduleWidthMm)));

    /// <summary>Dikey modül = ekran yüksekliği / modül yüksekliği (yukarı yuvarlanır).</summary>
    public static int CountVerticalModules(int screenHeightMm, int moduleHeightMm) =>
        Math.Max(1, (int)Math.Ceiling(screenHeightMm / (double)Math.Max(1, moduleHeightMm)));

    /// <summary>Güç kaynağı adedi = ceil(toplam modül / 6).</summary>
    public static int CountPowerSupplies(int totalModules) =>
        Math.Max(1, (int)Math.Ceiling(Math.Max(0, totalModules) / (double)ModulesPerPowerSupply));

    /// <summary>
    /// Alıcı kart: toplam çözünürlük (px) / kart MaxPixelCapacity (W×H).
    /// Katalog yoksa port başına 650.000 piksel tavanı kullanılır.
    /// </summary>
    public static int CountReceivingCards(int totalResW, int totalResH, int totalPixels, ReceivingCard? card)
    {
        long capacity = 0;
        if (card != null)
        {
            int capW = Math.Max(0, card.MaxPixelWidth);
            int capH = Math.Max(0, card.MaxPixelHeight);
            if (capW > 0 && capH > 0)
                capacity = (long)capW * capH;
            else if (capW > 0)
                capacity = capW;
            else if (capH > 0)
                capacity = capH;
        }

        if (capacity <= 0)
            capacity = MaxPixelsPerPort;

        int byPixels = Math.Max(1, (int)Math.Ceiling(Math.Max(0, totalPixels) / (double)capacity));

        if (card is { MaxPixelWidth: > 0, MaxPixelHeight: > 0 } && totalResW > 0 && totalResH > 0)
        {
            int byWidth = (int)Math.Ceiling(totalResW / (double)card.MaxPixelWidth);
            int byHeight = (int)Math.Ceiling(totalResH / (double)card.MaxPixelHeight);
            return Math.Max(byPixels, Math.Max(1, Math.Max(byWidth, byHeight)));
        }

        return byPixels;
    }

    /// <summary>Patch = max(0, alıcı kart − 1) (daisy-chain).</summary>
    public static int CountPatchCables(int receivingCardCount) =>
        Math.Max(0, receivingCardCount - 1);

    /// <summary>
    /// İşlemci adedi: toplam piksel, port başı bütçe ve işlemcinin port/Mpx tavanı.
    /// </summary>
    public static int CountProcessors(int totalPixels, Processor? processor, out int requiredPorts)
    {
        int portsOnUnit = processor is { EthernetPortCount: > 0 }
            ? processor.EthernetPortCount
            : 16;

        long pixelsPerPort = MaxPixelsPerPort;
        if (processor is { MaxPixelCapacityMpx: > 0 } && portsOnUnit > 0)
        {
            long fromCapacity = (long)(processor.MaxPixelCapacityMpx * 1_000_000m / portsOnUnit);
            if (fromCapacity > 0)
                pixelsPerPort = Math.Min(MaxPixelsPerPort, fromCapacity);
        }

        requiredPorts = Math.Max(1, (int)Math.Ceiling(Math.Max(0, totalPixels) / (double)pixelsPerPort));

        int byPorts = (int)Math.Ceiling(requiredPorts / (double)portsOnUnit);

        int byPixels = 1;
        if (processor is { MaxPixelCapacityMpx: > 0 })
        {
            long procCap = (long)(processor.MaxPixelCapacityMpx * 1_000_000m);
            if (procCap > 0)
                byPixels = (int)Math.Ceiling(totalPixels / (double)procCap);
        }

        return Math.Max(1, Math.Max(byPorts, byPixels));
    }

    /// <summary>
    /// Toplam Watt = Modül Gücü + (Güç Kaynağı Kayıpları / EfficiencyRatio).
    /// Kayıp = yük × (1 − η); η=1 iken (PSU yok) sonuç salt modül gücüdür.
    /// </summary>
    public static decimal ApplyPsuLosses(decimal moduleWatts, decimal efficiencyRatio)
    {
        var eta = efficiencyRatio > 0 ? efficiencyRatio : 1m;
        var psuLosses = moduleWatts * (1m - eta);
        return moduleWatts + (psuLosses / eta);
    }

    /// <summary>
    /// En uygun izleme mesafesi (m): pitch kuralı ile köşegen kuralının büyüğü.
    /// </summary>
    public static decimal ViewingDistanceM(Cabin cabin, int cols, int rows)
    {
        decimal pitchBase = cabin.ViewingDistanceM is > 0
            ? cabin.ViewingDistanceM.Value
            : Math.Round(cabin.PixelPitchMm * 2.5m, 1);

        if (cols <= 0 || rows <= 0) return pitchBase;

        var widthM = cols * (cabin.WidthMm / 1000m);
        var heightM = rows * (cabin.HeightMm / 1000m);
        var diagonalM = (decimal)Math.Sqrt((double)(widthM * widthM + heightM * heightM));
        return Math.Max(pitchBase, diagonalM);
    }

    private static HardwareLineItemDto Line(string key, string name, int quantity, decimal unitPrice) =>
        new()
        {
            Key = key,
            Name = name,
            Quantity = quantity,
            UnitPrice = Math.Round(unitPrice, 2),
            LineTotal = Math.Round(quantity * unitPrice, 2),
        };

    private static string ModuleDisplayName(Cabin cabin)
    {
        if (!string.IsNullOrWhiteSpace(cabin.Name)) return cabin.Name;
        if (!string.IsNullOrWhiteSpace(cabin.ModelCode)) return cabin.ModelCode;
        return "Modül";
    }

    private static string DisplayName(HardwareComponent? component, string fallback)
    {
        if (component == null) return fallback;
        if (!string.IsNullOrWhiteSpace(component.Name)) return component.Name;
        if (!string.IsNullOrWhiteSpace(component.Model)) return component.Model;
        return fallback;
    }

    public static string DetermineProcessor(int totalPixels, int requiredPorts)
    {
        if (totalPixels <= 1300000 && requiredPorts <= 2)
            return "NovaStar TB40 (2 Port / Multi-Card)";
        if (totalPixels <= 2300000 && requiredPorts <= 2)
            return "NovaStar TB60 (2 Port)";
        if (requiredPorts <= 4 && totalPixels <= 2600000)
            return "NovaStar VX400 (4 Port)";
        if (requiredPorts <= 6 && totalPixels <= 3900000)
            return "NovaStar VX600 (6 Port)";
        if (requiredPorts <= 10 && totalPixels <= 6500000)
            return "NovaStar VX1000 (10 Port)";
        if (requiredPorts <= 16)
            return "NovaStar MCTRL4K (16 Port / 4K Pro)";

        int unitsNeeded = (int)Math.Ceiling(requiredPorts / 16.0);
        return $"NovaStar MCTRL4K x{unitsNeeded} (senkronize çoklu işlemci — {requiredPorts} port gerekli)";
    }

    public static string CalculateAspectRatio(int width, int height)
    {
        if (height == 0) return "16:9";

        int gcd = FindGcd(width, height);
        int ratioW = width / gcd;
        int ratioH = height / gcd;

        double ratioDecimal = (double)width / height;
        if (Math.Abs(ratioDecimal - (16.0 / 9.0)) < 0.05) return "16:9";
        if (Math.Abs(ratioDecimal - (32.0 / 9.0)) < 0.05) return "32:9";
        if (Math.Abs(ratioDecimal - (4.0 / 3.0)) < 0.05) return "4:3";

        return $"{ratioW}:{ratioH}";
    }

    private static int FindGcd(int a, int b)
    {
        while (b != 0)
        {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }
}
