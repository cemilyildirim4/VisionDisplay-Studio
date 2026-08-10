using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using DisplayConfigurator.Infrastructure.Pdf;
using QuestPDF.Fluent;

namespace DisplayConfigurator.Infrastructure.Services;

public class ConfigurationService : IConfigurationService
{
    private readonly IConfigurationRepository _configurationRepository;
    private readonly ICabinRepository _cabinRepository;

    public ConfigurationService(
        IConfigurationRepository configurationRepository, 
        ICabinRepository cabinRepository)
    {
        _configurationRepository = configurationRepository;
        _cabinRepository = cabinRepository;
    }

    public async Task<IEnumerable<ConfigurationResponseDto>> GetAllAsync()
    {
        var configurations = await _configurationRepository.GetAllAsync();
        var resultList = new List<ConfigurationResponseDto>();

        foreach (var config in configurations)
        {
            Cabin? cabin = null;
            if (config.CabinId > 0)
            {
                cabin = await _cabinRepository.GetByIdAsync(config.CabinId);
            }

            resultList.Add(MapToResponseDto(config, cabin));
        }

        return resultList;
    }

    public async Task<ConfigurationResponseDto?> GetByIdAsync(int id)
    {
        var config = await _configurationRepository.GetByIdAsync(id);
        if (config == null) return null;

        Cabin? cabin = null;
        if (config.CabinId > 0)
        {
            cabin = await _cabinRepository.GetByIdAsync(config.CabinId);
        }

        return MapToResponseDto(config, cabin);
    }

    public async Task<ConfigurationResponseDto> CreateAsync(CreateConfigurationDto dto)
    {
        var cabin = await _cabinRepository.GetByIdAsync(dto.CabinId);
        if (cabin == null)
            throw new ArgumentException("Seçilen kabin veya modül modeli bulunamadı.");

        var responseDto = CalculateConfigurationDto(dto, cabin);

        var entity = new Configuration
        {
            ProjectName = responseDto.ProjectName,
            CustomerName = responseDto.CustomerName,
            CabinId = dto.CabinId,
            AssemblyType = responseDto.AssemblyType,
            ModulesPerCard = responseDto.ModulesPerCard,
            ReceivingCardCount = responseDto.ReceivingCardCount,
            RequiredRj45Ports = responseDto.RequiredRj45Ports,
            RecommendedProcessor = responseDto.RecommendedProcessor,
            Cols = dto.Cols,
            Rows = dto.Rows,
            TotalWidthMm = responseDto.TotalWidthMm,
            TotalHeightMm = responseDto.TotalHeightMm,
            TotalResolution = responseDto.TotalResolution,
            TotalWeightKg = responseDto.TotalWeightKg,
            TotalMaxPowerKw = responseDto.TotalMaxPowerKw,
            TotalAvgPowerKw = responseDto.TotalAvgPowerKw,
            AspectRatio = responseDto.AspectRatio,
            IsFullHd = responseDto.IsFullHd,
            Is4K = responseDto.Is4K,
            TotalPrice = responseDto.TotalPrice,
            CreatedAt = DateTime.UtcNow
        };

        int createdId = await _configurationRepository.CreateAsync(entity);
        entity.Id = createdId;

        return MapToResponseDto(entity, cabin);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        return await _configurationRepository.DeleteAsync(id);
    }

    public async Task<byte[]?> GenerateSpecSheetPdfAsync(int id)
    {
        var configDto = await GetByIdAsync(id);
        if (configDto == null) return null;

        var document = new SpecSheetDocument(configDto);
        return document.GeneratePdf();
    }

    public async Task<byte[]> GenerateSpecSheetPdfFromDtoAsync(CreateConfigurationDto dto)
    {
        var cabin = await _cabinRepository.GetByIdAsync(dto.CabinId);
        if (cabin == null)
            throw new ArgumentException("Seçilen kabin veya modül modeli bulunamadı.");

        var configDto = CalculateConfigurationDto(dto, cabin);

        var document = new SpecSheetDocument(configDto);
        return document.GeneratePdf();
    }

