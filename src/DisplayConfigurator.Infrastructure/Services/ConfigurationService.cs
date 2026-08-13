using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Services;

public class ConfigurationService : IConfigurationService
{
    private readonly IConfigurationRepository _configurationRepository;
    private readonly ICabinRepository _cabinRepository;
    private readonly IPdfReportService _pdfReportService;

    public ConfigurationService(
        IConfigurationRepository configurationRepository,
        ICabinRepository cabinRepository,
        IPdfReportService pdfReportService)
    {
        _configurationRepository = configurationRepository;
        _cabinRepository = cabinRepository;
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
            Status = "Beklemede",
            Revision = 1,
            UserId = userId,
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

    public async Task<bool> UpdateStatusAsync(int id, string status)
    {
        return await _configurationRepository.UpdateStatusAsync(id, status);
    }

    public async Task<byte[]?> GenerateSpecSheetPdfAsync(int id)
    {
        var configDto = await GetByIdAsync(id);
        if (configDto == null) return null;

        Cabin? cabin = configDto.CabinId > 0
            ? await _cabinRepository.GetByIdAsync(configDto.CabinId)
            : null;

        return _pdfReportService.Generate(configDto, extras: null, cabin);
    }

    public async Task<byte[]> GenerateSpecSheetPdfFromDtoAsync(CreateConfigurationDto dto, PdfReportExtras? extras = null)
    {
        var cabin = await _cabinRepository.GetByIdAsync(dto.CabinId);
        if (cabin == null)
            throw new ArgumentException("Seçilen kabin veya modül modeli bulunamadı.");

        var configDto = CalculateConfigurationDto(dto, cabin);
        return _pdfReportService.Generate(configDto, extras, cabin);
    }

    // Gerçek hesaplama mantığı DisplayConfigurator.Application/Engine/ConfigurationCalculator.cs'e
    // taşındı (bkz. DisplayConfigurator.Tests) — burada yalnızca ince bir sarmalayıcı kalıyor.
    private static ConfigurationResponseDto CalculateConfigurationDto(CreateConfigurationDto dto, Cabin cabin)
        => ConfigurationCalculator.Calculate(dto, cabin);

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

        return new ConfigurationResponseDto
        {
            Id = c.Id,
            ProjectName = string.IsNullOrWhiteSpace(c.ProjectName) ? "Taslak Proje" : c.ProjectName,
            CustomerName = string.IsNullOrWhiteSpace(c.CustomerName) ? "Müşteri Belirtilmedi" : c.CustomerName,
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
            AspectRatio = c.AspectRatio,
            IsFullHd = c.IsFullHd,
            Is4K = c.Is4K,
            TotalPrice = c.TotalPrice,
            Status = string.IsNullOrWhiteSpace(c.Status) ? "Taslak" : c.Status,
            Revision = c.Revision <= 0 ? 1 : c.Revision,
            CreatedAt = c.CreatedAt
        };
    }
}