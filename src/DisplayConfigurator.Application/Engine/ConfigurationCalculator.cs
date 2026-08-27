using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// LED ekran / video duvarı yapılandırma HESAPLAMA MOTORU.
///
/// Bilerek ConfigurationService'ten ayrı, saf (side-effect'siz, veritabanı/HTTP
/// bağımlılığı olmayan) statik bir sınıfa taşındı: bu sayede motor, gerçek bir
/// Postgres bağlantısı veya repository mock'lamaya ihtiyaç duymadan doğrudan
/// birim testlerle (bkz. DisplayConfigurator.Tests) doğrulanabilir.
/// ConfigurationService artık bu sınıfı çağıran ince bir sarmalayıcıdır.
/// </summary>
public static class ConfigurationCalculator
{
    // 1 RJ45 portu standartta güvenli sınır olarak max 550.000 - 650.000 piksel taşır.
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
        // DTO zaten [Range(1,50)] ile sınırlı, ama servis doğrudan (validasyon
        // atlanarak) çağrılırsa 0/negatif ızgara sıfıra bölme veya anlamsız
        // sonuç üretmesin diye burada da güvenceye alınıyor.
        if (dto.Cols <= 0 || dto.Rows <= 0)
            throw new ArgumentException("Sütun ve satır sayısı 0'dan büyük olmalıdır.");

        int totalUnits = dto.Cols * dto.Rows; // Toplam Kabin veya Modül sayısı

        int totalWidthMm = dto.Cols * cabin.WidthMm;
        int totalHeightMm = dto.Rows * cabin.HeightMm;
        int totalResW = dto.Cols * cabin.PixelWidth;
        int totalResH = dto.Rows * cabin.PixelHeight;

        // `long` ile çarpılıp güvenli aralıkta olduğu doğrulanıyor; aksi halde
        // (örn. hatalı/aşırı büyük piksel değeri girilmiş bir kabin modeli)
        // int taşması sessizce yanlış (hatta negatif) bir piksel sayısına yol açardı.
        long totalPixelsLong = (long)totalResW * totalResH;
        if (totalPixelsLong > int.MaxValue)
            throw new ArgumentException("Seçilen ızgara boyutu çok büyük — toplam piksel sayısı hesaplama sınırını aşıyor.");
        int totalPixels = (int)totalPixelsLong;
        string totalResolution = $"{totalResW}x{totalResH}";

        // 1. MONTAJ TİPİ VE ALICI KART HESABI
        string assemblyType = !string.IsNullOrWhiteSpace(dto.AssemblyType)
            ? dto.AssemblyType
            : cabin.ProductType; // DTO'dan gelmezse veri tabanındaki varsayılanı al

        int modulesPerCard = dto.ModulesPerCard > 0
            ? dto.ModulesPerCard
            : (cabin.DefaultModulesPerCard > 0 ? cabin.DefaultModulesPerCard : 10);

        int receivingCardCount;

        if (assemblyType.Equals("MODULE", StringComparison.OrdinalIgnoreCase))
        {
            // Modül sistemi: Örn: 60 Modül / 10 = 6 Alıcı Kart
            receivingCardCount = (int)Math.Ceiling((double)totalUnits / modulesPerCard);
        }
        else
        {
            // Kabinli sistem: Her kabinde 1 kart var varsayılır
            receivingCardCount = totalUnits;
        }

        // 2. RJ45 PORT HESABI VE İŞLEMCİ SEÇİM MANTIĞI
        int requiredPorts = (int)Math.Ceiling((double)totalPixels / MaxPixelsPerPort);
        if (requiredPorts < 1) requiredPorts = 1;

        string recommendedProcessor = DetermineProcessor(totalPixels, requiredPorts);
        int processorQty = requiredPorts > 16
            ? (int)Math.Ceiling(requiredPorts / 16.0)
            : 1;

        // 3. DONANIM KIRILIMI (6 kalem)
        var hw = hardware ?? new HardwareCatalogItems();
        int moduleQty = totalUnits;
        int powerSupplyQty = totalUnits; // kabin/modül başına 1 PSU
        int receivingCardQty = receivingCardCount;
        int patchCableQty = receivingCardCount;
        int miniPcQty = dto.HasMiniPc ? 1 : 0;

