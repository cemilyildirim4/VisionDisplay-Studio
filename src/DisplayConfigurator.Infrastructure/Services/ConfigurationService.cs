using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Services;

public class ConfigurationService : IConfigurationService
{
    private readonly IConfigurationRepository _configurationRepository;
    private readonly ICabinRepository _cabinRepository;
    private readonly IHardwareCatalogRepository _hardwareCatalogRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;
    private readonly IPdfReportService _pdfReportService;

    public ConfigurationService(
        IConfigurationRepository configurationRepository,
        ICabinRepository cabinRepository,
        IHardwareCatalogRepository hardwareCatalogRepository,
        ISystemSettingsRepository systemSettingsRepository,
        IPdfReportService pdfReportService)
    {
        _configurationRepository = configurationRepository;
        _cabinRepository = cabinRepository;
        _hardwareCatalogRepository = hardwareCatalogRepository;
        _systemSettingsRepository = systemSettingsRepository;
        _pdfReportService = pdfReportService;
    }

    public async Task<PagedResultDto<ConfigurationResponseDto>> GetPagedAsync(PagedQueryDto query)
    {
        var paged = await _configurationRepository.GetPagedAsync(query);
        var items = paged.Items.Select(c => MapToResponseDto(c, c.Cabin)).ToList();

        return new PagedResultDto<ConfigurationResponseDto>
        {
            Items = items,
            TotalCount = paged.TotalCount,
            Page = paged.Page,
            PageSize = paged.PageSize,
        };
    }

