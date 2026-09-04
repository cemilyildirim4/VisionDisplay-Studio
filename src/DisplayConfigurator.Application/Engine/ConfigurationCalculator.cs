using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// LED ekran yapılandırma HESAPLAMA MOTORU.
///
/// Donanım adetleri ve fiyatları veritabanındaki gerçek katalog kayıtlarından
/// gelir. Katalog parçası yoksa jenerik modele düşülmez; <see cref="HardwareMatchException"/>.
/// Saf (side-effect'siz) statik sınıf — birim testlerle doğrudan doğrulanır.
/// </summary>
public static class ConfigurationCalculator
{
    /// <summary>1 RJ45 portunun güvenli piksel tavanı (işlemci port bütçesi).</summary>
    public const int MaxPixelsPerPort = 650000;

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

        decimal maxWattsPerUnit = cabin.PowerMaxWatts;
        decimal avgWattsPerUnit = cabin.PowerTypicalWatts > 0
            ? cabin.PowerTypicalWatts
            : maxWattsPerUnit * 0.35m;
        decimal moduleMaxWatts = totalModules * maxWattsPerUnit;
        decimal moduleAvgWatts = totalModules * avgWattsPerUnit;
        decimal? moduleVoltage = cabin.SupplyVoltage is > 0 ? cabin.SupplyVoltage : null;

        if (hw.PowerSupply == null)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Güç Kaynağı bulunamadı.");
        if (hw.ReceivingCard == null)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Alıcı Kart bulunamadı.");
        if (hw.Processor == null)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun İşlemci bulunamadı.");

        int powerSupplyQty = CountPowerSupplies(moduleMaxWatts, hw.PowerSupply, moduleVoltage);
        if (powerSupplyQty <= 0)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Güç Kaynağı bulunamadı.");

        int receivingCardQty = CountReceivingCards(totalResW, totalResH, totalPixels, hw.ReceivingCard);
        int patchCableQty = CountPatchCables(receivingCardQty);
        int processorQty = CountProcessors(totalPixels, totalResW, totalResH, hw.Processor, out int requiredPorts);
        int miniPcQty = dto.HasMiniPc ? 1 : 0;

        if (patchCableQty > 0 && hw.PatchCable == null)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Patch Kablosu bulunamadı.");
        if (miniPcQty > 0 && hw.MiniPc == null)
            throw new HardwareMatchException(
                "Seçilen konfigürasyon için veritabanında uygun Mini PC bulunamadı.");

        string recommendedProcessor = DisplayName(hw.Processor, hw.Processor.Name);

        var breakdown = new List<HardwareLineItemDto>
        {
            Line("module", ModuleDisplayName(cabin), totalModules, cabin.Price),
            Line("processor", recommendedProcessor, processorQty, hw.Processor.Price),
            Line("powerSupply", DisplayName(hw.PowerSupply, "Güç Kaynağı"),
                powerSupplyQty, hw.PowerSupply.Price),
            Line("miniPc", DisplayName(hw.MiniPc, "Mini PC"),
                miniPcQty, hw.MiniPc?.Price ?? 0m),
            Line("patchCable", DisplayName(hw.PatchCable, "Patch Kablosu"),
                patchCableQty, hw.PatchCable?.Price ?? 0m),
            Line("receivingCard", DisplayName(hw.ReceivingCard, "Alıcı Kart"),
                receivingCardQty, hw.ReceivingCard.Price),
        };

        decimal hardwareSubtotal = Math.Round(breakdown.Sum(x => x.LineTotal), 2);

        decimal efficiency = hw.PowerSupply.EfficiencyRatio > 0
            ? hw.PowerSupply.EfficiencyRatio
            : 1m;

        decimal accessoryWatts =
            receivingCardQty * hw.ReceivingCard.PowerDrawWatt
            + processorQty * hw.Processor.PowerDrawWatt
            + miniPcQty * (hw.MiniPc?.PowerDrawWatt ?? 0m);

        decimal totalMaxWatts = ApplyPsuLosses(moduleMaxWatts + accessoryWatts, efficiency);
        decimal totalAvgWatts = ApplyPsuLosses(moduleAvgWatts + accessoryWatts, efficiency);