        var breakdown = new List<HardwareLineItemDto>
        {
            Line("module", !string.IsNullOrWhiteSpace(cabin.ModelCode) ? cabin.ModelCode : "Modül",
                moduleQty, cabin.Price),
            Line("processor", DisplayName(hw.Processor, recommendedProcessor),
                processorQty, hw.Processor?.Price ?? 0m),
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

        // 4. GÜÇ VE ISI
        decimal maxWattsPerUnit = cabin.PowerMaxWatts;
        decimal avgWattsPerUnit = cabin.PowerTypicalWatts > 0
            ? cabin.PowerTypicalWatts
            : maxWattsPerUnit * 0.35m;

        decimal moduleMaxWatts = totalUnits * maxWattsPerUnit;
        decimal moduleAvgWatts = totalUnits * avgWattsPerUnit;

        decimal efficiency = hw.PowerSupply is { EfficiencyRatio: > 0 }
            ? hw.PowerSupply.EfficiencyRatio
            : 1m;

        decimal totalMaxWatts = ApplyPsuLosses(moduleMaxWatts, efficiency);
        decimal totalAvgWatts = ApplyPsuLosses(moduleAvgWatts, efficiency);

        decimal maxPowerKw = Math.Round(totalMaxWatts / 1000m, 2);
        decimal avgPowerKw = Math.Round(totalAvgWatts / 1000m, 2);
        decimal moduleHeatBtu = Math.Round(moduleMaxWatts * WattsToBtu, 2);
        decimal totalWeightKg = Math.Round(totalUnits * (cabin.WeightKg ?? 0m), 2);

        // 5. İŞÇİLİK VE ADMIN FİYATI
        decimal widthM = totalWidthMm / 1000m;
        decimal heightM = totalHeightMm / 1000m;
        decimal screenAreaM2 = Math.Round(widthM * heightM, 4);
        decimal laborMultiplier = dto.LaborCostMultiplier ?? 1m;
        decimal laborCost = Math.Round(screenAreaM2 * laborMultiplier, 2);
        decimal adminTotal = Math.Round(hardwareSubtotal + laborCost, 2);

        string aspectRatio = CalculateAspectRatio(totalWidthMm, totalHeightMm);
        bool isFullHd = totalResW >= 1920 && totalResH >= 1080;
        bool is4K = totalResW >= 3840 && totalResH >= 2160;

        return new ConfigurationResponseDto
        {
            ProjectName = string.IsNullOrWhiteSpace(dto.ProjectName) ? "Taslak Proje" : dto.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Müşteri Belirtilmedi" : dto.CustomerName,
            CabinId = dto.CabinId,
            CabinModelName = !string.IsNullOrWhiteSpace(cabin.ModelCode) ? cabin.ModelCode : "Standart Model",
            AssemblyType = assemblyType,
            ModulesPerCard = modulesPerCard,
            ReceivingCardCount = receivingCardCount,
            RequiredRj45Ports = requiredPorts,
            RecommendedProcessor = recommendedProcessor,
            Cols = dto.Cols,
            Rows = dto.Rows,
            TotalWidthMm = totalWidthMm,
            TotalHeightMm = totalHeightMm,
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
            TotalPrice = adminTotal,
            Status = "Beklemede",
            Revision = 1,
            CreatedAt = DateTime.UtcNow,
        };
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

    private static HardwareLineItemDto Line(string key, string name, int quantity, decimal unitPrice) =>
        new()
        {
            Key = key,
            Name = name,
            Quantity = quantity,
            UnitPrice = Math.Round(unitPrice, 2),
            LineTotal = Math.Round(quantity * unitPrice, 2),
        };

    private static string DisplayName(HardwareComponent? component, string fallback)
    {
        if (component == null) return fallback;
        if (!string.IsNullOrWhiteSpace(component.Name)) return component.Name;
        if (!string.IsNullOrWhiteSpace(component.Model)) return component.Model;
        return fallback;
    }

    // --- NOVASTAR İŞLEMCİ SEÇİM SİMÜLASYONU ---
    public static string DetermineProcessor(int totalPixels, int requiredPorts)
    {
        // 60 modül örneğimizde (P2.5 128x64px -> ~491k piksel):
        // TB40 hem piksel kapasitesini (1.3M) hem de port ihtiyacını (<= 2 Port) karşılar.
        if (totalPixels <= 1300000 && requiredPorts <= 2)
        {
            return "NovaStar TB40 (2 Port / Multi-Card)";
        }
        if (totalPixels <= 2300000 && requiredPorts <= 2)
        {
            return "NovaStar TB60 (2 Port)";
        }
        if (requiredPorts <= 4 && totalPixels <= 2600000)
        {
            return "NovaStar VX400 (4 Port)";
        }
        if (requiredPorts <= 6 && totalPixels <= 3900000)
        {
            return "NovaStar VX600 (6 Port)";
        }
        if (requiredPorts <= 10 && totalPixels <= 6500000)
        {
            return "NovaStar VX1000 (10 Port)";
        }
        if (requiredPorts <= 16)
        {
            return "NovaStar MCTRL4K (16 Port / 4K Pro)";
        }

        // Eskiden 16 portun üzerinde de sessizce MCTRL4K öneriliyordu — oysa tek
        // işlemci fiziksel port sınırını aşınca birden fazla işlemci (senkron
        // "cascading" bağlantı) gerekir. Bunu açıkça belirtiyoruz.
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
