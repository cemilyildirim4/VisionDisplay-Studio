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

    public static ConfigurationResponseDto Calculate(CreateConfigurationDto dto, Cabin cabin)
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

        // 3. GÜÇ, AĞIRLIK VE FİYAT HESAPLARI
        decimal maxWattsPerUnit = cabin.PowerMaxWatts;
        decimal avgWattsPerUnit = cabin.PowerTypicalWatts > 0
            ? cabin.PowerTypicalWatts
            : maxWattsPerUnit * 0.35m;

        decimal maxPowerKw = Math.Round((totalUnits * maxWattsPerUnit) / 1000m, 2);
        decimal avgPowerKw = Math.Round((totalUnits * avgWattsPerUnit) / 1000m, 2);
        decimal totalWeightKg = Math.Round(totalUnits * (cabin.WeightKg ?? 0m), 2);

        string aspectRatio = CalculateAspectRatio(totalWidthMm, totalHeightMm);
        bool isFullHd = totalResW >= 1920 && totalResH >= 1080;
        bool is4K = totalResW >= 3840 && totalResH >= 2160;
        // 2 ondalığa yuvarlanmazsa PDF/arayüzde "1234.5600000001 ₺" gibi kuruş
        // hataları birikip görünürdü — parasal her alan burada normalize edilir.
        decimal calculatedPrice = Math.Round(totalUnits * cabin.Price, 2);

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
            AspectRatio = aspectRatio,
            IsFullHd = isFullHd,
            Is4K = is4K,
            TotalPrice = calculatedPrice,
            Status = "Beklemede",
            Revision = 1,
            CreatedAt = DateTime.UtcNow,
        };
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