    // --- GELİŞMİŞ HESAPLAMA MOTORU (CABINET vs MODULE) ---
    private ConfigurationResponseDto CalculateConfigurationDto(CreateConfigurationDto dto, Cabin cabin)
    {
        int totalUnits = dto.Cols * dto.Rows; // Toplam Kabin veya Modül sayısı

        int totalWidthMm = dto.Cols * cabin.WidthMm;
        int totalHeightMm = dto.Rows * cabin.HeightMm;
        int totalResW = dto.Cols * cabin.ResolutionWidth;
        int totalResH = dto.Rows * cabin.ResolutionHeight;
        int totalPixels = totalResW * totalResH;
        string totalResolution = $"{totalResW}x{totalResH}";

        // 1. MONTAJ TİPİ VE ALICI KART HESABI
        string assemblyType = !string.IsNullOrWhiteSpace(dto.AssemblyType) 
            ? dto.AssemblyType 
            : cabin.ProductType; // DTO'dan gelmezse veri tabanındaki varsayılanı al

        int modulesPerCard = dto.ModulesPerCard > 0 
            ? dto.ModulesPerCard 
            : (cabin.DefaultModulesPerCard > 0 ? cabin.DefaultModulesPerCard : 10);

        int receivingCardCount = 0;

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
        // 1 RJ45 portu standartta güvenli sınır olarak max 550.000 - 650.000 piksel taşır.
        const int MAX_PIXELS_PER_PORT = 650000;
        int requiredPorts = (int)Math.Ceiling((double)totalPixels / MAX_PIXELS_PER_PORT);
        if (requiredPorts < 1) requiredPorts = 1;

        string recommendedProcessor = DetermineProcessor(totalPixels, requiredPorts);

        // 3. GÜÇ, AĞIRLIK VE FİYAT HESAPLARI
        decimal maxWattsPerUnit = cabin.MaxPowerWatts;
        decimal avgWattsPerUnit = cabin.AvgPowerWatts > 0 
            ? cabin.AvgPowerWatts 
            : maxWattsPerUnit * 0.35m;

        decimal maxPowerKw = Math.Round((totalUnits * maxWattsPerUnit) / 1000m, 2);
        decimal avgPowerKw = Math.Round((totalUnits * avgWattsPerUnit) / 1000m, 2);
        decimal totalWeightKg = Math.Round(totalUnits * (cabin.WeightKg ?? 0m), 2);

        string aspectRatio = CalculateAspectRatio(totalWidthMm, totalHeightMm);
        bool isFullHd = totalResW >= 1920 && totalResH >= 1080;
        bool is4K = totalResW >= 3840 && totalResH >= 2160;
        decimal calculatedPrice = totalUnits * cabin.Price;

        return new ConfigurationResponseDto
        {
            ProjectName = string.IsNullOrWhiteSpace(dto.ProjectName) ? "Taslak Proje" : dto.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Müşteri Belirtilmedi" : dto.CustomerName,
            CabinId = dto.CabinId,
            CabinModelName = !string.IsNullOrWhiteSpace(cabin.ModelName) ? cabin.ModelName : "Standart Model",
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
            CreatedAt = DateTime.UtcNow
        };
    }

    // --- NOVASTAR İŞLEMCİ SEÇİM SİMÜLASYONU ---
    private static string DetermineProcessor(int totalPixels, int requiredPorts)
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

        return "NovaStar MCTRL4K (16 Port / 4K Pro)";
    }

    private static string CalculateAspectRatio(int width, int height)
    {
        if (height == 0) return "16:9";
        
        int gcd = FindGCD(width, height);
        int ratioW = width / gcd;
        int ratioH = height / gcd;

        double ratioDecimal = (double)width / height;
        if (Math.Abs(ratioDecimal - (16.0 / 9.0)) < 0.05) return "16:9";
        if (Math.Abs(ratioDecimal - (32.0 / 9.0)) < 0.05) return "32:9";
        if (Math.Abs(ratioDecimal - (4.0 / 3.0)) < 0.05) return "4:3";

        return $"{ratioW}:{ratioH}";
    }

    private static int FindGCD(int a, int b)
    {
        while (b != 0)
        {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    private static ConfigurationResponseDto MapToResponseDto(Configuration c, Cabin? cabin = null)
    {
        int totalUnits = c.Cols * c.Rows;

        decimal maxPowerKw = c.TotalMaxPowerKw;
        decimal avgPowerKw = c.TotalAvgPowerKw;

        if (maxPowerKw == 0 && cabin != null && cabin.MaxPowerWatts > 0)
        {
            maxPowerKw = Math.Round((totalUnits * cabin.MaxPowerWatts) / 1000m, 2);
            avgPowerKw = cabin.AvgPowerWatts > 0 
                ? Math.Round((totalUnits * cabin.AvgPowerWatts) / 1000m, 2)
                : Math.Round(maxPowerKw * 0.35m, 2);
        }

        return new ConfigurationResponseDto
        {
            Id = c.Id,
            ProjectName = string.IsNullOrWhiteSpace(c.ProjectName) ? "Taslak Proje" : c.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(c.CustomerName) ? "Müşteri Belirtilmedi" : c.CustomerName,
            CabinId = c.CabinId,
            CabinModelName = cabin?.ModelName ?? c.Cabin?.ModelName ?? "Bilinmeyen Model",
            AssemblyType = c.AssemblyType,
            ModulesPerCard = c.ModulesPerCard,
            ReceivingCardCount = c.ReceivingCardCount,
            RequiredRj45Ports = c.RequiredRj45Ports,
            RecommendedProcessor = c.RecommendedProcessor,
            Cols = c.Cols,
            Rows = c.Rows,
            TotalWidthMm = c.TotalWidthMm,
            TotalHeightMm = c.TotalHeightMm,
            TotalResolution = c.TotalResolution,
            TotalWeightKg = c.TotalWeightKg,
            TotalMaxPowerKw = maxPowerKw,
            TotalAvgPowerKw = avgPowerKw,
            AspectRatio = c.AspectRatio,
            IsFullHd = c.IsFullHd,
            Is4K = c.Is4K,
            TotalPrice = c.TotalPrice,
            CreatedAt = c.CreatedAt
        };
    }
}