    public async Task<IEnumerable<ConfigurationResponseDto>> GetByUserIdAsync(int userId)
    {
        var configurations = await _configurationRepository.GetByUserIdAsync(userId);
        return configurations.Select(c => MapToResponseDto(c, c.Cabin)).ToList();
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

    public async Task<ConfigurationResponseDto> CreateAsync(CreateConfigurationDto dto, int? userId = null)
    {
        var cabin = await _cabinRepository.GetByIdAsync(dto.CabinId);
        if (cabin == null)
            throw new ArgumentException("Seçilen kabin veya modül modeli bulunamadı.");

        var hardware = await LoadHardwareAsync(dto);
        dto.LaborCostMultiplier ??= await _systemSettingsRepository.GetLaborCostMultiplierAsync();
        var responseDto = CalculateConfigurationDto(dto, cabin, hardware);

        var entity = new Configuration
        {
            ProjectName = responseDto.ProjectName,
            CustomerName = FirstNonEmpty(dto.Customer?.Name, dto.CustomerName),
            Phone = FirstNonEmpty(dto.Customer?.Phone, dto.Phone),
            Email = FirstNonEmpty(dto.Customer?.Email, dto.Email),
            WallWidthM = dto.WallWidthM,
            WallHeightM = dto.WallHeightM,
            ScreenMode = dto.ScreenMode,
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
            HasMiniPc = dto.HasMiniPc,
            LaborCostMultiplier = dto.LaborCostMultiplier ?? 1m,
            PowerSupplyId = dto.PowerSupplyId,
            MiniPcId = dto.MiniPcId,
            PatchCableId = dto.PatchCableId,
            ReceivingCardId = dto.ReceivingCardId,
            ProcessorId = dto.ProcessorId,
            Status = "Beklemede",
            Revision = 1,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        int createdId = await _configurationRepository.CreateAsync(entity);
        responseDto.Id = createdId;
        responseDto.UserId = userId;
        responseDto.Status = entity.Status;
        responseDto.Revision = entity.Revision;
        return responseDto;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        return await _configurationRepository.DeleteAsync(id);
    }

    public async Task<bool> UpdateStatusAsync(int id, string status)
    {
        return await _configurationRepository.UpdateStatusAsync(id, status);
    }

    public async Task<byte[]?> GenerateSpecSheetPdfAsync(int id, PdfReportKind kind = PdfReportKind.Client)
    {
        var entity = await _configurationRepository.GetByIdAsync(id);
        if (entity == null) return null;

        Cabin? cabin = entity.CabinId > 0
            ? await _cabinRepository.GetByIdAsync(entity.CabinId)
            : null;
        if (cabin == null) return null;

        var dto = ToCreateDto(entity);
        var hardware = await LoadHardwareAsync(dto);
        dto.LaborCostMultiplier ??= await _systemSettingsRepository.GetLaborCostMultiplierAsync();
        var configDto = CalculateConfigurationDto(dto, cabin, hardware);
        configDto.Id = entity.Id;
        configDto.UserId = entity.UserId;
        configDto.Status = entity.Status;
        configDto.Revision = entity.Revision;
        configDto.CreatedAt = entity.CreatedAt;
        return _pdfReportService.Generate(configDto, extras: null, cabin, kind);
    }

    public async Task<byte[]> GenerateSpecSheetPdfFromDtoAsync(
        CreateConfigurationDto dto,
        PdfReportExtras? extras = null,
        PdfReportKind kind = PdfReportKind.Client)
    {
        var cabin = await _cabinRepository.GetByIdAsync(dto.CabinId);
        if (cabin == null)
            throw new ArgumentException("Seçilen kabin veya modül modeli bulunamadı.");

        var hardware = await LoadHardwareAsync(dto);
        dto.LaborCostMultiplier ??= await _systemSettingsRepository.GetLaborCostMultiplierAsync();
        var configDto = CalculateConfigurationDto(dto, cabin, hardware);
        return _pdfReportService.Generate(configDto, extras, cabin, kind);
    }

    private static CreateConfigurationDto ToCreateDto(Configuration entity) => new()
    {
        ProjectName = entity.ProjectName,
        CustomerName = entity.CustomerName,
        Phone = entity.Phone,
        Email = entity.Email,
        WallWidthM = entity.WallWidthM,
        WallHeightM = entity.WallHeightM,
        ScreenMode = entity.ScreenMode,
        CabinId = entity.CabinId,
        Cols = entity.Cols,
        Rows = entity.Rows,
        AssemblyType = entity.AssemblyType,
        ModulesPerCard = entity.ModulesPerCard,
        HasMiniPc = entity.HasMiniPc,
        LaborCostMultiplier = entity.LaborCostMultiplier,
        PowerSupplyId = entity.PowerSupplyId,
        MiniPcId = entity.MiniPcId,
        PatchCableId = entity.PatchCableId,
        ReceivingCardId = entity.ReceivingCardId,
        ProcessorId = entity.ProcessorId,
    };

    private static ConfigurationResponseDto CalculateConfigurationDto(
        CreateConfigurationDto dto,
        Cabin cabin,
        HardwareCatalogItems? hardware = null)
        => ConfigurationCalculator.Calculate(dto, cabin, hardware);

    private async Task<HardwareCatalogItems> LoadHardwareAsync(CreateConfigurationDto dto)
    {
        Processor? processor = null;
        PowerSupply? powerSupply = null;
        MiniPc? miniPc = null;
        PatchCable? patchCable = null;
        ReceivingCard? receivingCard = null;

        if (dto.ProcessorId is > 0)
        {
            processor = await _hardwareCatalogRepository.GetProcessorByIdAsync(dto.ProcessorId.Value)
                ?? throw new ArgumentException("Seçilen işlemci bulunamadı.");
        }

        if (dto.PowerSupplyId is > 0)
        {
            powerSupply = await _hardwareCatalogRepository.GetPowerSupplyByIdAsync(dto.PowerSupplyId.Value)
                ?? throw new ArgumentException("Seçilen güç kaynağı bulunamadı.");
        }

        if (dto.MiniPcId is > 0)
        {
            miniPc = await _hardwareCatalogRepository.GetMiniPcByIdAsync(dto.MiniPcId.Value)
                ?? throw new ArgumentException("Seçilen mini PC bulunamadı.");
        }

        if (dto.PatchCableId is > 0)
        {
            patchCable = await _hardwareCatalogRepository.GetPatchCableByIdAsync(dto.PatchCableId.Value)
                ?? throw new ArgumentException("Seçilen patch kablosu bulunamadı.");
        }

        if (dto.ReceivingCardId is > 0)
        {
            receivingCard = await _hardwareCatalogRepository.GetReceivingCardByIdAsync(dto.ReceivingCardId.Value)
                ?? throw new ArgumentException("Seçilen alıcı kart bulunamadı.");
        }

        return new HardwareCatalogItems
        {
            Processor = processor,
            PowerSupply = powerSupply,
            MiniPc = miniPc,
            PatchCable = patchCable,
            ReceivingCard = receivingCard,
        };
    }

    private static ConfigurationResponseDto MapToResponseDto(Configuration c, Cabin? cabin = null)
    {
        int totalUnits = c.Cols * c.Rows;

        decimal maxPowerKw = c.TotalMaxPowerKw;
        decimal avgPowerKw = c.TotalAvgPowerKw;

        if (maxPowerKw == 0 && cabin != null && cabin.PowerMaxWatts > 0)
        {
            maxPowerKw = Math.Round((totalUnits * cabin.PowerMaxWatts) / 1000m, 2);
            avgPowerKw = cabin.PowerTypicalWatts > 0 
                ? Math.Round((totalUnits * cabin.PowerTypicalWatts) / 1000m, 2)
                : Math.Round(maxPowerKw * 0.35m, 2);
        }

        decimal widthM = c.TotalWidthMm / 1000m;
        decimal heightM = c.TotalHeightMm / 1000m;
        decimal screenAreaM2 = Math.Round(widthM * heightM, 4);
        decimal laborMultiplier = c.LaborCostMultiplier;
        decimal laborCost = Math.Round(screenAreaM2 * laborMultiplier, 2);
        decimal moduleMaxWatts = totalUnits * (cabin?.PowerMaxWatts ?? 0m);
        decimal moduleHeatBtu = Math.Round(moduleMaxWatts * ConfigurationCalculator.WattsToBtu, 2);

        return new ConfigurationResponseDto
        {
            Id = c.Id,
            ProjectName = string.IsNullOrWhiteSpace(c.ProjectName) ? "Taslak Proje" : c.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(c.CustomerName) ? null : c.CustomerName,
            Phone = c.Phone,
            Email = c.Email,
            WallWidthM = c.WallWidthM,
            WallHeightM = c.WallHeightM,
            ScreenMode = c.ScreenMode,
            UserId = c.UserId,
            CabinId = c.CabinId,
            CabinModelName = cabin?.ModelCode ?? c.Cabin?.ModelCode ?? "Bilinmeyen Model",
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
            ModuleHeatDissipationBtu = moduleHeatBtu,
            AspectRatio = c.AspectRatio,
            IsFullHd = c.IsFullHd,
            Is4K = c.Is4K,
            HasMiniPc = c.HasMiniPc,
            LaborCostMultiplier = laborMultiplier,
            ScreenAreaM2 = screenAreaM2,
            LaborCost = laborCost,
            HardwareSubtotal = Math.Round(c.TotalPrice - laborCost, 2),
            PowerSupplyId = c.PowerSupplyId,
            MiniPcId = c.MiniPcId,
            PatchCableId = c.PatchCableId,
            ReceivingCardId = c.ReceivingCardId,
            ProcessorId = c.ProcessorId,
            TotalPrice = c.TotalPrice,
            Status = string.IsNullOrWhiteSpace(c.Status) ? "Taslak" : c.Status,
            Revision = c.Revision <= 0 ? 1 : c.Revision,
            CreatedAt = c.CreatedAt
        };
    }

    private static string? FirstNonEmpty(string? a, string? b) =>
        !string.IsNullOrWhiteSpace(a) ? a : (!string.IsNullOrWhiteSpace(b) ? b : null);
}