        decimal maxPowerKw = Math.Round(totalMaxWatts / 1000m, 2);
        decimal avgPowerKw = Math.Round(totalAvgWatts / 1000m, 2);
        decimal moduleHeatBtu = Math.Round(
            moduleMaxWatts * WattsToBtu + powerSupplyQty * hw.PowerSupply.HeatDissipationBtu, 2);
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
            PowerSupplyId = hw.PowerSupply.Id,
            MiniPcId = hw.MiniPc?.Id,
            PatchCableId = hw.PatchCable?.Id,
            ReceivingCardId = hw.ReceivingCard.Id,
            ProcessorId = hw.Processor.Id,
            HardwareBreakdown = breakdown,
            PsuEfficiencyRatio = efficiency,
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

    /// <summary>
    /// Güç kaynağı adedi: toplam modül watt / PSU çıkış kapasitesi (Watt ve Amper).
    /// Kapasite yoksa 0 — çağıran hata üretir.
    /// </summary>
    public static int CountPowerSupplies(decimal moduleMaxWatts, PowerSupply psu, decimal? moduleVoltage = null)
    {
        decimal capacity = HardwareMatcher.EffectiveWattCapacity(psu);
        if (capacity <= 0) return 0;

        int byWatt = (int)Math.Ceiling((double)Math.Max(0, moduleMaxWatts) / (double)capacity);
        int byAmp = 1;
        decimal voltage = moduleVoltage is > 0 ? moduleVoltage.Value : psu.OutputVoltage;
        if (psu.Amperage > 0 && voltage > 0 && moduleMaxWatts > 0)
        {
            decimal totalAmps = moduleMaxWatts / voltage;
            byAmp = (int)Math.Ceiling((double)totalAmps / (double)psu.Amperage);
        }

        return Math.Max(1, Math.Max(byWatt, byAmp));
    }

    /// <summary>
    /// Alıcı kart: toplam çözünürlük (px) / kart piksel kapasitesi (W×H).
    /// Kapasitesi 0 olan kart kullanılamaz (0 döner).
    /// </summary>
    public static int CountReceivingCards(int totalResW, int totalResH, int totalPixels, ReceivingCard? card)
    {
        if (card == null) return 0;
        long capacity = HardwareMatcher.PixelCapacity(card);
        if (capacity <= 0) return 0;

        int byPixels = Math.Max(1, (int)Math.Ceiling(Math.Max(0, totalPixels) / (double)capacity));

        if (card.MaxPixelWidth > 0 && card.MaxPixelHeight > 0 && totalResW > 0 && totalResH > 0)
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
    /// İşlemci adedi: toplam piksel, port başı kapasite ve port genişlik/yükseklik tavanı.
    /// Toplam kapasite = EthernetPortCount × MaxPixelCapacityPerPort.
    /// </summary>
    public static int CountProcessors(int totalPixels, Processor? processor, out int requiredPorts)
        => CountProcessors(totalPixels, totalResW: 0, totalResH: 0, processor, out requiredPorts);

    public static int CountProcessors(
        int totalPixels,
        int totalResW,
        int totalResH,
        Processor? processor,
        out int requiredPorts)
    {
        int portsOnUnit = processor is { EthernetPortCount: > 0 }
            ? processor.EthernetPortCount
            : 1;

        int pixelsPerPort = PixelsPerPort(processor);
        int byPixels = Math.Max(1, (int)Math.Ceiling(Math.Max(0, totalPixels) / (double)pixelsPerPort));

        int byWidth = 0;
        if (processor is { MaxPortWidth: > 0 } && totalResW > 0)
            byWidth = (int)Math.Ceiling(totalResW / (double)processor.MaxPortWidth);

        int byHeight = 0;
        if (processor is { MaxPortHeight: > 0 } && totalResH > 0)
            byHeight = (int)Math.Ceiling(totalResH / (double)processor.MaxPortHeight);

        requiredPorts = Math.Max(1, Math.Max(byPixels, Math.Max(byWidth, byHeight)));

        int byPorts = (int)Math.Ceiling(requiredPorts / (double)portsOnUnit);
        long totalCapacity = (long)portsOnUnit * pixelsPerPort;
        int byTotalCapacity = totalCapacity > 0
            ? (int)Math.Ceiling(Math.Max(0, totalPixels) / (double)totalCapacity)
            : 1;

        return Math.Max(1, Math.Max(byPorts, byTotalCapacity));
    }

    /// <summary>Port başı piksel; katalog 0 ise 650.000 varsayılanı.</summary>
    public static int PixelsPerPort(Processor? processor) =>
        processor is { MaxPixelCapacityPerPort: > 0 }
            ? processor.MaxPixelCapacityPerPort
            : MaxPixelsPerPort;

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
