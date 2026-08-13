using DisplayConfigurator.Application.DTOs;

namespace DisplayConfigurator.Application.Interfaces;

public interface IConfigurationService
{
    Task<PagedResultDto<ConfigurationResponseDto>> GetPagedAsync(PagedQueryDto query);
    Task<IEnumerable<ConfigurationResponseDto>> GetByUserIdAsync(int userId);
    Task<ConfigurationResponseDto?> GetByIdAsync(int id);
    Task<ConfigurationResponseDto> CreateAsync(CreateConfigurationDto dto, int? userId = null);
    Task<byte[]?> GenerateSpecSheetPdfAsync(int id);
    Task<byte[]> GenerateSpecSheetPdfFromDtoAsync(CreateConfigurationDto dto, PdfReportExtras? extras = null);
    Task<bool> DeleteAsync(int id);
    Task<bool> UpdateStatusAsync(int id, string status);
}